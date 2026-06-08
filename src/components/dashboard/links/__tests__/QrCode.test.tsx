import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QrCode } from '../QrCode';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('qrcode', () => ({
  default: { toCanvas: vi.fn().mockResolvedValue(undefined) },
  toCanvas: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('lucide-react', () => ({ Download: () => <span>download-icon</span> }));

describe('QrCode', () => {
  it('renders a canvas element', () => {
    render(<QrCode url="https://klyro.app/es/salon/centro/ana" staffSlug="ana" />);
    expect(document.querySelector('canvas')).toBeInTheDocument();
  });

  it('renders the download button', () => {
    render(<QrCode url="https://klyro.app/es/salon/centro/ana" staffSlug="ana" />);
    expect(screen.getByRole('button', { name: /downloadQr/i })).toBeInTheDocument();
  });
});
