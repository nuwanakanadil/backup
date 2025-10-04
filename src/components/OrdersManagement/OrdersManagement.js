'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table, TableHead, TableRow, TableCell, TableBody,
  Chip,
  Button,
  CircularProgress,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Menu,
  MenuItem,
} from '@mui/material';

const TABS = [
  { key: 'placed', label: 'Placed orders' },
  { key: 'cooking', label: 'Cooking orders' },
  { key: 'ready', label: 'Ready orders' },
  { key: 'out_for_delivery', label: 'Out for delivery' },
  { key: 'finished', label: 'Finished orders' },
];

export default function ManageOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);  // session rows for current tab
  const [error, setError] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [activeTab, setActiveTab] = useState('placed');

  // menu state for "Update status" (in Placed)
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuSessionTs, setMenuSessionTs] = useState(null);

  const fmt = (d) => new Date(d).toLocaleString();

  const fetchSessions = async (statusKey = activeTab) => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/canteen/order-sessions?status=${statusKey}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load order sessions');
      setRows(data.sessions || []);
      setError('');
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ----- Actions -----

  // Assign delivery (ready -> out_for_delivery)
  const handleAssignDeliveryForSession = async (sessionTs) => {
    try {
      const res = await fetch(`http://localhost:5000/api/canteen/order-sessions/${sessionTs}/assign-delivery`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to assign');
      alert(data.message);
      fetchSessions(activeTab);
    } catch (e) {
      alert(e.message || 'Network error');
    }
  };

  // Update status for the whole session (optionally just pickup/delivery via method)
  const updateStatus = async (sessionTs, toStatus, method) => {
    try {
      const res = await fetch(`http://localhost:5000/api/canteen/order-sessions/${sessionTs}/update-status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus, method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update status');
      alert(`${data.message}. Modified: ${data.modified ?? data.modifiedCount ?? 'N/A'}`);
      fetchSessions(activeTab);
    } catch (e) {
      alert(e.message || 'Network error');
    }
  };

  // ----- UI helpers -----

  const openDetails = (sessionObj) => {
    setSelectedSession(sessionObj);
    setDetailsOpen(true);
  };
  const closeDetails = () => {
    setDetailsOpen(false);
    setSelectedSession(null);
  };

  const placedHeaderExtra = useMemo(() => (
    <Stack direction="row" spacing={1}>
      <Chip label={`Sessions: ${rows.length}`} color="primary" />
      <Button variant="outlined" size="small" onClick={() => fetchSessions(activeTab)} sx={{ textTransform: 'none' }}>
        Refresh
      </Button>
    </Stack>
  ), [rows.length, activeTab]);

  // ----- Render -----

  return (
    <Box className="min-h-screen bg-gray-50 p-4 md:p-6">
      <Card className="shadow-lg">
        <CardContent>

          {/* Top controls: tabs as buttons */}
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
            {TABS.map(t => (
              <Button
                key={t.key}
                variant={activeTab === t.key ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setActiveTab(t.key)}
                sx={{ textTransform: 'none' }}
              >
                {t.label}
              </Button>
            ))}
          </Stack>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <Typography variant="h5" fontWeight={600}>
                {TABS.find(t => t.key === activeTab)?.label || 'Manage Order Sessions'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Grouped by <strong>sessionTs</strong>. Showing <strong>{activeTab}</strong>.
              </Typography>
            </div>
            {placedHeaderExtra}
          </div>

          <Box mt={3}>
            {loading ? (
              <div className="flex items-center gap-2">
                <CircularProgress size={22} />
                <Typography>Loading sessions…</Typography>
              </div>
            ) : error ? (
              <Typography color="error">{error}</Typography>
            ) : rows.length === 0 ? (
              <Typography color="text.secondary">No sessions in this status.</Typography>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Session</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Items</TableCell>
                    <TableCell align="right">Total (Rs.)</TableCell>
                    <TableCell>Methods</TableCell>
                    <TableCell>Ordered Window</TableCell>

                    {/* Column differs by tab */}
                    {activeTab === 'out_for_delivery' ? (
                      <TableCell>Delivery person(s)</TableCell>
                    ) : activeTab === 'finished' ? null : (
                      <TableCell>Delivery</TableCell>
                    )}

                    <TableCell>Details</TableCell>

                    {/* Action column varies by tab; finished has no action column */}
                    {activeTab === 'finished' ? null : (
                      <TableCell align="center">Action</TableCell>
                    )}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((r) => {
                    const itemsPreview = r.items?.slice(0, 2) || [];
                    const extra = Math.max((r.items?.length || 0) - itemsPreview.length, 0);

                    const hasDeliveryReady = (r.items || []).some(it => it.method === 'delivery' && it.status === 'ready');
                    const hasPickupReady   = (r.items || []).some(it => it.method === 'pickup'   && it.status === 'ready');

                    return (
                      <TableRow key={r.sessionTs} hover>
                        <TableCell>
                          <Chip size="small" label={r.sessionTs} />
                        </TableCell>

                        <TableCell>{r.customerName || '—'}</TableCell>

                        <TableCell sx={{ maxWidth: 360 }}>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            {itemsPreview.map(it => (
                              <Chip key={it.orderId} size="small" label={`${it.itemName} ×${it.quantity}`} />
                            ))}
                            {extra > 0 && (
                              <Tooltip
                                title={(r.items || []).map(it => `${it.itemName} ×${it.quantity}`).join(', ')}
                              >
                                <Chip size="small" label={`+${extra} more`} />
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>

                        <TableCell align="right">
                          {Number(r.totalAmount).toLocaleString('en-LK')}
                        </TableCell>

                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            {(r.methods || []).map(m => (
                              <Chip key={m} size="small" label={m} />
                            ))}
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2">
                            {fmt(r.createdAtMin)} → {fmt(r.createdAtMax)}
                          </Typography>
                        </TableCell>

                        {/* Delivery/Assigned column OR Delivery person(s) OR nothing (finished) */}
                        {activeTab === 'out_for_delivery' ? (
                          <TableCell>
                            {(r.deliveryPersons || []).length
                              ? (r.deliveryPersons || []).join(', ')
                              : '—'}
                          </TableCell>
                        ) : activeTab === 'finished' ? null : (
                          <TableCell>
                            {r.assignment?.deliveryPersonName ? (
                              <Chip color="success" size="small" label={`Assigned: ${r.assignment.deliveryPersonName}`} />
                            ) : (
                              <Chip size="small" label="Not assigned" />
                            )}
                          </TableCell>
                        )}

                        <TableCell>
                          <Button
                            variant="text"
                            size="small"
                            onClick={() => openDetails(r)}
                            sx={{ textTransform: 'none' }}
                          >
                            View details
                          </Button>
                        </TableCell>

                        {/* Action buttons per tab */}
                        {activeTab === 'finished' ? null : (
                          <TableCell align="center">
                            {/* PLACED: Update status (menu with Cooking/Ready) */}
                            {activeTab === 'placed' && (
                              <>
                                <Button
                                  variant="contained"
                                  size="small"
                                  sx={{ textTransform: 'none' }}
                                  onClick={(e) => { setAnchorEl(e.currentTarget); setMenuSessionTs(r.sessionTs); }}
                                >
                                  Update status
                                </Button>
                                <Menu
                                  anchorEl={anchorEl}
                                  open={Boolean(anchorEl) && menuSessionTs === r.sessionTs}
                                  onClose={() => { setAnchorEl(null); setMenuSessionTs(null); }}
                                >
                                  <MenuItem
                                    onClick={() => {
                                      updateStatus(r.sessionTs, 'cooking');
                                      setAnchorEl(null);
                                      setMenuSessionTs(null);
                                    }}
                                  >
                                    Cooking
                                  </MenuItem>
                                  <MenuItem
                                    onClick={() => {
                                      updateStatus(r.sessionTs, 'ready');
                                      setAnchorEl(null);
                                      setMenuSessionTs(null);
                                    }}
                                  >
                                    Ready
                                  </MenuItem>
                                </Menu>
                              </>
                            )}

                            {/* COOKING: single button to Ready */}
                            {activeTab === 'cooking' && (
                              <Button
                                variant="contained"
                                size="small"
                                sx={{ textTransform: 'none' }}
                                onClick={() => updateStatus(r.sessionTs, 'ready')}
                              >
                                Update status to Ready
                              </Button>
                            )}

                            {/* READY: assign delivery for delivery items; picked for pickup items */}
                            {activeTab === 'ready' && (
                              <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                                {hasDeliveryReady && (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    sx={{ textTransform: 'none' }}
                                    onClick={() => handleAssignDeliveryForSession(r.sessionTs)}
                                  >
                                    Assign delivery person
                                  </Button>
                                )}
                                {hasPickupReady && (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    sx={{ textTransform: 'none' }}
                                    onClick={() => updateStatus(r.sessionTs, 'picked', 'pickup')}
                                  >
                                    Update status to Picked
                                  </Button>
                                )}
                              </Stack>
                            )}

                            {/* OUT_FOR_DELIVERY: no action (requirements say just show delivery person(s)) */}
                            {activeTab === 'out_for_delivery' && (
                              <Typography variant="body2" color="text.secondary">—</Typography>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={closeDetails} maxWidth="md" fullWidth>
        <DialogTitle>
          Session {selectedSession?.sessionTs} — {selectedSession?.customerName || 'Customer'}
        </DialogTitle>
        <DialogContent dividers>
          {selectedSession && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Window: {fmt(selectedSession.createdAtMin)} → {fmt(selectedSession.createdAtMax)}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                {(selectedSession.methods || []).map(m => (
                  <Chip key={m} size="small" label={m} />
                ))}
                {selectedSession.assignment?.deliveryPersonName && (
                  <Chip color="success" size="small" label={`Assigned to ${selectedSession.assignment.deliveryPersonName}`} />
                )}
              </Stack>

              <Divider sx={{ mb: 2 }} />

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Payment</TableCell>
                    <TableCell>Address</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Ordered At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(selectedSession.items || []).map((it) => (
                    <TableRow key={it.orderId}>
                      <TableCell>{String(it.orderId).slice(0, 6)}…{String(it.orderId).slice(-4)}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {it.img && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`http://localhost:5000/${it.img}`}
                              alt=""
                              width={34}
                              height={34}
                              style={{ borderRadius: 6, objectFit: 'cover' }}
                            />
                          )}
                          <span>{it.itemName}</span>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{it.quantity}</TableCell>
                      <TableCell><Chip size="small" label={it.method} /></TableCell>
                      <TableCell><Chip size="small" label={it.status} /></TableCell>
                      <TableCell>{it.Paymentmethod || '—'}</TableCell>
                      <TableCell style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {it.address || '—'}
                      </TableCell>
                      <TableCell align="right">
                        {it.price != null ? Number(it.price).toLocaleString('en-LK') : '—'}
                      </TableCell>
                      <TableCell align="right">
                        {Number(it.totalAmount).toLocaleString('en-LK')}
                      </TableCell>
                      <TableCell>{new Date(it.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Divider sx={{ my: 2 }} />

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Items: <strong>{selectedSession.itemCount}</strong></Typography>
                <Typography variant="subtitle1">
                  Session Total: <strong>Rs. {Number(selectedSession.totalAmount).toLocaleString('en-LK')}</strong>
                </Typography>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetails} sx={{ textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
