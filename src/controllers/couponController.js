const Coupon = require('../models/Coupon');
const Cart = require('../models/Cart');
const Dodoclient = require('../config/dodoClient');

exports.createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      expiresAt,
      name,
      usageLimit,
      restrictedTo,
      subscriptionCycles,
    } = req.body;
    console.log('Creating coupon with data:', req.body);

    // Validate input
    if (!code || !discountType || !discountValue) {
      return res
        .status(400)
        .json({ message: 'Missing required fields: code, discountType, discountValue' });
    }
    const valueNum = Number(discountValue);
    if (isNaN(valueNum) || valueNum <= 0) {
      return res.status(400).json({ message: 'Invalid discountValue' });
    } 
    let amount, type;
    if (discountType === 'percentage') {
      amount = Math.round(valueNum * 100); // 5% → 500
      type = 'percentage';
    } else if (discountType === 'fixed' || discountType === 'flat') {
      amount = Math.round(valueNum * 100); // $10 → 1000 (Dodo expects cents)
      type = 'flat';  
    } else {
      return res.status(400).json({ message: 'Unknown discount type' });
    }

    
    const safeToISOString = d => {
      if (!d) return undefined;
      const dt = new Date(d);
      return isNaN(dt) ? undefined : dt.toISOString();
    };
    const formattedExpiresAt = safeToISOString(expiresAt);

    //payload
    const dodoDiscountPayload = {
      code: code.toUpperCase(),
      amount,
      type,
      name ,
      restricted_to:
        Array.isArray(restrictedTo) && restrictedTo.length > 0 ? restrictedTo : null,
      subscription_cycles: subscriptionCycles || null,
      usage_limit: usageLimit || null,
      ...(formattedExpiresAt ? { expires_at: formattedExpiresAt } : {}),
    };

     
    let dodoDiscount;
    try {
      dodoDiscount = await Dodoclient.discounts.create(dodoDiscountPayload);
    } catch (err) {
      if (
        type === 'flat' &&
        err &&
        err.message &&
        err.message.includes('unknown variant `flat`')
      ) {
        return res.status(400).json({
          message:
            'Flat (amount-based) discounts are not currently enabled for your Dodo Payments account. Please contact Dodo Payments support to enable this feature.',
        });
      }
      // Generic handling for other errors
      console.error('Dodo Payments API error:', err);
      return res.status(400).json({ message: err.message || 'Dodo Payments error' });
    }

    // Save in your DB
    const couponData = {
      code: code.toUpperCase(),
      discountType,
      discountValue: valueNum,
      expiresAt,
      usageLimit,
      name,
      dodoDiscountId: dodoDiscount.discount_id || dodoDiscount.id,
       
      createdBy: req.user._id,
      dodoDiscountId: dodoDiscount.discount_id || dodoDiscount.id,
    };

    console.log('Saving coupon to DB with data:', couponData);

    const coupon = await Coupon.create(couponData);

    res.status(201).json(coupon);
  } catch (error) {
    console.error('Coupon creation error:', error);
    res.status(400).json({ message: error.message });
  }
};




// Get all coupons with filtering
exports.getCoupons = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search;
    const status = req.query.status;

    let query = {};

    // Search by code
    if (search) {
      query.code = { $regex: search, $options: 'i' };
    }
 
    if (status === 'active') {
      query.isActive = true;
      query.expiresAt = { $gt: new Date() };
    } else if (status === 'expired') {
      query.expiresAt = { $lt: new Date() };
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const total = await Coupon.countDocuments(query);
    const coupons = await Coupon.find(query)
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      coupons,
      page,
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateCoupon = async (req, res) => {
  console.log('Update coupon request body:', req.body);
  try {
    // Find the coupon first
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    // console.log('Found coupon to update:', coupon, coupon?.dodoDiscountId);
      if(!coupon.dodoDiscountId){
      return res.status(400).json({ message: 'Coupon does not have associated Dodo discount ID.' }); 
      }
     
    if (coupon.dodoDiscountId) {
      
      const dodoPayload = {};
      if (req.body.name) dodoPayload.name = req.body.name || coupon.name;
      if (req.body.expiresAt) dodoPayload.expires_at = new Date(req.body.expiresAt).toISOString();

      // Handle amount 
      if (req.body.discountValue) {
       
        const inputType = req.body.discountType || coupon.discountType || 'percentage';
        if (inputType === 'percentage') {
          dodoPayload.amount = Math.round(Number(req.body.discountValue) * 100);  
          dodoPayload.type = 'percentage';
        } else if (inputType === 'fixed' || inputType === 'flat') {
          dodoPayload.amount = Math.round(Number(req.body.discountValue) * 100);  
          dodoPayload.type = 'flat';
        } else {
          return res.status(400).json({ message: 'Unknown discount type for Dodo update.' });
        }
      }

      // Add more fields as needed

      try {
        const dodo = await Dodoclient.discounts.update(coupon.dodoDiscountId, dodoPayload);
        console.log('Dodo update response:', dodo);

        // Now update locally
        const updatedCoupon = await Coupon.findByIdAndUpdate(
          req.params.id,
          req.body,
          { new: true, runValidators: true }
        );
        return res.json(updatedCoupon);

      } catch (err) {
        console.error('Failed to update discount in Dodo Payments:', err);
        return res.status(400).json({ message: 'Dodo update failed: ' + err.message });
      }
    } else {
      const updatedCoupon = await Coupon.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      return res.json(updatedCoupon);
    }

  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(400).json({ message: error.message });
  }
};



// Delete coupon (superadmin only)
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if coupon exists
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({
        message: 'Coupon not found'
      });
    }

    // Check if coupon is in use in any active cart
    const activeCart = await Cart.findOne({
      coupon: id,
      // Add further active cart conditions as needed
    });

    if (activeCart) {
      return res.status(400).json({
        message: 'Cannot delete coupon - it is currently in use'
      });
    }

    // Remove from Dodo Payments if dodoDiscountId exists
    if (coupon.dodoDiscountId) {
      try {
        await Dodoclient.discounts.delete(coupon.dodoDiscountId);
      } catch (err) {
        console.error('Dodo Payments deletion error:', err);
        return res.status(500).json({
          message: 'Failed to delete related Dodo Payments discount: ' + err.message
        });
      }
    }

    // Delete the coupon locally
    await Coupon.findByIdAndDelete(id);

    res.json({
      message: 'Coupon deleted successfully',
      deletedCoupon: coupon
    });

  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({
      message: 'Error deleting coupon',
      error: error.message
    });
  }
};


// Fix the coupon usage validation
exports.applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!coupon) {
      return res.status(400).json({ message: 'Invalid or expired coupon' });
    }

    // Check usage limit
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ message: 'Coupon usage limit reached' });
    }

    // Increment used count
    coupon.usedCount += 1;
    await coupon.save();

    res.json(coupon);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};