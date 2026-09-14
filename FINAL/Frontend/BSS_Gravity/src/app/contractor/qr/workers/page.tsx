import { redirect } from 'next/navigation';

// Bound worker list + QR identity now live in one place: the Worker Master page.
export default function ContractorQrWorkersPage() {
  redirect('/contractor/workers');
}
