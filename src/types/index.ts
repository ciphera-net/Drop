export interface FileUpload {
  id: string;
  user_id: string | null;
  created_at: string;
  filename_encrypted: string;
  filename_iv: string;
  mime_type_encrypted: string | null;
  mime_type_iv: string | null;
  size: number;
  iv: string;
  expiration_time: string;
  is_password_protected: boolean;
  password_salt: string | null;
  encrypted_key: string | null;
  encrypted_key_iv: string | null;
  file_deleted: boolean;
  magic_words: string | null;
  download_limit: number | null;
  download_count: number;
  request_id: string | null;
  file_type: string; // 'image' | 'video' etc. Stored as string in DB but we can refine
  message_encrypted?: string;
  message_iv?: string;
  file_hash?: string;
  notify_on_download?: boolean;
  sender_email?: string;
}

export interface FileRequest {
  id: string;
  user_id: string;
  created_at: string;
  name: string;
  description: string | null;
  status: 'active' | 'closed';
  public_key: string;
  encrypted_private_key: string;
  encrypted_private_key_iv: string;
  salt: string;
  expiration_time?: string; // From migration 19?
  notify_email?: string; // From migration 18?
}

// UI extended types
export interface DecryptedFile extends FileUpload {
  name?: string; // Decrypted name
  aesKey?: CryptoKey; // Decrypted AES key
}

