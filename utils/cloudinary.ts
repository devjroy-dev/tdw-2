/**
 * Inject Cloudinary on-the-fly transformations into an image URL.
 * - Caps width to typical phone resolution (default 900px = 2x ~450 logical)
 * - Auto-format (WebP on Android, AVIF if supported, JPG fallback)
 * - Auto-quality (~good-balance default)
 * - Face-aware fill crop so weddings render with bride/groom centered
 *
 * Safely no-ops on non-Cloudinary URLs (Pinterest, Instagram, direct hosting).
 *
 * Example:
 *   in:  https://res.cloudinary.com/dccso5ljv/image/upload/v123/abc.jpg
 *   out: https://res.cloudinary.com/dccso5ljv/image/upload/w_900,f_auto,q_auto,c_fill,g_auto/v123/abc.jpg
 */
export function optimizeCloudinary(url: string | undefined | null, width: number = 900): string {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com')) return url;
  // Already has transformations — don't double-transform
  if (url.includes('/image/upload/w_') || url.includes('/image/upload/c_') || url.includes('/image/upload/f_')) {
    return url;
  }
  return url.replace(
    '/image/upload/',
    `/image/upload/w_${width},f_auto,q_auto,c_fill,g_auto/`
  );
}

/** Smaller variant for thumbnails (Muse tiles, peek cards). */
export function optimizeCloudinaryThumb(url: string | undefined | null): string {
  return optimizeCloudinary(url, 450);
}
