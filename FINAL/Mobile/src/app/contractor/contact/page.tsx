"use client";

import ContactBssForm from '@/components/support/ContactBssForm';
import { useContractor } from '@/contexts/ContractorContext';

export default function ContractorContactPage() {
  const { contractor } = useContractor();
  return (
    <ContactBssForm
      role="contractor"
      backHref="/contractor/dashboard"
      defaultName={contractor.identity.name}
      defaultBssId={contractor.identity.bssId}
      defaultEmail={contractor.identity.email}
      defaultPhone={contractor.identity.contact}
    />
  );
}
