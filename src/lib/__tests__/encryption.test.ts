import { describe, it, expect } from 'vitest';
import { EncryptionService } from '../encryption';

describe('EncryptionService', () => {
  it('should generate a key', async () => {
    const key = await EncryptionService.generateKey();
    expect(key).toBeDefined();
    expect(key.algorithm.name).toBe('AES-GCM');
  });

  it('should encrypt and decrypt text correctly', async () => {
    const key = await EncryptionService.generateKey();
    const originalText = 'Hello, Secure World!';

    // Encrypt
    const { encrypted, iv } = await EncryptionService.encryptText(originalText, key);
    expect(encrypted).toBeDefined();
    expect(iv).toBeDefined();
    expect(encrypted).not.toBe(originalText);

    // Decrypt
    const decryptedText = await EncryptionService.decryptText(encrypted, iv, key);
    expect(decryptedText).toBe(originalText);
  });

  it('should encrypt and decrypt a file blob', async () => {
    const key = await EncryptionService.generateKey();
    const fileContent = 'File content for testing';
    const file = new File([fileContent], 'test.txt', { type: 'text/plain' });

    // Encrypt
    const { encryptedBlob, iv } = await EncryptionService.encryptFile(file, key);
    expect(encryptedBlob).toBeInstanceOf(Blob);

    // Decrypt
    const decryptedBlob = await EncryptionService.decryptFile(encryptedBlob, key, iv);
    const decryptedText = await decryptedBlob.text();
    
    expect(decryptedText).toBe(fileContent);
  });

  it('should derive key from password', async () => {
      const password = 'securepassword';
      const salt = EncryptionService.ivToBase64(window.crypto.getRandomValues(new Uint8Array(12)));
      
      const key = await EncryptionService.deriveKeyFromPassword(password, salt);
      expect(key).toBeDefined();
      expect(key.algorithm.name).toBe('AES-GCM');
  });
});

