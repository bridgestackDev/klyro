'use client';

import { useState, useTransition, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CountryPhoneInput } from '@/components/wizard/CountryPhoneInput';
import { COUNTRIES, DEFAULT_COUNTRY, type CountryCode } from '@/lib/i18n/countries';
import { addBranch, updateBranch } from '@/lib/actions/branches';
import type { Database } from '@/types/database';

type Branch = Database['public']['Tables']['branches']['Row'];

interface BranchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Branch;
}

type FormState = {
  name: string;
  address: string;
  city: string;
  country: CountryCode;
  timezone: string;
  phone: string;
  whatsapp_number: string;
};

function defaultForm(): FormState {
  return {
    name: '',
    address: '',
    city: '',
    country: DEFAULT_COUNTRY,
    timezone: COUNTRIES[DEFAULT_COUNTRY].timezone,
    phone: '',
    whatsapp_number: '',
  };
}

function formFromBranch(b: Branch): FormState {
  return {
    name: b.name,
    address: b.address ?? '',
    city: b.city ?? '',
    country: (b.country as CountryCode) ?? DEFAULT_COUNTRY,
    timezone: b.timezone,
    phone: b.phone ?? '',
    whatsapp_number: b.whatsapp_number ?? '',
  };
}

export function BranchSheet({ open, onOpenChange, initialData }: BranchSheetProps) {
  const t = useTranslations('dashboard.branches');
  const isEdit = Boolean(initialData);
  const [form, setForm] = useState<FormState>(
    initialData ? formFromBranch(initialData) : defaultForm()
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setForm(initialData ? formFromBranch(initialData) : defaultForm());
    setNameError(null);
  }, [initialData]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleCountryChange(code: CountryCode) {
    set('country', code);
    set('timezone', COUNTRIES[code].timezone);
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      setNameError(t('nameRequired'));
      return;
    }
    setNameError(null);
    startTransition(async () => {
      try {
        if (isEdit && initialData) {
          await updateBranch(initialData.id, form);
        } else {
          await addBranch(form);
        }
        toast.success(t('saved'));
        onOpenChange(false);
      } catch {
        toast.error(t('failed'));
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? t('editTitle') : t('addTitle')}</SheetTitle>
          <SheetDescription>{isEdit ? t('editDescription') : t('addDescription')}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="branch-name">{t('nameLabel')}</Label>
            <Input
              id="branch-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder={t('namePlaceholder')}
              maxLength={120}
            />
            {nameError && (
              <p className="text-xs text-[var(--color-danger)]" role="alert">
                {nameError}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch-country">{t('countryLabel')}</Label>
            <select
              id="branch-country"
              value={form.country}
              onChange={(e) => handleCountryChange(e.target.value as CountryCode)}
              className="w-full rounded-[var(--radius-button)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            >
              {Object.entries(COUNTRIES).map(([code, c]) => (
                <option key={code} value={code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch-city">{t('cityLabel')}</Label>
            <Input
              id="branch-city"
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              placeholder={t('cityPlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch-address">{t('addressLabel')}</Label>
            <Input
              id="branch-address"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder={t('addressPlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch-timezone">{t('timezoneLabel')}</Label>
            <Input
              id="branch-timezone"
              value={form.timezone}
              onChange={(e) => set('timezone', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch-phone">{t('phoneLabel')}</Label>
            <CountryPhoneInput
              id="branch-phone"
              country={form.country}
              value={form.phone}
              onChange={(v) => set('phone', v)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch-whatsapp">{t('whatsappLabel')}</Label>
            <CountryPhoneInput
              id="branch-whatsapp"
              country={form.country}
              value={form.whatsapp_number}
              onChange={(v) => set('whatsapp_number', v)}
            />
            <p className="text-xs text-[var(--color-text-muted)]">{t('whatsappHelp')}</p>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? t('saving') : t('save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
