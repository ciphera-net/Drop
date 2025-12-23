import { createSHA256 } from 'hash-wasm';

export type FileCategory = 'image' | 'video' | 'audio' | 'pdf' | 'archive' | 'code' | 'text' | 'other';

export async function calculateFileHash(file: File): Promise<string> {
  const hasher = await createSHA256();
  const chunkSize = 10 * 1024 * 1024; // 10MB chunk size for hashing
  const totalChunks = Math.ceil(file.size / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    const buffer = await chunk.arrayBuffer();
    hasher.update(new Uint8Array(buffer));
  }

  return hasher.digest();
}

export function getFileCategory(file: File): FileCategory {
  const mimeType = file.type;
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  
  const archiveTypes = [
    'application/zip', 
    'application/x-zip-compressed', 
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/gzip'
  ];
  if (archiveTypes.includes(mimeType) || ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
    return 'archive';
  }

  const codeExtensions = [
    'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'php', 'rb', 'go', 'rs', 'sql', 'sh', 'yaml', 'yml', 'xml', 'md'
  ];
  if (codeExtensions.includes(extension)) {
    return 'code';
  }

  if (mimeType.startsWith('text/')) return 'text';

  return 'other';
}

