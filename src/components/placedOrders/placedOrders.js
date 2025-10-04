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
  Divider,
  Chip,
  Stack,
} from "@mui/material";

/* ---------------------------------------------------
   helpers (kept; + status color + currency tweaks)
--------------------------------------------------- */

function formatRemaining(expiresAt) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "00:00";
  const secs = Math.floor(diff / 1000);
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatTimeLeft(target) {
  const ms = Math.max(0, target.getTime() - Date.now());
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/** Group orders into sessions. */
function groupBySession(orders) {
  const map = new Map();
  for (const o of orders) {
    const key = o.sessionTs ? String(o.sessionTs) : `single:${o._id}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        sessionTs: o.sessionTs || null,
        items: [],
        windowEndsAt: new Date(o.expiresAt || 0),
        createdAtMin: new Date(o.createdAt),
        createdAtMax: new Date(o.createdAt),
        totalAmount: 0,
        methods: new Set(),
        method: o.method || null,
        address: o.address || null,
        Paymentmethod: o.Paymentmethod || null,
        userId: o.userId,
      });
    }
    const g = map.get(key);
    g.items.push(o);
    const exp = new Date(o.expiresAt || 0);
    if (exp > g.windowEndsAt) g.windowEndsAt = exp;
    const c = new Date(o.createdAt);
    if (c < g.createdAtMin) g.createdAtMin = c;
    if (c > g.createdAtMax) g.createdAtMax = c;
    g.totalAmount += Number(o.totalAmount || (o.price || 0) * (o.quantity || 0));
    if (o.method) g.methods.add(o.method);
  }
  return Array.from(map.values()).sort(
    (a, b) => b.createdAtMax.getTime() - a.createdAtMax.getTime()
  );
}

/** Status color mapping */
const STATUS_COLORS = {
  pending:           { bg: "#FFD54F", text: "#1a1a1a" }, // amber 300
  placed:            { bg: "#81C784", text: "#0b3d0b" }, // green 300
  cooking:           { bg: "#FFB74D", text: "#1a1a1a" }, // orange 300
  ready:             { bg: "#64B5F6", text: "#0b355c" }, // blue 300
  out_for_delivery:  { bg: "#BA68C8", text: "#23003a" }, // purple 300
  delivered:         { bg: "#66BB6A", text: "#0b3d0b" }, // green 400
  picked:            { bg: "#4DB6AC", text: "#003d3b" }, // teal 300
  cancelled:         { bg: "#EF9A9A", text: "#3d0000" }, // red 300
  default:           { bg: "rgba(255,255,255,0.18)", text: "#ffffff" },
};

function prettyStatus(s) {
  if (!s) return "";
  return s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function statusChipSx(status) {
  const key = (status || "default");
  const { bg, text } = STATUS_COLORS[key] || STATUS_COLORS.default;
  return {
    bgcolor: bg,
    color: text,
    fontWeight: 600,
  };
}

/* ---------------------------------------------------
   Download button (per session)
--------------------------------------------------- */

function DownloadFinalBillButton({ sessionTs, userId, windowEndsAt }) {
  const [busy, setBusy] = useState(false);
  const [allowed, setAllowed] = useState(Date.now() >= new Date(windowEndsAt).getTime());

  useEffect(() => {
    const t = setInterval(() => {
      setAllowed(Date.now() >= new Date(windowEndsAt).getTime());
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

/* ---------------------------------------------------
   Page
--------------------------------------------------- */

export default function PlacedOrders() {
  const [orders, setOrders] = useState(null);
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  // rating dialog state (kept)
  const [rateOpen, setRateOpen] = useState(false);
  const [ratingOrderId, setRatingOrderId] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // fetch orders (kept)
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

  // re-render each second for countdowns (kept)
  useEffect(() => {
    const t = setInterval(() => {
      setOrders((prev) => (prev ? [...prev] : prev));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // cancel (kept)
  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${id}`, { method: "DELETE" });
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

  // sessions
  const sessions = useMemo(() => (orders ? groupBySession(orders) : []), [orders]);

  if (orders === null) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] p-6 text-black flex items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] p-6 text-black">
      <div className="max-w-5xl mx-auto space-y-4">
        <h1 className="mt-3 text-3xl md:text-5xl font-extrabold leading-tight text-center mx-auto w-fit">
          <span className="bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 bg-clip-text text-transparent">
            Your Orders
          </span>
        </h1>

        {sessions.length === 0 && (
          <Typography variant="body1" className="text-black">
            No orders yet.
          </Typography>
        )}

        {/* One card per session */}
        <div className="grid grid-cols-1 gap-4">
          {sessions.map((sess) => {
            const isSession = !!sess.sessionTs;
            const showBillBtn = isSession && userId && sess.windowEndsAt;
            const methods = Array.from(sess.methods || []);

            return (
              <Card
                key={sess.key}
                className="rounded-2xl shadow overflow-hidden"
                style={{ backgroundColor: "#6F4E37", color: "white" }}
              >
                <CardContent>
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <Typography variant="h6" className="font-bold text-white">
                        {isSession ? `Order #${sess.sessionTs}` : "Single Order"}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        {methods.map((m) => (
                          <Chip key={m} size="small" label={m} />
                        ))}
                      </Stack>
                    </div>

                    <div className="text-sm opacity-90">
                      {new Date(sess.createdAtMin).toLocaleString()} →{" "}
                      {new Date(sess.createdAtMax).toLocaleString()}
                    </div>
                  </div>

                  {/* Items list */}
                  <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.25)" }} />

                  <div className="space-y-2">
                    {sess.items.map((o) => {
                      const isPending = o.status === "pending";
                      const stillCancelable =
                        isPending && new Date(o.expiresAt).getTime() > Date.now();
                      const remaining = isPending ? formatRemaining(o.expiresAt) : null;

                      return (
                        <div
                          key={o._id}
                          className="flex items-start justify-between gap-3 p-2 rounded-lg"
                          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                        >
                          {/* Left: image + title + meta */}
                          <div className="flex items-start gap-3">
                            {o.img && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`http://localhost:5000/${o.img}`}
                                alt={o.itemName}
                                className="w-20 h-20 object-cover rounded-lg"
                                onError={(e) => (e.currentTarget.src = o.img)}
                              />
                            )}

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Typography variant="subtitle1" className="font-bold text-white">
                                  {o.itemName}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={prettyStatus(o.status)}
                                  sx={statusChipSx(o.status)}
                                />
                              </div>
                              <div className="text-sm opacity-90">
                                <b>Qty:</b> {o.quantity} &nbsp;•&nbsp; <b>Method:</b> {o.method}
                                {o.method === "delivery" && o.address ? (
                                  <>
                                    &nbsp;•&nbsp; <b>Address:</b> {o.address}
                                  </>
                                ) : null}
                              </div>
                              <div className="text-sm opacity-90">
                                <b>Payment:</b> {o.Paymentmethod || "-"} &nbsp;•&nbsp; <b>Created:</b>{" "}
                                {new Date(o.createdAt).toLocaleString()}
                              </div>
                              <div className="text-sm">
                                <b>Total:</b>{" "}
                                {/* Rs. formatting (en-LK) */}
                                Rs.{" "}
                                {((o.price ?? 0) * (o.quantity ?? 0)).toLocaleString("en-LK")}
                              </div>
                              {isPending && (
                                <div className="text-sm font-semibold">
                                  <b>Time left:</b> {remaining}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: per-item actions (kept) */}
                          <div className="flex flex-col items-end gap-2">
                            {stillCancelable ? (
                              <Button variant="contained" color="error" onClick={() => handleCancel(o._id)}>
                                Cancel
                              </Button>
                            ) : (
                              <div />
                            )}

                            {/* Rate button — delivered + delivery */}
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
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer (totals + bill) */}
                  <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.25)" }} />

                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <Typography variant="subtitle1" className="font-bold">
                      {/* Rs. formatting (en-LK) */}
                      Order Total:{" "}
                      <strong>
                        Rs. {Number(sess.totalAmount).toLocaleString("en-LK")}
                      </strong>
                    </Typography>

                    {sess.sessionTs && (
                      <DownloadFinalBillButton
                        sessionTs={sess.sessionTs}
                        userId={sess.userId}
                        windowEndsAt={sess.windowEndsAt}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Rating dialog (kept) */}
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
