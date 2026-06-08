import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BranchCard } from '../BranchCard';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('lucide-react', () => ({
  MapPin: () => null, Clock: () => null, Phone: () => null, Pencil: () => null,
}));

const BASE_BRANCH = {
  id: 'b1',
  business_id: 'biz1',
  name: 'Sucursal Norte',
  slug: 'norte',
  address: 'Calle 1',
  city: 'Tegucigalpa',
  country: 'HN',
  timezone: 'America/Tegucigalpa',
  phone: null,
  whatsapp_number: '+50498765432',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

describe('BranchCard', () => {
  it('renders the branch name', () => {
    render(<BranchCard branch={BASE_BRANCH} onEdit={vi.fn()} />);
    expect(screen.getByText('Sucursal Norte')).toBeInTheDocument();
  });

  it('renders the active badge when is_active is true', () => {
    render(<BranchCard branch={BASE_BRANCH} onEdit={vi.fn()} />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('renders the inactive badge when is_active is false', () => {
    render(<BranchCard branch={{ ...BASE_BRANCH, is_active: false }} onEdit={vi.fn()} />);
    expect(screen.getByText('inactive')).toBeInTheDocument();
  });

  it('calls onEdit with the branch when the edit button is clicked', async () => {
    const onEdit = vi.fn();
    render(<BranchCard branch={BASE_BRANCH} onEdit={onEdit} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onEdit).toHaveBeenCalledWith(BASE_BRANCH);
  });

  it('renders the city', () => {
    render(<BranchCard branch={BASE_BRANCH} onEdit={vi.fn()} />);
    expect(screen.getByText('Tegucigalpa')).toBeInTheDocument();
  });
});
