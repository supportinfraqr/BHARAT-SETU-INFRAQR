export type MigrationType =
  | 'Inter-State Migrant Worker'
  | 'Intra-State Migrant Worker'
  | 'Non-Migrant / Local'
  | 'Migration type will be determined after address/work location is completed.';

export type MobilityAddress = {
  line: string;
  state: string;
  district: string;
  city: string;
  /** Locality / area / mohalla (UIDAI `vtc`) — distinct from the city. */
  locality: string;
  pin: string;
};

export type MobilityPayload = {
  email: string;
  mobile: string;
  alternateMobile: string;
  currentAddress: MobilityAddress;
  permanentAddress: MobilityAddress;
  /** Worker ticked "Current address is the same as permanent". */
  sameAsPermanent: boolean;
};

export type GeographyReference = Record<string, Record<string, ReadonlyArray<{
  city: string;
  pins: readonly string[];
}>>>;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MOBILE_PATTERN = /^[6-9]\d{9}$/;
export const PIN_PATTERN = /^\d{6}$/;

const comparable = (value: string) => value.trim().toLocaleLowerCase('en-IN');

export function deriveMigrationType(
  homeState?: string,
  homeDistrict?: string,
  workState?: string,
  workDistrict?: string,
): MigrationType {
  if (![homeState, homeDistrict, workState, workDistrict].every(value => value?.trim())) {
    return 'Migration type will be determined after address/work location is completed.';
  }
  if (comparable(homeState!) !== comparable(workState!)) return 'Inter-State Migrant Worker';
  if (comparable(homeDistrict!) !== comparable(workDistrict!)) return 'Intra-State Migrant Worker';
  return 'Non-Migrant / Local';
}

export function findLocationByPin(reference: GeographyReference, pin: string) {
  for (const [state, districts] of Object.entries(reference)) {
    for (const [district, places] of Object.entries(districts)) {
      const place = places.find(entry => entry.pins.includes(pin));
      if (place) return { state, district, city: place.city, pin };
    }
  }
  return null;
}

export function isKnownAddress(reference: GeographyReference, address: MobilityAddress) {
  return Boolean(reference[address.state]?.[address.district]?.some(
    place => place.city === address.city && place.pins.includes(address.pin),
  ));
}

export function normalizeMobilityPayload(payload: MobilityPayload): MobilityPayload {
  const cleanAddress = (address: MobilityAddress): MobilityAddress => ({
    line: address.line.trim(),
    state: address.state.trim(),
    district: address.district.trim(),
    city: address.city.trim(),
    locality: (address.locality ?? '').trim(),
    pin: address.pin.trim(),
  });
  return {
    email: payload.email.trim().toLocaleLowerCase('en-IN'),
    mobile: payload.mobile.replace(/\D/g, ''),
    alternateMobile: payload.alternateMobile.replace(/\D/g, ''),
    currentAddress: cleanAddress(payload.currentAddress),
    permanentAddress: cleanAddress(payload.permanentAddress),
    sameAsPermanent: Boolean(payload.sameAsPermanent),
  };
}

export function validateMobilityPayload(reference: GeographyReference, payload: MobilityPayload) {
  const errors: Record<string, string> = {};
  if (payload.email && !EMAIL_PATTERN.test(payload.email)) errors.email = 'Please enter a valid email address, e.g. name@example.com';
  if (!MOBILE_PATTERN.test(payload.mobile)) errors.mobile = 'Enter a valid 10-digit Indian mobile number.';
  if (payload.alternateMobile && (!MOBILE_PATTERN.test(payload.alternateMobile) || payload.alternateMobile === payload.mobile)) {
    errors.alternateMobile = payload.alternateMobile === payload.mobile
      ? 'Alternate mobile number must be different.'
      : 'Enter a valid 10-digit Indian mobile number.';
  }
  for (const [key, address] of Object.entries({ currentAddress: payload.currentAddress, permanentAddress: payload.permanentAddress })) {
    if (address.line.length < 5) errors[`${key}.line`] = 'Enter a complete address line.';
    if (!PIN_PATTERN.test(address.pin) || !isKnownAddress(reference, address)) {
      errors[`${key}.location`] = 'Select a consistent State, District, City and PIN combination.';
    }
  }
  return errors;
}
