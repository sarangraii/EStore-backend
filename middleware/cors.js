const cors = require('cors');

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://e-store-frontend-ten.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
]
  .filter(Boolean)
  .map((url) => url.replace(/\/$/, '')); // strip trailing slash

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (Postman, Stripe webhooks, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false); // deny without throwing a 500
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

module.exports = cors(corsOptions);