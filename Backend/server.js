const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./route/auth');
const profileRoutes = require('./route/getUserDetailsRoute');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const uploadRoutes = require('./route/userProfileImg');
const updateprfileRoutes = require('./route/updateUser');
const reviewRoutes = require('./route/reviews');
const productsRoutes = require('./route/getProductDetails');
const distance = require('./route/calculate_distance');
const cartRoutes = require('./route/cart'); // Cart routes
const orderplacement = require('./route/orderPlacement'); // Order placement routes
const managerprofile = require('./route/getManagerDetails');
const canteenRoutes = require('./route/canteen');
const addproduct = require('./route/addProduct');
const loadproducts = require('./route/loadProducts');
const chatRoutes = require('./route/chat');

const http = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // your frontend origin
  credentials: true,               // allow cookies/session
}));
app.use(express.json()); // Parse incoming JSON
app.use(cookieParser()); // Needed for reading cookies

// Static file serving
app.use('/profile-images', express.static('profile-images'));
app.use('/product-images', express.static('product-images'));

// --- Create HTTP server FIRST ---
const server = http.createServer(app);

// --- Socket.IO ---
const io = new Server(server, {
  cors: { origin: 'http://localhost:3000', credentials: true }
});

// make io available to routes via req.app.get('io')
app.set('io', io);

io.on('connection', (socket) => {
  // client should emit: socket.emit('join', { conversationId })
  socket.on('join', ({ conversationId }) => {
    if (conversationId) socket.join(String(conversationId));
  });

  // if you later want to send events:
  // socket.to(roomId).emit('newMessage', payload);
});

// Routes
app.use('/api/auth', authRoutes);           // Signup/Login endpoint base
app.use('/api/auth', profileRoutes);        // Profile endpoint base
app.use('/api', uploadRoutes);              // Upload route
app.use('/api', updateprfileRoutes);        // Update profile route
app.use('/api/reviews', reviewRoutes);      // Reviews
app.use('/api', productsRoutes);            // Product details
app.use('/api', distance);                  // Distance calculation
app.use('/api/cart', cartRoutes);           // Cart
app.use('/api/orders', orderplacement);     // Orders
app.use('/api/auth', managerprofile);       // Manager profile
app.use('/api/canteen', canteenRoutes);     // Canteen
app.use('/api/products', addproduct);       // Add product
app.use('/api/loadproducts', loadproducts); // Load products
app.use('/api', chatRoutes);                // Chat

// Start server (use server.listen, not app.listen)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
