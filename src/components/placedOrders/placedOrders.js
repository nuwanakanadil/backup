import { useEffect, useState } from "react";
import { Card, CardContent, Typography, Button } from "@mui/material";

function formatRemaining(expiresAt) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "00:00";
  const secs = Math.floor(diff / 1000);
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function PlacedOrders() {
  const [orders, setOrders] = useState([]);
  const userId = localStorage.getItem("userId");

  // Fetch orders of logged in user
  useEffect(() => {
    if (!userId) return;
    fetch(`http://localhost:5000/api/orders/user/${userId}`)
      .then((r) => r.json())
      .then((data) => setOrders(data))
      .catch((e) => console.error(e));
  }, [userId]);

  // Refresh timer every second
  useEffect(() => {
    const t = setInterval(() => {
      setOrders((prev) => [...prev]); // re-render
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Cancel order
  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o._id !== id));
        alert("Order cancelled successfully!");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to cancel order");
      }
    } catch (err) {
      console.error(err);
      alert("Error cancelling order");
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] p-6 text-black">
      <div className="max-w-4xl mx-auto space-y-4">
        <Typography variant="h4" className="font-bold text-black text-center mb-8">
          YOUR ORDERS
        </Typography>

        {orders.length === 0 && (
          <Typography variant="body1" className="text-black">
            No orders yet.
          </Typography>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.map((o) => {
            const isPending = o.status === "pending";
            const remaining = isPending ? formatRemaining(o.expiresAt) : null;
            const stillCancelable =
              isPending && new Date(o.expiresAt).getTime() > Date.now();

            return (
              <Card
                key={o._id}
                className="rounded-2xl shadow overflow-hidden"
                style={{ backgroundColor: "#6F4E37", color: "white" }}
              >
                {/* Order Image */}
                {o.img && (
                  <img
                    src={`http://localhost:5000/${o.img}`}
                    alt={o.itemName}
                    className="w-full h-48 object-cover"
                  />
                )}

                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <Typography variant="h6" className="font-bold text-white">
                      {o.itemName}
                    </Typography>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        isPending
                          ? "bg-yellow-400 text-black"
                          : "bg-green-400 text-black"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>Method:</strong> {o.method}
                    </div>
                    {o.method === "delivery" && (
                      <div>
                        <strong>Delivery Address:</strong> {o.address}
                      </div>
                    )}
                    <div>
                      <strong>Quantity:</strong> {o.quantity}
                    </div>
                    <div>
                      <strong>Total:</strong> ₹{o.price * o.quantity}
                    </div>
                    <div>
                      <strong>Created:</strong>{" "}
                      {new Date(o.createdAt).toLocaleString()}
                    </div>
                    {isPending && (
                      <div className="font-semibold">
                        <strong>Time left:</strong> {remaining}
                      </div>
                    )}
                  </div>

                  {stillCancelable && (
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => handleCancel(o._id)}
                      className="mt-3"
                    >
                      Cancel Order
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
