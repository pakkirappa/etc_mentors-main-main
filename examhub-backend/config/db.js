const mysql = require('mysql2/promise');
require('dotenv').config();

// const pool = mysql.createPool({
//   host: process.env.DB_HOST || 'localhost',
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD || '',
//   database: 'ExamHubDB',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

const pool = mysql.createPool({
  uri: process.env.DB_URL || 'mysql://root:root@localhost:3306/ExamHubDB',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
