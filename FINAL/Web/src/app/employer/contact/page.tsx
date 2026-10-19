"use client";

import ContactBssForm from '@/components/support/ContactBssForm';
import { useEmployer } from '@/contexts/EmployerContext';

export default function EmployerContactPage() {
  const { employer } = useEmployer();
  return (
    <ContactBssForm
      role="employer"
      backHref="/employer/dashboard"
      defaultName={employer.identity.name}
      defaultBssId={employer.identity.bssId}
      defaultEmail={employer.identity.email}
      defaultPhone={employer.identity.contact}
    />
  );
}
