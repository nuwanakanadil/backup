"use client";
import { useEffect, useState } from "react";
import { Button, Card, CardContent, Typography } from "@mui/material";

export default function CartPage() {
  const [cart, setCart] = useState(null);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      alert("Please log in to view your cart.");
      window.location.href = "/login";
      return;
    }
    fetch(`http://localhost:5000/api/cart/${userId}`)
      .then(res => res.json())
      .then(data => setCart(data));
  }, []);

  const handleRemove = async (itemId) => {
    const userId = localStorage.getItem("userId");
    const res = await fetch(`http://localhost:5000/api/cart/remove/${itemId}`, {
      method: "DELETE",
      headers: { "userId": userId },
      credentials:"include"

    });
    const data = await res.json();
    setCart(data.cart);
  };

  if (!cart) return <div className="text-center text-white mt-10">Loading...</div>;

  return (
    <div className="p-6 bg-[#ededed] min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-black text-center">  Your Cart</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cart.items.map(item => (
          <Card key={item._id} className="shadow-lg">
            <CardContent>
              <img src={`http://localhost:5000/${item.image}`} className="h-40 w-full object-cover mb-2" />
              <Typography variant="h6">{item.name}</Typography>
              <Typography>${item.price} x {item.quantity}</Typography>
              <Button
                variant="contained"
                color="error"
                onClick={() => handleRemove(item._id)}
                className="mt-2"
              >
                Remove
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}