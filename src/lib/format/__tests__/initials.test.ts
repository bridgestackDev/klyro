import { describe, it, expect } from 'vitest';
import { getInitials } from '../initials';

describe('getInitials', () => {
  it('returns "?" for an empty string', () => {
    expect(getInitials('')).toBe('?');
  });

  it('returns "?" for a whitespace-only string', () => {
    expect(getInitials('   ')).toBe('?');
  });

  it('returns the first letter uppercased for a single word', () => {
    expect(getInitials('Marcus')).toBe('M');
  });

  it('returns the first letter of each of the first two words for two words', () => {
    expect(getInitials('Juan Pérez')).toBe('JP');
  });

  it('returns initials of only the first two words for three or more words', () => {
    expect(getInitials('Ana María González')).toBe('AM');
  });

  it('handles accented first characters correctly', () => {
    expect(getInitials('Óscar Ruíz')).toBe('ÓR');
  });

  it('handles lowercase input by uppercasing the result', () => {
    expect(getInitials('carlos díaz')).toBe('CD');
  });

  it('handles extra internal whitespace gracefully', () => {
    expect(getInitials('Luis   García')).toBe('LG');
  });
});
