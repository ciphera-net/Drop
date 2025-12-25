import { vi } from 'vitest';

// Polyfill window.crypto for encryption tests in Node.js/JSDOM environment
if (!globalThis.crypto) {
    const { webcrypto } = require('node:crypto');
    // @ts-ignore
    globalThis.crypto = webcrypto;
}

if (typeof window !== 'undefined' && !window.crypto) {
    Object.defineProperty(window, 'crypto', {
        value: globalThis.crypto,
        writable: true
    });
}

// Polyfill TextEncoder/TextDecoder if missing
if (typeof globalThis.TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util');
    globalThis.TextEncoder = TextEncoder;
    // @ts-ignore
    globalThis.TextDecoder = TextDecoder;
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
