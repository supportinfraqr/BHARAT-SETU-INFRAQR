import { redirect } from 'next/navigation';

// Engagements are consolidated into the Binding Requests register — every
// contractor ↔ worker and contractor ↔ employer request appears there.
export default function ContractorEngagementsPage(): never {
  redirect('/contractor/qr/requests');
}
