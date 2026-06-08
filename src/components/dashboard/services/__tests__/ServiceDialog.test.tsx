import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServiceDialog } from '../ServiceDialog';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/actions/services', () => ({
  addService: vi.fn().mockResolvedValue({ id: 'new-id' }),
  updateService: vi.fn().mockResolvedValue(undefined),
}));

const BASE_SERVICE = {
  id: 's1', business_id: 'biz1', name: 'Corte', duration_minutes: 45,
  price: 150, currency: 'HNL', is_active: true, created_at: '2026-01-01T00:00:00Z',
};

describe('ServiceDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders add title when no initialData', () => {
    render(<ServiceDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('addTitle')).toBeInTheDocument();
  });

  it('renders edit title when initialData provided', () => {
    render(<ServiceDialog open={true} onOpenChange={vi.fn()} initialData={BASE_SERVICE} />);
    expect(screen.getByText('editTitle')).toBeInTheDocument();
  });

  it('pre-fills the name field', () => {
    render(<ServiceDialog open={true} onOpenChange={vi.fn()} initialData={BASE_SERVICE} />);
    expect(screen.getByDisplayValue('Corte')).toBeInTheDocument();
  });

  it('calls addService and closes on save', async () => {
    const { addService } = await import('@/lib/actions/services');
    const onOpenChange = vi.fn();
    render(<ServiceDialog open={true} onOpenChange={onOpenChange} />);

    await userEvent.type(screen.getByLabelText('nameLabel'), 'Nuevo');
    await userEvent.click(screen.getByText('save'));

    await vi.waitFor(() => expect(addService).toHaveBeenCalled());
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
