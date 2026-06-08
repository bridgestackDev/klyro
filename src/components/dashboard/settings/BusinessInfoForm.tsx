'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { COUNTRIES, type CountryCode } from '@/lib/i18n/countries';
import { updateBusinessInfo } from '@/lib/actions/settings';

interface BusinessInfoFormProps {
  defaultValues: {
    name: string;
    country: string;
    default_currency: string;
    default_language: string;
  };
}

export function BusinessInfoForm({ defaultValues }: BusinessInfoFormProps) {
  const t = useTranslations('settings.business');
  const [form, setForm] = useState(defaultValues);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleCountryChange(code: string) {
    set('country', code);
    const currency = COUNTRIES[code as CountryCode]?.currency;
    if (currency) set('default_currency', currency);
  }

  function handleSubmit() {
    startTransition(async () => {
      try {
        await updateBusinessInfo({
          name: form.name,
          country: form.country as CountryCode,
          default_currency: form.default_currency,
          default_language: form.default_language as 'es' | 'en',
        });
        toast.success(t('saved'));
      } catch {
        toast.error(t('failed'));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="biz-name">{t('nameLabel')}</Label>
        <Input
          id="biz-name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          maxLength={120}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="biz-country">{t('countryLabel')}</Label>
        <select
          id="biz-country"
          value={form.country}
          onChange={(e) => handleCountryChange(e.target.value)}
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
        <Label htmlFor="biz-currency">{t('currencyLabel')}</Label>
        <Input
          id="biz-currency"
          value={form.default_currency}
          onChange={(e) => set('default_currency', e.target.value)}
          maxLength={10}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="biz-language">{t('languageLabel')}</Label>
        <select
          id="biz-language"
          value={form.default_language}
          onChange={(e) => set('default_language', e.target.value)}
          className="w-full rounded-[var(--radius-button)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </div>

      <Button onClick={handleSubmit} disabled={pending}>
        {pending ? t('saving') : t('save')}
      </Button>
    </div>
  );
}
