// routes/orders.js
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const Canteen = require("../models/Canteen");
const User = require("../models/User");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

// POST /api/orders/place  — creates ONE Order doc per item (JSON only)
router.post("/place", async (req, res) => {
  try {
    const {
      userId, itemId, itemName, quantity, method, address, price, img, sessionTs,
      Paymentmethod, // <-- NEW
    } = req.body;

    // add Paymentmethod to required checks
    if (!userId || !itemId || !itemName || !quantity || !method || !Paymentmethod) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (!["Cash", "Card"].includes(Paymentmethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    // product -> canteen
    const product = await Product.findById(itemId).select("canteenId").lean();
    if (!product?.canteenId) {
      return res.status(400).json({ message: "Invalid product or canteen not found" });
    }

    // (optional) verify user exists
    const user = await User.findById(userId).select("_id").lean();
    if (!user) return res.status(400).json({ message: "User not found" });

    const totalAmount = price * quantity;

    // align window using sessionTs to keep batch consistent
    const base = sessionTs ? new Date(Number(sessionTs)) : new Date();
    const expiresAt = new Date(base.getTime() + 5 * 60 * 1000);

    const order = await Order.create({
      userId,
      itemId,
      itemName,
      quantity,
      method,
      address: method === "delivery" ? (address || "").trim() : "",
      price,
      img,
      status: "pending",
      expiresAt,
      canteenId: product.canteenId,
      totalAmount,
      sessionTs: sessionTs ? Number(sessionTs) : undefined,
      Paymentmethod, // <-- NEW save to DB
    });

    // auto-advance to placed after 5 minutes
    setTimeout(async () => {
      try {
        await Order.findByIdAndUpdate(order._id, { status: "placed" });
        console.log(`Order ${order._id} -> placed`);
      } catch (e) {
        console.error("Auto-place error:", e);
      }
    }, 5 * 60 * 1000);

    return res.status(201).json(order);
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/orders/user/:userId — list a user's orders
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

// DELETE /api/orders/:id — cancel (only pending & not expired)
router.delete("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.status !== "pending") {
      return res.status(400).json({ error: "Only pending orders can be cancelled" });
    }

    if (new Date(order.expiresAt).getTime() <= Date.now()) {
      return res.status(400).json({ error: "Order can no longer be cancelled" });
    }

    await order.deleteOne();
    res.json({ message: "Order cancelled successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/orders/session/:sessionTs — current snapshot for a batch
router.get("/session/:sessionTs", async (req, res) => {
  try {
    const sessionTs = Number(req.params.sessionTs);
    const { userId } = req.query;
    if (!userId || Number.isNaN(sessionTs)) {
      return res.status(400).json({ message: "Bad request" });
    }

    const items = await Order.find({ userId, sessionTs }).sort({ createdAt: 1 }).lean();

    const total = items.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const windowEndsAt = items.reduce(
      (max, o) => (o.expiresAt > max ? o.expiresAt : max),
      new Date(0)
    );

    // Assume payment method is same across the session; use first if present
    const Paymentmethod = items[0]?.Paymentmethod || null;
    const method = items[0]?.method || null;
    const address = items[0]?.address || null;

    res.json({
      sessionTs,
      userId,
      items,
      total,
      windowEndsAt,
      canDownload: new Date() >= new Date(windowEndsAt),
      Paymentmethod,
      method,
      address,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/orders/session/:sessionTs/bill — final combined PDF after window
router.get("/session/:sessionTs/bill", async (req, res) => {
  try {
    const sessionTs = Number(req.params.sessionTs);
    const { userId } = req.query;
    if (!userId || Number.isNaN(sessionTs)) {
      return res.status(400).json({ message: "Bad request" });
    }

    const user = await User.findById(userId).select("firstName lastName").lean();
    if (!user) return res.status(400).json({ message: "User not found" });

    const orders = await Order.find({ userId, sessionTs }).sort({ createdAt: 1 }).lean();
    if (!orders.length) return res.status(404).json({ message: "No orders for this session" });

    const windowEndsAt = orders.reduce(
      (max, o) => (o.expiresAt > max ? o.expiresAt : max),
      new Date(0)
    );
    if (new Date() < new Date(windowEndsAt)) {
      return res.status(400).json({ message: "Billing window not finished yet" });
    }

    const grandTotal = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const sessionPayment = orders[0]?.Paymentmethod || "-";
    const sessionMethod = orders[0]?.method || "-";
    const sessionAddress = orders[0]?.address || "";

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="order-batch-${sessionTs}.pdf"`
    );
    doc.pipe(res);

    doc.fontSize(20).text("MEALMATRIX", { align: "center" });
    doc.fontSize(12).text("Smart Canteen Solution", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).text(`Date: ${new Date().toLocaleString()}`);
    doc.text(`Customer: ${user.firstName || ""} ${user.lastName || ""}`.trim());
    doc.text(`Session: ${sessionTs}`);
    doc.text(`Delivery Method: ${sessionMethod}`);
    if (sessionMethod === "delivery") doc.text(`Address: ${sessionAddress}`);
    doc.text(`Payment Method: ${sessionPayment}`); // <-- NEW on bill

    doc.moveDown().fontSize(12).text("Items");
    doc.moveDown(0.25).fontSize(10);
    orders.forEach((o, i) => {
      doc.text(
        `${i + 1}. ${o.itemName} x${o.quantity} @ $${(o.price ?? 0).toFixed(2)} = $${(
          o.totalAmount || 0
        ).toFixed(2)}`
      );
    });
    doc.moveDown();
    doc.fontSize(12).text(`Total: $${grandTotal.toFixed(2)}`);

    const payload = {
      type: "BATCH",
      userId,
      sessionTs,
      orderIds: orders.map((o) => o._id),
    };
    const qrPng = await QRCode.toDataURL(JSON.stringify(payload));
    doc.moveDown().image(qrPng, { fit: [120, 120], align: "center" });

    doc.end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
