import { customAlphabet } from 'nanoid';

// 8-char base62 ID generator
// 62^8 = 218 trillion combinations, collision probability negligible
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export const nanoid = customAlphabet(alphabet, 8);

// Generate unique ID with collision check
export async function generateUniqueId(checkExists) {
  let id;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    id = nanoid();
    attempts++;
    if (attempts > maxAttempts) {
      throw new Error('Failed to generate unique ID after max attempts');
    }
  } while (checkExists && await checkExists(id));

  return id;
}
