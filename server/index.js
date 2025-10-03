require('dotenv').config({ path: './server/.env' });
console.log('Starting Concert Companion Server...');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');

const { pool, query } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5001;


app.use(helmet()); 
app.use(morgan('dev')); 
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


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


app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    database: 'Connected'
  });
});


app.get('/api/test-db', async (req, res) => {
  try {
    console.log('🔍 Testing database connection...');
    

    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    

    const usersResult = await query('SELECT COUNT(*) as user_count FROM users');
    
    res.json({
      message: 'Database test successful!',
      database_time: result.rows[0].current_time,
      postgresql_version: result.rows[0].pg_version,
      total_users: parseInt(usersResult.rows[0].user_count),
      status: 'Connected'
    });
    
  } catch (error) {
    console.error('Database test failed:', error);
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
    console.log('Fetching all users...');
    
    const result = await query('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC');
    
    res.json({
      message: 'Users retrieved successfully',
      count: result.rows.length,
      users: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});


app.post('/api/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    

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
    console.error('Error creating user:', error);

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

// Spotify token exchange endpoint
app.post('/api/spotify/token', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        error: 'Missing authorization code'
      });
    }

    console.log('🎵 Exchanging Spotify authorization code for access token...');

    // Spotify token endpoint
    const tokenUrl = 'https://accounts.spotify.com/api/token';
    
    // Your Spotify app credentials
    const CLIENT_ID = 'd88d11f594d146b6a607b0b02f6cf2a3';
    const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET; // You'll need to add this to your .env
    const REDIRECT_URI = 'http://127.0.0.1:3000/callback';

    if (!CLIENT_SECRET) {
      return res.status(500).json({
        error: 'Spotify Client Secret not configured'
      });
    }

    // Prepare the request data
    const data = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    });

    // Exchange code for access token
    const response = await axios.post(tokenUrl, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ Successfully obtained Spotify access token');

    // Return the tokens to the frontend
    res.json({
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in,
      token_type: response.data.token_type
    });

  } catch (error) {
    console.error('❌ Spotify token exchange failed:', error.response?.data || error.message);
    
    res.status(500).json({
      error: 'Failed to exchange authorization code',
      message: error.response?.data?.error_description || error.message
    });
  }
});


app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  
  res.status(err.status || 500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});


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
      'POST /api/users',
      'POST /api/spotify/token'
    ]
  });
});


app.listen(PORT, () => {
  console.log('Concert Companion Server is running!');
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.DB_NAME || 'concert_companion'}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /              - API info');
  console.log('  GET  /api/health    - Health check');
  console.log('  GET  /api/test-db   - Database test');
  console.log('  GET  /api/users     - List all users');
  console.log('  POST /api/users     - Create new user');
  console.log('  POST /api/spotify/token - Exchange Spotify code for token');
  console.log('');
  console.log('🔍 Test with: curl http://localhost:' + PORT + '/api/test-db');
});


process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});