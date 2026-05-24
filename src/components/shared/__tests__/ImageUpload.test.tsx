import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageUpload } from '../ImageUpload';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params?.max !== undefined) return `tooLarge:${params.max}`;
    return key;
  },
}));

vi.mock('@/components/shared/Logo', () => ({
  Logo: () => <div data-testid="logo-mark" />,
}));

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  }),
}));

// Image constructor: always reports 100×100 so canvas resize is skipped
class MockImage {
  naturalWidth = 100;
  naturalHeight = 100;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = '';
  get src() {
    return this._src;
  }
  set src(value: string) {
    this._src = value;
    queueMicrotask(() => this.onload?.());
  }
}

vi.stubGlobal('Image', MockImage);
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:fake'),
  revokeObjectURL: vi.fn(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const PUBLIC_URL = 'https://cdn.example.com/test.png';

function makeFile(name = 'photo.png', type = 'image/png', sizeMB = 0.1) {
  const size = Math.floor(sizeMB * 1024 * 1024);
  return new File([new Uint8Array(size)], name, { type });
}

function getFileInput() {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}

function uploadFile(file: File) {
  fireEvent.change(getFileInput(), { target: { files: [file] } });
}

const defaultProps = {
  bucket: 'business-logos' as const,
  path: 'biz-id/logo.png',
  currentUrl: null,
  onUploaded: vi.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ImageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: PUBLIC_URL } });
  });

  it('renders the logo placeholder when currentUrl is null', () => {
    render(<ImageUpload {...defaultProps} />);
    expect(screen.getByTestId('logo-mark')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('renders an img element when currentUrl is set', () => {
    const { container } = render(
      <ImageUpload {...defaultProps} currentUrl="https://cdn.example.com/existing.png" />
    );
    // img has alt="" (decorative, button provides context) so role is 'presentation'
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/existing.png');
  });

  it('rejects a file that exceeds maxSizeMB and does not call upload', async () => {
    render(<ImageUpload {...defaultProps} maxSizeMB={1} />);
    uploadFile(makeFile('big.png', 'image/png', 2));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByRole('alert').textContent).toContain('tooLarge');
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('rejects a file with a disallowed MIME type and does not call upload', async () => {
    render(<ImageUpload {...defaultProps} />);
    uploadFile(makeFile('file.gif', 'image/gif', 0.1));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByRole('alert').textContent).toContain('wrongType');
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('uploads a valid file and calls onUploaded with the public URL', async () => {
    const onUploaded = vi.fn();
    render(<ImageUpload {...defaultProps} onUploaded={onUploaded} />);
    uploadFile(makeFile('photo.png', 'image/png', 0.1));

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledWith(PUBLIC_URL);
    });
    expect(mockUpload).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('has an aria-label on the trigger button', () => {
    render(<ImageUpload {...defaultProps} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
    expect(button.getAttribute('aria-label')).toBeTruthy();
  });

  it('is keyboard-focusable (button role present)', () => {
    render(<ImageUpload {...defaultProps} />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    // button elements are focusable by default
    expect(button.tagName).toBe('BUTTON');
  });

  it('disables the button when disabled prop is true', () => {
    render(<ImageUpload {...defaultProps} disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  // [M3] Previously missing: Supabase upload returns { error } (not a thrown exception)
  it('shows failed error and does not call onUploaded when Supabase upload returns an error', async () => {
    mockUpload.mockResolvedValue({ error: { message: 'storage quota exceeded' } });
    const onUploaded = vi.fn();
    render(<ImageUpload {...defaultProps} onUploaded={onUploaded} />);
    uploadFile(makeFile('photo.png', 'image/png', 0.1));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByRole('alert').textContent).toContain('failed');
    expect(onUploaded).not.toHaveBeenCalled();
  });
});
