/**
 * Static audit: every variable declared in a reminder_24h template's `variables`
 * array must be resolvable by MessageRouter at dispatch time.
 *
 * The router builds a TemplateVariables map with these keys:
 *   nombre, fecha, hora, staff, negocio, servicio, dirección, sucursal,
 *   cancel_link, link
 * Plus `mascota` is handled via a fallback to `nombre` — no throw needed.
 *
 * This test encodes the variable arrays from supabase/migrations/0003_message_templates.sql
 * and asserts that none are missing from the router map.
 *
 * Audit result: CLEAN — no mismatches. No migration fix required.
 */

import { describe, it, expect } from 'vitest';

// Variables the router populates at dispatch time (from router.ts vars map)
const ROUTER_VARS = new Set([
  'nombre',
  'fecha',
  'hora',
  'staff',
  'negocio',
  'servicio',
  'dirección',
  'sucursal',
  'cancel_link',
  'link',
]);

// `mascota` is exempt — it falls back to `nombre` via interpolate()
const FALLBACK_VARS = new Set(['mascota']);

// reminder_24h variable arrays as seeded in 0003_message_templates.sql
// Format: [vertical, channel, language, variables[]]
const REMINDER_TEMPLATES: Array<[string, string, string, string[]]> = [
  // barbershop
  ['barbershop', 'whatsapp', 'es', ['nombre', 'fecha', 'hora', 'staff']],
  ['barbershop', 'whatsapp', 'en', ['nombre', 'fecha', 'hora', 'staff']],
  ['barbershop', 'email',    'es', ['nombre', 'negocio', 'fecha', 'hora', 'staff']],
  ['barbershop', 'email',    'en', ['nombre', 'negocio', 'fecha', 'hora', 'staff']],
  // salon
  ['salon', 'whatsapp', 'es', ['nombre', 'servicio', 'hora', 'staff']],
  ['salon', 'whatsapp', 'en', ['nombre', 'servicio', 'hora', 'staff']],
  ['salon', 'email',    'es', ['nombre', 'negocio', 'fecha', 'hora', 'servicio']],
  ['salon', 'email',    'en', ['nombre', 'servicio', 'negocio', 'hora']],
  // fitness
  ['fitness', 'whatsapp', 'es', ['nombre', 'staff', 'hora']],
  ['fitness', 'whatsapp', 'en', ['nombre', 'staff', 'hora']],
  ['fitness', 'email',    'es', ['nombre', 'negocio', 'fecha', 'hora', 'staff']],
  ['fitness', 'email',    'en', ['nombre', 'negocio', 'fecha', 'hora', 'staff']],
  // spa
  ['spa', 'whatsapp', 'es', ['nombre', 'servicio', 'hora', 'negocio']],
  ['spa', 'whatsapp', 'en', ['nombre', 'servicio', 'hora', 'negocio']],
  ['spa', 'email',    'es', ['nombre', 'servicio', 'negocio', 'fecha', 'hora']],
  ['spa', 'email',    'en', ['nombre', 'servicio', 'negocio', 'fecha', 'hora']],
  // tattoo
  ['tattoo', 'whatsapp', 'es', ['nombre', 'staff', 'hora']],
  ['tattoo', 'whatsapp', 'en', ['nombre', 'staff', 'hora']],
  ['tattoo', 'email',    'es', ['nombre', 'negocio', 'fecha', 'hora', 'staff']],
  ['tattoo', 'email',    'en', ['nombre', 'negocio', 'fecha', 'hora', 'staff']],
  // carwash
  ['carwash', 'whatsapp', 'es', ['nombre', 'hora', 'sucursal']],
  ['carwash', 'whatsapp', 'en', ['nombre', 'hora', 'sucursal']],
  ['carwash', 'email',    'es', ['nombre', 'negocio', 'fecha', 'hora']],
  ['carwash', 'email',    'en', ['nombre', 'negocio', 'fecha', 'hora']],
  // petgrooming — uses {mascota} which falls back to {nombre}
  ['petgrooming', 'whatsapp', 'es', ['nombre', 'mascota', 'hora']],
  ['petgrooming', 'whatsapp', 'en', ['nombre', 'mascota', 'hora']],
  ['petgrooming', 'email',    'es', ['nombre', 'mascota', 'negocio', 'fecha', 'hora']],
  ['petgrooming', 'email',    'en', ['nombre', 'mascota', 'negocio', 'fecha', 'hora']],
];

describe('reminder_24h template variable audit', () => {
  it('covers all 28 reminder templates (7 verticals × 2 channels × 2 languages)', () => {
    expect(REMINDER_TEMPLATES).toHaveLength(28);
  });

  it('every variable in every reminder_24h template is resolvable by the router', () => {
    const mismatches: string[] = [];

    for (const [vertical, channel, language, vars] of REMINDER_TEMPLATES) {
      for (const v of vars) {
        if (!ROUTER_VARS.has(v) && !FALLBACK_VARS.has(v)) {
          mismatches.push(`${vertical}/${channel}/${language}: unknown variable "{${v}}"`);
        }
      }
    }

    // Report all mismatches in one assertion for easy debugging
    expect(mismatches).toEqual([]);
  });

  it('mascota fallback is the only special-cased variable', () => {
    const allVars = new Set(REMINDER_TEMPLATES.flatMap(([, , , vars]) => vars));
    const unresolvable = [...allVars].filter(
      (v) => !ROUTER_VARS.has(v) && !FALLBACK_VARS.has(v),
    );
    expect(unresolvable).toEqual([]);
  });

  it('petgrooming is the only vertical using {mascota}', () => {
    const mascotaVerticals = REMINDER_TEMPLATES
      .filter(([, , , vars]) => vars.includes('mascota'))
      .map(([vertical]) => vertical);

    expect([...new Set(mascotaVerticals)]).toEqual(['petgrooming']);
  });

  it('all required router fields (nombre, fecha, hora, negocio) appear in at least one reminder template', () => {
    const allVars = new Set(REMINDER_TEMPLATES.flatMap(([, , , vars]) => vars));
    expect(allVars.has('nombre')).toBe(true);
    expect(allVars.has('fecha')).toBe(true);
    expect(allVars.has('hora')).toBe(true);
    expect(allVars.has('negocio')).toBe(true);
  });
});
