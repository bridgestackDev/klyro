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

const mockSetStaffActive = vi.fn();
const mockUpdateStaffBranches = vi.fn();
const mockUpdateStaffContact = vi.fn();
vi.mock('@/lib/actions/team', () => ({
  setStaffActive: (...args: unknown[]) => mockSetStaffActive(...args),
  updateStaffBranches: (...args: unknown[]) => mockUpdateStaffBranches(...args),
  updateStaffContact: (...args: unknown[]) => mockUpdateStaffContact(...args),
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
  isActive: true,
  email: null,
  phone: null,
  branches: [
    { id: 'b1', name: 'Centro' },
    { id: 'b2', name: 'Norte' },
  ],
  assignedBranchIds: ['b1'],
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

  it('toggles active state via setStaffActive', async () => {
    mockSetStaffActive.mockResolvedValue(undefined);
    render(<EditStaffDialog {...defaultProps} />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(toggle);
    await waitFor(() => {
      expect(mockSetStaffActive).toHaveBeenCalledWith('staff-1', false);
    });
  });

  it('reverts the toggle when setStaffActive fails', async () => {
    mockSetStaffActive.mockRejectedValue(new Error('boom'));
    render(<EditStaffDialog {...defaultProps} />);
    const toggle = screen.getByRole('switch');
    await userEvent.click(toggle);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('team.status.failed');
    });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('saves contact + branches together via the Save button', async () => {
    mockUpdateStaffContact.mockResolvedValue(undefined);
    mockUpdateStaffBranches.mockResolvedValue(undefined);
    render(<EditStaffDialog {...defaultProps} />);
    // Toggle the second branch on, then save
    await userEvent.click(screen.getByLabelText('Norte'));
    await userEvent.click(screen.getByText('team.save'));
    await waitFor(() => {
      expect(mockUpdateStaffContact).toHaveBeenCalledWith({
        staffId: 'staff-1',
        email: undefined,
        phone: undefined,
      });
      expect(mockUpdateStaffBranches).toHaveBeenCalledWith({
        staffId: 'staff-1',
        branchIds: ['b1', 'b2'],
      });
    });
  });

  it('passes entered contact details to updateStaffContact', async () => {
    mockUpdateStaffContact.mockResolvedValue(undefined);
    mockUpdateStaffBranches.mockResolvedValue(undefined);
    render(<EditStaffDialog {...defaultProps} />);
    await userEvent.type(screen.getByLabelText('team.contact.email'), 'ana@example.com');
    await userEvent.click(screen.getByText('team.save'));
    await waitFor(() => {
      expect(mockUpdateStaffContact).toHaveBeenCalledWith({
        staffId: 'staff-1',
        email: 'ana@example.com',
        phone: undefined,
      });
    });
  });
});
