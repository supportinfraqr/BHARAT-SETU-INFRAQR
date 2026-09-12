import { redirect } from 'next/navigation';

// These bindings are consolidated into the Binding Requests register — every
// contractor ↔ worker and contractor ↔ employer request appears there.
export default function ContractorBindingRedirectPage(): never {
  redirect('/contractor/qr/requests');
}
