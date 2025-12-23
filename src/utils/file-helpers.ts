export type FileCategory = 'image' | 'video' | 'audio' | 'pdf' | 'archive' | 'code' | 'text' | 'other';

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

