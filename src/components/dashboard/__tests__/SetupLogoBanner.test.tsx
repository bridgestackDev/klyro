import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SetupLogoBanner } from '../SetupLogoBanner';

vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const defaults = {
  logoUrl: null,
  onboardingCompleted: true,
  locale: 'es',
};

describe('SetupLogoBanner', () => {
  it('returns null when logo_url is already set', () => {
    const { container } = render(
      <SetupLogoBanner {...defaults} logoUrl="https://cdn.example.com/logo.png" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when logo_url is null and onboarding is complete', () => {
    render(<SetupLogoBanner {...defaults} />);
    expect(screen.getByText('dashboard.banners.logo.title')).toBeInTheDocument();
  });

  it('returns null when onboarding is not yet completed', () => {
    const { container } = render(
      <SetupLogoBanner {...defaults} onboardingCompleted={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('has an aria-label on the dismiss button', () => {
    render(<SetupLogoBanner {...defaults} />);
    const btn = screen.getByLabelText('dashboard.banners.logo.dismiss');
    expect(btn).toBeInTheDocument();
  });

  it('hides the banner when dismiss is clicked', () => {
    render(<SetupLogoBanner {...defaults} />);
    const dismissBtn = screen.getByLabelText('dashboard.banners.logo.dismiss');
    fireEvent.click(dismissBtn);
    expect(screen.queryByText('dashboard.banners.logo.title')).toBeNull();
  });

  it('links to the settings page', () => {
    render(<SetupLogoBanner {...defaults} />);
    const link = screen.getByText('dashboard.banners.logo.cta').closest('a');
    expect(link).toHaveAttribute('href', '/es/dashboard/settings');
  });
});
