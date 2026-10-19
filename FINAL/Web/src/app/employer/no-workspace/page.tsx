import { ShieldAlert } from 'lucide-react';
import { SignOutButton } from '@/components/auth/SignOutButton';

export default function EmployerNoWorkspacePage() {
  return (
    <div className="max-w-xl mx-auto py-16 px-4 text-center">
      <span className="mx-auto w-14 h-14 rounded-2xl bg-bss-bg border border-bss-border grid place-items-center text-bss-text-muted">
        <ShieldAlert size={26} />
      </span>
      <h1 className="mt-4 text-xl font-bold text-bss-text-primary">No workspace assigned yet</h1>
      <p className="mt-2 text-sm text-bss-text-muted">
        Your employer has created your staff account, but your role does not have access to a workspace yet.
        Please contact your employer to request access.
      </p>
      <SignOutButton className="mt-5 inline-flex items-center gap-2 rounded-xl border border-bss-border bg-white px-4 py-2.5 text-sm font-semibold text-bss-text-primary hover:bg-bss-bg" />
    </div>
  );
}
