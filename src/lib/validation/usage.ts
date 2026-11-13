const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function validateModelColor(colorHex: string): string | null {
  if (!HEX_COLOR_PATTERN.test(colorHex)) {
    return "Warna model harus format hex 6 digit, misalnya #4F83E5.";
  }
  return null;
}
