const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'changeme';
const DB_PATH = path.join(__dirname, 'users.db');

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    encrypted_key TEXT NOT NULL
  )`);
});

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_SECRET, 'utf8'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(data) {
  const [ivHex, encrypted] = data.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_SECRET, 'utf8'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function registerUser(username, password, privateKey, cb) {
  const password_hash = hashPassword(password);
  const encrypted_key = encrypt(privateKey);
  db.run(
    'INSERT INTO users (username, password_hash, encrypted_key) VALUES (?, ?, ?)',
    [username, password_hash, encrypted_key],
    cb
  );
}

function authenticateUser(username, password, cb) {
  const password_hash = hashPassword(password);
  db.get(
    'SELECT * FROM users WHERE username = ? AND password_hash = ?',
    [username, password_hash],
    (err, row) => {
      if (err) return cb(err);
      if (!row) return cb(null, null);
      cb(null, row);
    }
  );
}

function getDecryptedKey(username, cb) {
  db.get('SELECT encrypted_key FROM users WHERE username = ?', [username], (err, row) => {
    if (err) return cb(err);
    if (!row) return cb(new Error('User not found'));
    try {
      const privateKey = decrypt(row.encrypted_key);
      cb(null, privateKey);
    } catch (e) {
      cb(e);
    }
  });
}

module.exports = {
  registerUser,
  authenticateUser,
  getDecryptedKey,
}; 