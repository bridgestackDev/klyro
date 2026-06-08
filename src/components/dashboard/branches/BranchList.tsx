'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BranchCard } from './BranchCard';
import { BranchSheet } from './BranchSheet';
import type { Database } from '@/types/database';

type Branch = Database['public']['Tables']['branches']['Row'];

interface BranchListProps {
  branches: Branch[];
  addButtonLabel: string;
  emptyLabel: string;
}

export function BranchList({ branches, addButtonLabel, emptyLabel }: BranchListProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | undefined>();

  function openAdd() {
    setEditing(undefined);
    setSheetOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    setSheetOpen(true);
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          {addButtonLabel}
        </Button>
      </div>

      {branches.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">
          {branches.map((b) => (
            <BranchCard key={b.id} branch={b} onEdit={openEdit} />
          ))}
        </div>
      )}

      <BranchSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialData={editing}
      />
    </>
  );
}
