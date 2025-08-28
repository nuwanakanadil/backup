'use client';

import { useState, useEffect } from 'react';
import {
  Card, CardContent, Badge, Typography, Avatar, Button, Divider, TextField
} from '@mui/material';
import { useRouter } from 'next/navigation';

const dummyChats = [
  {
    username: 'alice123',
    lastMessage: 'Hey, are you available tomorrow?',
    unreadCount: 3,
    isUnread: true,
  },
  {
    username: 'bob456',
    lastMessage: 'Thanks for the update!',
    unreadCount: 0,
    isUnread: false,
  },
  {
    username: 'charlie789',
    lastMessage: 'Can you send me the files?',
    unreadCount: 1,
    isUnread: true,
  },
];

export default function ProfileComponent() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chats] = useState(dummyChats);
  const [selectedFile, setSelectedFile] = useState(null);

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
          router.push('/signin'); // Redirect to login if not authenticated
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

  const handleChatClick = (username) => {
    router.push(`/chat/${username}`);
  };

const handleUpdate = async () =>
   { 
    if (!user.firstName || !user.lastName || !user.email || !user.phone) {
      alert('First name, last name, email, and phone are required');
      return;
    }

const emailRegex = /^[^\s@]+@[^\s@]+.[^\s@]+$/; const phoneRegex = /^\d{10}$/;
  if (!emailRegex.test(user.email)){
     alert('Invalid email format');
     return;
  }
  if (!phoneRegex.test(user.phone)) { 
  alert('Phone must be exactly 10 digits');
   return;
  }
  try { const res = await fetch('http://localhost:5000/api/update-profile',
    { method: 'PUT', headers: { 'Content-Type': 'application/json', }, credentials: 'include',
    body: JSON.stringify({ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, universityId: user.universityId }) });
  const data = await res.json();

  if (res.ok) {
  alert('Profile updated successfully');
  setUser(data.updatedUser); // Update UI with new data
  } else {
  alert(data.message || 'Update failed');
  }

} 
catch (err) { console.error('Update error:', err); alert('Something went wrong'); } 
};

  const handleDelete = () => {
    console.log('Delete account');
  };

  const handleLogout = async () => {
  try {
    const res = await fetch('http://localhost:5000/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    if (res.ok) {
      localStorage.removeItem('email')
      localStorage.clear()
      alert('Logged out successfully');
      router.refresh()
      router.push('/signin');
       // redirect to login
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
    formData.append('userId', user._id); // Send user ID

    try {
      const res = await fetch('http://localhost:5000/api/upload-profile-pic', {
        method: 'POST',
        body: formData,
        credentials:'include'
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
  }

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
            
            <Button variant="outlined" onClick={handleDelete} sx={{
              color: 'white',
              borderColor: 'white',
              '&:hover': {
                borderColor: '#FF4081',
                color: '#FF4081',
              },
            }}>
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
            {/* Editable form fields */}
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
              '&:hover': {
                backgroundColor: '#e91e63',
              },
            }}>
              Update Details
            </Button>

             <Button variant="contained" onClick={handleLogout} sx={{
              backgroundColor: '#FF4081',
              color: 'white',
              marginLeft: '16px',
              '&:hover': {
                backgroundColor: '#e91e63',
              },
            }}>
              Logout
            </Button>

            <Button variant="contained" onClick={redirectToOrders} sx={{
              backgroundColor: '#FF4081',
              color: 'white',
              marginLeft: '16px',
              '&:hover': {
                backgroundColor: '#e91e63',
              },
            }}>
              Your orders
            </Button>

            
            
            
          </div>
        </CardContent>
      </Card>

      {/* Chat Section */}
      <div className="w-full lg:w-1/2 p-4">
        <Card className="shadow-lg ">
          <CardContent className="p-6 bg-[#6F4E37]">
            <Typography variant="h6" className="font-semibold text-white-800 mb-4">Chat</Typography>
            <div className="space-y-4">
              {chats.map((chat, index) => (
                <div
                  key={index}
                  onClick={() => handleChatClick(chat.username)}
                  className={`cursor-pointer p-4 rounded-lg transition-all duration-200 ${
                    chat.isUnread ? 'bg-gray-100' : 'bg-white'
                  } hover:bg-gray-200`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <Typography variant="subtitle1" className="font-medium text-gray-900">{chat.username}</Typography>
                      <Typography variant="body2" className="text-gray-600 truncate max-w-xs">{chat.lastMessage}</Typography>
                    </div>
                    {chat.unreadCount > 0 && (
                      <Badge
                        badgeContent={chat.unreadCount}
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
    </div>
  );
}
