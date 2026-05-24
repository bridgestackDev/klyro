import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditStaffDialog } from '../EditStaffDialog';

vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockUpdateStaffAvatar = vi.fn();
vi.mock('@/lib/actions/media', () => ({
  updateStaffAvatar: (...args: unknown[]) => mockUpdateStaffAvatar(...args),
}));

vi.mock('@/components/shared/ImageUpload', () => ({
  ImageUpload: (props: {
    bucket: string;
    path: string;
    currentUrl: string | null;
    onUploaded: (url: string) => void;
    label?: string;
    helpText?: string;
  }) => (
    <div data-testid="image-upload" data-path={props.path}>
      <button
        type="button"
        onClick={() => props.onUploaded('https://cdn.example.com/avatar.png')}
      >
        trigger-upload
      </button>
    </div>
  ),
}));

// Minimal dialog stubs: DialogContent renders children, DialogClose renders as button
vi.mock('@/components/ui/dialog', () => ({
  DialogContent: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogClose: ({ children, render: Slot }: { children: React.ReactNode; render?: React.ReactElement }) =>
    Slot ? (
      <button data-testid="dialog-close">{children}</button>
    ) : (
      <button data-testid="dialog-close">{children}</button>
    ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

import { toast } from 'sonner';

const defaultProps = {
  staffId: 'staff-1',
  staffName: 'Ana García',
  businessId: 'biz-1',
  currentAvatarUrl: null,
};

describe('EditStaffDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dialog with the staff name as description', () => {
    render(<EditStaffDialog {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Ana García')).toBeInTheDocument();
  });

  it('renders the dialog title', () => {
    render(<EditStaffDialog {...defaultProps} />);
    expect(screen.getByText('team.dialog.title')).toBeInTheDocument();
  });

  it('renders ImageUpload with the correct staff path', () => {
    render(<EditStaffDialog {...defaultProps} />);
    expect(screen.getByTestId('image-upload')).toHaveAttribute(
      'data-path',
      'biz-1/staff-1.png'
    );
  });

  it('renders the close button', () => {
    render(<EditStaffDialog {...defaultProps} />);
    expect(screen.getByTestId('dialog-close')).toBeInTheDocument();
  });

  it('calls updateStaffAvatar when onUploaded fires', async () => {
    mockUpdateStaffAvatar.mockResolvedValue(undefined);
    render(<EditStaffDialog {...defaultProps} />);
    await userEvent.click(screen.getByText('trigger-upload'));
    await waitFor(() => {
      expect(mockUpdateStaffAvatar).toHaveBeenCalledWith(
        'staff-1',
        'https://cdn.example.com/avatar.png'
      );
    });
  });

  it('shows a success toast on successful upload', async () => {
    mockUpdateStaffAvatar.mockResolvedValue(undefined);
    render(<EditStaffDialog {...defaultProps} />);
    await userEvent.click(screen.getByText('trigger-upload'));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('team.avatar.updated');
    });
  });

  it('shows an error toast when updateStaffAvatar throws', async () => {
    mockUpdateStaffAvatar.mockRejectedValue(new Error('network'));
    render(<EditStaffDialog {...defaultProps} />);
    await userEvent.click(screen.getByText('trigger-upload'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('team.avatar.failed');
    });
  });
});
