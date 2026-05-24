'use client';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { updateStaffAvatar } from '@/lib/actions/media';

interface EditStaffDialogProps {
  staffId: string;
  staffName: string;
  businessId: string;
  currentAvatarUrl: string | null;
}

export function EditStaffDialog({
  staffId,
  staffName,
  businessId,
  currentAvatarUrl,
}: EditStaffDialogProps) {
  const t = useTranslations('team');

  const handleUploaded = async (publicUrl: string) => {
    try {
      await updateStaffAvatar(staffId, publicUrl);
      toast.success(t('avatar.updated'));
    } catch {
      toast.error(t('avatar.failed'));
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t('dialog.title')}</DialogTitle>
        <DialogDescription>{staffName}</DialogDescription>
      </DialogHeader>

      <ImageUpload
        bucket="staff-avatars"
        path={`${businessId}/${staffId}.png`}
        currentUrl={currentAvatarUrl}
        onUploaded={handleUploaded}
        aspect="square"
        maxSizeMB={1}
        label={t('dialog.avatar.label')}
        helpText={t('dialog.avatar.help')}
      />

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>
          {t('dialog.close')}
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
