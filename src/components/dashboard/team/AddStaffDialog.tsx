'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
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
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setDisplayName('');
    setSelected([]);
    setError(null);
  }

  function toggleBranch(id: string) {
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((b) => b !== id) : [...cur, id]
    );
  }

  function handleSubmit() {
    if (displayName.trim().length < 2) {
      setError(t('add.nameError'));
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await addStaffMember({ displayName: displayName.trim(), branchIds: selected });
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('add.title')}</DialogTitle>
          <DialogDescription>{t('add.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="staff-name">{t('add.nameLabel')}</Label>
            <Input
              id="staff-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('add.namePlaceholder')}
              maxLength={80}
              autoComplete="off"
            />
            {error && (
              <p className="text-xs text-[var(--color-danger)]" role="alert">
                {error}
              </p>
            )}
          </div>

          {branches.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-[var(--color-text-primary)]">
                {t('add.branchesLabel')}
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
            </fieldset>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {t('add.cancel')}
          </DialogClose>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? t('add.saving') : t('add.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
