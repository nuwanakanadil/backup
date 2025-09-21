
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/userAuth";
import { getDraftItems, saveDraftItems, removeFromDraft, clearDraft } from "@/utils/orderDraft";

export default function OrderPage() {
  useAuth();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [method, setMethod] = useState("delivery");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  useEffect(() => {
    const uid = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    const draft = getDraftItems(uid);
    setItems(draft || []);
  }, []);

  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.price * (it.quantity || 1), 0),
    [items]
  );

  const updateQty = (id, delta) => {
    const next = items.map((it) =>
      it._id === id ? { ...it, quantity: Math.max(1, (it.quantity || 1) + delta) } : it
    );
    setItems(next);
    const uid = localStorage.getItem("userId");
    saveDraftItems(next, uid);
  };

  const handleRemove = (id) => {
    const uid = localStorage.getItem("userId");
    const next = items.filter((it) => it._id !== id);
    setItems(next);
    removeFromDraft(id, uid);
  };

  const handleOrderMore = () => router.push("/");

  const handlePlaceOrder = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) { alert("Please sign in."); router.push("/signin"); return; }
    if (!items.length) { alert("Add at least one item."); return; }
    if (method === "delivery" && !deliveryAddress.trim()) { alert("Enter a delivery address."); return; }

    try {
      const sessionTs = Date.now(); // shared batch anchor
      for (const it of items) {
        const res = await fetch("http://localhost:5000/api/orders/place", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            itemId: it._id,
            itemName: it.name,
            quantity: it.quantity,
            method,
            address: method === "delivery" ? deliveryAddress : "",
            price: it.price,
            img: it.image,
            sessionTs,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || `Failed to place ${it.name}`);
        }
        await res.json(); // created order (not used here)
      }

      clearDraft(userId);
      localStorage.setItem("lastSessionTs", String(sessionTs));
      alert("Order placed! Your final bill will be ready after the 5-minute window.");
      router.push("/Orders"); // or a dedicated confirmation page
    } catch (e) {
      console.error(e);
      alert(e.message || "Something went wrong");
    }
  };

  if (!items.length) {
    return (
      <div className="min-h-screen bg-[#ededed] p-6 text-black text-center">
        <p className="mb-4">No items in your order yet.</p>
        <Button
          variant="contained"
          sx={{ backgroundColor: "#FF4081" }}
          onClick={() => router.push("/")}
        >
          Add Foods
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ededed] p-6 text-black">
      <div className="max-w-3xl mx-auto bg-[#6F4E37] text-white rounded-lg p-6 shadow-lg">
        <h2 className="text-3xl font-bold text-center mb-4">Your Order</h2>

        <div className="space-y-4 mb-6">
          {items.map((it) => (
            <div key={it._id} className="flex items-center gap-4 bg-white text-black rounded p-3">
              <img
                src={`http://localhost:5000/${it.image}`}
                onError={(e) => (e.currentTarget.src = it.image)}
                alt={it.name}
                className="w-20 h-20 object-cover rounded"
              />
              <div className="flex-1">
                <div className="font-bold">{it.name}</div>
                <div className="text-sm text-gray-600">${it.price}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="contained"
                  disabled={(it.quantity || 1) <= 1}
                  onClick={() => updateQty(it._id, -1)}
                  sx={{ backgroundColor: "#FF4081" }}
                >
                  -
                </Button>
                <span className="text-lg">{it.quantity || 1}</span>
                <Button
                  variant="contained"
                  onClick={() => updateQty(it._id, +1)}
                  sx={{ backgroundColor: "#FF4081" }}
                >
                  +
                </Button>
              </div>
              <div className="w-24 text-right font-semibold">
                ${(it.price * (it.quantity || 1)).toFixed(2)}
              </div>
              <Button variant="text" color="error" onClick={() => handleRemove(it._id)}>
                Remove
              </Button>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mb-6">
          <Button variant="outlined" sx={{ color: "white", borderColor: "white" }} onClick={handleOrderMore}>
            Order more foods
          </Button>
          <Typography className="font-bold text-lg">Total: ${total.toFixed(2)}</Typography>
        </div>

        <div className="mb-4">
          <Typography variant="body1" className="mb-2">Delivery Method:</Typography>
          <div className="flex gap-4">
            <Button
              variant={method === "delivery" ? "contained" : "outlined"}
              sx={{ backgroundColor: method === "delivery" ? "#FF4081" : "transparent", color: "white", borderColor: "white" }}
              onClick={() => setMethod("delivery")}
            >
              Delivery
            </Button>
            <Button
              variant={method === "pickup" ? "contained" : "outlined"}
              sx={{ backgroundColor: method === "pickup" ? "#FF4081" : "transparent", color: "white", borderColor: "white" }}
              onClick={() => setMethod("pickup")}
            >
              Pickup
            </Button>
          </div>
        </div>

        {method === "delivery" && (
          <TextField
            multiline
            rows={3}
            label="Delivery Address"
            fullWidth
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            className="bg-white rounded mb-4"
            InputProps={{ style: { color: "black" } }}
          />
        )}

        <Button fullWidth variant="contained" sx={{ backgroundColor: "#FF4081" }} onClick={handlePlaceOrder}>
          Place Order
        </Button>
      </div>
    </div>
  );
}
