import { redirect } from 'next/navigation';

// The employer portal has no standalone index route — send /employer to the
// dashboard. Without this, any prefetch/navigation to /employer 404s.
export default function EmployerIndexPage() {
  redirect('/employer/dashboard');
}
