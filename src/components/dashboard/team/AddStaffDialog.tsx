'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, Mail, Phone, User } from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
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
import { addStaffMember } from '@/lib/actions/team';

interface AddStaffDialogProps {
  branches: Array<{ id: string; name: string }>;
}

export function AddStaffDialog({ branches }: AddStaffDialogProps) {
  const t = useTranslations('team');
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setDisplayName('');
    setEmail('');
    setPhone('');
    setSelected([]);
    setError(null);
  }

  function toggleBranch(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((b) => b !== id) : [...cur, id]));
  }

  function handleSubmit() {
    if (displayName.trim().length < 2) {
      setError(t('add.nameError'));
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await addStaffMember({
          displayName: displayName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          branchIds: selected,
        });
        toast.success(t('add.created'));
        reset();
        setOpen(false);
      } catch {
        toast.error(t('add.failed'));
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <Plus className="h-4 w-4" />
            {t('add.button')}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('add.title')}</DialogTitle>
          <DialogDescription>{t('add.description')}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="staff-name">{t('add.nameLabel')}</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <Input
                id="staff-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('add.namePlaceholder')}
                maxLength={80}
                className="pl-9"
                autoComplete="off"
              />
            </div>
            {error && (
              <p className="text-xs text-[var(--color-danger)]" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="staff-email">{t('contact.email')}</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <Input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('contact.emailPlaceholder')}
                className="pl-9"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="staff-phone">{t('contact.phone')}</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <Input
                id="staff-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('contact.phonePlaceholder')}
                className="pl-9"
                autoComplete="off"
              />
            </div>
          </div>

          {branches.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-[var(--color-text-primary)]">
                {t('add.branchesLabel')}
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
          )}
        </div>

        <DialogFooter className="border-[var(--border-subtle)] bg-transparent">
          <DialogClose render={<Button variant="outline" />}>{t('add.cancel')}</DialogClose>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? t('add.saving') : t('add.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
