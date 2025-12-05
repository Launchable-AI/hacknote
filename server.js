const express = require('express');
const path = require('path');
const net = require('net');
const db = require('./db');

const app = express();

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));

// Serve static files from current directory
app.use(express.static(__dirname));

// API: Get all data
app.get('/api/data', (req, res) => {
  try {
    const data = db.load();
    res.json(data || { workspaces: [], pages: [], settings: {} });
  } catch (err) {
    console.error('[API] Failed to load data:', err);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

// API: Save all data
app.post('/api/data', (req, res) => {
  try {
    db.save(req.body);
    res.json({ success: true });
  } catch (err) {
    console.error('[API] Failed to save data:', err);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Find an available port starting from basePort
function findAvailablePort(basePort, maxAttempts = 100) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    function tryPort(port) {
      if (attempts >= maxAttempts) {
        reject(new Error(`Could not find available port after ${maxAttempts} attempts`));
        return;
      }

      const server = net.createServer();
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          attempts++;
          tryPort(port + 1);
        } else {
          reject(err);
        }
      });

      server.once('listening', () => {
        server.close(() => {
          resolve(port);
        });
      });

      server.listen(port);
    }

    tryPort(basePort);
  });
}

// Start server with dynamic port discovery
const BASE_PORT = parseInt(process.env.PORT) || 3000;

findAvailablePort(BASE_PORT)
  .then(port => {
    app.listen(port, () => {
      console.log(`\n\x1b[32m[HACKNOTE]\x1b[0m Server running at \x1b[36mhttp://localhost:${port}\x1b[0m\n`);
    });
  })
  .catch(err => {
    console.error('\x1b[31m[ERROR]\x1b[0m Failed to start server:', err.message);
    process.exit(1);
  });
