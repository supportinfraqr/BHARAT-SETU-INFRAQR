// Demo/test mobile numbers that are allowed to bypass the strict Indian-mobile
// (first digit 6–9) format check during registration. Kept in one place so the
// registration form and the register API agree. These match the OTP whitelist
// (BSS_DEMO_OTP_MOBILES) so they also receive the fixed demo OTP.
export const DEMO_MOBILES: readonly string[] = [
  '0000000000',
  '1111111111', '2222222222', '3333333333',
  '4444444444', '5555555555', '6666666666',
  '7777777777', '8888888888', '9999999999',
];

export function isDemoMobile(value: string): boolean {
  return DEMO_MOBILES.includes((value || '').trim());
}
