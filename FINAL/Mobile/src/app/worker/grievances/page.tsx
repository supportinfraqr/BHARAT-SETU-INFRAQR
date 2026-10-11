"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, Square, Play, RotateCcw, Send, CheckCircle2, 
  MessageSquareWarning, Volume2, Globe, Clock, FileAudio,
  Loader2, Home, Info, Paperclip, X, ChevronRight,
  MapPin, UserRound, Building2, TimerReset, ClipboardList, MessageSquareText
} from 'lucide-react';
import Link from 'next/link';
import { hasFoulLanguage } from '@/lib/profanity';
import { grievanceFileBlobUrl, downloadGrievanceFile, openGrievanceFileInNewTab } from '@/lib/grievanceFiles';
import { useWorker } from '@/contexts/WorkerContext';
import PageHero from '@/components/portal/PageHero';

// Statuses mirror the BSS grievance lifecycle (schema: Submitted, Under Review,
// In Progress, Resolved). UI never invents new statuses.
type GrievanceStatus = 'Submitted' | 'Open' | 'In Progress' | 'Resolved' | 'Reopened' | 'Closed';

type Reply = { id: string; by: 'Worker' | 'Contractor' | 'Employer' | 'BSS'; text: string; at: string; attachment: boolean; attachmentName: string | null };

type Ticket = {
  id: string;
  ref: string;
  category: string;
  status: GrievanceStatus;
  raisedBy: string;
  site: string;
  assignedTo: string;
  raisedAt: string;
  updatedAt: string;
  description: string;
  audioAvailable: boolean;
  duration: number;
  attachmentName: string | null;
  replyHistory: Reply[];
  resolutionConfirmed: boolean;
};

type BackendGrievance = {
  id: string;
  ref: string;
  category: string;
  status: GrievanceStatus;
  description: string;
  worker: string;
  workerId: string;
  site: string;
  employer: string;
  contractor: string;
  raisedAt: string;
  updatedAt: string;
  audioAvailable: boolean;
  duration: number;
  attachmentName: string | null;
  replyHistory: Reply[];
  resolutionConfirmed: boolean;
  resolvedAt: string;
  confirmedAt: string;
};

function formatDateTime(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const TIMELINE_STEPS: Array<{ status: GrievanceStatus; label: string; note: string }> = [
  { status:'Submitted', label:'Submitted', note:'Grievance recorded and assigned a reference.' },
  { status:'Open', label:'Open', note:'Seen by the resolution team.' },
  { status:'In Progress', label:'Action / Response', note:'Resolution action is in progress.' },
  { status:'Resolved', label:'Resolved', note:'Resolved — awaiting your confirmation.' },
  { status:'Closed', label:'Closed', note:'You confirmed the resolution.' },
];

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const LANGUAGE_BCP47: Record<string, string> = {
  Hindi: 'hi-IN', English: 'en-IN', Marathi: 'mr-IN', Telugu: 'te-IN', Bhojpuri: 'hi-IN', Punjabi: 'pa-IN',
  Bengali: 'bn-IN', Tamil: 'ta-IN', Gujarati: 'gu-IN', Kannada: 'kn-IN', Malayalam: 'ml-IN',
  Odia: 'or-IN', Urdu: 'ur-IN', Assamese: 'as-IN',
};

const STATUS_INDEX: Record<GrievanceStatus, number> = { Submitted:0, Open:1, 'In Progress':2, Resolved:3, Reopened:2, Closed:4 };

export default function GrievancePage() {
  const { worker } = useWorker();
  const [view, setView] = useState<'lodge' | 'track'>('lodge');
  const [language, setLanguage] = useState('Hindi');
  const [category, setCategory] = useState('Wages');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'recorded' | 'playing'>('idle');
  const [timer, setTimer] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedGrievance, setSubmittedGrievance] = useState<{ref: string, date: string, status: GrievanceStatus} | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [recordError, setRecordError] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const contentTopRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const replyFileRef = useRef<HTMLInputElement>(null);
  const [replyText, setReplyText] = useState('');
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [playUrl, setPlayUrl] = useState('');

  const toTicket = useCallback((g: BackendGrievance): Ticket => ({
    id: g.id,
    ref: g.ref,
    category: g.category,
    status: g.status,
    raisedBy: 'You (Self)',
    site: g.site || worker.employment?.site || '—',
    assignedTo: g.contractor ? `Contractor · ${g.contractor}` : 'Awaiting assignment',
    raisedAt: formatDateTime(g.raisedAt),
    updatedAt: formatDateTime(g.updatedAt),
    description: g.description || 'Voice grievance recorded (see audio).',
    audioAvailable: g.audioAvailable,
    duration: g.duration || 0,
    attachmentName: g.attachmentName,
    replyHistory: g.replyHistory ?? [],
    resolutionConfirmed: g.resolutionConfirmed,
  }), [worker.employment?.site]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch('/api/worker/grievances', { cache: 'no-store' });
      const json = await response.json() as { data?: BackendGrievance[]; error?: string };
      if (!response.ok) throw new Error(json.error || 'Grievances could not be loaded.');
      setTickets((json.data ?? []).map(toTicket));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Grievances could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [toTicket]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
  useEffect(() => { void load(); }, [load]);

  // Deep-link support: /worker/grievances#GRV-… opens the grievance in Track Status.
  const openReferenceFromHash = () => {
    const ref = window.location.hash.replace(/^#/, '');
    if (!/^GRV-/i.test(ref)) return false;
    const ticket = tickets.find(item => item.ref === ref);
    if (!ticket) return false;
    setView('track');
    setSelectedTicket(ticket);
    setTimeout(() => {
      const element = document.getElementById(ref);
      if (element) element.scrollIntoView({ behavior:'smooth', block:'start' });
    }, 60);
    return true;
  };
  useEffect(() => {
    let timer: number | undefined;
    if (window.location.hash) timer = window.setTimeout(openReferenceFromHash, 0);
    const onHashChange = () => { if (window.location.hash) openReferenceFromHash(); };
    window.addEventListener('hashchange', onHashChange);
    return () => { if (timer) window.clearTimeout(timer); window.removeEventListener('hashchange', onHashChange); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets.length]);

  const goTo = (next: 'lodge' | 'track') => {
    setView(next);
    contentTopRef.current?.scrollIntoView({ behavior:'smooth', block:'start' });
  };

  useEffect(() => {
    if (recordingState === 'recording' || recordingState === 'playing') {
      timerRef.current = setInterval(() => { setTimer(prev => prev + 1); }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recordingState]);

  // Real speech-to-text (browser Web Speech API) + MediaRecorder, mirroring the
  // EesassinErp grievance recorder. No server-side transcription.
  const stopAudioStream = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  const translateText = (text: string, targetLanguage: string) => {
    const target = (LANGUAGE_BCP47[targetLanguage] || 'en-IN').split('-')[0];
    fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`)
      .then(r => r.json())
      .then((data: Array<Array<[string]>>) => {
        const translated = (data?.[0] ?? []).map(item => item?.[0] ?? '').join('');
        if (translated) setLiveTranscript(translated);
      })
      .catch(() => { /* keep the original transcription */ });
  };

  const startSpeechToText = (lang: string) => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setRecordError('Live transcription is not supported in this browser. Your audio will still be recorded.');
      return;
    }
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = LANGUAGE_BCP47[lang] || 'en-IN';
    recognition.onresult = event => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i += 1) transcript += `${event.results[i][0].transcript} `;
      setLiveTranscript(transcript.trim());
    };
    recognition.onerror = () => { /* audio is still recorded */ };
    recognition.start();
    recognitionRef.current = recognition;
  };

  const changeLanguage = (next: string) => {
    setLanguage(next);
    // Apply immediately to an in-progress recording by restarting recognition.
    if (recordingState === 'recording') {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      startSpeechToText(next);
    }
  };

  const startRecording = async () => {
    setRecordError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordError('Audio recording is not supported in this browser. Please type your concern instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = event => { if (event.data.size) audioChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
        stopAudioStream();
      };
      mediaRecorderRef.current = recorder;
      recorder.start();

      startSpeechToText(language);

      setTimer(0);
      setLiveTranscript('');
      setRecordingState('recording');
    } catch (err) {
      stopAudioStream();
      const denied = err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      setRecordError(denied ? 'Microphone access was not allowed. Enable permission or type your concern.' : 'The recording could not start. Please try again or type your concern.');
    }
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    if (liveTranscript.trim()) translateText(liveTranscript, language);
    setRecordingState('recorded');
  };

  const playRecording = () => {
    if (!audioUrl) return;
    setRecordingState('playing');
    const el = audioElRef.current;
    if (el) { el.currentTime = 0; void el.play(); }
  };
  const stopPlaying = () => { audioElRef.current?.pause(); setRecordingState('recorded'); };
  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(''); setAudioBlob(null); setRecordingState('idle'); setTimer(0); setLiveTranscript(''); setRecordError('');
  };

  const submitGrievance = async () => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const form = new FormData();
      form.append('category', category);
      form.append('body', description || liveTranscript);
      form.append('language', language);
      if (attachment) form.append('attachment', attachment, attachment.name);
      form.append('duration', String(timer));
      if (audioBlob) form.append('audio', audioBlob, 'recording.webm');
      const response = await fetch('/api/worker/grievances', { method: 'POST', body: form });
      const json = await response.json() as { data?: BackendGrievance; error?: string };
      if (!response.ok || !json.data) throw new Error(json.error || 'Grievance could not be submitted.');
      const ticket = toTicket(json.data);
      setTickets(current => [ticket, ...current]);
      setSubmittedGrievance({ ref: ticket.ref, date: ticket.raisedAt, status: ticket.status });
      resetRecording();
      setDescription(''); setAttachment(null);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Grievance could not be submitted.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Lifecycle actions on a ticket (reply / confirm / reopen) via the shared,
  // attachment-capable endpoint.
  const runAction = async (ticket: Ticket, action: 'reply' | 'confirm' | 'reopen', body?: string, file?: File | null) => {
    setActionBusy(true); setActionError('');
    try {
      const form = new FormData();
      form.append('action', action);
      if (body) form.append('body', body);
      if (file) form.append('attachment', file, file.name);
      const response = await fetch(`/api/grievances/${ticket.id}/action`, { method: 'POST', body: form });
      const json = await response.json() as { data?: BackendGrievance; error?: string };
      if (!response.ok || !json.data) throw new Error(json.error || 'The grievance could not be updated.');
      const updated = toTicket(json.data);
      setTickets(current => current.map(t => t.id === updated.id ? updated : t));
      setSelectedTicket(updated);
      return true;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'The grievance could not be updated.');
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  const sendReply = async (ticket: Ticket) => {
    if (!replyText.trim() && !replyFile) return;
    const ok = await runAction(ticket, 'reply', replyText.trim(), replyFile);
    if (ok) { setReplyText(''); setReplyFile(null); }
  };

  const playAudio = async (ticket: Ticket) => {
    setActionError('');
    try {
      if (playUrl) { URL.revokeObjectURL(playUrl); setPlayUrl(''); }
      const { url } = await grievanceFileBlobUrl(ticket.id, 'audio');
      setPlayUrl(url);
      window.setTimeout(() => { void audioElRef.current?.play(); }, 50);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'The recording could not be opened.');
    }
  };

  const statusBadge = (status: string) => {
    const config: Record<string, string> = { 'Submitted':'bg-slate-100 text-slate-600', 'Open':'bg-blue-100 text-bss-interactive-blue', 'In Progress':'bg-orange-100 text-[#F47A32]', 'Resolved':'bg-green-100 text-[#2F9E67]', 'Reopened':'bg-red-100 text-red-700', 'Closed':'bg-emerald-100 text-emerald-700' };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${config[status] ?? 'bg-bss-bg text-bss-text-secondary'}`}>{status}</span>;
  };

  const counts = {
    submitted: tickets.filter(t => t.status === 'Submitted').length,
    open: tickets.filter(t => t.status === 'Open').length,
    inProgress: tickets.filter(t => t.status === 'In Progress' || t.status === 'Reopened').length,
    resolved: tickets.filter(t => t.status === 'Resolved').length,
    total: tickets.length,
  };
  // Foul language — only a gentle in-form highlight; no notification is sent.
  const foulSpotted = hasFoulLanguage(description) || hasFoulLanguage(liveTranscript);

  const Timeline = ({ ticket }: { ticket: Ticket }) => {
    const current = STATUS_INDEX[ticket.status];
    const reached = STATUS_INDEX[ticket.status];
    return (
      <div className="space-y-0">
        {TIMELINE_STEPS.map((step, index) => {
          const isReached = index <= reached;
          const isCurrent = index === current;
          const showUpdated = isCurrent && index > 0 && ticket.updatedAt !== ticket.raisedAt;
          return (
            <div key={step.status} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isReached ? (isCurrent ? 'bg-[#073B67] border-[#073B67] text-white' : 'bg-green-100 border-green-200 text-[#2F9E67]') : 'bg-white border-bss-border text-bss-text-muted'}`}>
                  {isReached && index < reached ? <CheckCircle2 size={13}/> : isCurrent ? <span className="w-1.5 h-1.5 rounded-full bg-white"/> : <span className="w-1.5 h-1.5 rounded-full bg-bss-bg"/>}
                </span>
                {index < TIMELINE_STEPS.length - 1 && <span className={`w-0.5 flex-1 min-h-6 ${isReached && index < reached ? 'bg-green-200' : 'bg-bss-bg'}`}/>}
              </div>
              <div className={`pb-5 ${isReached ? '' : 'opacity-45'}`}>
                <p className={`text-xs font-bold ${isCurrent ? 'text-[#073B67]' : 'text-bss-text-secondary'}`}>{step.label}</p>
                <p className="text-[11px] text-bss-text-muted mt-0.5">{isReached ? step.note : 'Pending'}</p>
                {index === 0 && isReached && <p className="text-[11px] text-bss-text-muted mt-0.5">Raised {ticket.raisedAt}</p>}
                {showUpdated && <p className="text-[11px] font-medium text-bss-text-muted mt-0.5">Last update · {ticket.updatedAt}</p>}
              </div>
            </div>
          );
        })}
        <p className="text-[10px] text-bss-text-muted mt-1">Progress reflects events recorded in the BSS grievance system.</p>
      </div>
    );
  };

  return (
    <div ref={contentTopRef} className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6 scroll-mt-24">
      
      <PageHero
        title="Grievances"
        subtitle="Lodge a new grievance or track your submitted tickets end-to-end."
        actions={<>
          {view === 'lodge' ? (
            <button onClick={() => goTo('track')} className="bg-white/10 border border-white/20 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-white/20 transition-colors flex items-center gap-2"><ClipboardList size={16}/>My Grievances · Track Status</button>
          ) : (
            <button onClick={() => goTo('lodge')} className="bg-white/10 border border-white/20 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-white/20 transition-colors flex items-center gap-2"><Mic size={16}/>Lodge New Grievance</button>
          )}
          <Link href="/worker" className="w-10 h-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors" title="Go to Dashboard">
            <Home size={18} />
          </Link>
        </>}
      />

      {/* TICKET STATS */}
      {loading && <p className="text-xs font-semibold text-bss-text-muted">Loading your grievances…</p>}
      {loadError && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Submitted', value: counts.submitted, tone:'text-slate-600 bg-slate-50 border-slate-100' },
          { label:'Open', value: counts.open, tone:'text-bss-interactive-blue bg-bss-blue-tint border-bss-border' },
          { label:'In Progress', value: counts.inProgress, tone:'text-[#F47A32] bg-orange-50 border-orange-100' },
          { label:'Resolved', value: counts.resolved, tone:'text-[#2F9E67] bg-green-50 border-green-100' },
        ].map(stat => <div key={stat.label} className={`rounded-xl border p-4 ${stat.tone}`}><strong className="block text-2xl font-bold">{stat.value}</strong><span className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{stat.label}</span></div>)}
      </section>

      {/* SEGMENTED VIEW SWITCH — filing and tracking are distinct experiences */}
      {!submittedGrievance && (
        <div className="bss-3d bss-scroll-rise flex flex-wrap items-center justify-between gap-3 bg-white border border-bss-border rounded-2xl p-1.5">
          <div className="flex gap-1 bg-bss-bg p-1 rounded-xl w-fit">
            <button onClick={() => setView('lodge')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-colors ${view === 'lodge' ? 'bg-[#073B67] text-white shadow-sm' : 'text-bss-text-secondary hover:text-[#073B67]'}`}><MessageSquareText size={15}/>Lodge Grievance</button>
            <button onClick={() => setView('track')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-colors ${view === 'track' ? 'bg-[#073B67] text-white shadow-sm' : 'text-bss-text-secondary hover:text-[#073B67]'}`}><ClipboardList size={15}/>Track Status <span className="text-[10px] bg-white/90 text-[#073B67] px-1.5 rounded-full font-black">{counts.total}</span></button>
          </div>
          {view === 'track' && <p className="text-[11px] font-semibold text-bss-text-muted px-3">{counts.total} grievance{counts.total === 1 ? '' : 's'} · statuses shown exactly as recorded by BSS</p>}
        </div>
      )}

      {submittedGrievance ? (
        <div className="bss-3d bss-scroll-rise bg-white rounded-[16px] shadow-sm border border-green-200 overflow-hidden text-center p-10 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-[#2F9E67]" />
          </div>
          <h2 className="text-2xl font-bold text-bss-text-primary mb-2">Grievance Submitted</h2>
          <p className="text-bss-text-muted max-w-sm mx-auto mb-8">
            Your complaint has been recorded and forwarded to the appropriate authorities. Track its progress from the My Grievances screen.
          </p>
          
          <div className="bg-bss-bg border border-bss-border rounded-xl max-w-md mx-auto p-4 flex flex-col gap-3 text-left">
            <div className="flex justify-between items-center border-b border-bss-border pb-2">
              <span className="text-xs font-bold text-bss-text-muted uppercase tracking-wider">Ticket / Reference Number</span>
              <span className="font-mono font-bold text-[#073B67]">{submittedGrievance.ref}</span>
            </div>
            <div className="flex justify-between items-center border-b border-bss-border pb-2">
              <span className="text-xs font-bold text-bss-text-muted uppercase tracking-wider">Raised Date & Time</span>
              <span className="font-semibold text-bss-text-primary">{submittedGrievance.date}</span>
            </div>
            <div className="flex justify-between items-center border-b border-bss-border pb-2">
              <span className="text-xs font-bold text-bss-text-muted uppercase tracking-wider">Raised By</span>
              <span className="font-semibold text-bss-text-primary">{worker.identity.name?.trim() ? `${worker.identity.name} (Self)` : 'You (Self)'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-bss-text-muted uppercase tracking-wider">Current Status</span>
              {statusBadge(submittedGrievance.status)}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={() => goTo('track')} className="bg-[#073B67] text-white px-6 py-2.5 rounded-[8px] font-bold text-sm hover:bg-[#062D4F] transition-colors flex items-center gap-2"><ClipboardList size={16}/>View My Grievances</button>
            <button onClick={() => setSubmittedGrievance(null)} className="bg-white border border-[#073B67] text-[#073B67] px-6 py-2.5 rounded-[8px] font-bold text-sm hover:bg-bss-bg transition-colors">
              Record Another
            </button>
          </div>
        </div>
      ) : view === 'lodge' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* RECORDING / FORM INTERFACE */}
          <div id="new-grievance" className="space-y-6 scroll-mt-24">
            <div className="bss-3d bss-scroll-rise bg-white rounded-[16px] shadow-sm border border-bss-border overflow-hidden">
              <div className="p-4 border-b border-bss-border bg-bss-bg/50 flex flex-wrap justify-between items-center gap-3">
                <h2 className="font-bold text-bss-text-primary flex items-center gap-2"><Mic size={18} className="text-[#073B67]"/> New Grievance</h2>
                <div className="flex items-center gap-2 bg-white border border-bss-border px-3 py-1.5 rounded-lg">
                  <Globe size={14} className="text-bss-text-muted" />
                  <span className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider hidden sm:inline">Preferred Response Language</span>
                  <select value={language} onChange={(e) => changeLanguage(e.target.value)} className="text-xs font-bold text-bss-text-secondary bg-transparent outline-none cursor-pointer">
                    <option value="Hindi">हिन्दी</option>
                    <option value="English">English</option>
                    <option value="Marathi">मराठी</option>
                    <option value="Telugu">తెలుగు</option>
                    <option value="Bhojpuri">भोजपुरी</option>
                    <option value="Punjabi">ਪੰਜਾਬੀ</option>
                    <option value="Bengali">বাংলা</option>
                    <option value="Tamil">தமிழ்</option>
                    <option value="Gujarati">ગુજરાતી</option>
                    <option value="Kannada">ಕನ್ನಡ</option>
                    <option value="Malayalam">മലയാളം</option>
                    <option value="Odia">ଓଡ଼ିଆ</option>
                    <option value="Urdu">اردو</option>
                    <option value="Assamese">অসমীয়া</option>
                  </select>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Category */}
                <div>
                  <label className="block text-[11px] font-bold text-bss-text-muted uppercase tracking-wider mb-2">Grievance Category</label>
                  <div className="flex flex-wrap gap-2">
                    {['Wages','Safety','Harassment','Accommodation','Benefits','Other'].map(cat => (
                      <button key={cat} type="button" onClick={() => setCategory(cat)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${category === cat ? 'bg-[#073B67] text-white border-[#073B67]' : 'bg-white text-bss-text-secondary border-bss-border hover:border-[#073B67]/40'}`}>{cat}</button>
                    ))}
                  </div>
                </div>

                {/* Recorder */}
                <div className="bg-bss-bg/70 rounded-xl p-5 flex flex-col items-center">
                  <div className="text-4xl font-mono font-extrabold text-[#073B67] mb-5 tabular-nums">
                    {formatTime(timer)}
                  </div>

                  {recordingState === 'idle' && (
                    <button onClick={startRecording} className="w-20 h-20 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 border-4 border-red-100 transition-all shadow-md group">
                      <Mic size={30} className="group-hover:scale-110 transition-transform" />
                    </button>
                  )}
                  {recordingState === 'recording' && (
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-30"></div>
                      <button onClick={stopRecording} className="relative w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white border-4 border-red-200 shadow-lg">
                        <Square size={26} fill="currentColor" />
                      </button>
                    </div>
                  )}
                  {recordingState === 'playing' && (
                    <button onClick={stopPlaying} className="w-20 h-20 rounded-full bg-[#073B67] flex items-center justify-center text-white border-4 border-blue-200 shadow-lg">
                      <Square size={26} fill="currentColor" />
                    </button>
                  )}
                  {recordingState === 'recorded' && (
                    <div className="flex items-center gap-6">
                      <button onClick={resetRecording} className="flex flex-col items-center gap-1.5 text-bss-text-muted hover:text-bss-text-primary transition-colors">
                        <div className="w-11 h-11 rounded-full bg-white border border-bss-border flex items-center justify-center"><RotateCcw size={18} /></div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Re-record</span>
                      </button>
                      <button onClick={playRecording} className="flex flex-col items-center gap-1.5 text-[#2F9E67] hover:text-[#237c50] transition-colors">
                        <div className="w-14 h-14 rounded-full bg-green-50 border-2 border-green-100 flex items-center justify-center shadow-sm"><Play size={24} fill="currentColor" className="ml-1" /></div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Play</span>
                      </button>
                    </div>
                  )}

                  <p className="mt-4 text-sm font-semibold text-bss-text-muted h-5">
                    {recordingState === 'idle' && 'Tap the microphone to start recording'}
                    {recordingState === 'recording' && <span className="text-red-500 animate-pulse">● Recording in progress...</span>}
                    {recordingState === 'playing' && 'Playing back recording...'}
                    {recordingState === 'recorded' && 'Review your recording or submit'}
                  </p>
                  <audio ref={audioElRef} src={audioUrl || undefined} onEnded={() => setRecordingState('recorded')} className="hidden" />
                  {recordError && <p className="mt-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">{recordError}</p>}
                </div>

                {/* Live AI transcription */}
                {recordingState !== 'idle' && (
                  <div className="bg-[#0A192F] rounded-xl p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2"><Volume2 size={12}/>Live AI transcription · {language}</p>
                    {recordingState === 'recording' && !liveTranscript ? <p className="text-xs text-slate-500 animate-pulse">Listening…</p> : <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">{liveTranscript || (recordingState === 'recorded' ? 'No speech detected — your audio recording is still attached.' : '')}</p>}
                    {foulSpotted && <p className="mt-2 text-[11px] font-semibold text-amber-300 bg-amber-400/10 border border-amber-300/20 rounded-lg px-3 py-2">Heads up: your recording appears to contain strong language. Please describe your concern respectfully — offensive words are masked when your case is shown to the contractor.</p>}
                  </div>
                )}

                {/* Describe the concern */}
                <div>
                  <label className="block text-[11px] font-bold text-bss-text-muted uppercase tracking-wider mb-2">Describe the Concern</label>
                  <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Write the concern in your own words (optional if you recorded audio)" className="w-full bg-white border border-bss-border rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] resize-none"/>
                  {foulSpotted && <p className="mt-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-1.5"><MessageSquareWarning size={13} className="mt-0.5 flex-shrink-0"/>Please avoid using foul or abusive language in your grievance. Your case text is shared with the contractor — inappropriate words are masked on their screen but describing the issue clearly helps it get resolved faster.</p>}
                </div>

                {/* Attachment */}
                <div className="flex items-center justify-between gap-3 bg-bss-bg/70 rounded-xl p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip size={16} className="text-bss-text-muted flex-shrink-0"/>
                    <span className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider flex-shrink-0">Upload Letter / Letter Image</span>
                    {attachment ? <span className="text-xs font-semibold text-[#073B67] truncate flex items-center gap-1"><FileAudio size={14}/>{attachment.name}<button onClick={() => setAttachment(null)} className="text-bss-text-muted hover:text-red-500"><X size={13}/></button></span> : <span className="text-xs text-bss-text-muted">No file chosen</span>}
                  </div>
                  <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setAttachment(f); }}/>
                  <button onClick={() => fileRef.current?.click()} className="text-xs font-bold text-[#073B67] bg-white border border-bss-border px-3 py-1.5 rounded-lg hover:bg-bss-bg flex-shrink-0">Choose file</button>
                </div>

                {submitError && <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{submitError}</p>}
                <button onClick={submitGrievance} disabled={isSubmitting || (!description.trim() && !liveTranscript.trim() && !audioBlob && !attachment)} className="w-full bg-[#073B67] hover:bg-[#062D4F] disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm transition-colors flex justify-center items-center gap-2">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  {isSubmitting ? 'Submitting Grievance...' : 'Submit Grievance'}
                </button>
              </div>
            </div>

            {/* Recording guide & tips */}
            <div className="bg-[#073B67] rounded-[16px] p-5 text-white shadow-sm">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Info size={16} className="text-[#F47A32]"/> Recording guide</h3>
              <div className="space-y-2 text-xs text-white/85">
                <p className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">1</span>State your <strong>Worker Name and BSS ID</strong> at the start.</p>
                <p className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">2</span>Mention the <strong>Contractor Name</strong> you are bound to.</p>
                <p className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">3</span>Mention the <strong>Principal Employer and Site details</strong>.</p>
                <p className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">4</span>Describe <strong>what happened, when and where</strong>, then what you expect.</p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#F47A32] mb-2">Recording tips</h4>
                <ul className="space-y-1 text-[11px] text-white/75">
                  <li>• Record in a quiet place and speak clearly.</li>
                  <li>• Keep the recording under 2 minutes.</li>
                  <li>• You can re-record any time before submitting.</li>
                  <li>• Attach a letter or photo if you have evidence.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* TRACKING TEASER */}
          <div className="space-y-4">
            <div className="bss-3d bss-scroll-rise bg-white rounded-[16px] shadow-sm border border-bss-border overflow-hidden">
              <div className="p-4 border-b border-bss-border bg-bss-bg/50 flex items-center justify-between">
                <h2 className="font-bold text-bss-text-primary flex items-center gap-2"><ClipboardList size={17} className="text-[#073B67]"/> Your recent grievances</h2>
                <button onClick={() => goTo('track')} className="text-xs font-bold text-[#073B67] hover:underline flex items-center gap-1">View full tracking<ChevronRight size={14}/></button>
              </div>
              <div className="divide-y divide-bss-border">
                {tickets.slice(0, 3).map(ticket => (
                  <div key={ticket.ref} className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-[#073B67]">{ticket.ref}</span>{statusBadge(ticket.status)}</div>
                      <p className="text-[13px] text-bss-text-secondary font-medium mt-1 line-clamp-1">{ticket.description}</p>
                      <p className="text-[11px] text-bss-text-muted mt-0.5">Updated {ticket.updatedAt}</p>
                    </div>
                    <button onClick={() => { setSelectedTicket(ticket); goTo('track'); }} className="text-[11px] font-bold text-[#073B67] bg-bss-bg border border-bss-border px-3 py-1.5 rounded-lg hover:bg-bss-bg flex-shrink-0">Track</button>
                  </div>
                ))}
                {tickets.length === 0 && <p className="p-6 text-center text-xs text-bss-text-muted">No grievances raised yet.</p>}
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* TRACK STATUS — dedicated tracking experience */
        <div className="space-y-4 scroll-mt-24">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-bold text-bss-text-primary flex items-center gap-2"><Clock size={17} className="text-[#073B67]"/> My Grievances — Track Status</h2>
            <span className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">{counts.total} ticket{counts.total === 1 ? '' : 's'}</span>
          </div>

          {tickets.map(ticket => (
            <article key={ticket.ref} id={ticket.ref} className="bss-3d bss-scroll-rise bg-white rounded-[12px] border border-bss-border shadow-sm overflow-hidden scroll-mt-28">
              <button onClick={() => setSelectedTicket(selectedTicket?.ref === ticket.ref ? null : ticket)} className="w-full p-4 text-left flex items-start gap-3 hover:bg-bss-bg/60 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#073B67]">{ticket.ref}</span>
                    {statusBadge(ticket.status)}
                    <span className="text-[10px] font-semibold text-bss-text-muted">{ticket.category}</span>
                  </div>
                  <p className="text-sm font-semibold text-bss-text-primary mt-1.5 line-clamp-1">{ticket.description}</p>
                  <p className="text-[11px] text-bss-text-muted mt-1">Raised {ticket.raisedAt} · Last update {ticket.updatedAt}</p>
                </div>
                <span className="flex items-center gap-1.5 mt-1 flex-shrink-0"><span className="text-[10px] font-bold text-[#073B67]">{selectedTicket?.ref === ticket.ref ? 'Hide Details' : 'View Details'}</span><ChevronRight size={16} className={`text-bss-text-muted transition-transform ${selectedTicket?.ref === ticket.ref ? 'rotate-90' : ''}`}/></span>
              </button>

              {selectedTicket?.ref === ticket.ref && (
                <div className="border-t border-bss-border bg-bss-bg/50 p-4 sm:p-5 space-y-4 animate-in slide-in-from-top-1 duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div><p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider flex items-center gap-1"><UserRound size={11}/> Raised By</p><p className="font-semibold text-bss-text-primary mt-0.5">{ticket.raisedBy}</p></div>
                    <div><p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider flex items-center gap-1"><MapPin size={11}/> Site Location</p><p className="font-semibold text-bss-text-primary mt-0.5">{ticket.site}</p></div>
                    <div><p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider flex items-center gap-1"><Building2 size={11}/> Responsible Authority</p><p className="font-semibold text-bss-text-primary mt-0.5">{ticket.assignedTo}</p></div>
                    <div><p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider flex items-center gap-1"><TimerReset size={11}/> Updated Date & Time</p><p className="font-semibold text-bss-text-primary mt-0.5">{ticket.updatedAt}</p></div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Progress timeline */}
                    <div className="bg-white border border-bss-border rounded-xl p-4">
                      <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider mb-3">Resolution Progress</p>
                      <Timeline ticket={ticket} />
                    </div>
                    <div className="space-y-3">
                      {/* Original attachment (secure single-use link) */}
                      {ticket.attachmentName && (
                        <div className="bg-white border border-bss-border rounded-xl p-4 flex items-center justify-between gap-3">
                          <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider flex items-center gap-1.5"><Paperclip size={12}/>Your attachment</p>
                          <button onClick={() => void downloadGrievanceFile(ticket.id, 'attachment')} className="text-xs font-bold text-[#073B67] hover:underline truncate">{ticket.attachmentName}</button>
                        </div>
                      )}
                      {/* Voice recording — single request → blob (single-use token) */}
                      {ticket.audioAvailable && (
                        <div className="bg-white border border-bss-border rounded-xl p-4">
                          <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5"><FileAudio size={12}/> Voice recording</p>
                          {playUrl ? <audio controls autoPlay src={playUrl} className="w-full" /> : <button onClick={() => void playAudio(ticket)} className="text-xs font-bold text-[#073B67] hover:underline flex items-center gap-1"><Play size={13}/>Play recording</button>}
                        </div>
                      )}
                      {/* Conversation + worker reply */}
                      <div className="bg-white border border-bss-border rounded-xl p-4">
                        <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider mb-3">Conversation</p>
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                          {ticket.replyHistory.length === 0 && <p className="text-xs text-bss-text-muted italic">No replies yet — the contractor and principal employer have been notified.</p>}
                          {ticket.replyHistory.map(entry => (
                            <div key={entry.id} className={`rounded-lg border p-2.5 text-xs ${entry.by === 'Worker' ? 'bg-bss-bg border-bss-border ml-6' : 'bg-bss-blue-tint border-bss-border mr-6'}`}>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-1">{entry.by} · {formatDateTime(entry.at)}</p>
                              {entry.text && <p className="text-bss-text-primary leading-5 whitespace-pre-line">{entry.text}</p>}
                              {entry.attachment && <button onClick={() => void openGrievanceFileInNewTab(ticket.id, 'attachment', entry.id)} className="mt-1 text-[11px] font-bold text-[#073B67] hover:underline flex items-center gap-1"><Paperclip size={11}/>{entry.attachmentName || 'Attachment'}</button>}
                            </div>
                          ))}
                        </div>
                        {ticket.status !== 'Closed' && (
                          <div className="mt-3 space-y-2">
                            <textarea rows={2} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Reply to the contractor / employer…" className="w-full border border-bss-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#0066CC] resize-none"/>
                            <div className="flex items-center gap-2">
                              <input ref={replyFileRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setReplyFile(f); }}/>
                              <button onClick={() => replyFileRef.current?.click()} className="text-[11px] font-bold text-bss-text-secondary border border-bss-border rounded-lg px-2.5 py-1.5 hover:bg-bss-bg flex items-center gap-1"><Paperclip size={12}/>{replyFile ? replyFile.name : 'Attach'}</button>
                              {replyFile && <button onClick={() => setReplyFile(null)} aria-label="Remove attachment" className="text-bss-text-muted hover:text-red-500"><X size={13}/></button>}
                              <button onClick={() => void sendReply(ticket)} disabled={actionBusy || (!replyText.trim() && !replyFile)} className="ml-auto text-xs font-bold text-white bg-[#073B67] rounded-lg px-3 py-1.5 hover:bg-[#062D4F] disabled:opacity-50 flex items-center gap-1"><Send size={12}/>Send reply</button>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Lifecycle actions */}
                      <div className="flex flex-wrap gap-2 items-center">
                        {ticket.status === 'Resolved' && <button onClick={() => void runAction(ticket, 'confirm')} disabled={actionBusy} className="text-xs font-bold text-white bg-[#2F9E67] rounded-lg px-3 py-2 hover:brightness-95 disabled:opacity-50 flex items-center gap-1"><CheckCircle2 size={13}/>Confirm resolution</button>}
                        {['Resolved', 'Closed'].includes(ticket.status) && <button onClick={() => void runAction(ticket, 'reopen')} disabled={actionBusy} className="text-xs font-bold text-red-600 border border-red-200 rounded-lg px-3 py-2 hover:bg-red-50 disabled:opacity-50 flex items-center gap-1"><RotateCcw size={13}/>Reopen</button>}
                        <span className="text-[11px] text-bss-text-muted ml-auto">Auto-generated reference · {ticket.ref}</span>
                      </div>
                      {actionError && <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{actionError}</p>}
                    </div>
                  </div>
                </div>
              )}
            </article>
          ))}

          {tickets.length === 0 && <div className="bss-3d bss-scroll-rise bg-white border border-dashed border-bss-border rounded-2xl p-10 text-center"><p className="text-sm font-semibold text-bss-text-secondary">No grievances raised yet</p><p className="text-xs text-bss-text-muted mt-1">Your raised grievances and their status will appear here.</p></div>}
        </div>
      )}
    </div>
  );
}
