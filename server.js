require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const connectDB = require('./config/database');
const corsMiddleware = require('./middleware/cors');

// Import routes
const orderRoutes = require('./routes/orders');
const stripeRoutes = require('./routes/stripe');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// Middleware
app.use(corsMiddleware);

// Body parser middleware (except for webhook route)
app.use('/api/stripe/webhook', stripeRoutes); // This route needs raw body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/orders', orderRoutes);
app.use('/api/stripe', stripeRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'E-commerce backend is running' });
});

app.get('/', (req, res) => {
  res.json({ message: 'MyEStore API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});