
import { EncryptionService } from "@/lib/encryption";
import { SupabaseClient } from "@supabase/supabase-js";

export interface CreateRequestParams {
  name: string;
  description: string;
  password: string;
  notifyEmail?: string;
  supabase: SupabaseClient;
}

export async function createFileRequest({
  name,
  description,
  password,
  notifyEmail,
  supabase
}: CreateRequestParams) {
    // 1. Generate RSA Key Pair
    const keyPair = await EncryptionService.generateKeyPair();
    const publicKeyJwk = await EncryptionService.exportPublicKey(keyPair.publicKey);
    const privateKeyJwk = await EncryptionService.exportPrivateKey(keyPair.privateKey);

    // 2. Encrypt Private Key with Password
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const saltBase64 = EncryptionService.ivToBase64(salt);
    
    const wrappingKey = await EncryptionService.deriveKeyFromPassword(password, saltBase64);
    const { encrypted: encryptedPrivateKey, iv: encryptedPrivateKeyIv } = await EncryptionService.encryptText(privateKeyJwk, wrappingKey);

    // 3. Insert into DB
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase.from('file_requests').insert({
        user_id: user.id,
        name,
        description,
        public_key: publicKeyJwk,
        encrypted_private_key: encryptedPrivateKey,
        encrypted_private_key_iv: encryptedPrivateKeyIv,
        salt: saltBase64,
        status: 'active',
        notify_email: notifyEmail || null
    }).select().single();

    if (error) throw error;
    
    return data;
}

