import crypto from 'crypto';

/** Generate a cryptographically random 64-char hex token */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** SHA-256 hash a token for safe DB storage */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
