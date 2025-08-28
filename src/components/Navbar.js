"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Button,
  IconButton,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import InfoIcon from '@mui/icons-material/Info';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const pathname = usePathname();
  const router = useRouter();

  const toggleDrawer = (open) => () => setDrawerOpen(open);
  const open = Boolean(anchorEl);

  const fetchUser = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/profile', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      setUser(null);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [pathname]);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setUser(null);
        handleMenuClose();
        alert("Logout successful");
        router.push('/signin');
      } else {
        alert('Logout failed');
      }
    } catch (err) {
      console.error('Logout error:', err);
      alert('Logout failed');
    }
  };

  return (
    <nav className="bg-[#6F4E37] text-white py-3 shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 flex items-center justify-between">
        
        {/* Left side: Hamburger + Cart */}
        <div className="flex items-center flex-1">
          {/* Hamburger for mobile */}
          <div className="md:hidden">
            <IconButton onClick={toggleDrawer(true)} className="text-white">
              <MenuIcon />
            </IconButton>
          </div>

          {/* Cart icon */}
          <div className="ml-2">
            <Tooltip title="Your Cart" arrow>
              <IconButton
                color="inherit"
                onClick={() => router.push('/Cart')}
              >
                <ShoppingCartIcon />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* Center Nav Icons */}
        <div className="hidden md:flex space-x-6">
          <Tooltip title="Home" arrow>
            <Link href="/" passHref>
              <IconButton color="inherit" component="a" size="large" sx={{ '&:hover': { color: '#FF4081' } }}>
                <HomeIcon fontSize="inherit" />
              </IconButton>
            </Link>
          </Tooltip>
          <Tooltip title="About Us" arrow>
            <Link href="/about" passHref>
              <IconButton color="inherit" component="a" size="large" sx={{ '&:hover': { color: '#FF4081' } }}>
                <InfoIcon fontSize="inherit" />
              </IconButton>
            </Link>
          </Tooltip>
          <Tooltip title="Contact Us" arrow>
            <Link href="/contact" passHref>
              <IconButton color="inherit" component="a" size="large" sx={{ '&:hover': { color: '#FF4081' } }}>
                <ContactMailIcon fontSize="inherit" />
              </IconButton>
            </Link>
          </Tooltip>
        </div>

        {/* Right side buttons/profile */}
        <div className="hidden md:flex items-center justify-end flex-1 mr-4 mt-2 space-x-3">
          {user ? (
            <>
              <IconButton onClick={handleMenuOpen}>
                <Avatar
                  alt={user.firstName}
                  src={user.profilePic ? `http://localhost:5000/${user.profilePic}` : ''}
                  sx={{ width: 36, height: 36 }}
                />
              </IconButton>
              <span className="text-white font-semibold cursor-pointer" onClick={handleMenuOpen}>
                {user.firstName}
              </span>
              <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem onClick={() => { handleMenuClose(); router.push('/userProfile'); }}>
                  Profile
                </MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </>
          ) : (
            <div className="flex">
              {['/signin', '/signup', '/seller-login', '/be-a-seller'].map((path, index, arr) => (
                <Button
                  key={index}
                  variant="contained"
                  sx={{
                    backgroundColor: '#FF4081',
                    '&:hover': { backgroundColor: '#ff5a95' },
                    textTransform: 'none',
                    minWidth: '100px',
                    marginRight: index !== arr.length - 1 ? '8px' : '0px',
                  }}
                  size="small"
                  component={Link}
                  href={path}
                >
                  {path === '/signin' && 'Sign In'}
                  {path === '/signup' && 'Sign Up'}
                  {path === '/seller-login' && 'Seller Login'}
                  {path === '/be-a-seller' && 'Be a Seller'}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Drawer for mobile */}
        <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
          <div className="w-64 bg-[#6F4E37] h-full text-white p-4">
            <h2 className="text-xl mb-4 font-semibold">Menu</h2>
            <List>
              <ListItem button component={Link} href="/"><HomeIcon className="mr-2" /><ListItemText primary="Home" /></ListItem>
              <ListItem button component={Link} href="/about"><InfoIcon className="mr-2" /><ListItemText primary="About Us" /></ListItem>
              <ListItem button component={Link} href="/contact"><ContactMailIcon className="mr-2" /><ListItemText primary="Contact Us" /></ListItem>
              <ListItem button component={Link} href="/userProfile"><AccountCircleIcon className="mr-2" /><ListItemText primary="Profile" /></ListItem>
              <ListItem button component={Link} href="/cart"><ShoppingCartIcon className="mr-2" /><ListItemText primary="Cart" /></ListItem>
            </List>
            <Divider className="my-4 border-pink-300" />
            <List>
              <ListItem button component={Link} href="/signin"><ListItemText primary="Sign In" /></ListItem>
              <ListItem button component={Link} href="/signup"><ListItemText primary="Sign Up" /></ListItem>
              <ListItem button component={Link} href="/seller-login"><ListItemText primary="Seller Login" /></ListItem>
              <ListItem button component={Link} href="/be-a-seller"><ListItemText primary="Be a Seller" /></ListItem>
            </List>
          </div>
        </Drawer>
      </div>
    </nav>
  );
}
