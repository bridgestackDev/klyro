/** A slug must start and end with [a-z0-9] and may contain hyphens in between. */
export const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;

/**
 * Converts a free-text string to a URL-safe lowercase slug.
 * Strips accents, removes non-alphanumeric characters, collapses hyphens.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 50);
}

export function isValidSlug(input: string): boolean {
  return SLUG_REGEX.test(input);
}
