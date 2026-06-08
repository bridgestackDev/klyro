import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServiceRow } from '../ServiceRow';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string, p?: Record<string, unknown>) => p ? `${k}:${JSON.stringify(p)}` : k }));
vi.mock('@/lib/actions/services', () => ({ setServiceActive: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/format/currency', () => ({ formatCurrency: (amount: number, currency: string) => `${currency} ${amount}` }));
vi.mock('lucide-react', () => ({ Pencil: () => null }));

const BASE_SERVICE = {
  id: 's1', business_id: 'biz1', name: 'Corte', duration_minutes: 45,
  price: 150, currency: 'HNL', is_active: true, created_at: '2026-01-01T00:00:00Z',
};

describe('ServiceRow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the service name', () => {
    render(<ServiceRow service={BASE_SERVICE} onEdit={vi.fn()} />);
    expect(screen.getByText('Corte')).toBeInTheDocument();
  });

  it('renders the formatted duration', () => {
    render(<ServiceRow service={BASE_SERVICE} onEdit={vi.fn()} />);
    expect(screen.getByText('45 min')).toBeInTheDocument();
  });

  it('renders the formatted price', () => {
    render(<ServiceRow service={BASE_SERVICE} onEdit={vi.fn()} />);
    expect(screen.getByText('HNL 150')).toBeInTheDocument();
  });

  it('renders the active badge', () => {
    render(<ServiceRow service={BASE_SERVICE} onEdit={vi.fn()} />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('calls onEdit when the edit button is clicked', async () => {
    const onEdit = vi.fn();
    render(<ServiceRow service={BASE_SERVICE} onEdit={onEdit} />);
    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(BASE_SERVICE);
  });
});
