import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StaffCard } from '../StaffCard';

vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

// Stub out the dialog and EditStaffDialog so StaffCard tests stay focused
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({
    children,
    onClick,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button onClick={onClick} {...rest}>{children}</button>
  ),
}));

vi.mock('../EditStaffDialog', () => ({
  EditStaffDialog: () => <div data-testid="edit-dialog" />,
}));

const baseStaff: {
  id: string;
  displayName: string;
  slug: string;
  avatarUrl: string | null;
  isActive: boolean;
} = {
  id: 'staff-1',
  displayName: 'Ana García',
  slug: 'ana-garcia',
  avatarUrl: null,
  isActive: true,
};

const branches = [
  { id: 'b1', name: 'Centro' },
  { id: 'b2', name: 'Norte' },
];

function renderCard(staff = baseStaff, assignedBranchIds: string[] = []) {
  return render(
    <StaffCard
      staff={staff}
      businessId="biz-1"
      branches={branches}
      assignedBranchIds={assignedBranchIds}
    />
  );
}

describe('StaffCard', () => {
  it('renders the initials placeholder when avatarUrl is null', () => {
    renderCard();
    // "AG" from "Ana García"
    expect(screen.getByText('AG')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('renders the avatar img when avatarUrl is set', () => {
    renderCard({ ...baseStaff, avatarUrl: 'https://cdn.example.com/avatar.png' });
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/avatar.png');
    expect(img).toHaveAttribute('alt', 'Ana García');
  });

  it('renders the display name and slug', () => {
    renderCard();
    expect(screen.getByText('Ana García')).toBeInTheDocument();
    expect(screen.getByText('ana-garcia')).toBeInTheDocument();
  });

  it('renders the edit button with the translated label', () => {
    renderCard();
    expect(screen.getByText('team.edit')).toBeInTheDocument();
  });

  it('renders the EditStaffDialog alongside the trigger', () => {
    renderCard();
    expect(screen.getByTestId('edit-dialog')).toBeInTheDocument();
  });

  it('shows the active status badge', () => {
    renderCard();
    expect(screen.getByText('team.status.active')).toBeInTheDocument();
  });

  it('shows the inactive status badge for deactivated staff', () => {
    renderCard({ ...baseStaff, isActive: false });
    expect(screen.getByText('team.status.inactive')).toBeInTheDocument();
  });

  it('renders chips for assigned branches', () => {
    renderCard(baseStaff, ['b1']);
    expect(screen.getByText('Centro')).toBeInTheDocument();
    expect(screen.queryByText('Norte')).toBeNull();
  });
});
