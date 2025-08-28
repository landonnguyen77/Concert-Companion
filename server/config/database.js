const { Pool } = require('pg');

// Database configuration
const config = {
  // We'll use individual parameters for now (easier to understand)
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'concert_companion',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '', // You'll set this in .env
  
  // Connection pool settings
  max: 20, // Maximum number of connections in pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection fails
};

// Create connection pool
const pool = new Pool(config);

// Test the connection when this module loads
const testConnection = async () => {
  try {
    console.log('🔗 Attempting to connect to PostgreSQL...');
    
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    
    console.log('✅ Database connected successfully!');
    console.log(`🕒 Database time: ${result.rows[0].current_time}`);
    console.log(`🏠 Database host: ${config.host}:${config.port}`);
    console.log(`📊 Database name: ${config.database}`);
    
    client.release(); // Return client to pool
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error details:', error.message);
    console.error('Make sure PostgreSQL is running and credentials are correct');
    
    // Don't exit the process, just log the error
    // process.exit(1);
  }
};

// Test connection when server starts
testConnection();

// Event handlers for pool
pool.on('connect', (client) => {
  console.log('🔌 New client connected to database');
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client:', err);
});

// Helper function to execute queries
const query = (text, params) => {
  console.log('🔍 Executing query:', text);
  return pool.query(text, params);
};

// Helper function to get a client from the pool
const getClient = () => {
  return pool.connect();
};

// Graceful shutdown function
const gracefulShutdown = async () => {
  console.log('🔄 Closing database connections...');
  await pool.end();
  console.log('✅ Database connections closed');
};

// Handle process termination
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = {
  pool,
  query,
  getClient,
  gracefulShutdown
};