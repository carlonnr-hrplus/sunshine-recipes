import { useCallback, useRef, useState } from 'react';
import { uploadRecipeImage, ImageUploadError } from '@/services/imageService';

type ImageMode = 'url' | 'upload';

interface ImageUploadProps {
  /** Current image URL (from a previous save or external link) */
  value: string;
  /** Called when the resolved image URL changes */
  onChange: (url: string) => void;
  disabled?: boolean;
  error?: string;
}

export function ImageUpload({ value, onChange, disabled, error }: ImageUploadProps) {
  const [mode, setMode] = useState<ImageMode>(value ? 'url' : 'upload');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setUploadError(null);
      setUploading(true);

      // Show local preview immediately
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);

      try {
        const publicUrl = await uploadRecipeImage(file);
        onChange(publicUrl);
        setPreview(null);
        URL.revokeObjectURL(localUrl);
      } catch (err) {
        setPreview(null);
        URL.revokeObjectURL(localUrl);
        onChange('');
        if (err instanceof ImageUploadError) {
          setUploadError(err.message);
        } else {
          setUploadError('Upload failed. Please try again.');
        }
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so the same file can be re-selected
      e.target.value = '';
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith('image/')) handleFile(file);
    },
    [handleFile],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleFile(file);
            return;
          }
        }
      }
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const clearImage = useCallback(() => {
    onChange('');
    setPreview(null);
    setUploadError(null);
  }, [onChange]);

  const switchMode = useCallback(
    (newMode: ImageMode) => {
      setMode(newMode);
      setUploadError(null);
      setPreview(null);
      // Don't clear value — let user switch tabs without losing existing image
    },
    [],
  );

  const displayUrl = preview ?? (value || null);

  return (
    <div className="space-y-2">
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Image <span className="text-gray-400">(optional)</span>
      </label>

      {/* Mode tabs */}
      <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
        <button
          type="button"
          onClick={() => switchMode('url')}
          disabled={disabled || uploading}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === 'url'
              ? 'bg-white text-sunshine-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          } disabled:opacity-50`}
        >
          Paste URL
        </button>
        <button
          type="button"
          onClick={() => switchMode('upload')}
          disabled={disabled || uploading}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === 'upload'
              ? 'bg-white text-sunshine-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          } disabled:opacity-50`}
        >
          Upload Image
        </button>
      </div>

      {/* URL input */}
      {mode === 'url' && (
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || uploading}
          placeholder="https://example.com/image.jpg"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:border-sunshine-400 focus:outline-none focus:ring-2 focus:ring-sunshine-200
            disabled:bg-gray-50"
        />
      )}

      {/* Upload drop zone */}
      {mode === 'upload' && (
        <div
          ref={dropZoneRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onPaste={handlePaste}
          tabIndex={0}
          role="button"
          aria-label="Image upload area. Click to browse, drag and drop, or paste from clipboard."
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center
            rounded-lg border-2 border-dashed transition-colors
            ${dragOver ? 'border-sunshine-400 bg-sunshine-50' : 'border-gray-300 hover:border-gray-400'}
            ${uploading ? 'pointer-events-none opacity-60' : ''}
            ${disabled ? 'pointer-events-none bg-gray-50 opacity-50' : ''}
            focus:outline-none focus:ring-2 focus:ring-sunshine-200`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileInput}
            className="hidden"
            aria-hidden="true"
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-2 p-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-sunshine-300 border-t-sunshine-600" />
              <p className="text-xs text-gray-500">Uploading…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 p-4 text-center">
              <svg
                className="mb-1 h-8 w-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 16V4m0 0l-4 4m4-4l4 4M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4"
                />
              </svg>
              <p className="text-sm text-gray-600">
                <span className="font-medium text-sunshine-600">Click to browse</span>,
                drag &amp; drop, or paste from clipboard
              </p>
              <p className="text-xs text-gray-400">JPEG, PNG, WebP, GIF — max 5 MB</p>
            </div>
          )}
        </div>
      )}

      {/* Error messages */}
      {(uploadError ?? error) && (
        <p className="text-xs text-red-600">{uploadError ?? error}</p>
      )}

      {/* Preview */}
      {displayUrl && (
        <div className="relative inline-block">
          <img
            src={displayUrl}
            alt="Recipe preview"
            className="h-32 w-32 rounded-lg object-cover border border-gray-200"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {!uploading && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearImage();
              }}
              disabled={disabled}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center
                rounded-full bg-red-500 text-xs text-white shadow hover:bg-red-600
                disabled:opacity-50"
              aria-label="Remove image"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}
