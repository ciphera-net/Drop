import { EncryptionService } from "@/lib/encryption";
import { createClient } from "@/utils/supabase/client";

interface UploadProgressCallback {
  (progress: number): void;
}

export async function uploadEncryptedFile(
  file: File,
  key: CryptoKey,
  bucket: string,
  path: string,
  onProgress: UploadProgressCallback
) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) throw new Error("No active session");

  // Keep a reference to the token that we can update
  let currentToken = session.access_token;

  const chunkSize = EncryptionService.CHUNK_SIZE;
  const totalChunks = Math.ceil(file.size / chunkSize);
  const totalOverhead = totalChunks * EncryptionService.ENCRYPTED_CHUNK_OVERHEAD;
  const totalSize = file.size + totalOverhead;

  // 1. Initialize TUS Upload
  const endpoint = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`;
  
  // Encode metadata strictly as TUS expects (base64)
  // key value pairs, values base64 encoded
  const metadata = {
    bucketName: bucket,
    objectName: path,
    contentType: 'application/octet-stream',
    cacheControl: '3600',
  };
  
  const metadataStr = Object.entries(metadata)
    .map(([k, v]) => `${k} ${btoa(v)}`)
    .join(',');

  const headers = {
    'Authorization': `Bearer ${currentToken}`,
    'Tus-Resumable': '1.0.0',
    'Upload-Length': totalSize.toString(),
    'Upload-Metadata': metadataStr,
    'x-upsert': 'true', // Optional, depending on need
  };

  const createRes = await fetch(endpoint, {
    method: 'POST',
    headers,
  });

  if (!createRes.ok) {
     // Read the error body if possible to debug
    const text = await createRes.text();
    throw new Error(`Failed to create upload: ${createRes.status} ${createRes.statusText} - ${text}`);
  }

  const uploadUrl = createRes.headers.get('Location');
  if (!uploadUrl) {
    throw new Error("No upload location returned");
  }

  // 2. Upload Chunks
  let offset = 0;
  
  for (let i = 0; i < totalChunks; i++) {
    // Check/Refresh Token every ~10 chunks (100MB)
    if (i > 0 && i % 10 === 0) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.access_token) {
            currentToken = currentSession.access_token;
        }
    }

    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    
    // Read Chunk
    const chunkBlob = file.slice(start, end);
    const chunkBuffer = await chunkBlob.arrayBuffer();
    
    // Encrypt Chunk
    const { encrypted, iv } = await EncryptionService.encryptChunk(chunkBuffer, key);
    
    // Construct Encrypted Payload: [IV][Data]
    // IV is 12 bytes.
    const payload = new Uint8Array(iv.byteLength + encrypted.byteLength);
    payload.set(iv, 0);
    payload.set(new Uint8Array(encrypted), iv.byteLength);
    
    // Upload with current token
    // Retry logic could be added here
    await uploadChunk(uploadUrl, payload, offset, currentToken);
    
    offset += payload.byteLength;
    
    // Calculate Progress (Approximate based on encrypted size vs total encrypted)
    const percent = Math.round((offset / totalSize) * 100);
    onProgress(percent);
  }
}

async function uploadChunk(url: string, data: Uint8Array, offset: number, token: string) {
  // Simple retry logic for resilience
  let retries = 3;
  while (retries > 0) {
      try {
          const res = await fetch(url, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Tus-Resumable': '1.0.0',
              'Upload-Offset': offset.toString(),
              'Content-Type': 'application/offset+octet-stream',
            },
            body: data,
          });

          if (res.ok) return;
          
          if (res.status === 401) {
              // Token might have expired during the request? 
              // We should fail so the outer loop refreshes, but simplistic retry helps network blips.
              throw new Error("Unauthorized");
          }
           const text = await res.text();
           throw new Error(`Status ${res.status}: ${text}`);
      } catch (e) {
          retries--;
          if (retries === 0) throw e;
          // Wait 1s before retry
          await new Promise(r => setTimeout(r, 1000));
      }
  }
}
