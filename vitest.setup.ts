import { vi } from 'vitest';

// Polyfill window.crypto for encryption tests in Node.js/JSDOM environment
if (!globalThis.crypto) {
    const { webcrypto } = require('node:crypto');
    // @ts-ignore
    globalThis.crypto = webcrypto;
}

if (typeof window !== 'undefined' && !window.crypto) {
    // @ts-ignore
    window.crypto = globalThis.crypto;
}

// Polyfill TextEncoder/TextDecoder if missing
if (typeof globalThis.TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util');
    globalThis.TextEncoder = TextEncoder;
    // @ts-ignore
    globalThis.TextDecoder = TextDecoder;
}

// Ensure ArrayBuffer and Uint8Array are consistent globally
// This fixes issues where "instanceof ArrayBuffer" checks fail inside node:crypto
// when objects are created in JSDOM context
const { webcrypto } = require('node:crypto');
if (webcrypto) {
   Object.defineProperty(globalThis, 'crypto', {
       value: webcrypto,
       writable: true,
       configurable: true,
   });
}

// Polyfill Blob/File methods if missing in JSDOM
if (typeof Blob !== 'undefined') {
    if (!Blob.prototype.arrayBuffer) {
        Blob.prototype.arrayBuffer = function() {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as ArrayBuffer);
                reader.onerror = () => reject(reader.error);
                reader.readAsArrayBuffer(this);
            });
        };
    }

    if (!Blob.prototype.text) {
        Blob.prototype.text = function() {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(reader.error);
                reader.readAsText(this);
            });
        };
    }
}
