import { redirect } from 'next/navigation';

// Contractor ↔ employer relationships are bindings. They are handled entirely
// from the Binding Requests register — there is no separate view for these.
export default function EmployerBindingRedirectPage(): never {
  redirect('/employer/qr/requests');
}
