const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

const dbConfig = {
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'appdb',
};

app.get('/', (req, res) => {
  console.log('[INFO] GET / called');
  res.json({ status: 'ok', message: 'Backend API is running', timestamp: new Date().toISOString() });
});

app.get('/health', async (req, res) => {
  console.log('[INFO] GET /health called');
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.query('SELECT 1');
    await connection.end();
    console.log('[INFO] DB health check passed');
    res.status(200).json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[ERROR] DB health check failed:', err.message);
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message, timestamp: new Date().toISOString() });
  }
});

app.listen(PORT, () => {
  console.log(`[INFO] Backend API listening on port ${PORT}`);
});
