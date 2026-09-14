import { redirect } from 'next/navigation';

// Worker list + QR identity now live in one place: the Workforce → Workers page.
export default function EmployerQrWorkersPage() {
  redirect('/employer/workers');
}
