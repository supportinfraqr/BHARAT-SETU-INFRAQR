import { NextResponse } from 'next/server';
import { listExams, saveExam } from '@/server/medical/store';
import type { MedicalExam } from '@/components/employer/medical/types';

export const dynamic = 'force-dynamic';

/** GET ?workers=id1,id2 → { exams: { [workerId]: MedicalExam[] } } (newest first). */
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get('workers') ?? '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 2000);
  return NextResponse.json({ exams: await listExams(ids) });
}

/** POST MedicalExam → record a new examination for a worker. */
export async function POST(req: Request) {
  const exam = await req.json().catch(() => null) as MedicalExam | null;
  if (!exam?.workerId || !exam.examDate || !exam.partA?.name) return NextResponse.json({ error: 'workerId, examDate and worker name are required.' }, { status: 400 });
  return NextResponse.json({ exam: await saveExam(exam) });
}
