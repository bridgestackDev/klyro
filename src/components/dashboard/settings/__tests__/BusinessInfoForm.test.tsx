import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BusinessInfoForm } from '../BusinessInfoForm';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/actions/settings', () => ({
  updateBusinessInfo: vi.fn().mockResolvedValue(undefined),
}));

const DEFAULT_VALUES = {
  name: 'Barbería Clásica',
  country: 'HN',
  default_currency: 'HNL',
  default_language: 'es',
};

describe('BusinessInfoForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the business name field', () => {
    render(<BusinessInfoForm defaultValues={DEFAULT_VALUES} />);
    expect(screen.getByLabelText('nameLabel')).toBeInTheDocument();
  });

  it('pre-fills the name from defaultValues', () => {
    render(<BusinessInfoForm defaultValues={DEFAULT_VALUES} />);
    expect(screen.getByDisplayValue('Barbería Clásica')).toBeInTheDocument();
  });

  it('calls updateBusinessInfo when save is clicked', async () => {
    const { updateBusinessInfo } = await import('@/lib/actions/settings');
    render(<BusinessInfoForm defaultValues={DEFAULT_VALUES} />);

    await userEvent.click(screen.getByText('save'));

    await vi.waitFor(() => expect(updateBusinessInfo).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Barbería Clásica' })
    ));
  });
});
