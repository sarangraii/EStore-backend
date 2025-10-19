const cors = require('cors');

/**
 * CORS configuration for cross-origin requests
 */
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
};

module.exports = cors(corsOptions);