import crypto from 'crypto';

/** 24-character hex id (Mongo ObjectId-shaped string) without a database. */
export function newObjectIdHex(): string {
  return crypto.randomBytes(12).toString('hex');
}
