import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrandSettingsForm } from '../BrandSettingsForm';

vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockUpdateBusinessLogo = vi.fn();
vi.mock('@/lib/actions/media', () => ({
  updateBusinessLogo: (...args: unknown[]) => mockUpdateBusinessLogo(...args),
}));

vi.mock('@/components/shared/ImageUpload', () => ({
  ImageUpload: (props: {
    bucket: string;
    path: string;
    currentUrl: string | null;
    onUploaded: (url: string) => void;
    aspect?: string;
    maxSizeMB?: number;
    label?: string;
    helpText?: string;
  }) => (
    <div
      data-testid="image-upload"
      data-bucket={props.bucket}
      data-path={props.path}
      data-current-url={props.currentUrl ?? ''}
      data-label={props.label}
    >
      <button
        type="button"
        onClick={() => props.onUploaded('https://cdn.example.com/logo.png')}
      >
        trigger-upload
      </button>
    </div>
  ),
}));

import { toast } from 'sonner';

describe('BrandSettingsForm', () => {
  const businessId = 'biz-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ImageUpload with correct bucket and path', () => {
    render(<BrandSettingsForm businessId={businessId} currentLogoUrl={null} />);
    const upload = screen.getByTestId('image-upload');
    expect(upload).toHaveAttribute('data-bucket', 'business-logos');
    expect(upload).toHaveAttribute('data-path', `${businessId}/logo.png`);
  });

  it('passes currentLogoUrl to ImageUpload', () => {
    render(
      <BrandSettingsForm businessId={businessId} currentLogoUrl="https://cdn.example.com/existing.png" />
    );
    expect(screen.getByTestId('image-upload')).toHaveAttribute(
      'data-current-url',
      'https://cdn.example.com/existing.png'
    );
  });

  it('calls updateBusinessLogo when onUploaded fires', async () => {
    mockUpdateBusinessLogo.mockResolvedValue(undefined);
    render(<BrandSettingsForm businessId={businessId} currentLogoUrl={null} />);
    screen.getByText('trigger-upload').click();
    await waitFor(() => {
      expect(mockUpdateBusinessLogo).toHaveBeenCalledWith('https://cdn.example.com/logo.png');
    });
  });

  it('shows a success toast on successful upload', async () => {
    mockUpdateBusinessLogo.mockResolvedValue(undefined);
    render(<BrandSettingsForm businessId={businessId} currentLogoUrl={null} />);
    screen.getByText('trigger-upload').click();
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('settings.brand.updated');
    });
  });

  it('shows an error toast when updateBusinessLogo throws', async () => {
    mockUpdateBusinessLogo.mockRejectedValue(new Error('network'));
    render(<BrandSettingsForm businessId={businessId} currentLogoUrl={null} />);
    screen.getByText('trigger-upload').click();
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('settings.brand.failed');
    });
  });
});
