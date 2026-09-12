/**
 * File utility helpers: size formatting, date formatting, mime icons
 */

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(timestamp: number): string {
  // If in seconds, convert to ms
  const ms = timestamp > 1e11 ? timestamp : timestamp * 1000;
  const date = new Date(ms);
  
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getFileTypeCategory(mimeType: string, fileName: string): 'image' | 'video' | 'audio' | 'pdf' | 'doc' | 'archive' | 'code' | 'other' {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mime = (mimeType || '').toLowerCase();

  if (
    mime.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'tiff', 'tif', 'heic', 'heif', 'eps', 'ai', 'psd'].includes(ext)
  ) {
    return 'image';
  }
  if (
    mime.startsWith('video/') ||
    ['mp4', 'mkv', 'mov', 'webm', 'avi', 'flv', 'wmv', 'm4v', '3gp', 'ts'].includes(ext)
  ) {
    return 'video';
  }
  if (
    mime.startsWith('audio/') ||
    ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus', 'mid', 'midi', 'weba'].includes(ext)
  ) {
    return 'audio';
  }
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (
    ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'odt', 'ods', 'odp'].includes(ext) ||
    mime.includes('document') ||
    mime.includes('sheet') ||
    mime.includes('presentation') ||
    mime.includes('excel') ||
    mime.includes('word') ||
    mime.includes('powerpoint')
  ) {
    return 'doc';
  }
  if (
    ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'tgz'].includes(ext) ||
    mime.includes('zip') ||
    mime.includes('compressed') ||
    mime.includes('tar') ||
    mime.includes('archive')
  ) {
    return 'archive';
  }
  if (
    ['js', 'ts', 'jsx', 'tsx', 'json', 'html', 'css', 'scss', 'py', 'go', 'rs', 'c', 'cpp', 'h', 'hpp', 'java', 'php', 'rb', 'sh', 'bash', 'zsh', 'sql', 'yaml', 'yml', 'xml', 'md', 'env', 'toml'].includes(ext) ||
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    mime.includes('json') ||
    mime.includes('xml')
  ) {
    return 'code';
  }
  return 'other';
}
