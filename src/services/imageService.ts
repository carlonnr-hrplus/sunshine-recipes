import { supabase } from '@/lib/supabaseClient';

const BUCKET = 'recipe-images';
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageUploadError';
  }
}

/** Validate a file before upload */
function validateFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ImageUploadError(
      `Unsupported file type "${file.type}". Allowed: JPEG, PNG, WebP, GIF.`,
    );
  }
  if (file.size > MAX_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new ImageUploadError(
      `File is too large (${sizeMB} MB). Maximum size is 5 MB.`,
    );
  }
}

/** Derive a file extension from a MIME type */
function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[mime] ?? 'jpg';
}

/**
 * Upload a recipe image to Supabase Storage.
 * Files are stored under `recipe-images/{userId}/{uuid}.{ext}`.
 * Returns the public URL of the uploaded image.
 */
export async function uploadRecipeImage(file: File): Promise<string> {
  validateFile(file);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ImageUploadError('You must be signed in to upload images.');

  const ext = extFromMime(file.type);
  const filename = `${crypto.randomUUID()}.${ext}`;
  const path = `${user.id}/${filename}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw new ImageUploadError(`Upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return urlData.publicUrl;
}

/**
 * Check whether a URL points to our Supabase Storage bucket.
 * Only our own uploads should be deleted from storage.
 */
export function isStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  return url.startsWith(`${supabaseUrl}/storage/v1/object/public/${BUCKET}/`);
}

/**
 * Extract the storage path from a public URL.
 * e.g. `https://xyz.supabase.co/storage/v1/object/public/recipe-images/uid/file.jpg`
 *   → `uid/file.jpg`
 */
function storagePathFromUrl(url: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const prefix = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/`;
  return url.slice(prefix.length);
}

/**
 * Delete an image from Supabase Storage.
 * No-op if the URL is not a storage URL (i.e. it's an external link).
 */
export async function deleteRecipeImage(url: string | null | undefined): Promise<void> {
  if (!isStorageUrl(url)) return;

  const path = storagePathFromUrl(url!);
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    // Log but don't throw — image cleanup is best-effort
    console.warn(`Failed to delete image from storage: ${error.message}`);
  }
}
