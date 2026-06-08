import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BranchSheet } from '../BranchSheet';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/actions/branches', () => ({
  addBranch: vi.fn().mockResolvedValue({ id: 'new-id' }),
  updateBranch: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/components/wizard/CountryPhoneInput', () => ({
  CountryPhoneInput: ({ id }: { id: string }) => <input id={id} data-testid="phone-input" />,
}));

describe('BranchSheet', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the add title when no initialData', () => {
    render(<BranchSheet open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('addTitle')).toBeInTheDocument();
  });

  it('renders the edit title when initialData is provided', () => {
    const branch = {
      id: 'b1', business_id: 'biz1', name: 'Centro', slug: 'centro',
      address: null, city: 'Tegucigalpa', country: 'HN', timezone: 'America/Tegucigalpa',
      phone: null, whatsapp_number: null, is_active: true, created_at: '2026-01-01T00:00:00Z',
    };
    render(<BranchSheet open={true} onOpenChange={vi.fn()} initialData={branch} />);
    expect(screen.getByText('editTitle')).toBeInTheDocument();
  });

  it('pre-fills the name field with initialData.name', () => {
    const branch = {
      id: 'b1', business_id: 'biz1', name: 'Centro', slug: 'centro',
      address: null, city: null, country: 'HN', timezone: 'America/Tegucigalpa',
      phone: null, whatsapp_number: null, is_active: true, created_at: '2026-01-01T00:00:00Z',
    };
    render(<BranchSheet open={true} onOpenChange={vi.fn()} initialData={branch} />);
    expect(screen.getByDisplayValue('Centro')).toBeInTheDocument();
  });

  it('shows a validation error when save is clicked with an empty name', async () => {
    render(<BranchSheet open={true} onOpenChange={vi.fn()} />);
    await userEvent.click(screen.getByText('save'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('calls addBranch and closes on successful save', async () => {
    const onOpenChange = vi.fn();
    const { addBranch } = await import('@/lib/actions/branches');
    render(<BranchSheet open={true} onOpenChange={onOpenChange} />);

    await userEvent.type(screen.getByLabelText('nameLabel'), 'New Branch');
    await userEvent.click(screen.getByText('save'));

    await vi.waitFor(() => expect(addBranch).toHaveBeenCalled());
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
