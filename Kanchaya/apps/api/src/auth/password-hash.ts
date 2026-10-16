import argon2, { type HashOptions } from 'argon2';

const PASSWORD_HASH_OPTIONS: HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
};

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, PASSWORD_HASH_OPTIONS);
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export function createDummyPasswordHash(password: string): Promise<string> {
  return hashPassword(password);
}
