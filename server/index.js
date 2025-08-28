// Load environment variables first
require('dotenv').config();
console.log('🚀 Starting Concert Companion Server...');

// Import required packages
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import our database connection
const { pool, query } = require('./config/database');

// Create Express application
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware setup
app.use(helmet()); // Security headers
app.use(morgan('dev')); // Request logging (dev format is more readable)
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic routes
app.get('/', (req, res) => {
  res.json({
    message: 'Concert Companion API is running!',
    version: '1.0.0',
    database: 'Connected',
    endpoints: {
      health: '/api/health',
      users: '/api/users',
      'test-db': '/api/test-db'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    database: 'Connected'
  });
});

// Test database endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic query
    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    
    // Test our users table
    const usersResult = await query('SELECT COUNT(*) as user_count FROM users');
    
    res.json({
      message: 'Database test successful!',
      database_time: result.rows[0].current_time,
      postgresql_version: result.rows[0].pg_version,
      total_users: parseInt(usersResult.rows[0].user_count),
      status: 'Connected'
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    res.status(500).json({
      error: 'Database test failed',
      message: error.message,
      status: 'Error'
    });
  }
});

// Get all users endpoint
app.get('/api/users', async (req, res) => {
  try {
    console.log('📋 Fetching all users...');
    
    const result = await query('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC');
    
    res.json({
      message: 'Users retrieved successfully',
      count: result.rows.length,
      users: result.rows
    });
    
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

// Create a new user endpoint
app.post('/api/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    // Basic validation
    if (!name || !email) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'email']
      });
    }
    
    console.log(`👤 Creating new user: ${name} (${email})`);
    
    const result = await query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email, created_at',
      [name, email]
    );
    
    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
    
    // Handle duplicate email error
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Email already exists',
        message: 'A user with this email already exists'
      });
    }
    
    res.status(500).json({
      error: 'Failed to create user',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.stack);
  
  res.status(err.status || 500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/test-db',
      'GET /api/users',
      'POST /api/users'
    ]
  });
});

// Start the server
app.listen(PORT, () => {
  console.log('✅ Concert Companion Server is running!');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Database: ${process.env.DB_NAME || 'concert_companion'}`);
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('  GET  /              - API info');
  console.log('  GET  /api/health    - Health check');
  console.log('  GET  /api/test-db   - Database test');
  console.log('  GET  /api/users     - List all users');
  console.log('  POST /api/users     - Create new user');
  console.log('');
  console.log('🔍 Test with: curl http://localhost:' + PORT + '/api/test-db');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});