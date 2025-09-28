"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
} from "@mui/material";

// ---- helpers -------------------------------------------------------

function formatRemaining(expiresAt) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "00:00";
  const secs = Math.floor(diff / 1000);
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Build a map: sessionTs -> { firstOrderId, windowEndsAt }
function computeSessionMeta(orders) {
  const map = new Map();
  for (const o of orders) {
    if (!o.sessionTs) continue; // legacy single-item orders
    const key = String(o.sessionTs);
    const existing = map.get(key);
    const expires = new Date(o.expiresAt);
    if (!existing) {
      map.set(key, {
        firstOrderId: o._id,
        windowEndsAt: expires,
      });
    } else {
      if (
        new Date(o.createdAt) <
        new Date(orders.find((x) => x._id === existing.firstOrderId)?.createdAt || Infinity)
      ) {
        existing.firstOrderId = o._id;
      }
      if (expires > existing.windowEndsAt) {
        existing.windowEndsAt = expires;
      }
    }
  }
  return map;
}

function formatTimeLeft(target) {
  const ms = Math.max(0, target.getTime() - Date.now());
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

// ---- Download button (per session) ---------------------------------

function DownloadFinalBillButton({ sessionTs, userId, windowEndsAt }) {
  const [busy, setBusy] = useState(false);
  const [allowed, setAllowed] = useState(Date.now() >= new Date(windowEndsAt).getTime());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setAllowed(Date.now() >= new Date(windowEndsAt).getTime());
      setTick((x) => x + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [windowEndsAt]);

  const handleDownload = async () => {
    if (!sessionTs || !userId) return;
    setBusy(true);
    try {
      const check = await fetch(
        `http://localhost:5000/api/orders/session/${sessionTs}?userId=${encodeURIComponent(userId)}`
      );
      const info = await check.json();
      if (!check.ok) throw new Error(info?.message || "Failed to check bill status");
      if (!info.canDownload) {
        const left = formatTimeLeft(new Date(info.windowEndsAt));
        throw new Error(`Bill not ready yet. Try again in ${left}.`);
      }

      const res = await fetch(
        `http://localhost:5000/api/orders/session/${sessionTs}/bill?userId=${encodeURIComponent(userId)}`
      );
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to download bill");
      }
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `order-batch-${sessionTs}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert(e.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  const countdown = formatTimeLeft(new Date(windowEndsAt));

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="contained"
        sx={{ backgroundColor: "#FF4081" }}
        disabled={!allowed || busy}
        onClick={handleDownload}
      >
        {busy ? "Preparing…" : "Download Final Bill"}
      </Button>
      {!allowed && (
        <span className="text-sm text-gray-200">
          Bill Ready in <b>{countdown}</b>
        </span>
      )}
    </div>
  );
}

// ---- Page ----------------------------------------------------------

export default function PlacedOrders() {
  const [orders, setOrders] = useState(null); // null while loading
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  // ⭐ NEW: rating dialog state
  const [rateOpen, setRateOpen] = useState(false);
  const [ratingOrderId, setRatingOrderId] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Fetch orders of logged in user
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const r = await fetch(`http://localhost:5000/api/orders/user/${userId}`);
        const data = await r.json();
        setOrders(data || []);
      } catch (e) {
        console.error(e);
        setOrders([]);
      }
    })();
  }, [userId]);

  // Refresh timers every second (keeps per-order countdowns ticking)
  useEffect(() => {
    const t = setInterval(() => {
      setOrders((prev) => (prev ? [...prev] : prev)); // re-render
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
        setOrders((prev) => prev?.filter((o) => o._id !== id) || []);
        alert("Order cancelled successfully!");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to cancel order");
      }
    } catch (err) {
      console.error(err);
      alert("Error cancelling order");
    }
  };

  // Build session meta to know which card should show the button
  const sessionMeta = useMemo(
    () => (orders ? computeSessionMeta(orders) : new Map()),
    [orders]
  );

  if (orders === null) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] p-6 text-black flex items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

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

            // Determine if this card should show the session's Download button
            let showDownload = false;
            let sessionWindowEndsAt = null;
            if (o.sessionTs) {
              const meta = sessionMeta.get(String(o.sessionTs));
              if (meta && meta.firstOrderId === o._id) {
                showDownload = true; // only on the first order card in the session
                sessionWindowEndsAt = meta.windowEndsAt;
              }
            }

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
                    onError={(e) => (e.currentTarget.src = o.img)}
                  />
                )}

                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <Typography variant="h6" className="font-bold text-white">
                      {o.itemName}
                    </Typography>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        isPending ? "bg-yellow-400 text-black" : "bg-green-400 text-black"
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
                      <strong>Payment Method:</strong> {o.Paymentmethod || "-"}
                    </div>
                    <div>
                      <strong>Quantity:</strong> {o.quantity}
                    </div>
                    <div>
                      <strong>Total:</strong> ₹{(o.price ?? 0) * (o.quantity ?? 0)}
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

                  {/* Actions row */}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    {stillCancelable ? (
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() => handleCancel(o._id)}
                      >
                        Cancel Order
                      </Button>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center gap-2">
                      {/* ⭐ Rate button — only for delivered delivery orders */}
                      {o.method === "delivery" && o.status === "delivered" && (
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setRatingOrderId(o._id);
                            setRatingValue(0);
                            setRateOpen(true);
                          }}
                      sx={{
                        color: "#FF4081",
                        borderColor: "#FF4081",
                        "&:hover": {
                          color: "#e91e63",
                          borderColor: "#e91e63",
                          backgroundColor: "transparent",
                        },
                      }}
                        >
                          Rate delivery person
                        </Button>
                      )}

                      {/* Download Final Bill — show only once per session */}
                      {showDownload && userId && sessionWindowEndsAt && (
                        <DownloadFinalBillButton
                          sessionTs={o.sessionTs}
                          userId={userId}
                          windowEndsAt={sessionWindowEndsAt}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ⭐ Rating dialog */}
      <Dialog
        open={rateOpen}
        onClose={() => !ratingSubmitting && setRateOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Rate your delivery</DialogTitle>
        <DialogContent dividers>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              paddingTop: 8,
              paddingBottom: 4,
            }}
          >
            <Rating
              value={ratingValue}
              precision={0.5}
              onChange={(_, v) => setRatingValue(v ?? 0)}
            />
            <span>{ratingValue || 0}/5</span>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRateOpen(false)} disabled={ratingSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            sx={{ textTransform: "none", backgroundColor: "#FF4081" }}
            disabled={ratingSubmitting || ratingValue <= 0}
            onClick={async () => {
              try {
                if (!ratingOrderId) return;
                setRatingSubmitting(true);
                const res = await fetch(
                  `http://localhost:5000/api/orders/${ratingOrderId}/rate-delivery`,
                  {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ rating: ratingValue }),
                  }
                );
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to submit rating");
                alert("Thanks! Your rating was submitted.");
                setRateOpen(false);
              } catch (e) {
                alert(e.message || "Network error");
              } finally {
                setRatingSubmitting(false);
              }
            }}
          >
            {ratingSubmitting ? "Submitting…" : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
