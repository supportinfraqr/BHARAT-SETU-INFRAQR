import { redirect } from 'next/navigation';

// Site management (default site + QR) now lives in one place: the Sites section.
export default function EmployerQrSitesPage() {
  redirect('/employer/sites');
}
