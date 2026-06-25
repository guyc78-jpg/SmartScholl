export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_FILE_BYTES = 3 * 1024 * 1024;

export function validateFileSize(file, maxBytes = MAX_IMPORT_FILE_BYTES) {
  if (!file) return '';
  if (file.size > maxBytes) return `הקובץ גדול מדי. הגודל המרבי הוא ${Math.round(maxBytes / 1024 / 1024)}MB.`;
  return '';
}
