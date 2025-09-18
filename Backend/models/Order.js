const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    itemId: { type: String, required: true },
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ["delivery", "pickup"], required: true },
    address: { type: String },
    status: { type: String, enum: ["pending", "placed"], default: "pending", index: true },
    expiresAt: { type: Date, required: true },
    price: { type: Number },
    img: { type: String },
    canteenId: { type: mongoose.Schema.Types.ObjectId, ref: "Canteen", index: true },
    totalAmount: { type: Number, required: true }, // Total amount field
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
