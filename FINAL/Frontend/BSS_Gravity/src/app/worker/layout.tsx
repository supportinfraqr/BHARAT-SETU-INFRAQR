import { WorkerProvider } from '@/contexts/WorkerContext';
import WorkerShell from '@/components/worker/WorkerShell';
import { getWorkerPortal } from '@/server/portal';
import { requireSession } from '@/server/session';

export default async function WorkerLayout({ children }: { children:React.ReactNode }) {
  const session = await requireSession('Worker');
  const data = await getWorkerPortal(session);
  return <WorkerProvider initialData={data}><WorkerShell>{children}</WorkerShell></WorkerProvider>;
}
