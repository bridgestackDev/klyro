import { MissingVariableError } from './types';

/**
 * Replaces {placeholder} tokens in a template string.
 *
 * @param template      - Raw template content from message_templates.content
 * @param vars          - Variable values keyed by placeholder name
 * @param declaredVars  - Variable names declared in message_templates.variables;
 *                        all are required except `mascota` (falls back to `nombre`)
 */
export function interpolate(
  template: string,
  vars: Record<string, string | undefined>,
  declaredVars: string[],
): string {
  for (const key of declaredVars) {
    if (key === 'mascota') continue; // handled via fallback below
    if (vars[key] === undefined) {
      throw new MissingVariableError(key);
    }
  }

  return template.replace(/\{([^}]+)\}/g, (_match, key: string) => {
    if (key === 'mascota') {
      return vars['mascota'] ?? vars['nombre'] ?? `{${key}}`;
    }
    const value = vars[key];
    return value !== undefined ? value : `{${key}}`;
  });
}
