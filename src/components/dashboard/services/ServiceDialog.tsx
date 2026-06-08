'use client';

import { useState, useTransition, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Dialog,
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
import { addService, updateService } from '@/lib/actions/services';
import type { Database } from '@/types/database';

type Service = Database['public']['Tables']['services']['Row'];

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Service;
  defaultCurrency?: string;
}

type FormState = {
  name: string;
  duration_minutes: string;
  price: string;
  currency: string;
};

function defaultForm(currency: string): FormState {
  return { name: '', duration_minutes: '45', price: '0', currency };
}

function formFromService(s: Service): FormState {
  return {
    name: s.name,
    duration_minutes: String(s.duration_minutes),
    price: String(s.price),
    currency: s.currency,
  };
}

export function ServiceDialog({
  open,
  onOpenChange,
  initialData,
  defaultCurrency = 'HNL',
}: ServiceDialogProps) {
  const t = useTranslations('dashboard.services');
  const isEdit = Boolean(initialData);
  const [form, setForm] = useState<FormState>(
    initialData ? formFromService(initialData) : defaultForm(defaultCurrency)
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setForm(initialData ? formFromService(initialData) : defaultForm(defaultCurrency));
  }, [initialData, defaultCurrency]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    startTransition(async () => {
      const payload = {
        name: form.name.trim(),
        duration_minutes: parseInt(form.duration_minutes, 10) || 0,
        price: parseFloat(form.price || '0'),
        currency: form.currency,
      };
      try {
        if (isEdit && initialData) {
          await updateService(initialData.id, payload);
        } else {
          await addService(payload);
        }
        toast.success(t('saved'));
        onOpenChange(false);
      } catch {
        toast.error(t('failed'));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editTitle') : t('addTitle')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('editDescription') : t('addDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="svc-name">{t('nameLabel')}</Label>
            <Input
              id="svc-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder={t('namePlaceholder')}
              maxLength={120}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="svc-duration">{t('durationLabel')}</Label>
              <Input
                id="svc-duration"
                type="number"
                min={5}
                max={480}
                value={form.duration_minutes}
                onChange={(e) => set('duration_minutes', e.target.value)}
                placeholder={t('durationPlaceholder')}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="svc-price">{t('priceLabel')}</Label>
              <Input
                id="svc-price"
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder={t('pricePlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-currency">{t('currencyLabel')}</Label>
              <Input
                id="svc-currency"
                value={form.currency}
                onChange={(e) => set('currency', e.target.value)}
                maxLength={10}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={pending} />}>
            {t('cancel')}
          </DialogClose>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? t('saving') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
