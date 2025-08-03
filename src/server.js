const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const logoRoutes = require('./routes/logoRoutes');
const CloudDatabaseService = require('./services/cloudDatabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize cloud database
const cloudDb = new CloudDatabaseService();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/logos', logoRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    database: cloudDb.getDatabaseInfo(),
    storage: require('./services/cloudStorage').prototype.getStorageInfo ? 
      new (require('./services/cloudStorage'))().getStorageInfo() : 
      { provider: 'Local' }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'The requested resource was not found on this server.'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message
  });
});

// Initialize database and start server
cloudDb.initialize()
  .then(() => {
    // Only start server if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, () => {
        console.log(`🚀 Company Logo API server running on port ${PORT}`);
        console.log(`📋 Health check: http://localhost:${PORT}/health`);
        console.log(`🔗 API docs: http://localhost:${PORT}/api/logos`);
        console.log(`☁️  Database: ${cloudDb.getDatabaseInfo().provider}`);
      });
    }
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });

module.exports = app;