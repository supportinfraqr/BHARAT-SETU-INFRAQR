"use client";

import ContactBssForm from '@/components/support/ContactBssForm';
import { useWorker } from '@/contexts/WorkerContext';

export default function WorkerContactPage() {
  const { worker } = useWorker();
  return (
    <ContactBssForm
      role="worker"
      backHref="/worker"
      defaultName={worker.identity.name}
      defaultBssId={worker.identity.bssId}
      defaultEmail={worker.contact.email}
      defaultPhone={worker.contact.mobile}
    />
  );
}
