// Excluded: I, O, 0, 1 — visually ambiguous in confirmation codes
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateBookingCode(): string {
  let code = "KLY-";
  for (let i = 0; i < 4; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export async function generateUniqueBookingCode(
  checkExists: (code: string) => Promise<boolean>,
  maxRetries = 5
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const code = generateBookingCode();
    if (!(await checkExists(code))) return code;
  }
  throw new Error(`Could not generate unique booking code after ${maxRetries} attempts`);
}
