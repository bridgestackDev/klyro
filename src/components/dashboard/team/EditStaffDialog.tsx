'use client';

import { useState, useTransition } from 'react';
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
import { setStaffActive, updateStaffBranches } from '@/lib/actions/team';

interface Branch {
  id: string;
  name: string;
}

interface EditStaffDialogProps {
  staffId: string;
  staffName: string;
  businessId: string;
  currentAvatarUrl: string | null;
  isActive: boolean;
  branches: Branch[];
  assignedBranchIds: string[];
}

export function EditStaffDialog({
  staffId,
  staffName,
  businessId,
  currentAvatarUrl,
  isActive,
  branches,
  assignedBranchIds,
}: EditStaffDialogProps) {
  const t = useTranslations('team');
  const [active, setActive] = useState(isActive);
  const [selected, setSelected] = useState<string[]>(assignedBranchIds);
  const [pending, startTransition] = useTransition();

  const handleUploaded = async (publicUrl: string) => {
    try {
      await updateStaffAvatar(staffId, publicUrl);
      toast.success(t('avatar.updated'));
    } catch {
      toast.error(t('avatar.failed'));
    }
  };

  function handleToggleActive() {
    const next = !active;
    setActive(next);
    startTransition(async () => {
      try {
        await setStaffActive(staffId, next);
        toast.success(next ? t('status.activated') : t('status.deactivated'));
      } catch {
        setActive(!next); // revert on failure
        toast.error(t('status.failed'));
      }
    });
  }

  function toggleBranch(id: string) {
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((b) => b !== id) : [...cur, id]
    );
  }

  function handleSaveBranches() {
    startTransition(async () => {
      try {
        await updateStaffBranches({ staffId, branchIds: selected });
        toast.success(t('branches.saved'));
      } catch {
        toast.error(t('branches.failed'));
      }
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t('dialog.title')}</DialogTitle>
        <DialogDescription>{staffName}</DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
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

        {/* Active toggle */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              {t('status.label')}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">{t('status.help')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={active}
            aria-label={t('status.label')}
            disabled={pending}
            onClick={handleToggleActive}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
              active ? 'bg-[var(--color-violet)]' : 'bg-[var(--color-bg-elevated)]'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                active ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Branch assignment */}
        {branches.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-[var(--color-text-primary)]">
              {t('branches.label')}
            </legend>
            <div className="space-y-1.5">
              {branches.map((branch) => (
                <label
                  key={branch.id}
                  className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(branch.id)}
                    onChange={() => toggleBranch(branch.id)}
                    className="h-4 w-4 rounded border-[var(--border-subtle)] accent-[var(--color-violet)]"
                  />
                  {branch.name}
                </label>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveBranches}
              disabled={pending}
            >
              {t('branches.save')}
            </Button>
          </fieldset>
        )}
      </div>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>
          {t('dialog.close')}
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
