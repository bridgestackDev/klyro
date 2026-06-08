import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LinkCard } from '../LinkCard';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('@/lib/format/initials', () => ({ getInitials: (name: string) => name[0] ?? '?' }));
vi.mock('../QrCode', () => ({ QrCode: () => <div data-testid="qr-code" /> }));
vi.mock('lucide-react', () => ({ Copy: () => null, Check: () => null }));

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  configurable: true,
});

const LINK = {
  staffId: 's1',
  staffName: 'Ana García',
  staffSlug: 'ana',
  staffAvatarUrl: null,
  branchName: 'Centro',
  branchSlug: 'centro',
  url: 'https://klyro.app/es/salon/centro/ana',
};

describe('LinkCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders staff name', () => {
    render(<LinkCard link={LINK} />);
    expect(screen.getByText('Ana García')).toBeInTheDocument();
  });

  it('renders branch name as a chip', () => {
    render(<LinkCard link={LINK} />);
    expect(screen.getByText('Centro')).toBeInTheDocument();
  });

  it('renders the booking URL', () => {
    render(<LinkCard link={LINK} />);
    expect(screen.getByText('https://klyro.app/es/salon/centro/ana')).toBeInTheDocument();
  });

  it('copies the URL when copy button is clicked', async () => {
    render(<LinkCard link={LINK} />);
    await userEvent.click(screen.getByRole('button', { name: /copyLink/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(LINK.url);
  });

  it('renders the QrCode component', () => {
    render(<LinkCard link={LINK} />);
    expect(screen.getByTestId('qr-code')).toBeInTheDocument();
  });
});
