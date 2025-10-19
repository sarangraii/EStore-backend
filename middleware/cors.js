const cors = require('cors');

/**
 * CORS configuration for cross-origin requests
 */
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'https://e-store-frontend-8igs.vercel.app',
  credentials: true,
  optionsSuccessStatus: 200,
};

module.exports = cors(corsOptions);