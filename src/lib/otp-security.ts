import { createHash, timingSafeEqual, randomBytes } from "crypto";

/**
 * Hashes an OTP code using SHA-256 with a random salt
 * 
 * @param otp - The plaintext OTP code to hash
 * @returns The hashed OTP in format "salt:hash"
 */
export function hashOtp(otp: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash("sha256").update(otp + salt).digest("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies an OTP code against a stored hash using constant-time comparison
 * 
 * This prevents timing attacks by ensuring the comparison takes the same
 * amount of time regardless of where the first difference occurs.
 * 
 * @param plaintextOtp - The OTP code provided by the user
 * @param storedOtp - The stored hashed OTP from the database (format "salt:hash")
 * @returns True if the OTP matches, false otherwise
 */
export function verifyOtp(plaintextOtp: string, storedOtp: string): boolean {
  if (!storedOtp) return false;

  const parts = storedOtp.split(':');
  
  // Handle legacy unsalted hashes (64 hex chars)
  if (parts.length === 1 && storedOtp.length === 64) {
    const legacyHash = createHash("sha256").update(plaintextOtp).digest("hex");
    const inputBuffer = Buffer.from(legacyHash, "hex");
    const storedBuffer = Buffer.from(storedOtp, "hex");
    return inputBuffer.length === storedBuffer.length && timingSafeEqual(inputBuffer, storedBuffer);
  }

  // Handle salted hashes
  if (parts.length !== 2) return false;

  const [salt, storedHash] = parts;
  const hash = createHash("sha256").update(plaintextOtp + salt).digest("hex");
  
  const inputBuffer = Buffer.from(hash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");
  
  // * Ensure both buffers are the same length
  if (inputBuffer.length !== storedBuffer.length) {
    return false;
  }
  
  // * Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(inputBuffer, storedBuffer);
}
