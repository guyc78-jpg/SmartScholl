export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_FILE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function validateFileSize(file, maxBytes = MAX_IMPORT_FILE_BYTES) {
  if (!file) return '';
  if (file.size > maxBytes) return `הקובץ גדול מדי. הגודל המרבי הוא ${Math.round(maxBytes / 1024 / 1024)}MB.`;
  return '';
}

export function validateImageFile(file, maxBytes = MAX_IMAGE_FILE_BYTES) {
  const sizeError = validateFileSize(file, maxBytes);
  if (sizeError) return sizeError;
  if (!file || !ALLOWED_IMAGE_TYPES.has(String(file.type || '').toLowerCase())) {
    return 'ניתן להעלות תמונת JPG, PNG, WebP או GIF בלבד.';
  }
  return '';
}
