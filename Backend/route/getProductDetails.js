const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// GET all products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find(); 
    res.status(200).json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET single product by ID
router.get('/products/:id', async (req, res) => {
  const { id } = req.params;

  // // Optional: Validate ObjectId
  // if (!mongoose.Types.ObjectId.isValid(id)) {
  //   return res.status(400).json({ message: "Invalid product ID" });
  // }

  try {
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;