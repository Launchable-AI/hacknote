const Database = require('better-sqlite3');
const path = require('path');

// Store database in the project directory
const dbPath = path.join(__dirname, 'hacknote.db');
const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS app_data (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

// Prepare statements for better performance
const getData = db.prepare('SELECT data FROM app_data WHERE id = 1');
const upsertData = db.prepare(`
  INSERT INTO app_data (id, data, updated_at) VALUES (1, ?, ?)
  ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
`);

module.exports = {
  load() {
    const row = getData.get();
    if (row) {
      return JSON.parse(row.data);
    }
    return null;
  },

  save(data) {
    const jsonData = JSON.stringify(data);
    upsertData.run(jsonData, Date.now());
  },

  close() {
    db.close();
  }
};
