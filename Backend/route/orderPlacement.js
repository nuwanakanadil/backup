const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

// Create an order (status starts as "pending" for 5 mins)
router.post("/place", async (req, res) => {
  try {
    const { userId, itemId, itemName, quantity, method,address, price,img } = req.body;

    if (!userId || !itemId || !itemName || !quantity || !method) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

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

 

    return res.status(201).json(order);
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

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