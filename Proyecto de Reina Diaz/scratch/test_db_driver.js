try {
  const sqlite = require('better-sqlite3');
  console.log('better-sqlite3 loaded successfully!');
} catch (e) {
  console.log('better-sqlite3 failed:', e.message);
}

try {
  const mysql = require('mysql2');
  console.log('mysql2 loaded successfully!');
} catch (e) {
  console.log('mysql2 failed:', e.message);
}
