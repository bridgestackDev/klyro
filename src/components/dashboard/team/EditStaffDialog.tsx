'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Mail, Phone, User } from 'lucide-react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { updateStaffAvatar } from '@/lib/actions/media';
import { setStaffActive, updateStaffContact, updateStaffBranches } from '@/lib/actions/team';

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
  email: string | null;
  phone: string | null;
  branches: Branch[];
  assignedBranchIds: string[];
}

export function EditStaffDialog({
  staffId,
  staffName,
  businessId,
  currentAvatarUrl,
  isActive,
  email,
  phone,
  branches,
  assignedBranchIds,
}: EditStaffDialogProps) {
  const t = useTranslations('team');
  const [active, setActive] = useState(isActive);
  const [emailValue, setEmailValue] = useState(email ?? '');
  const [phoneValue, setPhoneValue] = useState(phone ?? '');
  const [selected, setSelected] = useState<string[]>(assignedBranchIds);
  const [savingToggle, startToggle] = useTransition();
  const [saving, startSave] = useTransition();

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
    startToggle(async () => {
      try {
        await setStaffActive(staffId, next);
        toast.success(next ? t('status.activated') : t('status.deactivated'));
      } catch {
        setActive(!next);
        toast.error(t('status.failed'));
      }
    });
  }

  function toggleBranch(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((b) => b !== id) : [...cur, id]));
  }

  function handleSave() {
    startSave(async () => {
      try {
        await updateStaffContact({
          staffId,
          email: emailValue.trim() || undefined,
          phone: phoneValue.trim() || undefined,
        });
        await updateStaffBranches({ staffId, branchIds: selected });
        toast.success(t('saved'));
      } catch {
        toast.error(t('saveFailed'));
      }
    });
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{t('dialog.title')}</DialogTitle>
        <DialogDescription>{staffName}</DialogDescription>
      </DialogHeader>

      <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
        {/* Photo */}
        <ImageUpload
          bucket="staff-avatars"
          path={`${businessId}/${staffId}.png`}
          currentUrl={currentAvatarUrl}
          onUploaded={handleUploaded}
          aspect="square"
          maxSizeMB={1}
          label={t('dialog.avatar.label')}
          helpText={t('dialog.avatar.help')}
          placeholder={<User className="h-9 w-9" />}
        />

        <div className="h-px bg-[var(--border-subtle)]" />

        {/* Active toggle */}
        <div className="flex items-center justify-between gap-4 rounded-[var(--radius-button)] bg-[var(--color-bg-elevated)] px-4 py-3">
          <div className="min-w-0">
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
            disabled={savingToggle}
            onClick={handleToggleActive}
            className={`inline-flex h-6 w-10 shrink-0 items-center rounded-full px-0.5 transition-colors disabled:opacity-50 ${
              active ? 'bg-[var(--color-violet)]' : 'bg-[var(--color-bg-hover)]'
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                active ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="h-px bg-[var(--border-subtle)]" />

        {/* Contact */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {t('contact.heading')}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor={`email-${staffId}`}>{t('contact.email')}</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <Input
                id={`email-${staffId}`}
                type="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                placeholder={t('contact.emailPlaceholder')}
                className="pl-9"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`phone-${staffId}`}>{t('contact.phone')}</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <Input
                id={`phone-${staffId}`}
                type="tel"
                value={phoneValue}
                onChange={(e) => setPhoneValue(e.target.value)}
                placeholder={t('contact.phonePlaceholder')}
                className="pl-9"
                autoComplete="off"
              />
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">{t('contact.phoneHelp')}</p>
          </div>
        </div>

        {/* Branches */}
        {branches.length > 0 && (
          <>
            <div className="h-px bg-[var(--border-subtle)]" />
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-[var(--color-text-primary)]">
                {t('branches.label')}
              </legend>
              <div className="grid grid-cols-2 gap-1.5">
                {branches.map((branch) => {
                  const checked = selected.includes(branch.id);
                  return (
                    <label
                      key={branch.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-[var(--radius-button)] border px-3 py-2 text-sm transition-colors ${
                        checked
                          ? 'border-[var(--color-violet)] bg-[var(--color-violet)]/10 text-[var(--color-text-primary)]'
                          : 'border-[var(--border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleBranch(branch.id)}
                        className="h-4 w-4 rounded border-[var(--border-subtle)] accent-[var(--color-violet)]"
                      />
                      {branch.name}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </>
        )}
      </div>

      <DialogFooter className="border-[var(--border-subtle)] bg-transparent">
        <DialogClose render={<Button variant="outline" />}>{t('dialog.close')}</DialogClose>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t('saving') : t('save')}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
