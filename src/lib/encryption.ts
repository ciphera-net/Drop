export class EncryptionService {
  private static ALGORITHM = 'AES-GCM';
  private static KEY_LENGTH = 256;

  // Generate a random key
  static async generateKey(): Promise<CryptoKey> {
    return window.crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Export key to base64 string (URL safe) for sharing
  static async exportKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('raw', key);
    return this.arrayBufferToBase64(exported);
  }

  // Import key from base64 string
  static async importKey(base64Key: string): Promise<CryptoKey> {
    const buffer = this.base64ToArrayBuffer(base64Key);
    return window.crypto.subtle.importKey(
      'raw',
      buffer,
      this.ALGORITHM,
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt file content
  static async encryptFile(file: File, key: CryptoKey): Promise<{ encryptedBlob: Blob; iv: Uint8Array }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
    const arrayBuffer = await file.arrayBuffer();

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
      },
      key,
      arrayBuffer
    );

    return {
      encryptedBlob: new Blob([encryptedBuffer]),
      iv: iv,
    };
  }

  // Decrypt file content
  static async decryptFile(encryptedBlob: Blob, key: CryptoKey, iv: Uint8Array): Promise<Blob> {
    const arrayBuffer = await encryptedBlob.arrayBuffer();

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
      },
      key,
      arrayBuffer
    );

    return new Blob([decryptedBuffer]);
  }

  // Utilities
  static arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  static base64ToArrayBuffer(base64: string): ArrayBuffer {
    // Add back padding if needed
    let b64 = base64.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) {
      b64 += '=';
    }
    const binary = window.atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  
  static ivToBase64(iv: Uint8Array): string {
     return this.arrayBufferToBase64(iv.buffer);
  }
  
  static base64ToIv(base64: string): Uint8Array {
      return new Uint8Array(this.base64ToArrayBuffer(base64));
  }

  // Helper for small text data (metadata)
  static async encryptText(text: string, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv },
      key,
      encoded
    );
    return {
      encrypted: this.arrayBufferToBase64(encryptedBuffer),
      iv: this.ivToBase64(iv)
    };
  }

  static async decryptText(encryptedBase64: string, ivBase64: string, key: CryptoKey): Promise<string> {
    const encrypted = this.base64ToArrayBuffer(encryptedBase64);
    const iv = this.base64ToIv(ivBase64);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: this.ALGORITHM, iv },
      key,
      encrypted
    );
    return new TextDecoder().decode(decryptedBuffer);
  }
}

