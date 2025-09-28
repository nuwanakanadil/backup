'use client';

import { useEffect, useState } from 'react';
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
} from '@mui/material';

export default function ManageOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/canteen/orders?status=placed', {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load orders');
      setRows(data.orders || []);
      setError('');
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAssign = async (orderId) => {
    try {
      // POST with no body — server picks a delivery person
      const res = await fetch(`http://localhost:5000/api/canteen/orders/${orderId}/assign-delivery`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to assign');

      const assigned = data.assigned || {};
      // Update the row to reflect the assignment
      setRows(prev =>
        prev.map(r =>
          r._id === orderId
            ? {
                ...r,
                assignment: {
                  deliveryPersonId: assigned.deliveryPersonId,
                  deliveryPersonName: assigned.deliveryPersonName,
                  deliveryPersonRating: assigned.rating ?? r.assignment?.deliveryPersonRating,
                  assignedAt: assigned.assignedAt,
                  deliveredAt: r.assignment?.deliveredAt || null,
                },
              }
            : r
        )
      );

      // Notify user
      alert(`Assigned to: ${assigned.deliveryPersonName || 'Unknown'}`);
    } catch (e) {
      alert(e.message || 'Network error');
    }
  };

  return (
    <Box className="min-h-screen bg-gray-50 p-4 md:p-6">
      <Card className="shadow-lg">
        <CardContent>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <Typography variant="h5" fontWeight={600}>Manage Orders</Typography>
              <Typography variant="body2" color="text.secondary">
                Showing all <strong>placed</strong> orders in your canteen.
              </Typography>
            </div>
            <Stack direction="row" spacing={1}>
              <Chip label={`Total: ${rows.length}`} color="primary" />
              <Button
                variant="outlined"
                size="small"
                onClick={fetchOrders}
                sx={{ textTransform: 'none' }}
              >
                Refresh
              </Button>
            </Stack>
          </div>

          <Box mt={3}>
            {loading ? (
              <div className="flex items-center gap-2">
                <CircularProgress size={22} />
                <Typography>Loading orders…</Typography>
              </div>
            ) : error ? (
              <Typography color="error">{error}</Typography>
            ) : rows.length === 0 ? (
              <Typography color="text.secondary">No placed orders right now.</Typography>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell align="right">Total (Rs.)</TableCell>
                    <TableCell>Ordered At</TableCell>
                    <TableCell>Delivery</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => {
                    const canAssign = r.method === 'delivery';
                    const alreadyAssigned = !!r.assignment?.deliveryPersonName; // <-- updated
                    return (
                      <TableRow key={r._id} hover>
                        <TableCell>{r._id.slice(0, 6)}…{r._id.slice(-4)}</TableCell>
                        <TableCell>{r.customerName || '—'}</TableCell>
                        <TableCell>{r.itemName}</TableCell>
                        <TableCell align="right">{r.quantity}</TableCell>
                        <TableCell><Chip size="small" label={r.method} /></TableCell>
                        <TableCell align="right">{Number(r.totalAmount).toLocaleString('en-LK')}</TableCell>
                        <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          {alreadyAssigned ? (
                            <Chip
                              color="success"
                              size="small"
                              label={`Assigned: ${r.assignment?.deliveryPersonName}`}
                            />
                          ) : (
                            <Chip size="small" label="Not assigned" />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            variant="contained"
                            size="small"
                            sx={{ textTransform: 'none', backgroundColor: '#FF4081' }}
                            disabled={!canAssign || alreadyAssigned}
                            onClick={() => handleAssign(r._id)}
                          >
                            Assign Delivery person
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
