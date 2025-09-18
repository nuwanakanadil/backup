const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const Canteen = require("../models/Canteen");
const User = require("../models/User"); // Import User model
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

// Create an order (status starts as "pending" for 5 mins)
router.post("/place", async (req, res) => {
  try {
    const { userId, itemId, itemName, quantity, method, address, price, img } = req.body;

    if (!userId || !itemId || !itemName || !quantity || !method) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Derive canteenId from product
    const product = await Product.findById(itemId).select("canteenId").lean();
    if (!product || !product.canteenId) {
      return res.status(400).json({ message: "Invalid product or canteen not found" });
    }

    // Fetch canteen name
    const canteen = await Canteen.findById(product.canteenId).select("name").lean();
    if (!canteen) {
      return res.status(400).json({ message: "Canteen not found" });
    }

      // Fetch the user's details using userId (to get first name and last name)
    const user = await User.findById(userId).select("firstName lastName").lean();
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const username = `${user.firstName} ${user.lastName}`;

    // Calculate total amount (price per item * quantity)
    const totalAmount = price * quantity;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    // Estimate delivery time
    let estimatedTime;
    if (method === "delivery") {
      estimatedTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes for delivery
    } else {
      estimatedTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes for pickup
    }

    const order = await Order.create({
      userId,
      itemId,
      itemName,
      quantity,
      method,
      address: method === "delivery" ? address : "",
      price,
      img,
      status: "pending",
      expiresAt,
      canteenId: product.canteenId,
      totalAmount, // Store the calculated total amount
    });

    // setTimeout to update status to "placed" after 5 min
    setTimeout(async () => {
      try {
        await Order.findByIdAndUpdate(order._id, { status: "placed" });
        console.log(`Order ${order._id} status updated to placed`);
      } catch (updateErr) {
        console.error("Error updating order after timeout:", updateErr);
      }
    }, 5 * 60 * 1000);

    // Generate and stream the PDF Bill after the order is placed
    generateBillAndStream(res, order, canteen.name, totalAmount, estimatedTime,username);

  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Function to generate the PDF Bill and stream it directly to the client
const generateBillAndStream = (res, order, canteenName, totalAmount, estimatedTime,username) => {
  const doc = new PDFDocument();

  // Set headers for the response (indicating that it's a PDF file)
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="order-${order._id}-bill.pdf"`);

  // Pipe the PDF directly to the response
  doc.pipe(res);

  // Add Bill title and sub-title
  doc.fontSize(20).text("MEALMATRIX", { align: "center" });
  doc.fontSize(14).text("Smart Canteen Solution", { align: "center" });

  // Add Canteen Name
  doc.moveDown().text(`Canteen: ${canteenName}`);

  // Add Order Details
  doc.moveDown().text(`Customer Name: ${username}`);
  doc.text(`Ordered Item: ${order.itemName}`);
  doc.text(`Quantity: ${order.quantity}`);
  doc.text(`Total Price: $${totalAmount}`);
  doc.text(`Time Order Placed: ${order.createdAt.toLocaleString()}`);
  doc.text(`Estimated Time: ${estimatedTime.toLocaleString()}`);

  // Add QR Code for the Order ID
  QRCode.toDataURL(order._id.toString(), (err, qrCodeUrl) => {
    if (err) {
      console.error("QR Code generation failed", err);
      return;
    }

    // Add QR code image to PDF
    doc.image(qrCodeUrl, { fit: [100, 100], align: 'center' });
    doc.text(`Order ID: ${order._id}`, { align: "center" });

    // Finalize the document
    doc.end();
  });
};


// Get orders for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(orders);
  } catch (err) {
    console.error("Fetch orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Cancel/Delete order
router.delete("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.status !== "pending") {
      return res
        .status(400)
        .json({ error: "Only pending orders can be cancelled" });
    }

    // optional: also check expiry
    if (new Date(order.expiresAt).getTime() <= Date.now()) {
      return res
        .status(400)
        .json({ error: "Order can no longer be cancelled" });
    }

    await order.deleteOne();
    res.json({ message: "Order cancelled successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
