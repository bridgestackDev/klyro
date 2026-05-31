import { describe, it, expect } from 'vitest';
import { interpolate } from '@/lib/messaging/variables';
import { MissingVariableError } from '@/lib/messaging/types';

const BASE_VARS = {
  nombre: 'Carlos',
  fecha: 'lunes, 2 de junio de 2026',
  hora: '3:00 PM',
  staff: 'Juan',
  negocio: 'Barber Club',
  servicio: 'Corte',
  dirección: 'Calle Principal 10',
  sucursal: 'Centro',
  cancel_link: 'https://klyro.app/api/appointments/abc/cancel',
  link: 'https://klyro.app/barber-club',
};

describe('interpolate', () => {
  it('replaces all declared variables', () => {
    const template = '¡Hola {nombre}! Tu turno es el {fecha} a las {hora} con {staff}.';
    const result = interpolate(template, BASE_VARS, ['nombre', 'fecha', 'hora', 'staff']);
    expect(result).toBe('¡Hola Carlos! Tu turno es el lunes, 2 de junio de 2026 a las 3:00 PM con Juan.');
  });

  it('replaces cancel_link variable', () => {
    const template = 'Confirma tu cita. Cancelar: {cancel_link}';
    const result = interpolate(template, BASE_VARS, ['cancel_link']);
    expect(result).toContain('https://klyro.app/api/appointments/abc/cancel');
  });

  it('replaces negocio and dirección', () => {
    const template = 'En {negocio}, {dirección}.';
    const result = interpolate(template, BASE_VARS, ['negocio', 'dirección']);
    expect(result).toBe('En Barber Club, Calle Principal 10.');
  });

  it('throws MissingVariableError for a declared variable that is absent', () => {
    const template = 'Hola {nombre}! Tu cita el {fecha}.';
    expect(() =>
      interpolate(template, { nombre: 'Ana' }, ['nombre', 'fecha'])
    ).toThrow(MissingVariableError);
  });

  it('MissingVariableError carries the missing variable name', () => {
    try {
      interpolate('{hora}', {}, ['hora']);
    } catch (err) {
      expect(err).toBeInstanceOf(MissingVariableError);
      expect((err as MissingVariableError).variable).toBe('hora');
    }
  });

  it('does NOT throw for undeclared variables that appear in the template', () => {
    const template = 'Hola {nombre}! Servicio: {servicio}.';
    // servicio is in template but not in declaredVars — should not throw
    const result = interpolate(template, { nombre: 'María' }, ['nombre']);
    // undeclared vars are left as-is or substituted if present
    expect(result).toContain('María');
  });

  it('ignores extra variables not present in the template', () => {
    const template = 'Hola {nombre}.';
    const result = interpolate(template, BASE_VARS, ['nombre']);
    expect(result).toBe('Hola Carlos.');
  });

  it('mascota falls back to nombre when mascota is absent', () => {
    const template = 'La cita de {mascota} está confirmada.';
    const vars = { nombre: 'Sofía' };
    const result = interpolate(template, vars, ['mascota']);
    expect(result).toBe('La cita de Sofía está confirmada.');
  });

  it('mascota uses its own value when present', () => {
    const template = 'La cita de {mascota} está confirmada.';
    const vars = { nombre: 'Sofía', mascota: 'Firulais' };
    const result = interpolate(template, vars, ['mascota']);
    expect(result).toBe('La cita de Firulais está confirmada.');
  });

  it('does NOT throw when mascota is declared but absent (uses fallback)', () => {
    const template = '{mascota} tiene cita.';
    expect(() =>
      interpolate(template, { nombre: 'Pedro' }, ['mascota'])
    ).not.toThrow();
  });

  it('handles templates with no placeholders', () => {
    const template = 'No hay variables aquí.';
    expect(interpolate(template, {}, [])).toBe('No hay variables aquí.');
  });

  it('leaves unknown placeholders intact when not declared and not in vars', () => {
    const template = 'Hola {unknown}.';
    const result = interpolate(template, {}, []);
    expect(result).toBe('Hola {unknown}.');
  });
});
