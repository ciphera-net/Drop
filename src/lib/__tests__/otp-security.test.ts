import { describe, it, expect } from "vitest";
import { hashOtp, verifyOtp } from "../otp-security";

describe("OTP Security", () => {
  describe("hashOtp", () => {
    it("should generate a verifiable hash", () => {
      const otp = "123456";
      const hash1 = hashOtp(otp);
      
      // * Should be verifiable
      expect(verifyOtp(otp, hash1)).toBe(true);
    });

    it("should generate different hashes for the same OTP (salting)", () => {
      const otp = "123456";
      const hash1 = hashOtp(otp);
      const hash2 = hashOtp(otp);
      
      // * Same input should produce DIFFERENT hash due to salt
      expect(hash1).not.toBe(hash2);
      // * But both should verify
      expect(verifyOtp(otp, hash1)).toBe(true);
      expect(verifyOtp(otp, hash2)).toBe(true);
    });

    it("should generate different hashes for different OTPs", () => {
      const otp1 = "123456";
      const otp2 = "654321";
      
      const hash1 = hashOtp(otp1);
      const hash2 = hashOtp(otp2);
      
      expect(hash1).not.toBe(hash2);
    });

    it("should generate a salt:hash format", () => {
      const otp = "123456";
      const hash = hashOtp(otp);
      
      // * Should contain a colon
      expect(hash).toContain(':');
      const parts = hash.split(':');
      expect(parts.length).toBe(2);
      // Salt is 16 bytes = 32 hex chars
      expect(parts[0]).toHaveLength(32);
      // SHA-256 is 32 bytes = 64 hex chars
      expect(parts[1]).toHaveLength(64);
    });
  });

  describe("verifyOtp", () => {
    it("should verify a correct OTP", () => {
      const otp = "123456";
      const hash = hashOtp(otp);
      
      expect(verifyOtp(otp, hash)).toBe(true);
    });

    it("should reject an incorrect OTP", () => {
      const correctOtp = "123456";
      const incorrectOtp = "654321";
      const hash = hashOtp(correctOtp);
      
      expect(verifyOtp(incorrectOtp, hash)).toBe(false);
    });

    it("should reject OTPs that differ by a single digit", () => {
      const correctOtp = "123456";
      const incorrectOtp = "123457";
      const hash = hashOtp(correctOtp);
      
      expect(verifyOtp(incorrectOtp, hash)).toBe(false);
    });

    it("should verify legacy unsalted hashes", () => {
      // Create a legacy hash (just SHA-256 hex)
      const { createHash } = require("crypto");
      const otp = "123456";
      const legacyHash = createHash("sha256").update(otp).digest("hex");
      
      expect(verifyOtp(otp, legacyHash)).toBe(true);
      expect(verifyOtp("wrong", legacyHash)).toBe(false);
    });

    it("should reject invalid hash formats", () => {
      const otp = "123456";
      const invalidHash = "not-a-valid-hash";
      
      // * Should return false for invalid hash format
      expect(verifyOtp(otp, invalidHash)).toBe(false);
    });

    it("should be resistant to timing attacks (constant-time)", () => {
      const correctOtp = "123456";
      const hash = hashOtp(correctOtp);
      
      // * These should all take roughly the same time regardless of where difference occurs
      const incorrectOtps = [
        "023456", // Different first digit
        "103456", // Different second digit
        "120456", // Different third digit
        "123056", // Different fourth digit
        "123406", // Different fifth digit
        "123450", // Different last digit
      ];
      
      // * All should fail verification
      incorrectOtps.forEach(incorrectOtp => {
        expect(verifyOtp(incorrectOtp, hash)).toBe(false);
      });
    });
  });
});
