const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true }, // adapt to ObjectId if you use users collection
    itemId: { type: String, required: true },
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ["delivery", "pickup"], required: true },
    address:{type:String},
    status: { type: String, enum: ["pending", "placed"], default: "pending", index: true },
    expiresAt: { type: Date, required: true }, // now + 5 minutes
    price: { type: Number }, //store price per item
    img: { type: String }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);