const storeModel = require("../models/storeModel");

exports.getSingleStore = async (req, res) => {
  try {
    const { storeUsername } = req.params;  

    console.log("storeUsername", storeUsername);

    const store = await storeModel.findOne({ storeUsername }) 
      .populate('ownerId', 'fullName email userName');

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    return res.status(200).json({
      success: true,
      store,
    });
  } catch (error) {
    console.error("Error fetching store:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


exports.getSingleID = async (req, res) => {
  try {
    const { storeId } = req;;  

    console.log("storeUsername", storeId);

    const store = await storeModel.findById(storeId) 
      .populate('ownerId', 'fullName email userName');

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    return res.status(200).json({
      success: true,
      store,
    });
  } catch (error) {
    console.error("Error fetching store:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};



exports.getAllStores = async (req, res) => {
  try {
   const stores = await storeModel.find({ status: "approved" })
  .populate('ownerId', 'fullName email userName')
  .sort({ createdAt: -1 });

    ;
    // console.log("stores", stores);

    if (stores.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "No stores found" 
      });
    }

    return res.status(200).json({
      success: true,
      stores,
    });
  } catch (error) {
    console.error("Error fetching stores:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};