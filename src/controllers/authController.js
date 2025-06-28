// controllers/authController.js
const User = require('../models/User');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../utils/sendEmail');
const { generateToken } = require('../utils/generateJWT');

exports.register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields"
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered"
      });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // Create salt and hash password
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(password + salt, 10);

    // Create user with hashed token
    const user = await User.create({
      fullName,
      email,
      passwordHash,
      salt,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000,
      isEmailVerified: false
    });

    // Send verification email with unhashed token
    const verificationURL = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    
    await sendEmail({
      to: email,
      subject: 'Welcome to VibeEver - Verify Your Email',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h1>Welcome to VibeEver!</h1>
          <p>Hi ${fullName},</p>
          <p>Thanks for registering! Please verify your email by clicking the button below:</p>
          <a href="${verificationURL}" 
             style="display: inline-block; padding: 12px 24px; 
                    background-color: #4F46E5; color: white; 
                    text-decoration: none; border-radius: 5px; 
                    margin: 20px 0;">
            Verify Email Address
          </a>
          <p>If the button doesn't work, copy and paste this link:</p>
          <p>${verificationURL}</p>
          <p>This link will expire in 24 hours.</p>
        </body>
        </html>
      `
    });

    res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email for verification.",
      email: user.email
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: "Error during registration"
    });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    console.log('Received token:', token); // Debug log

    // Hash the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    console.log('Hashed token:', hashedToken); // Debug log

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('No user found with token'); // Debug log
      return res.status(400).json({
        success: false,
        message: 'Verification failed. The link may be expired or invalid.'
      });
    }

    // Update user
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying email'
    });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    console.log('Resend requested for:', email); // Debug log

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // Update user with new token
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    // Send verification email
    const verificationURL = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    await sendEmail({
      to: user.email,
      subject: 'VibeEver - New Verification Link',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h1>Email Verification</h1>
          <p>Hi ${user.fullName},</p>
          <p>Here's your new verification link:</p>
          <a href="${verificationURL}" 
             style="display: inline-block; padding: 12px 24px; 
                    background-color: #4F46E5; color: white; 
                    text-decoration: none; border-radius: 5px; 
                    margin: 20px 0;">
            Verify Email Address
          </a>
          <p>This link will expire in 24 hours.</p>
        </body>
        </html>
      `
    });

    res.status(200).json({
      success: true,
      message: 'New verification email sent successfully'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending verification email'
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  const valid = await bcrypt.compare(password + user.salt, user.passwordHash);
  if (!valid) return res.status(400).json({ message: 'Invalid credentials' });

  if (!user.isEmailVerified) return res.status(403).json({ message: 'Email not verified' });
  const token = generateToken(user);
  res.status(200).json({ token, user: { id: user._id, fullName: user.fullName, role: user.role ,image: user.image , email: user.email , phoneNumber : user?.phoneNumber } });
};

exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

   
    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;  
    await user.save();

   
    const resetURL = `${process.env.FRONTEND_URL}/set-new-password/${resetToken}`;

    
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request - VibeEver',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h1>Password Reset</h1>
          <p>Hi ${user.fullName},</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetURL}" 
             style="display: inline-block; padding: 12px 24px; 
                    background-color: #4F46E5; color: white; 
                    text-decoration: none; border-radius: 5px; 
                    margin: 20px 0;">
            Reset Password
          </a>
          <p>If the button doesn't work, copy and paste this link:</p>
          <p>${resetURL}</p>
          <p>This link will expire in 1 hour.</p>
        </body>
        </html>
      `
    });

    res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending reset email'
    });
  }
};

exports.resetPassword = async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

  const salt = crypto.randomBytes(16).toString('hex');
  user.passwordHash = await bcrypt.hash(req.body.password + salt, 10);
  user.salt = salt;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  res.status(200).json({ message: 'Password updated successfully' });
};

exports.googleAuthCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=Authentication failed`);
    }

    const token = generateToken(req.user);
    const encodedToken = encodeURIComponent(token);

    // Read state param (which is the redirect path)
    const redirect = req.query.state || '/';

    // Redirect with token and redirect param
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/success?token=${encodedToken}&redirect=${encodeURIComponent(redirect)}`
    );
  } catch (error) {
    console.error('Google auth callback error:', error);
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/error?message=Server error during authentication`
    );
  }
};

exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Hash token for comparison
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Token is valid'
    });
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying token'
    });
  }
};

 

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(currentPassword + user.salt, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(newPassword + salt, 10);

    user.passwordHash = passwordHash;
    user.salt = salt;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: "Error changing password"
    });
  }
};


exports.recentUsers = async (req, res) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fullName email createdAt');

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching recent users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent users'
    });
  }
};

// Add this temporary test endpoint
exports.testGoogleAuth = async (req, res) => {
  try {
    const testUser = {
      _id: '123',
      email: 'test@example.com',
      role: 'user'
    };

    const token = generateToken({
      id: testUser._id,
      email: testUser.email,
      role: testUser.role
    });

    res.json({
      success: true,
      token,
      user: testUser
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};