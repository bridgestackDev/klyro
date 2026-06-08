'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceRow } from './ServiceRow';
import { ServiceDialog } from './ServiceDialog';
import type { Database } from '@/types/database';

type Service = Database['public']['Tables']['services']['Row'];

interface ServiceListProps {
  services: Service[];
  defaultCurrency: string;
  addButtonLabel: string;
  emptyLabel: string;
}

export function ServiceList({
  services,
  defaultCurrency,
  addButtonLabel,
  emptyLabel,
}: ServiceListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | undefined>();

  function openAdd() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setDialogOpen(true);
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          {addButtonLabel}
        </Button>
      </div>

      {services.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {services.map((s) => (
            <ServiceRow key={s.id} service={s} onEdit={openEdit} />
          ))}
        </div>
      )}

      <ServiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={editing}
        defaultCurrency={defaultCurrency}
      />
    </>
  );
}
