import { redirect } from 'next/navigation';

// Legacy help-desk route. "IT Help Desk" is a retired role (consolidated into
// BSS Staff), so this route only ever redirects. It must NOT call the operations
// upstream — doing so raised a Server Component error when the session could not
// be authenticated upstream.
export default function ItHelpDeskPage(): never {
  redirect('/?reason=session');
}
