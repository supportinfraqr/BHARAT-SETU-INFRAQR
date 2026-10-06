import { redirect } from 'next/navigation';

// The contractor portal has no standalone index route — send /contractor to the
// dashboard. Without this, any prefetch/navigation to /contractor 404s.
export default function ContractorIndexPage() {
  redirect('/contractor/dashboard');
}
