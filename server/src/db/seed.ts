import bcrypt from 'bcrypt';
import type { IUserRepository } from './repositories';

const SALT_ROUNDS = 12;
const DEFAULT_EMAIL = 'test@example.com';
const DEFAULT_PASSWORD = 'Password123!';

export async function seedDefaultUserIfNeeded(userRepo: IUserRepository): Promise<void> {
  const existing = await userRepo.findByEmail(DEFAULT_EMAIL);
  if (existing) return;
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
  await userRepo.create({ email: DEFAULT_EMAIL, passwordHash });
  console.log('Seed: created user', DEFAULT_EMAIL);
}
