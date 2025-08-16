const helloModel = require("../models/helloModel");
const { sendEmail } = require("../utils/sendEmail");

// hello.controller.js
exports.createHello = async (req, res) => {
  try {
    const { name, message, email } = req.body;
    if (!name || !message || !email) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const help = new helloModel({ name, message, email });
    await help.save(); // Uncomment when you want to store in DB

    await sendEmail({
      to: process.env.SMTP_FROM, // send to your inbox
      subject: "New Message From User",
      html: `
        <div style="font-family: Arial, sans-serif; color: #222;">
          <h2>New Message from VibeEver Contact Form</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 6px;">
            ${message}
          </div>
          <hr>
          <p style="font-size: 12px; color: #888;">
            This message was sent from the VibeEver website contact form.
          </p>
        </div>
      `
    });

    res.status(201).json({
      message: "We'll get back to you soon",
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


exports.getHello = async (req, res) => {
  try {
    let helps;
    if (req.user.role === 'admin') {
      helps = await helloModel.find().sort({  createdAt: -1});
    } else {
      helps = await helloModel.find({ email: req.user.email  })
    }
    res.json(helps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};