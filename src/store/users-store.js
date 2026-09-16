import pool from '../database/connection.js';

function toUserObject(row) {
  const user = {};
  user.id = Number(row.id);
  user.username = row.username;
  user.email = row.email;
  user.fullName = row.full_name;
  user.points = Number(row.points);
  user.isAdmin = Boolean(row.is_admin);
  return user;
}

function toAccountObject(row) {
  const account = {};
  account.user = toUserObject(row);
  account.passwordHash = row.password_hash;
  return account;
}

export async function findById(userId) {
  const result = await pool.execute(
    `SELECT id, username, email, full_name, points, is_admin
       FROM users
      WHERE id = ?`,
    [userId]
  );
  const rows = result[0];

  if (rows.length === 0) {
    return null;
  }

  return toUserObject(rows[0]);
}

export async function findByEmail(email) {
  const result = await pool.execute(
    `SELECT id, username, email, password_hash, full_name, points, is_admin
       FROM users
      WHERE email = ?
      LIMIT 1`,
    [email]
  );
  const rows = result[0];

  if (rows.length === 0) {
    return null;
  }

  return toAccountObject(rows[0]);
}

export async function findByUsername(username) {
  const result = await pool.execute(
    `SELECT id, username, email, password_hash, full_name, points, is_admin
       FROM users
      WHERE username = ?
      LIMIT 1`,
    [username]
  );
  const rows = result[0];

  if (rows.length === 0) {
    return null;
  }

  return toAccountObject(rows[0]);
}

export async function insertUser(conn, username, email, passwordHash, fullName) {
  const userValues = [
    username,
    email,
    passwordHash,
    fullName
  ];

  const result = await conn.execute(
    'INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
    userValues
  );
  const insertInfo = result[0];

  return insertInfo.insertId;
}
