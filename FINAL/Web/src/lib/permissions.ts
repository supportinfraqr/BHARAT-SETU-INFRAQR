import type { WorkerRecord } from '@/types/portal';

export type Role = 
  | 'Guest' 
  | 'Contractor Supervisor' 
  | 'Contractor-Bound Worker' 
  | 'Employer-Bound Worker' 
  | 'Government'
  | 'Worker-Own Profile'
  | 'BSS Staff'
  | 'BSS Admin';

export type PermissionLevel = 'Full' | 'View' | 'Masked' | 'Restricted' | 'No' | 'Public-safe' | 'Verified-name-only';

// Binding-aware disclosure of a worker profile.
// Pre-binding (no completed E-C-S-W consent handshake) only discloses: Name, Age, Sex, Company, Blood Group.
// Post-binding (consent handshake complete) unlocks the full permitted record.
export type BindingViewProfile = {
  identity: { name: string; gender: string; age: number | null };
  company: string;
  bloodGroup: string;
  full?: boolean;
};

function ageFrom(dob: string): number | null {
  // dob is ISO yyyy-mm-dd; approximate age.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

export function sanitizeForBinding(rawProfile: WorkerRecord, level: 'pre' | 'post'): BindingViewProfile {
  const base: BindingViewProfile = {
    identity: { name: rawProfile.identity.name, gender: rawProfile.identity.gender, age: ageFrom(rawProfile.identity.dob) },
    company: rawProfile.employment.employer,
    bloodGroup: rawProfile.personal.bloodGroup,
  };
  if (level === 'pre') return base;
  return { ...base, full: true };
}

function omitKeys<T extends object, K extends keyof T>(value: T, ...keys: K[]): Omit<T, K> {
  const result = { ...value };
  keys.forEach((key) => Reflect.deleteProperty(result, key));
  return result;
}

export function sanitizeWorkerProfile(rawProfile: WorkerRecord, role: Role) {
  // Deep clone to avoid mutating the original data
  const profile = structuredClone(rawProfile);

  // Helper to mask strings (e.g., Aadhaar, PAN)
  const maskString = (str: string, keepLast: number = 4) => {
    if (!str) return str;
    if (str.length <= keepLast) return str;
    return '*'.repeat(str.length - keepLast) + str.slice(-keepLast);
  };

  switch (role) {
    case 'Guest':
      // Guest-safe / Verified-name-only
      return {
        identity: {
          name: profile.identity.name,
          bssId: profile.identity.bssId,
          category: profile.identity.category,
          aadhaarVerified: profile.identity.aadhaarVerified,
          photoUrl: profile.identity.photoUrl
        },
        employment: {
          status: profile.employment.status
        },
        skills: {
          primary: profile.skills?.primary
        }
      };

    case 'Contractor Supervisor': {
      // Work-relevant information only. No sensitive PII/financial.
      profile.identity.aadhaar = maskString(profile.identity.aadhaar, 0); // No
      profile.identity.pan = maskString(profile.identity.pan, 0); // No
      const withoutBanking = omitKeys(profile, 'banking');
      const safePersonal = omitKeys(profile.personal, 'religion', 'caste');
      return {
        ...withoutBanking,
        personal: safePersonal,
        socialSecurity: {
          epfoLinked: !!profile.socialSecurity?.epfoUan,
          esicLinked: !!profile.socialSecurity?.esicIp,
        },
      }; // Only linkage status
    }

    case 'Contractor-Bound Worker':
    case 'Employer-Bound Worker': {
      // Bound employers/contractors can see operational and compliance info
      // but sensitive data (Bank, exact Aadhaar, exact PAN) should still be masked.
      profile.identity.aadhaar = maskString(profile.identity.aadhaar, 4);
      profile.identity.pan = maskString(profile.identity.pan, 4);
      if (profile.banking) {
        profile.banking.accountNumber = maskString(profile.banking.accountNumber, 4);
      }
      const safePersonal = omitKeys(profile.personal, 'religion', 'caste');
      return { ...profile, personal: safePersonal };
    }

    case 'Government':
      // Gov access for compliance, but masked banking.
      // Assuming 'View' access to most fields for compliance checking.
      if (profile.banking) {
        profile.banking.accountNumber = maskString(profile.banking.accountNumber, 4);
      }
      return profile;

    case 'Worker-Own Profile':
      // Worker sees their own complete profile
      return profile;

    case 'BSS Staff': {
      // Staff see operational data, heavily masked PII
      profile.identity.aadhaar = maskString(profile.identity.aadhaar, 4);
      profile.identity.pan = maskString(profile.identity.pan, 4);
      if (profile.banking) {
         profile.banking.accountNumber = maskString(profile.banking.accountNumber, 4);
      }
      const operationalProfile = omitKeys(profile, 'personal');
      return operationalProfile;
    }

    case 'BSS Admin':
      // BSS Admin sees all
      return profile;

    default:
      // Default to Public if unknown role
      return {
        identity: {
          name: profile.identity.name,
          bssId: profile.identity.bssId,
          photoUrl: profile.identity.photoUrl
        }
      };
  }
}
