/**
 * PasswordHasher — bcrypt wrapper.
 *
 * Service layer depends on this interface, never on `bcryptjs`
 * directly. This makes the hasher mockable in tests and lets us
 * swap hashing algorithms without touching business logic.
 */

import bcrypt from 'bcryptjs'

export interface PasswordHasher {
  hash(plain: string): Promise<string>
  verify(plain: string, hash: string): Promise<boolean>
}

const ROUNDS = 10

export class BcryptPasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, ROUNDS)
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash)
  }
}