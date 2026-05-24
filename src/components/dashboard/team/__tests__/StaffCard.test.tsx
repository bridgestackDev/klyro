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

const baseStaff = {
  id: 'staff-1',
  displayName: 'Ana García',
  slug: 'ana-garcia',
  avatarUrl: null,
};

describe('StaffCard', () => {
  it('renders the initials placeholder when avatarUrl is null', () => {
    render(<StaffCard staff={baseStaff} businessId="biz-1" />);
    // "AG" from "Ana García"
    expect(screen.getByText('AG')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('renders the avatar img when avatarUrl is set', () => {
    render(
      <StaffCard
        staff={{ ...baseStaff, avatarUrl: 'https://cdn.example.com/avatar.png' }}
        businessId="biz-1"
      />
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/avatar.png');
    expect(img).toHaveAttribute('alt', 'Ana García');
  });

  it('renders the display name and slug', () => {
    render(<StaffCard staff={baseStaff} businessId="biz-1" />);
    expect(screen.getByText('Ana García')).toBeInTheDocument();
    expect(screen.getByText('ana-garcia')).toBeInTheDocument();
  });

  it('renders the edit button with the translated label', () => {
    render(<StaffCard staff={baseStaff} businessId="biz-1" />);
    expect(screen.getByText('team.edit')).toBeInTheDocument();
  });

  it('renders the EditStaffDialog alongside the trigger', () => {
    render(<StaffCard staff={baseStaff} businessId="biz-1" />);
    expect(screen.getByTestId('edit-dialog')).toBeInTheDocument();
  });
});
