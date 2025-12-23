import { EncryptionService } from "@/lib/encryption";
import { createClient } from "@/utils/supabase/client";

interface UploadProgress {
  percent: number;
  speed: number; // bytes per second
  eta: number; // seconds remaining
}

interface UploadProgressCallback {
  (progress: UploadProgress): void;
}

const CONCURRENCY_LIMIT = 4; // Reduced from 6 for better stability

export async function uploadEncryptedFile(
  file: File,
  key: CryptoKey,
  bucket: string,
  path: string,
  onProgress: UploadProgressCallback
) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  const token = session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token) throw new Error("No authentication token available");

  const chunkSize = EncryptionService.CHUNK_SIZE;
  const totalChunks = Math.ceil(file.size / chunkSize);
  const totalOverhead = totalChunks * EncryptionService.ENCRYPTED_CHUNK_OVERHEAD;
  const totalSize = file.size + totalOverhead;
  
  let totalUploadedBytes = 0;
  const activeUploads = new Set<Promise<void>>();
  
  // Speed calculation state
  let startTime = performance.now();
  let lastSpeedUpdate = startTime;
  let bytesSinceLastUpdate = 0;
  let currentSpeed = 0;
  const SMOOTHING_FACTOR = 0.1;

  // Helper to upload a single chunk using XHR with Retries
  const uploadChunkTask = async (index: number) => {
    const start = index * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    
    // 1. Read & Encrypt
    const chunkBlob = file.slice(start, end);
    const chunkBuffer = await chunkBlob.arrayBuffer();
    const { encrypted, iv } = await EncryptionService.encryptChunk(chunkBuffer, key);
    
    // 2. Prepare Payload
    const payload = new Uint8Array(iv.byteLength + encrypted.byteLength);
    payload.set(iv, 0);
    payload.set(new Uint8Array(encrypted), iv.byteLength);
    
    // 3. Upload using XHR with Retry Logic
    const chunkPath = `${path}/${index}`;
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${chunkPath}`;
    
    let chunkUploadedBytes = 0;
    let retries = 3;

    while (retries > 0) {
        try {
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', url);
                
                // Refresh token if needed? For now using session token or anon key.
                xhr.setRequestHeader('apikey', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                // x-upsert removed to avoid 400 errors for anonymous users who lack UPDATE permissions.
                // We handle "already exists" errors in the onload handler below.
                
                // Set explicit timeout (e.g., 5 minutes per chunk to allow slow uploads)
                xhr.timeout = 300000; 

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const diff = e.loaded - chunkUploadedBytes;
                        // Only count positive progress (in case of retry where it resets)
                        if (diff > 0) {
                            chunkUploadedBytes = e.loaded;
                            totalUploadedBytes += diff;
                            bytesSinceLastUpdate += diff;
                        }
                        
                        // Update speed/progress every 500ms
                        const now = performance.now();
                        if (now - lastSpeedUpdate > 500) {
                            const timeDiff = (now - lastSpeedUpdate) / 1000;
                            const instantSpeed = bytesSinceLastUpdate / timeDiff;
                            
                            // Smooth speed
                            currentSpeed = (currentSpeed * (1 - SMOOTHING_FACTOR)) + (instantSpeed * SMOOTHING_FACTOR);
                            if (currentSpeed === 0) currentSpeed = instantSpeed;

                            const percent = Math.min(99, Math.round((totalUploadedBytes / totalSize) * 100));
                            const remainingBytes = totalSize - totalUploadedBytes;
                            const eta = currentSpeed > 0 ? Math.ceil(remainingBytes / currentSpeed) : 0;

                            onProgress({ percent, speed: currentSpeed, eta });
                            
                            lastSpeedUpdate = now;
                            bytesSinceLastUpdate = 0;
                        }
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                    } else {
                        // Handle "already exists" for anonymous uploads/retries
                        if (xhr.status === 400 || xhr.status === 409) {
                            try {
                                const response = JSON.parse(xhr.responseText);
                                // Supabase/S3 typically returns "The resource already exists"
                                if (response.message === "The resource already exists" || response.error === "Duplicate") {
                                    resolve();
                                    return;
                                }
                            } catch (e) {
                                // Ignore JSON parse error
                            }
                        }

                        let errorMessage = `Upload failed with status ${xhr.status}`;
                        try {
                            const response = JSON.parse(xhr.responseText);
                            if (response.message) errorMessage += `: ${response.message}`;
                        } catch (e) {
                            if (xhr.responseText) errorMessage += `: ${xhr.responseText.slice(0, 100)}`;
                        }
                        reject(new Error(errorMessage));
                    }
                };

                xhr.onerror = () => reject(new Error("Network error"));
                xhr.ontimeout = () => reject(new Error("Request timed out"));
                
                xhr.send(payload);
            });
            
            // Success!
            break; 

        } catch (e: any) {
            console.warn(`Chunk ${index} failed, retrying... (${retries} left)`, e);
            retries--;
            
            // If we failed, we need to subtract the bytes we "thought" we uploaded for this chunk from the total
            // so the progress bar doesn't look weird.
            totalUploadedBytes -= chunkUploadedBytes;
            chunkUploadedBytes = 0;

            if (retries === 0) throw e;
            
            // Exponential backoff: 1s, 2s, 4s
            const delay = 1000 * Math.pow(2, 3 - retries);
            await new Promise(r => setTimeout(r, delay));
        }
    }
  };

  // Queue Manager
  for (let i = 0; i < totalChunks; i++) {
    if (activeUploads.size >= CONCURRENCY_LIMIT) {
        await Promise.race(activeUploads);
    }
    
    const task = uploadChunkTask(i).then(() => {
        activeUploads.delete(task);
    });
    
    activeUploads.add(task);
  }
  
  await Promise.all(activeUploads);
}
