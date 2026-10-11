"use client";

import { use, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import { ArrowLeft, Award, Check, CheckCircle2, AlertTriangle, Clock, HelpCircle, Lock, ShieldCheck, FileText, Send, Sparkles, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useWorker } from '@/contexts/WorkerContext';
import PageHero from '@/components/portal/PageHero';
import type { CourseAssignmentView, CourseModuleView } from '@/types/portal';

type CourseSummary = {
  progress?: number;
  status?: string;
  certificateNo?: string;
  skillAwarded?: string;
  completedLessonIds?: string[];
  assignmentScores?: Record<string, number>;
  assignmentFailedAt?: Record<string, string>;
  modules?: Array<{ moduleId: string; completed: boolean }>;
};

export default function AssignmentPage({ params }: { params: Promise<{ courseId: string; assignmentId: string }> }) {
  const { courseId, assignmentId } = use(params);
  const router = useRouter();
  const { portal, worker } = useWorker();

  const course = portal.courses.find(c => c.id === courseId) ?? notFound();
  
  let targetModule: CourseModuleView | undefined;
  let assignment: CourseAssignmentView | undefined;

  for (const m of course.modules) {
    const found = m.assignments.find(a => a.id === assignmentId);
    if (found) {
      targetModule = m;
      assignment = found;
      break;
    }
  }

  if (!assignment || !targetModule) {
    notFound();
  }

  const [currentScore, setCurrentScore] = useState<number | null>(assignment.score);
  const [isPassed, setIsPassed] = useState<boolean>(assignment.passed);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [writing, setWriting] = useState(assignment.submission?.content ?? '');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [cooldownRemaining, setCooldownRemaining] = useState<string | null>(null);

  // Calculate cooldown state if worker previously failed this assignment
  const failedAtIso = course.assignmentFailedAt?.[assignment.id];

  useEffect(() => {
    if (!failedAtIso || isPassed) {
      setCooldownRemaining(null);
      return;
    }

    function checkCooldown() {
      const failedTime = new Date(failedAtIso!).getTime();
      const now = Date.now();
      const cooldownMs = 8 * 60 * 60 * 1000;
      const timeRemaining = (failedTime + cooldownMs) - now;

      if (timeRemaining <= 0) {
        setCooldownRemaining(null);
      } else {
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        setCooldownRemaining(`${hours}h ${minutes}m ${seconds}s`);
      }
    }

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [failedAtIso, isPassed]);

  const questions = assignment.questions || [];
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentQuestionIndex];

  async function submitAssignment() {
    if (!assignment) return;
    if (cooldownRemaining) return;

    setBusy(true);
    setError('');
    setSuccessNotice('');

    try {
      const payload = assignment.type === 'QUIZ'
        ? { action: 'submit-assignment', courseId, assignmentId: assignment.id, answers }
        : { action: 'submit-assignment', courseId, assignmentId: assignment.id, content: writing };

      const response = await fetch('/api/portal/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({})) as { data?: CourseSummary; error?: string };

      if (!response.ok || !result.data) {
        throw new Error(result.error ?? 'Assignment submission failed.');
      }

      const score = result.data.assignmentScores?.[assignment.id] ?? null;
      const passed = score !== null && score >= assignment.passScore;

      setCurrentScore(score);
      setIsPassed(passed);

      if (passed) {
        setSuccessNotice(`Congratulations! You passed with a score of ${score}%.`);
      } else {
        setError(`Your score was ${score}%. A minimum score of ${assignment.passScore}% is required to pass. An 8-hour cooldown limit has been initiated.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment submission failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 animate-in fade-in duration-300">
      <PageHero
        eyebrow={`${course.title} · ${targetModule.title}`}
        title={assignment.title}
        actions={<>
          <Link href={`/worker/Skills/${courseId}`} aria-label="Back to course" className="w-10 h-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            isPassed
              ? 'bg-bss-soft-green text-bss-green border border-bss-border'
              : currentScore !== null
                ? 'bg-bss-soft-orange text-bss-orange border border-bss-border'
                : 'bg-bss-bg text-bss-text-secondary border border-bss-border'
          }`}>
            {isPassed ? `Passed (${currentScore}%)` : currentScore !== null ? `Score: ${currentScore}%` : 'Not Attempted'}
          </span>
        </>}
      />

      {/* 8-Hour Cooldown Banner */}
      {cooldownRemaining && (
        <div className="bg-bss-soft-orange border border-bss-border rounded-2xl p-5 flex items-start gap-3 text-bss-orange shadow-sm">
          <Clock size={22} className="text-bss-orange shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-bss-orange">Quiz Retry Limit Active (8-Hour Limit)</h3>
            <p className="text-xs text-bss-orange mt-1">
              You did not pass this quiz on your previous attempt. To ensure thorough learning, retakes are locked for 8 hours after a failed attempt.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bss-soft-orange border border-bss-border text-xs font-mono font-bold text-bss-orange">
              <span>Time remaining until retry:</span>
              <strong className="text-bss-orange">{cooldownRemaining}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successNotice && (
        <div className="bg-bss-soft-green border border-bss-border rounded-2xl p-5 flex items-start gap-3 text-bss-green shadow-sm">
          <CheckCircle2 size={22} className="text-bss-green shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-bss-green">Assignment Passed!</h3>
            <p className="text-xs text-bss-green mt-1">{successNotice}</p>
            <div className="mt-4 flex gap-3">
              <Link href={`/worker/Skills/${courseId}`} className="px-4 py-2 bg-bss-green hover:bg-bss-green text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
                Back to Course Lessons
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-bss-soft-orange border border-bss-border rounded-xl p-4 flex items-center gap-3 text-bss-error text-sm">
          <AlertTriangle size={18} className="shrink-0 text-bss-error" />
          <span>{error}</span>
        </div>
      )}

      {/* Assignment Workspace */}
      <main className="bss-3d bss-scroll-rise bss-card rounded-2xl overflow-hidden">
        {/* Instructions */}
        {assignment.instructions && (
          <div className="p-5 bg-bss-blue-tint/50 border-b border-bss-border flex gap-3">
            <HelpCircle size={18} className="text-bss-interactive-blue shrink-0 mt-0.5" />
            <div className="text-xs text-bss-text-secondary leading-relaxed whitespace-pre-line">
              <strong className="font-semibold text-bss-text-primary block mb-1">Instructions:</strong>
              {assignment.instructions}
            </div>
          </div>
        )}

        {/* QUIZ INTERFACE */}
        {assignment.type === 'QUIZ' ? (
          totalQuestions > 0 ? (
            <div className="p-6 space-y-6">
              {/* Question Navigation Header */}
              <div className="flex items-center justify-between border-b border-bss-border pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-bss-text-muted">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
                <span className="text-xs font-semibold text-bss-text-muted">
                  Pass Mark: {assignment.passScore}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 bg-bss-bg rounded-full overflow-hidden">
                <div className="h-full bg-[#01183A] transition-all duration-300 rounded-full" style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }} />
              </div>

              {/* Current Question */}
              <div className="py-2 space-y-4">
                <h3 className="text-base font-semibold text-bss-text-primary leading-snug">
                  {currentQuestionIndex + 1}. {currentQuestion.question}
                </h3>

                <div className="grid gap-3 pt-2">
                  {currentQuestion.options.map((option, oi) => {
                    const selected = answers[currentQuestion.id] === oi;
                    return (
                      <label
                        key={oi}
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          selected
                            ? 'border-[#01183A] bg-bss-blue-tint/60 shadow-sm'
                            : 'border-bss-border hover:border-bss-border bg-white'
                        } ${cooldownRemaining ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="radio"
                          name={`q-${currentQuestion.id}`}
                          disabled={!!cooldownRemaining}
                          checked={selected}
                          onChange={() => setAnswers(cur => ({ ...cur, [currentQuestion.id]: oi }))}
                          className="mt-0.5 h-4 w-4 text-[#01183A] border-bss-border focus:ring-[#01183A]"
                        />
                        <span className="text-sm font-medium text-bss-text-primary leading-tight">{option}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Question Navigation Controls */}
              <div className="pt-4 border-t border-bss-border flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(i => i - 1)}
                  className="px-4 py-2 border border-bss-border rounded-lg text-xs font-semibold text-bss-text-secondary disabled:opacity-40 hover:bg-bss-bg flex items-center gap-1.5"
                >
                  <ChevronLeft size={16} /> Previous
                </button>

                <div className="flex gap-2">
                  {currentQuestionIndex < totalQuestions - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentQuestionIndex(i => i + 1)}
                      className="px-5 py-2.5 bg-[#01183A] text-white rounded-lg text-xs font-bold hover:bg-[#022B5E] flex items-center gap-1.5"
                    >
                      Next Question <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy || !!cooldownRemaining || Object.keys(answers).length < totalQuestions}
                      onClick={submitAssignment}
                      className="px-6 py-2.5 bg-[#14843C] text-white rounded-lg text-xs font-bold hover:bg-[#247c51] disabled:opacity-50 flex items-center gap-2 shadow-sm"
                    >
                      {busy ? 'Submitting...' : isPassed ? 'Re-submit Quiz' : 'Submit Quiz'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-bss-text-muted">No questions published for this quiz yet.</p>
          )
        ) : (
          /* WRITTEN / UPLOAD INTERFACE */
          <div className="p-6 space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-bss-text-muted">
              Your Written Answer / Response
            </label>
            <textarea
              rows={8}
              disabled={!!cooldownRemaining}
              value={writing}
              onChange={e => setWriting(e.target.value)}
              placeholder="Type your response here in detail..."
              className="w-full border border-bss-border rounded-xl p-4 text-sm text-bss-text-primary focus:ring-2 focus:ring-[#01183A] focus:border-transparent outline-none transition-all disabled:opacity-60"
            />
            {assignment.submission && (
              <div className="p-3 bg-bss-bg border border-bss-border rounded-xl text-xs text-bss-text-secondary flex items-center justify-between">
                <span>Submitted on {assignment.submission.submittedAt.slice(0, 10)} · Status: <strong>{assignment.submission.status}</strong></span>
                {assignment.submission.feedback && <span>Feedback: <em>{assignment.submission.feedback}</em></span>}
              </div>
            )}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={busy || !!cooldownRemaining || writing.trim().length === 0}
                onClick={submitAssignment}
                className="px-6 py-2.5 bg-[#01183A] text-white rounded-lg text-xs font-bold hover:bg-[#022B5E] disabled:opacity-50 flex items-center gap-2"
              >
                {busy ? 'Submitting...' : 'Submit Written Response'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
