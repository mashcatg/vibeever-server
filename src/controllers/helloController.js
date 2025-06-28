const helloModel = require("../models/helloModel");

exports.createHello = async (req, res) => {
  try {
    const { name, message, email } = req.body;
    if ( !name || !message || !email ) {
        return res.status(400).json({ error: "All fields are required" });
    }
    const help = new helloModel({ name, message, email });
    await help.save();
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
      helps = await helloModel.find();
    } else {
      helps = await helloModel.find({ email: req.user.email });
    }
    res.json(helps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};