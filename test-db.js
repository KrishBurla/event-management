require('dotenv').config();

const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

connection.connect((err) => {
  if (err) {
    console.error('Connection error:', err.message);
  } else {
    console.log('Connected to Railway MySQL database successfully!');
  }
  connection.end();
});
