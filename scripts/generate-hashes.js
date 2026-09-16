import bcrypt from 'bcryptjs';

const usernames = ['admin', 'dimitris', 'maria', 'giannis'];
const password = 'test1234';

for (const username of usernames) {
  const hash = await bcrypt.hash(password, 10);
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE username = '${username}';`);
}
