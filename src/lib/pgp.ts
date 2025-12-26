import * as openpgp from 'openpgp';

const ZBASE32_ALPHABET = "ybndrfg8ejkmcpqxot1uwisza345h769";

function zBase32Encode(data: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < data.length; i++) {
    value = (value << 8) | data[i];
    bits += 8;

    while (bits >= 5) {
      output += ZBASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += ZBASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

async function sha1(str: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  return new Uint8Array(hashBuffer);
}

/**
 * Basic email validation and domain sanitization for WKD lookups.
 * Returns null if the email/domain is not acceptable for making outbound requests.
 */
function sanitizeEmailForWkd(email: string): { localPart: string; domain: string } | null {
  // Simple but strict email pattern: one "@" and at least one dot in the domain part.
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return null;
  }

  const [localPart, rawDomain] = email.split('@');
  const domain = rawDomain.toLowerCase().trim();

  // Disallow obvious SSRF vectors: ports, paths, query, spaces, control chars.
  if (
    domain.includes('/') ||
    domain.includes('\\') ||
    domain.includes('?') ||
    domain.includes('#') ||
    domain.includes('%') ||
    domain.includes('@') ||
    domain.includes(':') || // prevent "host:port"
    /\s/.test(domain)
  ) {
    return null;
  }

  // Disallow localhost and numeric IP literals (both IPv4 and simple IPv6 forms).
  const lower = domain.toLowerCase();
  const ipv4Regex = /^(?:\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^\[?[0-9a-f:]+\]?$/i;
  if (
    lower === 'localhost' ||
    ipv4Regex.test(lower) ||
    ipv6Regex.test(lower)
  ) {
    return null;
  }

  // Optionally, disallow obvious internal-only suffixes.
  const forbiddenSuffixes = ['.local', '.localhost', '.internal', '.intranet'];
  if (forbiddenSuffixes.some(suffix => lower.endsWith(suffix))) {
    return null;
  }

  return { localPart, domain };
}

export class PGPService {
  /**
   * Encrypts a message using the recipient's public key.
   * Returns an armored PGP message string.
   */
  static async encrypt(text: string, publicKeyArmored: string): Promise<string> {
    const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
    
    const message = await openpgp.createMessage({ text });
    
    const encrypted = await openpgp.encrypt({
      message,
      encryptionKeys: publicKey,
      format: 'armored' // Output as ASCII armor
    });

    return encrypted as string;
  }

  /**
   * Attempts to find a WKD (Web Key Directory) public key for an email address.
   * This works for Proton Mail and other privacy-focused providers.
   */
  static async lookupPublicKey(email: string): Promise<string | null> {
    try {
      const sanitized = sanitizeEmailForWkd(email);
      if (!sanitized) return null;

      const { localPart, domain } = sanitized;
      const lowerLocal = localPart.toLowerCase();
      const hash = await sha1(lowerLocal);
      const encodedHash = zBase32Encode(hash);

      // 1. Try Advanced Method (Standard for Proton and others)
      // Format: https://openpgpkey.domain/.well-known/openpgpkey/domain/hu/hash
      const advancedUrl = `https://openpgpkey.${domain}/.well-known/openpgpkey/${domain}/hu/${encodedHash}`;
      const advancedKey = await PGPService.fetchKey(advancedUrl);
      if (advancedKey) return advancedKey;

      // 2. Try Direct Method (Fallback)
      // Format: https://${domain}/.well-known/openpgpkey/hu/hash
      const directUrl = `https://${domain}/.well-known/openpgpkey/hu/${encodedHash}`;
      const directKey = await PGPService.fetchKey(directUrl);
      if (directKey) return directKey;

      // 3. Try Proton Mail API (Specific to Proton users)
      // This is a backup because WKD might fail or not be enabled for all custom domains hosted on Proton
      if (domain.includes('proton') || domain === 'pm.me') {
        const protonUrl = `https://mail-api.proton.me/pks/lookup?op=get&search=${encodeURIComponent(email)}`;
        const protonKey = await PGPService.fetchKey(protonUrl);
        if (protonKey) return protonKey;
      }
      
      return null;
      
    } catch (error) {
      // Fail silently for WKD lookup errors (it's an enhancement, not a requirement)
      console.warn(`WKD lookup failed for ${email}:`, error);
      return null;
    }
  }

  private static async fetchKey(url: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.status === 200) {
        // Proton API returns text/plain (ASCII Armor) or application/pgp-keys
        // We read as text to handle the ASCII Armor format shown in curl
        const text = await response.text();
        
        // Validate it's a real key
        const key = await openpgp.readKey({ armoredKey: text });
        return key.armor();
      }
    } catch (e) {
      // Ignore fetch errors
    }
    return null;
  }
}

