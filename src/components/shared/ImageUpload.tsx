'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/shared/Logo';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
const MAX_DIMENSION = 1024;

interface ImageUploadProps {
  bucket: 'business-logos' | 'staff-avatars';
  path: string;
  currentUrl: string | null;
  onUploaded: (publicUrl: string) => void | Promise<void>;
  maxSizeMB?: number;
  aspect?: 'square' | 'free';
  label?: string;
  helpText?: string;
  disabled?: boolean;
}

async function resizeIfNeeded(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { naturalWidth: w, naturalHeight: h } = img;

      if (w <= MAX_DIMENSION && h <= MAX_DIMENSION) {
        resolve(file);
        return;
      }

      const scale = MAX_DIMENSION / Math.max(w, h);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('canvas toBlob failed'));
            return;
          }
          resolve(blob);
        },
        file.type,
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('image load failed'));
    };

    img.src = objectUrl;
  });
}

export function ImageUpload({
  bucket,
  path,
  currentUrl,
  onUploaded,
  maxSizeMB = 2,
  aspect = 'square',
  label,
  helpText,
  disabled = false,
}: ImageUploadProps) {
  const t = useTranslations('media.upload');
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerPicker = () => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      triggerPicker();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected after an error
    e.target.value = '';

    setError(null);

    if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
      setError(t('wrongType'));
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(t('tooLarge', { max: maxSizeMB }));
      return;
    }

    setUploading(true);
    try {
      const blob = await resizeIfNeeded(file);
      const supabase = createClient();

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, blob, { upsert: true, contentType: file.type });

      if (uploadError) {
        setError(t('failed'));
        return;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      await onUploaded(data.publicUrl);
    } catch {
      setError(t('failed'));
    } finally {
      setUploading(false);
    }
  };

  const hasImage = Boolean(currentUrl);
  const buttonLabel = hasImage ? t('change') : t('button');
  const aspectClass = aspect === 'square' ? 'aspect-square' : '';

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-sm font-medium text-[--color-text-primary]">{label}</span>
      )}

      <button
        type="button"
        onClick={triggerPicker}
        onKeyDown={handleKeyDown}
        disabled={disabled || uploading}
        aria-label={buttonLabel}
        className={[
          'relative flex items-center justify-center w-32 rounded-xl border-2 border-dashed',
          'border-[--color-border] bg-[--color-bg-surface] transition-colors',
          'hover:border-[--color-violet] focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-[--color-violet] focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
          aspectClass,
        ].join(' ')}
      >
        {uploading && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40"
            aria-hidden="true"
          >
            <svg
              className="animate-spin h-6 w-6 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="sr-only">{t('uploading')}</span>
          </div>
        )}

        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl!}
            alt=""
            className="w-full h-full object-cover rounded-[10px]"
          />
        ) : (
          <span className="opacity-20">
            <Logo variant="mark" />
          </span>
        )}
      </button>

      {helpText && (
        <p className="text-xs text-[--color-text-secondary]">{helpText}</p>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />
    </div>
  );
}

export default ImageUpload;
