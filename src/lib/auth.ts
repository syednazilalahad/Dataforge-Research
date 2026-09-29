import { randomBytes, randomUUID, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { query } from './db';
import { AppError } from './errors';
import type { Profile } from './domain';
const scrypt = promisify(scryptCallback);
export const sessionCookie = 'rf_session';
export type User = {
  id: string;
  email: string;
  profile: Partial<Profile>;
};
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
export async function checkPassword(password: string, encoded: string) {
  const [salt, hex] = encoded.split(':');
  if (!salt || !hex) return false;
  const expected = Buffer.from(hex, 'hex');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return expected.length === key.length && timingSafeEqual(expected, key);
}
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const bucket = digest(key);
  const row = (await query<{
    count: number;
  }>(`INSERT INTO rate_limits(key,count,reset_at) VALUES($1,1,now()+($2 * interval '1 second')) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.reset_at<now() THEN 1 ELSE rate_limits.count+1 END,reset_at=CASE WHEN rate_limits.reset_at<now() THEN now()+($2 * interval '1 second') ELSE rate_limits.reset_at END RETURNING count`, [bucket, windowSeconds])).rows[0];
  if (row.count > limit) throw new AppError(429, 'Too many attempts. Please try again later.');
}
export async function register(email: string, password: string) {
  const encoded = await hashPassword(password);
  try {
    return (await query<User>('INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3) RETURNING id,email,profile', [randomUUID(), email.toLowerCase(), encoded])).rows[0];
  } catch (e) {
    if ((e as {
      code?: string;
    }).code === '23505') throw new AppError(409, 'Unable to create account with these details. Try signing in.');
    throw e;
  }
}
export async function authenticate(email: string, password: string) {
  const u = (await query<User & {
    password_hash: string;
  }>('SELECT * FROM users WHERE email=$1', [email.toLowerCase()])).rows[0];
  const valid = await checkPassword(password, u?.password_hash ?? '00000000000000000000000000000000:'.concat('0'.repeat(128)));
  if (!u || !valid) throw new AppError(401, 'Email or password is incorrect.');
  return {
    id: u.id,
    email: u.email,
    profile: u.profile
  };
}
export async function newSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  await query('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval \'7 days\')', [digest(token), userId]);
  return token;
}
export async function userFromToken(token?: string): Promise<User | null> {
  if (!token) return null;
  return (await query<User>('SELECT u.id,u.email,u.profile FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()', [digest(token)])).rows[0] ?? null;
}
export async function currentUser() {
  return userFromToken((await cookies()).get(sessionCookie)?.value);
}
export async function requireUser() {
  const u = await currentUser();
  if (!u) throw new AppError(401, 'Please sign in.');
  return u;
}
export async function endSession(token: string) {
  await query('DELETE FROM sessions WHERE token_hash=$1', [digest(token)]);
}
