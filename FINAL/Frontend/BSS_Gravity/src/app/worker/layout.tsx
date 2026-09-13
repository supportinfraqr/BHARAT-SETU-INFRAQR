import { WorkerProvider } from '@/contexts/WorkerContext';
import WorkerShell from '@/components/worker/WorkerShell';
import AccessibilityEffects, { ACCESSIBILITY_BOOTSTRAP } from '@/components/accessibility/AccessibilityEffects';
import { getWorkerPortal } from '@/server/portal';
import { requireSession } from '@/server/session';

export default async function WorkerLayout({ children }: { children:React.ReactNode }) {
  const session = await requireSession('Worker');
  const data = await getWorkerPortal(session);
  return (
    <WorkerProvider initialData={data}>
      <script dangerouslySetInnerHTML={{ __html: ACCESSIBILITY_BOOTSTRAP }} />
      <AccessibilityEffects />
      <WorkerShell>{children}</WorkerShell>
    </WorkerProvider>
  );
}
