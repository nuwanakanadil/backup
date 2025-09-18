'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Badge,
  Typography,
  Avatar,
  Button,
  Divider,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material'; // ✅ add this
import { useRouter } from 'next/navigation';

export default function ProfileComponent() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // NEW: conversations state
  const [conversations, setConversations] = useState([]);

  const [selectedFile, setSelectedFile] = useState(null);

  // delete-account dialog state
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openPassword, setOpenPassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/auth/profile', {
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          router.push('/signin');
          alert('Please log in to view your profile.');
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // NEW: fetch conversations for this customer
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/chat/my-conversations', {
          credentials: 'include',
        });
        const data = await res.json();
        if (res.ok) {
          setConversations(data.conversations || []);
        } else {
          console.warn(data.message || 'Failed to load conversations');
        }
      } catch (e) {
        console.error('Conversations fetch error:', e);
      }
    };

    fetchConversations();
  }, []);

  const handleChatClick = async (conversationId) => {
    try {
      // mark as read on backend
      await fetch(`http://localhost:5000/api/chat/conversations/${conversationId}/read`, {
        method: 'POST',
        credentials: 'include',
      });

      setConversations(prev =>
        prev.map(c => c._id === conversationId ? { ...c, unreadCount: 0 } : c)
      );

      // go to the chat room
      router.push(`/chat/${conversationId}`);
    } catch (e) {
      console.error('mark read error:', e);
      // still navigate; backend will get fixed next time
      router.push(`/chat/${conversationId}`);
    }
  };

  const handleUpdate = async () => { 
    if (!user.firstName || !user.lastName || !user.email || !user.phone) {
      alert('First name, last name, email, and phone are required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
    const phoneRegex = /^\d{10}$/;

    if (!emailRegex.test(user.email)){
      alert('Invalid email format');
      return;
    }
    if (!phoneRegex.test(user.phone)) { 
      alert('Phone must be exactly 10 digits');
      return;
    }

    try { 
      const res = await fetch('http://localhost:5000/api/update-profile', {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        credentials: 'include',
        body: JSON.stringify({ 
          firstName: user.firstName, 
          lastName: user.lastName, 
          email: user.email, 
          phone: user.phone, 
          universityId: user.universityId 
        })
      });
      const data = await res.json();

      if (res.ok) {
        alert('Profile updated successfully');
        setUser(data.updatedUser);
      } else {
        alert(data.message || 'Update failed');
      }
    } catch (err) { 
      console.error('Update error:', err); 
      alert('Something went wrong'); 
    }
  };


  const handleLogout = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        localStorage.removeItem('email');
        localStorage.clear();
        alert('Logged out successfully');
        router.refresh();
        router.push('/signin');
      } else {
        const data = await res.json();
        alert(data.message || 'Logout failed');
      }
    } catch (err) {
      console.error('Logout error:', err);
      alert('Something went wrong');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select an image');
      return;
    }

    const formData = new FormData();
    formData.append('profilePic', selectedFile);
    formData.append('userId', user._id);

    try {
      const res = await fetch('http://localhost:5000/api/upload-profile-pic', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await res.json();

      if (res.ok) {
        alert('Profile picture updated');
        setUser((prev) => ({ ...prev, profilePic: data.profilePic }));
        setSelectedFile(null);
      } else {
        alert(data.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Something went wrong');
    }
  };

  const redirectToOrders = () => {
    router.push('/Orders');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-dashed rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="text-center mt-10 text-red-500">User data could not be loaded.</div>;
  }

  const handleDelete = () => {
    setOpenConfirm(true);
  };

  // Deleet account : Confirm → proceed to password dialog
  const confirmDeletion = () => {
    setOpenConfirm(false);
    setOpenPassword(true);
  };

  // Delet account: Submit password → call backend
  const submitDeletion = async () => {
    if (!deletePassword) {
      alert('Please enter your password to confirm deletion.');
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch('http://localhost:5000/api/auth/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Account deletion failed.');
        return;
      }

      // Clear local client session info
      localStorage.removeItem('email');
      localStorage.clear();

      alert('Your account has been deleted.');
      setOpenPassword(false);

      // Redirect to signup page
      router.push('/signup');
    } catch (err) {
      console.error('Delete error:', err);
      alert('Something went wrong deleting your account.');
    } finally {
      setDeleting(false);
      setDeletePassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex flex-col lg:flex-row gap-6">
      {/* Account Details */}
      <Card className="w-full lg:w-1/2 shadow-lg" sx={{ backgroundColor: '#6F4E37', color: 'white' }}>
        <CardContent className="p-6 sm:p-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Avatar
                alt={`${user.firstName} ${user.lastName}`}
                src={user.profilePic ? `http://localhost:5000/${user.profilePic}` : ''}
                sx={{ width: 80, height: 80 }}
              />
              <div>
                <Typography variant="h5" className="font-semibold text-white">{user.firstName} {user.lastName}</Typography>
                <Typography variant="body2" className="text-white text-opacity-70">@{user.email}</Typography>
              </div>
            </div>
            
            <Button
              variant="outlined"
              onClick={handleDelete}
              sx={{
                color: 'white',
                borderColor: 'white',
                '&:hover': {
                  borderColor: '#FF4081',
                  color: '#FF4081',
                },
              }}
            >
              Delete Account
            </Button>
          </div>

          {/* Upload Image Form */}
          <form onSubmit={handleUpload} encType="multipart/form-data" className="mt-4 mb-6">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              className="text-white"
            />
            <Button type="submit" variant="contained" sx={{ mt: 2, backgroundColor: '#FF4081' }}>
              Upload Profile Image
            </Button>
          </form>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mb: 4 }} />

          <form
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdate();
            }}
          >
            {['firstName', 'lastName', 'email', 'phone', 'universityId'].map((field) => (
              <TextField
                key={field}
                label={field.replace(/([A-Z])/g, ' $1')}
                fullWidth
                value={user[field]}
                onChange={(e) => setUser({ ...user, [field]: e.target.value })}
                InputLabelProps={{ style: { color: 'white' } }}
                InputProps={{ style: { color: 'white' } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'white' },
                    '&:hover fieldset': { borderColor: '#FF4081' },
                  },
                }}
              />
            ))}
          </form>

          <div className="flex justify-end mt-6 space-x-5">
            <Button variant="contained" onClick={handleUpdate} sx={{
              backgroundColor: '#FF4081',
              color: 'white',
              '&:hover': { backgroundColor: '#e91e63' },
            }}>
              Update Details
            </Button>

            <Button variant="contained" onClick={handleLogout} sx={{
              backgroundColor: '#FF4081',
              color: 'white',
              marginLeft: '16px',
              '&:hover': { backgroundColor: '#e91e63' },
            }}>
              Logout
            </Button>

            <Button variant="contained" onClick={redirectToOrders} sx={{
              backgroundColor: '#FF4081',
              color: 'white',
              marginLeft: '16px',
              '&:hover': { backgroundColor: '#e91e63' },
            }}>
              Your orders
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chat Section (REAL DATA) */}
      <div className="w-full lg:w-1/2 p-4">
        <Card className="shadow-lg ">
          <CardContent className="p-6 bg-[#6F4E37]">
            <Typography variant="h6" className="font-semibold text-white mb-4">Chat</Typography>

            <div className="space-y-4">
              {conversations.length === 0 && (
                <div className="bg-white p-4 rounded-lg text-gray-600">
                  No conversations yet.
                </div>
              )}

              {conversations.map((conv) => (
                <div
                  key={conv._id}
                  onClick={() => handleChatClick(conv._id)}
                  className="cursor-pointer p-4 rounded-lg bg-white hover:bg-gray-100 transition-all duration-200"
                >
                  <div className="flex justify-between items-center">
                    <div className="min-w-0">
                      <Typography variant="subtitle1" className="font-medium text-gray-900 truncate">
                        {conv.partnerName}
                      </Typography>
                      <Typography variant="body2" className="text-gray-600 truncate max-w-xs">
                        {conv.lastMessage?.text || 'No messages yet'}
                      </Typography>
                    </div>
                    {conv.unreadCount > 0 && (
                      <Badge
                        badgeContent={conv.unreadCount}
                        color="secondary"
                        sx={{ '& .MuiBadge-badge': { backgroundColor: '#FF4081' } }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DIALOG 1: Confirm */}
      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)}>
        <DialogTitle>Delete account?</DialogTitle>
        <DialogContent>
          Are you sure you want to delete your account <b>{user?.email}</b>? This cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirm(false)}>Cancel</Button>
          <Button color="error" onClick={confirmDeletion}>
            Yes, delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 2: Password */}
      <Dialog open={openPassword} onClose={() => setOpenPassword(false)}>
        <DialogTitle>Confirm your password</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Password"
            type={showPwd ? 'text' : 'password'}
            fullWidth
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPwd((p) => !p)} edge="end">
                    {showPwd ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Please enter your account password for <b>{user?.email}</b> to confirm deletion.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPassword(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button color="error" onClick={submitDeletion} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete account'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
