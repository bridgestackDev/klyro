'use client';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { updateBusinessLogo } from '@/lib/actions/media';

interface BrandSettingsFormProps {
  businessId: string;
  currentLogoUrl: string | null;
}

export function BrandSettingsForm({ businessId, currentLogoUrl }: BrandSettingsFormProps) {
  const t = useTranslations('settings.brand');

  const handleUploaded = async (publicUrl: string) => {
    try {
      await updateBusinessLogo(publicUrl);
      toast.success(t('updated'));
    } catch {
      toast.error(t('failed'));
    }
  };

  return (
    <ImageUpload
      bucket="business-logos"
      path={`${businessId}/logo.png`}
      currentUrl={currentLogoUrl}
      onUploaded={handleUploaded}
      aspect="square"
      maxSizeMB={2}
      label={t('title')}
      helpText={t('help')}
    />
  );
}
