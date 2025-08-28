import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/userAuth";

export default function OrderComponent() {
  useAuth();
  const router = useRouter();
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState("delivery");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  
  useEffect(() => {
    if (!id) return;
    fetch(`http://localhost:5000/api/products/${id}`)
      .then((res) => res.json())
      .then((data) => setItem(data))
      .catch(() => {
        setItem({
          id,
          name: "Premium Armchair",
          price: 120,
          image: "https://via.placeholder.com/400x300",
        });
      });
  }, [id]);

  const handleOrder = async () => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!userId) {
      alert("Please sign in to place orders.");
      router.push("/signin");
      return;
    }

    if (method === "delivery" && !deliveryAddress.trim()) {
      alert("Please enter a delivery address.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/orders/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          itemId: item.id ?? id,
          itemName: item.name,
          quantity,
          method,
          address:deliveryAddress,
          price: item.price,
          img: item.image, // optional if you want to store image URL 
          // You can also include deliveryAddress if you plan to store it.
        }),
        
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to place order");
      }

      // Reset for a new order
      setQuantity(1);
      setMethod("delivery");
      setDeliveryAddress("");

      alert("Order placed! Check your Orders page for live status and countdown.");
      // Optionally route user to /orders (or keep them here so they can place more)
       router.push("/Orders");

    } catch (e) {
      console.error(e);
      alert(e.message || "Something went wrong");
    }
  };

  if (!item)
    return <div className="text-center text-black mt-10">Loading product...</div>;

  return (
    <div className="min-h-screen bg-[#ededed] p-6 text-black">
      <div className="max-w-2xl mx-auto bg-[#6F4E37] text-white rounded-lg p-6 shadow-lg">
        <h2 className="text-3xl font-bold text-center mb-4">Order: {item.name}</h2>
        <img
          src={`http://localhost:5000/${item.image}`}
          alt={item.name}
          className="w-full h-64 object-cover rounded mb-4"
          onError={(e) => (e.currentTarget.src = item.image)} // fallback to absolute URL
        />

        {/* Quantity Controls */}
        <div className="flex items-center justify-between mb-4">
          <Typography variant="body1">Quantity:</Typography>
          <div className="flex items-center gap-2">
            <Button
              variant="contained"
              disabled={quantity === 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              sx={{ backgroundColor: "#FF4081" }}
            >
              -
            </Button>
            <span className="text-lg">{quantity}</span>
            <Button
              variant="contained"
              onClick={() => setQuantity((q) => q + 1)}
              sx={{ backgroundColor: "#FF4081" }}
            >
              +
            </Button>
          </div>
        </div>

        {/* Delivery Method */}
        <div className="mb-4">
          <Typography variant="body1" className="mb-2">Delivery Method:</Typography>
          <div className="flex gap-4">
            <Button
              variant={method === "delivery" ? "contained" : "outlined"}
              sx={{
                backgroundColor: method === "delivery" ? "#FF4081" : "transparent",
                color: "white",
                borderColor: "white",
              }}
              onClick={() => setMethod("delivery")}
            >
              Delivery
            </Button>
            <Button
              variant={method === "pickup" ? "contained" : "outlined"}
              sx={{
                backgroundColor: method === "pickup" ? "#FF4081" : "transparent",
                color: "white",
                borderColor: "white",
              }}
              onClick={() => setMethod("pickup")}
            >
              Pickup
            </Button>
          </div>
        </div>

        {/* Delivery Address */}
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

        {/* Total Amount */}
        <Typography className="mb-4 font-bold text-lg">
          Total: ${item.price * quantity}
        </Typography>

        {/* Place Order */}
        <Button
          fullWidth
          variant="contained"
          sx={{ backgroundColor: "#FF4081" }}
          onClick={handleOrder}
        >
          Place Order
        </Button>
      </div>
    </div>
  );
}