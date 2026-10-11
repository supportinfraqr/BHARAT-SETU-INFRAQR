"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BssTaxonomies } from '@/data/taxonomies';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorker } from '@/contexts/WorkerContext';
import PageHero from '@/components/portal/PageHero';
import type { WorkerRecord } from '@/types/portal';
import { MobilitySection, type MobilitySectionHandle } from '@/components/worker/MobilitySection';
import { workerCompletion, completionTab } from '@/lib/workerProfileCompletion';
import DownSelect from '@/components/ui/DownSelect';
import { ResendOtp } from '@/components/auth/ResendOtp';
import { formatDate } from '@/lib/date';
import { 
  UserCircle, Save, CheckCircle2, CheckCheck, ShieldCheck, 
  MapPin, FileText, Users,
  Building2, CreditCard, Briefcase, Award, BadgeCheck,
  Clock,
  Database, Fingerprint, RefreshCw, CheckCircle, HardHat,
  Plus, Trash2, Percent, Upload, X, Eye, Camera, ChevronDown
} from 'lucide-react';

// Disability "Type / %" picker — fixed type + percentage combinations (RPwD
// common categories; 40% is the certification threshold in India).
const DISABILITY_TYPES = ['Locomotor', 'Visual', 'Hearing', 'Speech', 'Intellectual', 'Multiple'];
const DISABILITY_PERCENTS = [40, 50, 60, 70, 80, 90, 100];
const DISABILITY_OPTIONS = [
  ...DISABILITY_TYPES.flatMap(t => DISABILITY_PERCENTS.map(p => `${t} ${p}%`)),
  'Other / not listed',
];

/** Normalize the stored disability status to 'Yes' | 'No' | '' (Select). */
function normDisabilityStatus(v: unknown): string {
  const s = String(v ?? '').trim();
  return /^yes$/i.test(s) ? 'Yes' : /^no$/i.test(s) ? 'No' : '';
}

export default function WorkerProfilePage() {
  const { t } = useLanguage();
  const { worker, updateWorker, saveWorker, refresh } = useWorker();
  const mobilityRef = useRef<MobilitySectionHandle>(null);
  // Same source of truth as the dashboard card: the missing items are exactly
  // the ones dragging the profile-completion percentage down.
  const profileMissing = workerCompletion(worker).missing;
  const missingTabs = new Set(profileMissing.map(item => completionTab(item.section)));
  const [highlightMissing, setHighlightMissing] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'attendance' | 'contact' | 'family' | 'social' | 'banking' | 'classification' | 'employment' | 'skills' | 'welfare' | 'other' | 'integrations'>('personal');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  // Save Persona stays disabled until the user actually changes something.
  const [dirty, setDirty] = useState(false);
  // Switching tabs resets the dirty state AND any validation error/highlights
  // from the previous tab, so a missing-field warning never leaks onto another
  // section's Save Persona.
  useEffect(() => { setDirty(false); setProfileError(''); setInvalidFields([]); setSaveAttempted(false); }, [activeTab]);

  // ── Dynamic nominees ──────────────────────────────────────────────────
  type NomineeDoc = { type: string; name: string; fileName?: string; url?: string };
  type Nominee = { id: number; name: string; dependant: string; nomineeType: string; relationship: string; dob: string; contact: string; address: string; documents: NomineeDoc[]; percent: number };
  // Split 100% across the nominees as evenly as possible (remainder on the last).
  const balanceNominees = (list: Nominee[]): Nominee[] => {
    if (list.length === 0) return list;
    const base = Math.floor(100 / list.length);
    const remainder = 100 - base * list.length;
    return list.map((n, i) => ({ ...n, percent: base + (i === list.length - 1 ? remainder : 0) }));
  };
  const [nominees, setNominees] = useState<Nominee[]>(() => {
    const list = (worker.family?.nominees ?? []).map(n => ({
      id: n.id, name: n.name, dependant: n.dependant, nomineeType: n.nomineeType,
      relationship: n.relation, dob: n.dob, contact: n.contact, address: n.address,
      documents: (n.documents ?? []).map(d => typeof d === 'string' ? { type: d, name: d } : d), percent: n.percent ?? 100,
    }));
    const total = list.reduce((sum, n) => sum + (Number.isFinite(n.percent) ? n.percent : 0), 0);
    // Repair a previously-saved total that isn't 100 so the section opens balanced.
    return list.length > 0 && total !== 100 ? balanceNominees(list) : list;
  });
  const [nextNomineeId, setNextNomineeId] = useState(() => Math.max(0, ...(worker.family?.nominees ?? []).map(n => n.id)) + 1);
  const [docTargetId, setDocTargetId] = useState<number | null>(null);
  // Disability: Status drives whether Type / % is applicable.
  const [disabilityStatus, setDisabilityStatus] = useState(() => normDisabilityStatus(worker.personal.disabilityStatus));
  const [disabilityTypePct, setDisabilityTypePct] = useState(() => worker.identity.disabilityTypePct || '');
  const [disabilityTypeOpen, setDisabilityTypeOpen] = useState(false);
  const [maritalStatus, setMaritalStatus] = useState(() => worker.personal.maritalStatus || '');
  const [bloodGroup, setBloodGroup] = useState(() => worker.personal.bloodGroup || '');
  const [religion, setReligion] = useState(() => worker.personal.religion || '');
  const [caste, setCaste] = useState(() => worker.personal.caste || '');
  const [placeOfBirth, setPlaceOfBirth] = useState(() => worker.identity.placeOfBirth || worker.address.permanentState || '');
  const [motherName, setMotherName] = useState(() => worker.personal.motherName || '');
  const [emergencyName, setEmergencyName] = useState(() => worker.identity.emergencyContactName || '');
  const [emergencyNumber, setEmergencyNumber] = useState(() => worker.identity.emergencyContactNumber || '');
  const [emergencyRelation, setEmergencyRelation] = useState(() => worker.identity.emergencyContactRelation || '');
  const [alternateMobile, setAlternateMobile] = useState(() => worker.contact.alternateMobile || '');
  const [email, setEmail] = useState(() => worker.contact.email || '');
  const [sector, setSector] = useState(() => worker.classification?.sector || '');
  const [occupation, setOccupation] = useState(() => worker.classification?.occupation || '');

  // Value-based dirty check for the Personal tab: enable Save when ANY field
  // differs from what's stored (changing then reverting back counts as "no
  // change" → Save stays disabled). Other tabs keep the event-based `dirty`.
  const personalDirty =
    maritalStatus !== (worker.personal.maritalStatus || '') ||
    bloodGroup !== (worker.personal.bloodGroup || '') ||
    religion !== (worker.personal.religion || '') ||
    caste !== (worker.personal.caste || '') ||
    placeOfBirth !== (worker.identity.placeOfBirth || worker.address.permanentState || '') ||
    motherName !== (worker.personal.motherName || '') ||
    emergencyName !== (worker.identity.emergencyContactName || '') ||
    emergencyNumber !== (worker.identity.emergencyContactNumber || '') ||
    emergencyRelation !== (worker.identity.emergencyContactRelation || '') ||
    alternateMobile !== (worker.contact.alternateMobile || '') ||
    email !== (worker.contact.email || '') ||
    disabilityStatus !== normDisabilityStatus(worker.personal.disabilityStatus) ||
    disabilityTypePct !== (worker.identity.disabilityTypePct || '');
  const nomineeFileRef = useRef<HTMLInputElement>(null);
  const facePhotoInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement>(null);
  const [activeFaceSlot, setActiveFaceSlot] = useState<number | null>(null);
  const [facePhotos, setFacePhotos] = useState<Record<number, string>>({});
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [faceEnrollStatus, setFaceEnrollStatus] = useState('');
  const [faceChecks, setFaceChecks] = useState<Record<number, { state: 'checking' | 'ok' | 'error'; message?: string }>>({});
  const [faceMatch, setFaceMatch] = useState<Record<number, { state: 'checking' | 'ok' | 'error'; pct?: number; matched?: boolean; message?: string }>>({});
  const [faceSaveBusy, setFaceSaveBusy] = useState(false);
  const [faceEnrolled, setFaceEnrolled] = useState(0);
  const [enrolledPhotos, setEnrolledPhotos] = useState<Record<number, string>>({});
  const [faceStats, setFaceStats] = useState<{ photoCount: number; distinctPhotos: number }>({ photoCount: 0, distinctPhotos: 0 });
  const facePhotosRef = useRef<Record<number, string>>({});
  useEffect(() => { facePhotosRef.current = facePhotos; }, [facePhotos]);

  // Validate ONE staged photo (detect-only) and only keep it if a face is found.
  const checkFacePhoto = async (slot: number, dataUrl: string) => {
    // Reject an identical photo already staged in another slot — duplicate
    // captures collapse into a single face vector in the engine.
    const dup = Object.entries(facePhotosRef.current).find(([s, url]) => Number(s) !== slot && url === dataUrl);
    if (dup) {
      setFaceChecks(prev => ({ ...prev, [slot]: { state: 'error', message: `Same as Photo #${dup[0]} — capture a different angle` } }));
      setFaceEnrollStatus(`Photo #${slot} is identical to Photo #${dup[0]}. Each photo must be a different capture.`);
      return;
    }
    setFaceChecks(prev => ({ ...prev, [slot]: { state: 'checking' } }));
    try {
      const response = await fetch('/api/worker/face-check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: [dataUrl] }),
      });
      const body = await response.json().catch(() => ({})) as { data?: { results?: Array<{ face?: boolean; reason?: string }> }; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'The photo could not be checked.');
      const result = body.data.results?.[0];
      if (result?.face) {
        addFacePhoto(slot, dataUrl);
        setFaceChecks(prev => ({ ...prev, [slot]: { state: 'ok' } }));
        setFaceEnrollStatus('');
      } else {
        setFaceChecks(prev => ({ ...prev, [slot]: { state: 'error', message: result?.reason === 'invalid_image' ? 'Not a valid image' : 'No face detected — retake' } }));
        setFaceEnrollStatus('A photo was rejected (no face found). Please use a clear, front-facing photo.');
      }
    } catch (reason) {
      setFaceChecks(prev => ({ ...prev, [slot]: { state: 'error', message: reason instanceof Error ? reason.message : 'Check failed' } }));
    }
  };

  // Explicit Save & Enroll — sends all 5 together; the server re-checks every
  // photo and only saves/enrols when all five are valid faces.
  const saveFaceEnrollment = async () => {
    const slots = [1, 2, 3, 4, 5];
    if (slots.some(s => !facePhotos[s])) { setFaceEnrollStatus('Add all 5 face photos before saving.'); return; }
    // Block identical photos before hitting the server (they collapse to one vector).
    const seen = new Map<string, number>();
    const dups: number[] = [];
    for (const s of slots) {
      const value = facePhotos[s];
      const first = seen.get(value);
      if (first !== undefined) dups.push(s); else seen.set(value, s);
    }
    if (dups.length) {
      setFaceChecks(prev => {
        const next = { ...prev };
        dups.forEach(s => { next[s] = { state: 'error', message: 'Same as another photo — retake' }; });
        return next;
      });
      setFaceEnrollStatus('Some photos are identical — each of the 5 must be a different capture. Retake the highlighted ones.');
      return;
    }
    setFaceSaveBusy(true); setFaceEnrollStatus('Validating and enrolling your 5 photos…');
    try {
      const response = await fetch('/api/worker/face-enroll', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: slots.map(s => facePhotos[s]) }),
      });
      const body = await response.json().catch(() => ({})) as { data?: { enrolled: number; saved: number; matches?: Array<{ slot: number; cosinePct: number | null; matched: boolean | null }> }; error?: string; photoErrors?: number[]; duplicateErrors?: number[] };
      if (!response.ok || !body.data) {
        if (body.photoErrors?.length || body.duplicateErrors?.length) {
          setFaceChecks(prev => {
            const next = { ...prev };
            body.photoErrors?.forEach(i => { next[i + 1] = { state: 'error', message: 'No face detected — retake' }; });
            // duplicateErrors are already 1-based slot numbers.
            body.duplicateErrors?.forEach(slot => { next[slot] = { state: 'error', message: 'Same photo as another slot — retake a different angle' }; });
            return next;
          });
        }
        throw new Error(body.error ?? 'Enrolment failed.');
      }
      setFaceEnrolled(body.data.enrolled);
      setEnrolledPhotos(prev => ({ ...prev, ...facePhotos }));
      // Final Aadhaar match %, computed once at upload (stored server-side).
      if (Array.isArray(body.data.matches)) {
        setFaceMatch(prev => {
          const next = { ...prev };
          body.data!.matches!.forEach(m => {
            if (typeof m.cosinePct === 'number') next[m.slot] = { state: 'ok', pct: m.cosinePct, matched: m.matched ?? undefined };
          });
          return next;
        });
      }
      setFaceEnrollStatus(`Enrolled ${body.data.enrolled} of 5 photos for AI attendance.`);
      // Re-read the authoritative status (distinct photos + engine vectors).
      void fetch('/api/worker/face-status', { cache: 'no-store' })
        .then(r => (r.ok ? r.json() : null))
        .then((b: { data?: { enrolled?: number; photoCount?: number; distinctPhotos?: number } } | null) => {
          if (!b?.data) return;
          if (typeof b.data.enrolled === 'number') setFaceEnrolled(b.data.enrolled);
          setFaceStats({
            photoCount: b.data.photoCount ?? 5,
            distinctPhotos: b.data.distinctPhotos ?? 5,
          });
        })
        .catch(() => {});
    } catch (reason) {
      setFaceEnrollStatus(reason instanceof Error ? reason.message : 'Enrolment failed.');
    } finally { setFaceSaveBusy(false); }
  };

  // Load the server-side enrolled count on mount (source of truth).
  useEffect(() => {
    let active = true;
    void fetch('/api/worker/face-status', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((body: { data?: { enrolled?: number; photoCount?: number; distinctPhotos?: number } } | null) => {
        if (!active || !body?.data) return;
        if (typeof body.data.enrolled === 'number') setFaceEnrolled(body.data.enrolled);
        setFaceStats({
          photoCount: typeof body.data.photoCount === 'number' ? body.data.photoCount : 0,
          distinctPhotos: typeof body.data.distinctPhotos === 'number' ? body.data.distinctPhotos : 0,
        });
      })
      .catch(() => {});
    return () => { active = false; };
  }, [worker.identity.bssId]);

  // Load the stored face photos — including their persisted Aadhaar match %.
  // The match is computed ONCE server-side and stored on the photo, so it is
  // never recomputed on refresh.
  useEffect(() => {
    let active = true;
    void fetch('/api/worker/face-photos', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((body: { data?: Array<{ id: number; slot: number; aadhaarMatchPct?: number | null; aadhaarMatched?: boolean | null }> } | null) => {
        if (!active || !body?.data) return;
        const map: Record<number, string> = {};
        const matches: Record<number, { state: 'ok'; pct?: number; matched?: boolean }> = {};
        body.data.forEach(p => {
          if (!p.slot) return;
          map[p.slot] = `/api/worker/face-photos/${p.id}/file`;
          if (typeof p.aadhaarMatchPct === 'number') {
            matches[p.slot] = { state: 'ok', pct: p.aadhaarMatchPct, matched: p.aadhaarMatched ?? undefined };
          }
        });
        setEnrolledPhotos(map);
        setFaceMatch(prev => ({ ...prev, ...matches }));
      })
      .catch(() => {});
    return () => { active = false; };
  }, [worker.identity.bssId]);

  // Downscale + JPEG-compress a captured/selected image so 5 photos fit in
  // localStorage and under the upload size limit.
  const compressImage = (dataUrl: string, max = 640, quality = 0.75): Promise<string> =>
    new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(dataUrl); return; }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch { resolve(dataUrl); }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });

  // Merge one photo into the slot map (session-only; the saved photos come from
  // the server, so a cleared/re-enrolled state is never masked by stale browser
  // storage).
  const addFacePhoto = useCallback((slot: number, dataUrl: string) => {
    setFacePhotos(prev => ({ ...prev, [slot]: dataUrl }));
    // Drop any legacy localStorage copy so it can't resurface.
    try {
      const storageKey = `bss_face_photos_${worker.identity.bssId || worker.identity.aadhaar || 'current'}`;
      localStorage.removeItem(storageKey);
    } catch { /* ignore */ }
  }, [worker.identity.bssId, worker.identity.aadhaar]);

  // Clear any legacy localStorage copy of face photos so the server is the only
  // source of truth (a cleared account must show empty).
  useEffect(() => {
    try {
      const storageKey = `bss_face_photos_${worker.identity.bssId || worker.identity.aadhaar || 'current'}`;
      localStorage.removeItem(storageKey);
    } catch { /* ignore */ }
  }, [worker.identity.bssId, worker.identity.aadhaar]);

  // Stop the webcam stream on unmount (or when it is replaced) so the camera
  // light never stays on after leaving this page.
  useEffect(() => {
    return () => { cameraStream?.getTracks().forEach(track => track.stop()); };
  }, [cameraStream]);

  const startCamera = async (slotIdx: number) => {
    setActiveFaceSlot(slotIdx);
    setCameraModalOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } });
      setCameraStream(stream);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play();
      }
    } catch (err) {
      alert('Could not access camera. Please check camera permissions or upload a photo file.');
      setCameraModalOpen(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraModalOpen(false);
  };

  const capturePhoto = () => {
    if (!cameraVideoRef.current || activeFaceSlot === null) return;
    const video = cameraVideoRef.current;
    const canvas = cameraCanvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const slot = activeFaceSlot;
      void compressImage(dataUrl).then(compressed => { void checkFacePhoto(slot, compressed); });
      setDirty(true);
    }
    stopCamera();
  };
  const totalPercent = nominees.reduce((sum, n) => sum + (Number.isFinite(n.percent) ? n.percent : 0), 0);
  const percentBalanced = nominees.length > 0 && totalPercent === 100;
  const nomineeAge = (dob: string) => {
    if (!dob) return '';
    const born = new Date(dob + 'T00:00:00'); if (Number.isNaN(born.getTime())) return '';
    const ref = new Date('2026-09-05T00:00:00');
    let age = ref.getFullYear() - born.getFullYear();
    const m = ref.getMonth() - born.getMonth(); if (m < 0 || (m === 0 && ref.getDate() < born.getDate())) age -= 1;
    return String(Math.max(0, age));
  };
  const ageFromDoB = (dob: string) => {
    if (!dob) return '';
    const born = new Date(dob + 'T00:00:00'); if (Number.isNaN(born.getTime())) return '';
    const now = new Date();
    let age = now.getFullYear() - born.getFullYear();
    const m = now.getMonth() - born.getMonth(); if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age -= 1;
    return String(Math.max(0, age));
  };
  const updateNominee = (id: number, patch: Partial<Nominee>) => setNominees(current => current.map(n => n.id === id ? { ...n, ...patch } : n));
  const addNominee = () => { setDirty(true); setNominees(current => balanceNominees([...current, { id: nextNomineeId, name: '', dependant: '', nomineeType: 'Nominee', relationship: BssTaxonomies.NomineeRelationship[0], dob: '', contact: '', address: '', documents: [], percent: 0 }])); setNextNomineeId(id => id + 1); };
  const removeNominee = (id: number) => { setDirty(true); setNominees(current => balanceNominees(current.filter(n => n.id !== id))); };
  const pickNomineeDoc = (id: number) => { setDocTargetId(id); window.setTimeout(() => nomineeFileRef.current?.click(), 0); };
  const addNomineeDoc = async (file?: File) => {
    if (!file || docTargetId === null) return;
    const targetId = docTargetId;
    setDocTargetId(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const response = await fetch('/api/worker/nominee-document', { method: 'POST', body: form });
      const result = await response.json().catch(() => ({})) as { data?: NomineeDoc; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error || 'The document could not be uploaded.');
      const doc = result.data;
      setNominees(current => current.map(n => n.id === targetId ? { ...n, documents: [...n.documents, doc] } : n));
      setDirty(true);
    } catch (reason) {
      setProfileError(reason instanceof Error ? reason.message : 'The document could not be uploaded.');
    }
  };
  const splitEqually = () => { setDirty(true); setNominees(current => balanceNominees(current)); };
  const segColors = ['bg-[#073B67]', 'bg-[#F47A32]', 'bg-[#2F9E67]', 'bg-[#7A5AF8]', 'bg-[#0EA5E9]', 'bg-[#E11D48]'];
  // Red border for a required field that was left empty on a failed save.
  const clsErr = (name: string) => invalidFields.includes(name) ? 'border-red-400' : 'border-black/10';
  
  // ── Government ID integrations (sourced from the worker profile) ────────
  const maskId = (value: string, keep = 4) => {
    const clean = (value || '').replace(/\s+/g, '');
    return clean ? '•'.repeat(Math.max(0, clean.length - keep)) + clean.slice(-keep) : '';
  };
  const aadhaarDisplay = maskId(worker.identity.aadhaar, 4);
  const panDisplay = worker.identity.pan || '';
  const uanDisplay = worker.socialSecurity.epfoUan || '';
  const bankVerified = worker.banking.verificationStatus === 'Verified';

  // ── Aadhaar oKYC linking (for workers whose Aadhaar isn't linked yet) ────
  const [aadhaarLink, setAadhaarLink] = useState({ aadhaar: '', referenceId: '', otp: '', sent: false, busy: false, error: '', notice: '', otpCooldown: 0 });

  const sendAadhaarOtp = async () => {
    const aadhaar = aadhaarLink.aadhaar.replace(/\D/g, '');
    if (!/^\d{12}$/.test(aadhaar)) { setAadhaarLink(s => ({ ...s, error: 'Enter a valid 12-digit Aadhaar number.' })); return; }
    setAadhaarLink(s => ({ ...s, busy: true, error: '', notice: '' }));
    try {
      const response = await fetch('/api/auth/aadhaar/otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aadhaar }) });
      const json = await response.json() as { referenceId?: string; error?: string; message?: string; retryAfterSeconds?: number; otpPending?: boolean };
      if (json.referenceId) {
        setAadhaarLink(s => ({ ...s, referenceId: json.referenceId as string, sent: true, busy: false, error: '', otpCooldown: 0, notice: json.message || 'OTP sent to the mobile linked with your Aadhaar.' }));
        return;
      }
      // An OTP was already sent / is being debounced: still advance to the OTP step
      // so the code the user received can be entered, and start the resend cooldown.
      if (json.otpPending || json.retryAfterSeconds) {
        setAadhaarLink(s => ({ ...s, sent: true, busy: false, error: '', otpCooldown: json.retryAfterSeconds || 45, notice: json.message || json.error || 'An OTP was already sent to your Aadhaar mobile — enter it below.' }));
        return;
      }
      throw new Error(json.error || 'OTP could not be sent.');
    } catch (error) {
      setAadhaarLink(s => ({ ...s, busy: false, error: error instanceof Error ? error.message : 'OTP could not be sent.' }));
    }
  };

  const verifyAadhaarOtp = async () => {
    const aadhaar = aadhaarLink.aadhaar.replace(/\D/g, '');
    if (!/^\d{6}$/.test(aadhaarLink.otp)) { setAadhaarLink(s => ({ ...s, error: 'Enter the 6-digit OTP.' })); return; }
    setAadhaarLink(s => ({ ...s, busy: true, error: '', notice: '' }));
    try {
      const response = await fetch('/api/worker/link-aadhaar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aadhaar, referenceId: aadhaarLink.referenceId, otp: aadhaarLink.otp }) });
      const json = await response.json() as { error?: string; expired?: boolean; referenceId?: string; otpPending?: boolean; retryAfterSeconds?: number };
      // The OTP lapsed server-side: it auto-issued a fresh one. Adopt the new
      // reference and clear the box so the user enters the newest code.
      if (json.expired) {
        setAadhaarLink(s => ({
          ...s, busy: false, error: '',
          referenceId: json.referenceId || s.referenceId,
          otp: '', sent: true,
          otpCooldown: json.otpPending ? (json.retryAfterSeconds || 45) : 0,
          notice: json.error || 'The previous OTP expired — a new OTP was sent. Enter the new code.',
        }));
        return;
      }
      if (!response.ok) throw new Error(json.error || 'Aadhaar verification failed.');
      const profileResponse = await fetch('/api/worker/profile', { cache: 'no-store' });
      const profileJson = await profileResponse.json() as { data?: typeof worker };
      if (profileJson.data) updateWorker(profileJson.data);
      setAadhaarLink({ aadhaar: '', referenceId: '', otp: '', sent: false, busy: false, error: '', notice: '', otpCooldown: 0 });
    } catch (error) {
      setAadhaarLink(s => ({ ...s, busy: false, error: error instanceof Error ? error.message : 'Aadhaar verification failed.' }));
    }
  };

  // ── NPCI Penny Drop bank verification (Sandbox.co.in) ───────────────────
  const [bankVerify, setBankVerify] = useState<{ busy: boolean; message: string; error: string }>({ busy: false, message: '', error: '' });
  const verifyBank = async () => {
    setBankVerify({ busy: true, message: '', error: '' });
    try {
      // The worker only supplies account number + IFSC; the bank reads the rest.
      const form = document.querySelector('form');
      const accountInput = form?.querySelector('[name="banking.accountNumber"]') as HTMLInputElement | null;
      const ifscInput = form?.querySelector('[name="banking.ifsc"]') as HTMLInputElement | null;
      const accountNumber = (accountInput?.value || '').trim() || worker.banking.accountNumber || '';
      const ifsc = (ifscInput?.value || '').trim().toUpperCase() || worker.banking.ifsc || '';
      if (!accountNumber || !ifsc) {
        setBankVerify({ busy: false, message: '', error: 'Enter your bank account number and IFSC first.' });
        return;
      }
      const response = await fetch('/api/portal/bank-verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber, ifsc }),
      });
      const result = await response.json() as { data?: { verified?: boolean; bankName?: string; nameAtBank?: string; nameMatchesAadhaar?: boolean; utr?: string; message?: string }; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error || 'Verification failed.');
      await refresh();
      if (result.data.verified) {
        setBankVerify({ busy: false, message: `Verified — ${result.data.bankName || 'bank'} · account holder ${result.data.nameAtBank || worker.banking.holderName}${result.data.nameMatchesAadhaar ? ' (matches Aadhaar)' : ''}${result.data.utr ? ` · UTR ${result.data.utr}` : ''}.`, error: '' });
      } else {
        setBankVerify({ busy: false, message: '', error: result.data.message || 'Account could not be verified.' });
      }
    } catch (error) {
      setBankVerify({ busy: false, message: '', error: error instanceof Error ? error.message : 'Verification failed.' });
    }
  };

  // Deep-link support: /worker/Profile?tab=attendance (and ?highlight=missing,
  // set by the dashboard's profile card; the same link carries the target tab).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const allowed = ['personal', 'attendance', 'contact', 'family', 'social', 'banking', 'classification', 'employment', 'skills', 'welfare', 'other', 'integrations'] as const;
    if (tab && (allowed as readonly string[]).includes(tab)) setActiveTab(tab as typeof allowed[number]);
    if (params.get('highlight') === 'missing') setHighlightMissing(true);
  }, []);

  // Keep the active section in the URL so a refresh lands back on the same tab
  // instead of resetting to "Worker Identity".
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('tab') !== activeTab) {
      url.searchParams.set('tab', activeTab);
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, [activeTab]);

  // ── DigiLocker document wallet ──────────────────────────────────────────
  type DigiLockerDoc = { id: number; doctype?: string; issuer?: string; doc_date?: string; file_name?: string; file_url?: string; status?: string; downloaded_at?: string; created_at?: string };
  const [digilockerDocs, setDigilockerDocs] = useState<DigiLockerDoc[]>([]);
  const [digilockerStatus, setDigilockerStatus] = useState<'idle' | 'linking' | 'linked' | 'error'>('idle');
  const [digilockerMessage, setDigilockerMessage] = useState('');
  const [digilockerFetchError, setDigilockerFetchError] = useState('');
  const digilockerBlob = digilockerDocs.map(d => `${d.doctype ?? ''} ${d.file_name ?? ''}`).join(' ').toUpperCase();
  const digilockerErrorText = digilockerFetchError
    ? (digilockerFetchError.includes('insufficient_scope')
        ? 'Linked, but DigiLocker did not grant access to the requested documents (app permissions for issued/uploaded files or e-Aadhaar are not enabled).'
        : `Linked, but DigiLocker could not share documents: ${digilockerFetchError}`)
    : '';
  const digilockerKinds = {
    aadhaar: digilockerBlob.includes('AADHAAR') || digilockerBlob.includes('ADHAR'),
    pan: digilockerBlob.includes('PAN'),
    epfo: /EPFO|UAN|PRFND|PASSBOOK|PROVIDENT/.test(digilockerBlob),
  };

  const loadDigilockerDocs = useCallback(async (): Promise<DigiLockerDoc[]> => {
    try {
      const response = await fetch('/api/digilocker/documents', { cache: 'no-store' });
      if (!response.ok) return [];
      const json = await response.json() as DigiLockerDoc[] | { data?: DigiLockerDoc[]; error?: string };
      const list = Array.isArray(json) ? json : json.data;
      if (Array.isArray(list)) setDigilockerDocs(list);
      setDigilockerFetchError(Array.isArray(json) ? '' : (json.error || ''));
      return Array.isArray(list) ? list : [];
    } catch { return []; }
  }, []);

  const linkDigiLocker = async () => {
    setDigilockerStatus('linking');
    setDigilockerMessage('');
    try {
      const response = await fetch('/api/digilocker/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const json = await response.json() as { authorize_url?: string; error?: string };
      if (!response.ok || !json.authorize_url) throw new Error(json.error || 'Could not start DigiLocker linking.');
      window.location.href = json.authorize_url;
    } catch (error) {
      setDigilockerStatus('error');
      setDigilockerMessage(error instanceof Error ? error.message : 'DigiLocker linking failed.');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get('digilocker');
    if (outcome === 'linked') {
      setDigilockerStatus('linked');
      let tries = 0;
      const tick = async () => {
        tries += 1;
        const list = await loadDigilockerDocs();
        if ((list?.length ?? 0) > 0 || tries >= 5) {
          clearInterval(timer);
          setDigilockerStatus('idle');
        }
      };
      void tick();
      const timer = setInterval(() => { void tick(); }, 3000);
      return () => clearInterval(timer);
    }
    if (outcome === 'error') {
      setDigilockerStatus('error');
      setDigilockerMessage(params.get('message') || 'DigiLocker linking failed.');
    }
    void loadDigilockerDocs();
  }, [loadDigilockerDocs]);
  
  // Conditional UI State
  // EmploymentStatus values must match BssTaxonomies.EmploymentStatus exactly
  // ("Gig active", "Self-employed", "Seasonal", …) so the conditional
  // sub-forms below render when the matching option is selected.
  const [employmentStatus, setEmploymentStatus] = useState(worker.classification?.currentEmploymentStatus || BssTaxonomies.EmploymentStatus[0]);
  const [workerCategory, setWorkerCategory] = useState(worker.classification?.workerCategory || worker.identity.category || BssTaxonomies.WorkerCategory[0]);

  // Welfare & Safety — Medical examination values come from the Worker record.
  const medicalExaminationStatus = worker.welfare?.medicalExaminationStatus?.trim() || '';
  const medicalFitnessStatus = worker.welfare?.medicalFitnessStatus?.trim() || '';
  const medicalStatusTone = medicalExaminationStatus === 'Pending' ? 'text-[#F47A32]' : medicalExaminationStatus === 'Expired' ? 'text-[#FF3B30]' : medicalExaminationStatus ? 'text-bss-green' : 'text-bss-text-primary';
  // Green when a welfare/safety value is in a "done" state, amber when recorded
  // but not done, grey when empty — so the done items stand out on the tab.
  const welfareClass = (value?: string | boolean) => {
    const s = (typeof value === 'boolean' ? (value ? 'yes' : '') : String(value ?? '')).trim().toLowerCase();
    if (!s) return 'text-bss-text-muted';
    const ok = ['done', 'completed', 'active', 'fit', 'yes', 'provided', 'issued', 'self arranged', 'camp', 'room'].some(k => s.includes(k));
    return ok ? 'text-bss-green' : 'text-[#F47A32]';
  };

  // Skills & Education — self-declared manual-entry fields (editable).
  // System-verified certifications are read-only (issued via course completion).
  const [activeCert, setActiveCert] = useState<{ name: string; authority: string; number: string; expiry: string } | null>(null);
  const [skillsForm, setSkillsForm] = useState({
    educations: (worker.skills?.educations?.length
      ? worker.skills.educations.map(e => ({ qualificationCourse: e.qualificationCourse ?? '', boardUniversity: e.boardUniversity ?? '', passingYear: e.passingYear ?? '' }))
      : [{ qualificationCourse: '', boardUniversity: '', passingYear: '' }]),
    languages: (worker.skills?.languages ?? []).join(', '),
    items: (worker.skills?.items ?? [])
      .filter(s => !s.verified)
      .map(s => ({ name: s.name ?? '', experienceYears: s.experienceYears ?? '' })),
  });
  const setSkill = (key: 'languages', value: string) => setSkillsForm(current => ({ ...current, [key]: value }));
  const addEducation = () => { setDirty(true); setSkillsForm(current => ({ ...current, educations: [...current.educations, { qualificationCourse: '', boardUniversity: '', passingYear: '' }] })); };
  const updateEducation = (index: number, key: 'qualificationCourse' | 'boardUniversity' | 'passingYear', value: string) => setSkillsForm(current => ({ ...current, educations: current.educations.map((e, i) => i === index ? { ...e, [key]: value } : e) }));
  const removeEducation = (index: number) => { setDirty(true); setSkillsForm(current => ({ ...current, educations: current.educations.filter((_, i) => i !== index) })); };
  const addSkill = () => { setDirty(true); setSkillsForm(current => ({ ...current, items: [...current.items, { name: '', experienceYears: '' }] })); };
  const updateSkill = (index: number, key: 'name' | 'experienceYears', value: string) => setSkillsForm(current => ({ ...current, items: current.items.map((s, i) => i === index ? { ...s, [key]: value } : s) }));
  const removeSkill = (index: number) => { setDirty(true); setSkillsForm(current => ({ ...current, items: current.items.filter((_, i) => i !== index) })); };

  // On a successful save: show the success toast, jump to the top, then hard
  // reload the whole portal so every screen reflects the freshly saved data.
  const finishSave = useCallback(() => {
    setShowSuccess(true);
    setProfileError('');
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => window.location.reload(), 1200);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);

    // Block saving until the required fields on the active tab are complete.
    const requiredErrors: { message: string; selector: string; field?: string }[] = [];
    if (activeTab === 'personal') {
      if (!String(fd.get('identity.placeOfBirth') ?? '').trim()) requiredErrors.push({ message: 'Place of Birth is required.', selector: '[name="identity.placeOfBirth"]', field: 'identity.placeOfBirth' });
    }
    if (activeTab === 'classification') {
      const val = (name: string) => String(fd.get(name) ?? '').trim();
      const req: [string, string][] = [
        ['classification.sector', 'Sector'],
        ['classification.industry', 'Industry'],
        ['classification.occupation', 'Occupation'],
        ['classification.totalWorkerExperience', 'Total Worker Experience'],
        ['classification.paymentFrequency', 'Payment Frequency'],
        ['classification.paymentMode', 'Payment Mode'],
      ];
      if (employmentStatus === 'Gig active') req.push(
        ['classification.gigPlatformName', 'Platform / Aggregator Name'],
        ['classification.gigPlatformWorkerId', 'Platform Worker ID'],
        ['classification.gigDateJoined', 'Date Joined Platform'],
        ['classification.gigPlatformType', 'Platform Type'],
        ['classification.gigServiceArea', 'Service Area'],
        ['classification.gigAvgHoursPerDay', 'Average Hours per Day'],
        ['classification.gigAvgDaysPerWeek', 'Average Days per Week'],
      );
      if (employmentStatus === 'Self-employed') req.push(
        ['classification.seBusinessName', 'Business / Enterprise Name'],
        ['classification.seEmployerName', 'Employer / Business Name'],
        ['classification.seBusinessType', 'Business Type'],
        ['classification.seRegistrationStatus', 'Business Registration Status'],
        ['classification.seStartDate', 'Business Start Date'],
        ['classification.seEmployeesCount', 'Number of Employees'],
        ['classification.seAvgHoursPerDay', 'Average Hours/Day'],
        ['classification.seAvgDaysPerWeek', 'Average Days/Week'],
        ['classification.seLocation', 'Location'],
      );
      if (employmentStatus === 'Seasonal') req.push(
        ['classification.seasonalJobType', 'Job / Work Type'],
        ['classification.seasonalStartDate', 'Season Start'],
        ['classification.seasonalEndDate', 'Season End'],
        ['classification.seasonalAvgHoursPerDay', 'Average Hours/Day'],
        ['classification.seasonalAvgDaysPerWeek', 'Average Days/Week'],
        ['classification.seasonalLocation', 'Work Location / Service Area'],
        ['classification.seasonalExpectedIncome', 'Expected Seasonal Income'],
      );
      for (const [name, label] of req) {
        if (!val(name)) requiredErrors.push({ message: `${label} is required.`, selector: `[name="${name}"]`, field: name });
      }
    }
    if (activeTab === 'family') {
      nominees.forEach((n, i) => {
        const row = `Nominee ${i + 1}`;
        if (!n.name.trim()) requiredErrors.push({ message: `${row} — name is required.`, selector: `[data-nominee-name="${n.id}"]` });
        if (!n.relationship.trim()) requiredErrors.push({ message: `${row} — relationship is required.`, selector: `[data-nominee-relationship="${n.id}"]` });
        if (!n.nomineeType.trim()) requiredErrors.push({ message: `${row} — nominee type is required.`, selector: `[data-nominee-type="${n.id}"]` });
        if (!n.dob) requiredErrors.push({ message: `${row} — date of birth is required.`, selector: `[data-nominee-dob="${n.id}"]` });
        if (!n.contact.trim()) requiredErrors.push({ message: `${row} — contact is required.`, selector: `[data-nominee-contact="${n.id}"]` });
        if (!(n.nomineeType === 'Dependant' ? n.name : n.dependant).trim()) requiredErrors.push({ message: `${row} — dependant is required.`, selector: `[data-nominee-dependant="${n.id}"]` });
        if (!n.address.trim()) requiredErrors.push({ message: `${row} — address is required.`, selector: `[data-nominee-address="${n.id}"]` });
        if (n.documents.length === 0) requiredErrors.push({ message: `${row} — at least one identity document is required.`, selector: `[data-nominee-documents="${n.id}"]` });
      });
    }
    if (requiredErrors.length) {
      setShowSuccess(false);
      setSaveAttempted(true);
      setInvalidFields(requiredErrors.map(e => e.field).filter((f): f is string => Boolean(f)));
      setProfileError(`Please complete the required fields before saving — ${requiredErrors.map(e => e.message).join(' ')}`);
      const target = requiredErrors.map(e => form.querySelector(e.selector)).find(Boolean) as HTMLElement | undefined;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => target.focus?.(), 300);
      }
      return;
    }

    if (activeTab === 'contact') {
      await mobilityRef.current?.save();
      finishSave();
      return;
    }
    if (activeTab === 'skills') {
      setIsSaving(true);
      try {
        await saveWorker({
          skills: {
            educations: skillsForm.educations
              .filter(e => e.qualificationCourse.trim() || e.boardUniversity.trim() || e.passingYear.trim())
              .map(e => ({ qualificationCourse: e.qualificationCourse, boardUniversity: e.boardUniversity, passingYear: e.passingYear })),
            languages: skillsForm.languages.split(',').map(s => s.trim()).filter(Boolean),
            items: skillsForm.items
              .filter(s => s.name.trim() || s.experienceYears.trim())
              .map(s => ({ name: s.name, experienceYears: s.experienceYears })),
          },
        });
        finishSave();
      } catch {
        setShowSuccess(false);
      } finally {
        setIsSaving(false);
      }
      return;
    }
    setIsSaving(true);
    setProfileError('');
    try {
      const patch: Record<string, Record<string, unknown>> = {};
      for (const [key, value] of fd.entries()) {
        const idx = key.indexOf('.');
        if (idx <= 0 || idx === key.length - 1) continue;
        const section = key.slice(0, idx);
        const field = key.slice(idx + 1);
        (patch[section] ??= {})[field] = typeof value === 'string' ? value : value.name;
      }
      // Classification selects are controlled state, not native form fields.
      if (activeTab === 'classification') {
        patch.classification = { ...(patch.classification ?? {}), currentEmploymentStatus: employmentStatus, workerCategory };
      }
      // Disability Type / % is a controlled, conditionally-disabled field.
      if (activeTab === 'personal') {
        patch.identity = { ...(patch.identity ?? {}), disabilityTypePct: disabilityStatus === 'Yes' ? disabilityTypePct.trim() : '' };
      }
      // The Bank Account Number field is intentionally blank (re-enter to
      // change); an empty value must not wipe the stored account number. This
      // applies whether it is edited from the Banking tab or Govt. Integrations.
      if ((activeTab === 'banking' || activeTab === 'integrations') && patch.banking && String(patch.banking.accountNumber ?? '') === '') {
        delete patch.banking.accountNumber;
      }
      // Family nominees live in component state.
      if (activeTab === 'family') {
        patch.family = {
          ...(patch.family ?? {}),
          nominees: (() => {
            const named = nominees.filter(n => n.name.trim());
            const namedTotal = named.reduce((s, n) => s + (Number.isFinite(n.percent) ? n.percent : 0), 0);
            // Never save an unbalanced distribution — auto-normalise to 100%.
            const toSave = named.length > 0 && namedTotal !== 100 ? balanceNominees(named) : named;
            return toSave.map(n => ({
              name: n.name.trim(),
              dependant: n.nomineeType === 'Dependant' ? n.name.trim() : n.dependant,
              relation: n.relationship, nomineeType: n.nomineeType,
              dob: n.dob, age: nomineeAge(n.dob), contact: n.contact, address: n.address, documents: n.documents,
              percent: n.percent,
            }));
          })(),
        };
      }
      await saveWorker(patch as Partial<WorkerRecord>);
      finishSave();
    } catch (err) {
      setShowSuccess(false);
      setProfileError(err instanceof Error ? err.message : 'Profile could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bss-profile space-y-8 animate-in fade-in duration-500 pb-12">
      
      <PageHero
        title={t('nav.identity')}
        subtitle="Manage your identity, demographics, and security credentials."
        actions={(showSuccess || profileError) ? <>
          {showSuccess && (
            <span className="bg-white/15 text-white px-4 py-2.5 rounded-full border border-white/20 flex items-center gap-2 text-[13px] font-semibold animate-in slide-in-from-top-2">
              <CheckCircle2 size={16} /> Persona Updated
            </span>
          )}
          {profileError && (
            <span role="alert" className="bg-red-500/20 text-red-100 px-4 py-2.5 rounded-full border border-red-300/30 flex items-center gap-2 text-[13px] font-semibold">
              {profileError}
            </span>
          )}
        </> : undefined}
      />

      {highlightMissing && profileMissing.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-bss-soft-red/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-bss-error">Complete your profile — {profileMissing.length} mandatory {profileMissing.length === 1 ? 'detail' : 'details'} missing</p>
          <p className="text-xs text-bss-text-secondary mt-1">These are the {profileMissing.length === 1 ? 'detail' : 'details'} counted in your {workerCompletion(worker).percent}% profile completion. Tap one to jump to its section.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {profileMissing.map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(completionTab(item.section))}
                className="h-8 px-3 rounded-full bg-white border border-red-200 text-bss-error text-[12px] font-semibold hover:bg-red-100"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        
                {/* SIDEBAR NAVIGATION */}
        <div className="w-full md:w-64 flex-shrink-0 flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-1 hide-scrollbar p-1">
          <button 
            onClick={() => setActiveTab('personal')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'personal' ? 'bg-bss-navy text-white shadow-md' : 'text-bss-text-secondary hover:bg-bss-bg hover:text-bss-text-primary'}`}
          >
            <UserCircle size={18}/> Worker Identity
            {missingTabs.has('personal') && <span className="ml-auto w-2 h-2 rounded-full bg-red-500" aria-label="Missing mandatory details" />}
          </button>
          <button 
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'attendance' ? 'bg-bss-navy text-white shadow-md' : 'text-bss-text-secondary hover:bg-bss-bg hover:text-bss-text-primary'}`}
          >
            <Fingerprint size={18}/> AI Attendance Photos
          </button>
          <button 
            onClick={() => setActiveTab('contact')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'contact' ? 'bg-bss-navy text-white shadow-md' : 'text-bss-text-secondary hover:bg-bss-bg hover:text-bss-text-primary'}`}
          >
            <MapPin size={18}/> Address & Mobility
            {missingTabs.has('contact') && <span className="ml-auto w-2 h-2 rounded-full bg-red-500" aria-label="Missing mandatory details" />}
          </button>
          <button 
            onClick={() => setActiveTab('employment')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'employment' ? 'bg-bss-navy text-white shadow-md' : 'text-bss-text-secondary hover:bg-bss-bg hover:text-bss-text-primary'}`}
          >
            <Briefcase size={18}/> Employment & Work
          </button>
          <button 
            onClick={() => setActiveTab('family')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'family' ? 'bg-bss-navy text-white shadow-md' : 'text-bss-text-secondary hover:bg-bss-bg hover:text-bss-text-primary'}`}
          >
            <Users size={18}/> Family & Dependants
            {missingTabs.has('family') && <span className="ml-auto w-2 h-2 rounded-full bg-red-500" aria-label="Missing mandatory details" />}
          </button>
          <button 
            onClick={() => setActiveTab('social')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'social' ? 'bg-bss-navy text-white shadow-md' : 'text-bss-text-secondary hover:bg-bss-bg hover:text-bss-text-primary'}`}
          >
            <ShieldCheck size={18}/> Social Security
            {missingTabs.has('social') && <span className="ml-auto w-2 h-2 rounded-full bg-red-500" aria-label="Missing mandatory details" />}
          </button>
          <button 
            onClick={() => setActiveTab('banking')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'banking' ? 'bg-bss-navy text-white shadow-md' : 'text-bss-text-secondary hover:bg-bss-bg hover:text-bss-text-primary'}`}
          >
            <CreditCard size={18}/> Banking
            {missingTabs.has('banking') && <span className="ml-auto w-2 h-2 rounded-full bg-red-500" aria-label="Missing mandatory details" />}
          </button>
          <button 
            onClick={() => setActiveTab('classification')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'classification' ? 'bg-bss-navy text-white shadow-md' : 'text-bss-text-secondary hover:bg-bss-bg hover:text-bss-text-primary'}`}
          >
            <Building2 size={18}/> Worker Classification
          </button>
          <button 
            onClick={() => setActiveTab('welfare')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'welfare' ? 'bg-bss-navy text-white shadow-md' : 'text-bss-text-secondary hover:bg-bss-bg hover:text-bss-text-primary'}`}
          >
            <HardHat size={18}/> Welfare & Safety
          </button>
          <button 
            onClick={() => setActiveTab('skills')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'skills' ? 'bg-bss-navy text-white shadow-md' : 'text-bss-text-secondary hover:bg-bss-bg hover:text-bss-text-primary'}`}
          >
            <Award size={18}/> Skills & Employability
            {missingTabs.has('skills') && <span className="ml-auto w-2 h-2 rounded-full bg-red-500" aria-label="Missing mandatory details" />}
          </button>
          <button 
            onClick={() => setActiveTab('other')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'other' ? 'bg-bss-navy text-white shadow-md' : 'text-bss-text-secondary hover:bg-bss-bg hover:text-bss-text-primary'}`}
          >
            <Database size={18}/> Other
          </button>
          <a href="/worker/Documents" className="flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors text-bss-text-secondary hover:bg-bss-bg hover:text-bss-text-primary">
            <FileText size={18}/> Documents
          </a>
          <button 
            onClick={() => setActiveTab('integrations')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'integrations' ? 'bg-bss-navy text-white shadow-md' : 'text-bss-text-secondary hover:bg-bss-bg hover:text-bss-text-primary'}`}
          >
            <Fingerprint size={18}/> Govt. Integrations
          </button>
        </div>

        
        {/* CONTENT AREA */}
        <div className="bss-scroll-rise flex-1 w-full bg-white rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
          <form onSubmit={handleSave} onChange={() => { setDirty(true); setInvalidFields([]); }} onInput={() => { setDirty(true); setInvalidFields([]); }} className="p-6 md:p-8">
          
          {/* TAB: PERSONAL */}
          {activeTab === 'personal' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                 <div className="w-28 h-28 rounded-full border border-black/10 overflow-hidden flex-shrink-0 relative group">
                    {worker.identity.photoUrl ? <img src={worker.identity.photoUrl} alt="Worker" className="w-full h-full object-cover" /> : <span className="w-full h-full grid place-items-center text-bss-text-muted"><UserCircle size={44}/></span>}
                    <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer backdrop-blur-sm transition-all">
                      <span className="text-white text-[11px] font-semibold uppercase tracking-wider">Change Photo</span>
                    </div>
                    <p className="absolute -bottom-6 left-0 right-0 text-center text-[10px] font-semibold text-bss-text-muted uppercase tracking-wider">Worker Photo</p>
                 </div>
                 <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 w-full">
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">BSS Worker ID</label>
                      <input name="identity.bssId" type="text" defaultValue={worker.identity.bssId} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none" readOnly />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Name as per Aadhaar <span className="text-[#FF3B30]">*</span></label>
                      <input name="identity.name" type="text" defaultValue={worker.identity.name} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none" readOnly />
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6 pt-6 border-t border-black/5">
                 <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Date of Birth</label>
                    <input name="identity.dob" type="date" defaultValue={worker.identity.dob} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none" readOnly />
                 </div>
                 <div>
                   <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Age</label>
                   <input type="number" defaultValue={ageFromDoB(worker.identity.dob)} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none" readOnly />
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Gender</label>
                    <input name="identity.gender" type="text" defaultValue={worker.identity.gender} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none" readOnly />
                 </div>
                 <div>
                   <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Place of Birth <span className="text-[#FF3B30]">*</span></label>
                   <input name="identity.placeOfBirth" type="text" defaultValue={worker.identity.placeOfBirth || worker.address.permanentState || ''} onChange={e => setPlaceOfBirth(e.target.value)} placeholder="Native village/town, tehsil and district" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                   <p className="text-[10px] text-bss-text-muted mt-1">Used with your Aadhaar-verified work address to map migrant flows for state policy.</p>
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Marital Status</label>
                    <DownSelect name="personal.maritalStatus" value={maritalStatus} onChange={setMaritalStatus} placeholder="Select" options={BssTaxonomies.MaritalStatus} />
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Blood Group</label>
                    <DownSelect name="personal.bloodGroup" value={bloodGroup} onChange={setBloodGroup} placeholder="Select" options={BssTaxonomies.BloodGroup} />
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Religion</label>
                    <DownSelect name="personal.religion" value={religion} onChange={setReligion} placeholder="Select" options={BssTaxonomies.Religion} />
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Caste</label>
                    <DownSelect name="personal.caste" value={caste} onChange={setCaste} placeholder="Select" options={BssTaxonomies.SocialCategory} />
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Disability Status</label>
                    <DownSelect name="personal.disabilityStatus" value={disabilityStatus} onChange={v => { setDisabilityStatus(v); if (v !== 'Yes') setDisabilityTypePct(''); }} placeholder="Select" options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]} />
                  </div>
                  <div className="relative">
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Disability Type / %</label>
                    <button type="button" disabled={disabilityStatus !== 'Yes'} onClick={() => setDisabilityTypeOpen(o => !o)} className={`w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium flex items-center justify-between text-left focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] disabled:bg-[#F5F5F7] ${disabilityStatus !== 'Yes' ? 'cursor-not-allowed' : ''}`}>
                      <span className={disabilityTypePct ? 'text-bss-text-primary' : 'text-bss-text-muted'}>{disabilityTypePct || 'Select type & %'}</span>
                      <ChevronDown size={15} className={`text-bss-text-muted transition-transform ${disabilityTypeOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {disabilityTypeOpen && disabilityStatus === 'Yes' && (
                      <>
                        <button type="button" aria-hidden="true" tabIndex={-1} onClick={() => setDisabilityTypeOpen(false)} className="fixed inset-0 z-40 cursor-default" />
                        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-bss-border bg-white shadow-lg">
                          <button type="button" onClick={() => { setDisabilityTypePct(''); setDisabilityTypeOpen(false); }} className="block w-full px-4 py-2 text-left text-[13px] text-bss-text-muted hover:bg-bss-bg">Select type &amp; %</button>
                          {DISABILITY_OPTIONS.map(o => <button key={o} type="button" onClick={() => { setDisabilityTypePct(o); setDisabilityTypeOpen(false); }} className={`block w-full px-4 py-2 text-left text-[13px] hover:bg-bss-bg ${disabilityTypePct === o ? 'bg-bss-blue-tint font-semibold text-[#073B67]' : 'text-bss-text-secondary'}`}>{o}</button>)}
                          {disabilityTypePct && !DISABILITY_OPTIONS.includes(disabilityTypePct) && <button type="button" onClick={() => { setDisabilityTypePct(disabilityTypePct); setDisabilityTypeOpen(false); }} className="block w-full px-4 py-2 text-left text-[13px] text-bss-text-secondary hover:bg-bss-bg">{disabilityTypePct} (current)</button>}
                        </div>
                      </>
                    )}
                    {disabilityStatus === 'Yes' && !disabilityTypePct.trim() && <p className="text-[11px] text-[#F47A32] mt-1">Please select the disability type / percentage.</p>}
                  </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 pt-6 border-t border-black/5">
                 <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Father Name</label>
                    <input name="personal.fatherName" type="text" defaultValue={worker.personal.fatherName} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none" readOnly />
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Mother Name</label>
                    <input name="personal.motherName" type="text" defaultValue={worker.personal.motherName} onChange={e => setMotherName(e.target.value)} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]" />
                 </div>
               </div>

              <div className="pt-6 border-t border-black/5">
                <h3 className="text-[15px] font-semibold text-bss-text-primary mb-1">Emergency Contact</h3>
                <p className="text-[13px] text-bss-text-muted mb-4">Used by the site medical officer and safety team in case of an emergency.</p>
                <div className="bg-[#F5F5F7] rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                     <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Emergency Contact Name</p>
                     <input name="identity.emergencyContactName" type="text" defaultValue={worker.identity.emergencyContactName} onChange={e => setEmergencyName(e.target.value)} placeholder="Not provided" className="mt-1 w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-sm font-semibold text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                     <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Emergency Contact Number</p>
                     <input name="identity.emergencyContactNumber" type="tel" maxLength={10} defaultValue={worker.identity.emergencyContactNumber} onChange={e => setEmergencyNumber(e.target.value)} placeholder="Not provided" className="mt-1 w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-sm font-semibold text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                     <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Emergency Contact Relationship</p>
                     <DownSelect name="identity.emergencyContactRelation" value={emergencyRelation} onChange={setEmergencyRelation} placeholder="Select" options={BssTaxonomies.NomineeRelationship} />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <h3 className="text-[15px] font-semibold text-bss-text-primary mb-4">Contact Details</h3>
                <div className="bg-[#F5F5F7] rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Mobile Number</p>
                    <p className="text-sm font-semibold text-bss-text-primary mt-1">+91 {worker.contact.mobile}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Alternate Mobile Number</p>
                    <input name="identity.alternateMobile" type="tel" defaultValue={worker.contact.alternateMobile} onChange={e => setAlternateMobile(e.target.value)} placeholder="Not provided" className="mt-1 w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-sm font-semibold text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Email ID</p>
                    <input name="identity.email" type="email" defaultValue={worker.contact.email} onChange={e => setEmail(e.target.value)} placeholder="Not provided" className="mt-1 w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-sm font-semibold text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: AI ATTENDANCE PHOTOS */}
          {activeTab === 'attendance' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-gradient-to-r from-blue-50/90 via-slate-50 to-indigo-50/80 border border-blue-200/80 rounded-2xl p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-bss-border pb-4">
                  <div>
                    <h3 className="text-base font-bold text-bss-text-primary flex items-center gap-2">
                      <Fingerprint size={20} className="text-[#073B67]" />
                      AI CCTV Video Attendance — Face Photos (5 Required)
                    </h3>
                    <p className="text-xs text-bss-text-muted mt-1">
                      To automatically log your site attendance via CCTV &amp; camera recognition, please upload <strong>5 high-quality front-facing photos</strong> taken from different slight angles (approx. 1.5–2 meters distance).
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-100 text-[#073B67] border border-blue-200 whitespace-nowrap self-start sm:self-auto">
                    AI Enrollment Ready
                  </span>
                </div>

                <input
                  ref={facePhotoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && activeFaceSlot !== null) {
                      const slot = activeFaceSlot;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const dataUrl = event.target?.result as string;
                        if (dataUrl) {
                          void compressImage(dataUrl).then(compressed => { void checkFacePhoto(slot, compressed); });
                          setDirty(true);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                    e.target.value = '';
                  }}
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map((idx) => {
                    const imgUrl = facePhotos[idx] || enrolledPhotos[idx] || '';
                    return (
                      <div
                        key={idx}
                        className="bg-white border border-bss-border rounded-xl p-3 flex flex-col items-center justify-between text-center relative group hover:border-[#073B67] hover:shadow-xs transition-all"
                      >
                        <div 
                          onClick={() => {
                            setActiveFaceSlot(idx);
                            facePhotoInputRef.current?.click();
                          }}
                          className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden mb-2 relative cursor-pointer group/avatar"
                        >
                          {imgUrl ? (
                            <img src={imgUrl} alt={`Photo ${idx}`} className="w-full h-full object-cover" />
                          ) : (
                            <UserCircle size={30} className="text-slate-400" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                            <Upload size={14} className="text-white" />
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 leading-tight">Photo #{idx}</span>
                        <span className="text-[9.5px] text-slate-500 mt-0.5 min-h-[14px] leading-tight">
                          {idx === 1 ? 'Frontal View' : idx === 2 ? 'Slight Left' : idx === 3 ? 'Slight Right' : idx === 4 ? 'Outdoor Light' : 'Natural Face'}
                        </span>
                        <div className="mt-2.5 grid grid-cols-2 gap-1.5 w-full">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void startCamera(idx);
                            }}
                            className="text-bss-green hover:bg-bss-green hover:text-white bg-bss-soft-green py-1.5 rounded-lg border border-bss-border flex items-center justify-center transition-all shadow-2xs w-full group/btn"
                            title="Take photo with WebCam"
                          >
                            <Camera size={14} className="shrink-0 transition-transform group-hover/btn:scale-110" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveFaceSlot(idx);
                              facePhotoInputRef.current?.click();
                            }}
                            className="text-bss-interactive-blue hover:bg-bss-interactive-blue hover:text-white bg-bss-blue-tint py-1.5 rounded-lg border border-blue-200/80 flex items-center justify-center transition-all shadow-2xs w-full group/btn"
                            title="Upload photo file"
                          >
                            <Upload size={14} className="shrink-0 transition-transform group-hover/btn:scale-110" />
                          </button>
                        </div>
                        {faceChecks[idx]?.state === 'checking' && <span className="text-[9.5px] text-slate-400 mt-1">Checking…</span>}
                        {faceChecks[idx]?.state === 'ok' && <span className="text-[9.5px] text-bss-green font-semibold mt-1">✓ Face OK</span>}
                        {faceChecks[idx]?.state === 'error' && <span className="text-[9.5px] text-bss-error font-semibold mt-1 max-w-[120px] leading-tight">{faceChecks[idx].message || 'Retake'}</span>}
                        {faceMatch[idx]?.state === 'checking' && <span className="text-[9.5px] text-slate-400 mt-0.5">Matching Aadhaar…</span>}
                        {faceMatch[idx]?.state === 'ok' && (
                          <span className={`text-[9.5px] font-bold mt-0.5 ${faceMatch[idx].matched ? 'text-bss-green' : 'text-amber-600'}`} title="Cosine similarity vs your Aadhaar photo — advisory, uploads are never blocked">
                            {faceMatch[idx].matched ? '✓' : '⚠'} Aadhaar {faceMatch[idx].pct}%
                          </span>
                        )}
                        {faceMatch[idx]?.state === 'error' && <span className="text-[9px] text-slate-400 mt-0.5 max-w-[120px] leading-tight">{faceMatch[idx].message || 'Match unavailable'}</span>}
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 bg-white/80 rounded-xl p-3.5 border border-slate-200/60 gap-3">
                  <span className="flex items-center gap-2 font-medium">
                    <CheckCircle size={15} className="text-bss-green flex-shrink-0" />
                    Each photo is checked for a face; nothing is saved until all 5 are valid.
                  </span>
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className={`font-bold whitespace-nowrap ${faceStats.photoCount > 0 && faceStats.distinctPhotos < 5 ? 'text-amber-600' : 'text-[#073B67]'}`}>
                      {faceStats.photoCount > 0 && faceStats.distinctPhotos < 5
                        ? `${faceStats.distinctPhotos} / 5 distinct — duplicates`
                        : faceEnrolled > 0
                          ? `${faceEnrolled} / 5 Enrolled`
                          : `${[1, 2, 3, 4, 5].filter(i => facePhotos[i] || enrolledPhotos[i]).length} / 5 Selected`}
                    </span>
                    <button
                      type="button"
                      onClick={() => void saveFaceEnrollment()}
                      disabled={faceSaveBusy || [1, 2, 3, 4, 5].some(i => !facePhotos[i])}
                      title="Add all 5 valid face photos to enable"
                      className="h-9 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#062D4F] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Fingerprint size={14} />{faceSaveBusy ? 'Saving…' : 'Save & Enroll'}
                    </button>
                  </div>
                </div>
                {faceStats.photoCount > 0 && faceStats.distinctPhotos < 5 && (
                  <p className="text-[11px] font-semibold text-amber-600 mt-1">
                    {faceStats.photoCount - faceStats.distinctPhotos} of your saved photos are identical, so the system counts fewer than 5.
                    Add 5 photos from different angles and press Save &amp; Enroll.
                  </p>
                )}
                {faceEnrollStatus && <p role="status" className="text-[11px] font-semibold text-[#073B67] mt-2">{faceEnrollStatus}</p>}
              </div>
            </div>
          )}

              {/* Live WebCam Capture Modal */}
              {cameraModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm grid place-items-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-4 p-5 text-center">
                    <div className="flex items-center justify-between border-b border-bss-border pb-3">
                      <h3 className="text-sm font-bold text-bss-text-primary flex items-center gap-2">
                        <Camera size={18} className="text-[#073B67]" />
                        Capture Photo #{activeFaceSlot}
                      </h3>
                      <button type="button" onClick={stopCamera} className="w-8 h-8 grid place-items-center rounded-full hover:bg-bss-bg text-bss-text-muted">
                        <X size={16} />
                      </button>
                    </div>

                    <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-gray-800 flex items-center justify-center">
                      <video ref={cameraVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      <div className="absolute inset-0 border-2 border-emerald-400/40 rounded-xl pointer-events-none" />
                    </div>

                    <p className="text-xs text-bss-text-muted">
                      Position your face clearly in the camera center and click <strong>Capture Photo</strong>.
                    </p>

                    <div className="flex justify-end gap-2 pt-2 border-t border-bss-border">
                      <button type="button" onClick={stopCamera} className="h-9 px-4 rounded-lg border border-bss-border text-xs font-semibold hover:bg-bss-bg">
                        Cancel
                      </button>
                      <button type="button" onClick={capturePhoto} className="h-9 px-5 rounded-lg bg-bss-green hover:bg-bss-green text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5">
                        <Camera size={14} /> Capture Photo
                      </button>
                    </div>
                  </div>
                </div>
              )}



          {/* TAB: CONTACT */}
          {activeTab === 'contact' && <MobilitySection ref={mobilityRef} worker={worker} updateWorker={updateWorker} onSavingChange={setIsSaving} onSaved={() => { setShowSuccess(true); setTimeout(() => setShowSuccess(false), 3000); }}/>} 

          {/* TAB: FAMILY & NOMINEE */}
          {activeTab === 'family' && (
            <div className="space-y-8 animate-in fade-in">
              {/* Household size — describes your family, separate from the legal nominees below */}
              <div className="rounded-2xl border border-black/10 bg-bss-bg/40 p-5">
                <h3 className="text-[15px] font-semibold text-bss-text-primary">Household</h3>
                <p className="text-[13px] text-bss-text-muted mt-1 mb-4">How many people are in your family and how many depend on you. These are household counts — separate from the legal nominees below.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                   <div>
                     <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Family Members Count</label>
                     <input name="family.familyMembersCount" type="number" min={0} defaultValue={worker.family?.familyMembersCount ?? 0} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                   </div>
                   <div>
                     <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Dependants Count</label>
                     <input name="family.dependantsCount" type="number" min={0} defaultValue={worker.family?.dependantsCount ?? 0} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                   </div>
                </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                  <h3 className="text-[15px] font-semibold text-bss-text-primary">Official Nominee Details</h3>
                  <button type="button" onClick={addNominee} className="inline-flex items-center gap-1.5 text-[#0066CC] text-[13px] font-semibold hover:underline"><Plus size={15}/> Add Nominee</button>
                </div>
                <p className="text-[13px] text-bss-text-muted mb-4">Add multiple nominees — each nominee gets one row with their own relationship, identity documents and share (%). Total share must equal 100%.</p>

                {/* Hidden input shared by every nominee row's document upload */}
                <input ref={nomineeFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { void addNomineeDoc(e.target.files?.[0]); e.target.value = ''; }}/>

                <div className="space-y-4">
                  {nominees.map((n, rowIndex) => (
                    <div key={n.id} className="rounded-2xl border border-black/10 bg-bss-bg/40 p-5 space-y-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-bss-text-muted">Nominee {rowIndex + 1} {n.name && <span className="normal-case text-bss-text-secondary">— {n.name}</span>}</p>
                        <button type="button" onClick={() => removeNominee(n.id)} aria-label="Remove nominee" className="w-7 h-7 grid place-items-center rounded-full text-bss-text-muted hover:text-bss-error hover:bg-bss-soft-red"><Trash2 size={14}/></button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-5">
                        <div>
                          <label className="block text-[11px] font-semibold text-bss-text-muted uppercase tracking-wider mb-1.5">Name <span className="text-[#FF3B30]">*</span></label>
                          <input type="text" data-nominee-name={n.id} value={n.name} onChange={e => updateNominee(n.id, n.nomineeType === 'Dependant' ? { name: e.target.value, dependant: e.target.value } : { name: e.target.value })} placeholder="Nominee full name" className={`w-full bg-white border rounded-xl px-3 py-2.5 text-[13px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC] ${saveAttempted && !n.name.trim() ? 'border-red-400' : 'border-black/10'}`}/>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-bss-text-muted uppercase tracking-wider mb-1.5">Relationship <span className="text-[#FF3B30]">*</span></label>
                          <select data-nominee-relationship={n.id} value={n.relationship} onChange={e => updateNominee(n.id, { relationship: e.target.value })} className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]">
                            {BssTaxonomies.NomineeRelationship.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-bss-text-muted uppercase tracking-wider mb-1.5">Nominee Type <span className="text-[#FF3B30]">*</span></label>
                          <select data-nominee-type={n.id} value={n.nomineeType} onChange={e => { const t = e.target.value; updateNominee(n.id, t === 'Dependant' ? { nomineeType: t, dependant: n.name } : { nomineeType: t }); }} className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]">
                            <option>Nominee</option>
                            <option>Family Member</option>
                            <option>Dependant</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-bss-text-muted uppercase tracking-wider mb-1.5">Date of Birth <span className="text-[#FF3B30]">*</span></label>
                          <input type="date" data-nominee-dob={n.id} value={n.dob} onChange={e => updateNominee(n.id, { dob: e.target.value })} className={`w-full bg-white border rounded-xl px-3 py-2.5 text-[13px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC] ${saveAttempted && !n.dob ? 'border-red-400' : 'border-black/10'}`}/>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-bss-text-muted uppercase tracking-wider mb-1.5">Age</label>
                          <input type="text" value={nomineeAge(n.dob)} readOnly className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-3 py-2.5 text-[13px] font-medium text-bss-text-primary"/>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-bss-text-muted uppercase tracking-wider mb-1.5">Contact <span className="text-[#FF3B30]">*</span></label>
                          <input type="tel" maxLength={10} data-nominee-contact={n.id} value={n.contact} onChange={e => updateNominee(n.id, { contact: e.target.value })} className={`w-full bg-white border rounded-xl px-3 py-2.5 text-[13px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC] ${saveAttempted && !n.contact.trim() ? 'border-red-400' : 'border-black/10'}`}/>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-bss-text-muted uppercase tracking-wider mb-1.5">Dependant <span className="text-[#FF3B30]">*</span></label>
                          <input type="text" data-nominee-dependant={n.id} value={n.nomineeType === 'Dependant' ? n.name : n.dependant} readOnly={n.nomineeType === 'Dependant'} onChange={e => updateNominee(n.id, { dependant: e.target.value })} placeholder={n.nomineeType === 'Dependant' ? 'Auto-filled from nominee name' : 'Name of dependant'} className={`w-full border rounded-xl px-3 py-2.5 text-[13px] font-medium focus:outline-none focus:border-[#0066CC] ${n.nomineeType === 'Dependant' ? 'bg-[#F5F5F7] text-bss-text-muted border-transparent' : `bg-white text-bss-text-primary ${saveAttempted && !n.dependant.trim() ? 'border-red-400' : 'border-black/10'}`}`}/>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-bss-text-muted uppercase tracking-wider mb-1.5">Nominee / Family Address <span className="text-[#FF3B30]">*</span></label>
                          <textarea rows={2} data-nominee-address={n.id} value={n.address} onChange={e => updateNominee(n.id, { address: e.target.value })} className={`w-full bg-white border rounded-xl px-3 py-2.5 text-[13px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC] resize-none ${saveAttempted && !n.address.trim() ? 'border-red-400' : 'border-black/10'}`}/>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-bss-text-muted uppercase tracking-wider mb-1.5">Identity Documents <span className="text-[#FF3B30]">*</span></label>
                          <div data-nominee-documents={n.id} className={`flex flex-wrap items-center gap-2 rounded-xl min-h-[42px] ${saveAttempted && n.documents.length === 0 ? 'ring-1 ring-red-400 p-1' : ''}`}>
                            <button type="button" onClick={() => pickNomineeDoc(n.id)} className="inline-flex items-center gap-1.5 bg-white border border-black/10 px-3 py-2 rounded-lg text-[12px] font-medium hover:bg-bss-bg"><Upload size={14}/> Upload PAN / Aadhaar Copy</button>
                            {n.documents.map((doc, docIndex) => (
                              <span key={`${doc.fileName ?? doc.name}-${docIndex}`} className="inline-flex items-center gap-2 bg-[#E8F5E9]/70 border border-[#2F9E67]/20 text-bss-green px-2.5 py-1.5 rounded-lg text-[11px] font-semibold">
                                <FileText size={12}/>
                                <span className="max-w-[180px] truncate" title={doc.name}>{doc.name}</span>
                                {doc.url && <a href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[#073B67] hover:underline" title="View document"><Eye size={12}/>View</a>}
                                <button type="button" onClick={() => updateNominee(n.id, { documents: n.documents.filter((_, i) => i !== docIndex) })} aria-label={`Remove ${doc.name}`} className="text-bss-text-muted hover:text-bss-error"><Trash2 size={11}/></button>
                              </span>
                            ))}
                            {!n.documents.length && <span className="text-[11px] text-bss-text-muted">No document uploaded</span>}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-bss-text-muted uppercase tracking-wider mb-1.5">Share %</label>
                          <div className="relative">
                            <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bss-text-muted"/>
                            <input type="text" inputMode="numeric" pattern="[0-9]*" value={nominees.length === 1 ? '100' : (n.percent ? String(n.percent) : '')} placeholder="0" onChange={e => { const digits = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''); const others = totalPercent - (Number.isFinite(n.percent) ? n.percent : 0); const max = Math.max(0, 100 - others); const num = digits === '' ? 0 : Math.min(max, parseInt(digits, 10)); updateNominee(n.id, { percent: num }); }} disabled={nominees.length === 1} className="w-full bg-white border border-black/10 rounded-xl pl-8 pr-2 py-2.5 text-[13px] font-semibold text-bss-text-primary focus:outline-none focus:border-[#0066CC] disabled:bg-[#F5F5F7] disabled:text-bss-text-muted"/>
                          </div>
                          {nominees.length === 1 && <p className="text-[10px] text-bss-text-muted mt-1">A single nominee receives 100%.</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Distribution summary — only meaningful once a nominee exists */}
                {nominees.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-black/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[12px] font-semibold text-bss-text-primary">Nominee share distribution</p>
                      <span className={`text-[12px] font-bold ${percentBalanced ? 'text-bss-green' : 'text-[#F47A32]'}`}>{percentBalanced ? '100% · balanced' : `${totalPercent}% of 100%`}</span>
                    </div>
                    {nominees.length > 1 && (
                      <div className="mt-3 flex h-2.5 rounded-full overflow-hidden bg-bss-bg">
                        {nominees.map((n, index) => <span key={n.id} className={`h-full ${segColors[index % segColors.length]}`} style={{ width: `${n.percent}%` }} title={`${n.name || 'Nominee ' + (index + 1)} · ${n.percent}%`}/>)}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      {nominees.map((n, index) => (
                        <span key={n.id} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-bss-text-secondary"><span className={`w-2.5 h-2.5 rounded-full ${segColors[index % segColors.length]}`}/>{n.name || ('Nominee ' + (index + 1))} — {n.percent}%</span>
                      ))}
                    </div>
                    {!percentBalanced && <p className="mt-3 text-[12px] text-[#F47A32] font-semibold flex items-center gap-1.5">Shares add up to {totalPercent}% — {Math.max(0, 100 - totalPercent)}% still to allocate. The total must be exactly 100%.</p>}
                    {nominees.length > 1 && <button type="button" onClick={splitEqually} className="mt-3 inline-flex items-center gap-1.5 text-[#0066CC] text-[12px] font-semibold hover:underline"><RefreshCw size={13}/> Split equally</button>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: SOCIAL SECURITY */}
          {activeTab === 'social' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-[#FFF8F0] p-5 rounded-2xl border border-[#F47A32]/20 mb-6">
                <p className="text-[13px] text-[#F47A32] font-medium">These identifiers are primarily updated by your employer or government APIs. You can declare existing numbers here to assist matching.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                 <div>
                   <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">EPFO UAN</label>
                   <input name="socialSecurity.epfoUan" type="text" defaultValue={worker.socialSecurity.epfoUan} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                 </div>
                 <div>
                   <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">ESIC IP Number</label>
                   <input name="socialSecurity.esicIp" type="text" defaultValue={worker.socialSecurity.esicIp} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">LWF Number (Labour Welfare Fund)</label>
                    <input name="socialSecurity.lwfNo" type="text" defaultValue={worker.socialSecurity.lwfNo} placeholder="Enter if available" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">e-Shram Number <span className="ml-1 inline-flex items-center text-[10px] font-bold text-bss-orange bg-bss-soft-orange px-1.5 py-0.5 rounded uppercase">{worker.socialSecurity.eShramNo ? 'Linked' : 'Not Linked'}</span></label>
                    <input name="socialSecurity.eShramNo" type="text" defaultValue={worker.socialSecurity.eShramNo} placeholder="Enter 12 digit UAN" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">BOCW Registration Number <span className="ml-1 inline-flex items-center text-[10px] font-bold text-bss-orange bg-bss-soft-orange px-1.5 py-0.5 rounded uppercase">{worker.socialSecurity.bocwRegNumber ? 'Registered' : 'Not Registered'}</span></label>
                    <input name="socialSecurity.bocwRegNumber" type="text" defaultValue={worker.socialSecurity.bocwRegNumber} placeholder="State BOCW ID" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">WC Policy No. (Workmen Compensation)</label>
                    <input name="socialSecurity.wcPolicyNo" type="text" defaultValue={worker.socialSecurity.wcPolicyNo} placeholder="Insurance Policy No." className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">State Worker ID</label>
                    <input name="socialSecurity.stateWorkerId" type="text" defaultValue={worker.socialSecurity.stateWorkerId} placeholder="State labour department worker ID" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                 </div>
              </div>
            </div>
          )}

          {/* TAB: BANKING & VERIFICATION */}
          {activeTab === 'banking' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Aadhaar No.</label>
                    <div className="flex items-center gap-3">
                      <input name="identity.aadhaar" type="password" defaultValue={worker.identity.aadhaar} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-bss-text-primary" readOnly />
                      <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex-shrink-0 ${worker.identity.aadhaarVerified ? 'bg-[#E8F5E9] text-bss-green' : 'bg-bss-bg text-bss-text-muted'}`}>{worker.identity.aadhaarVerified ? 'Verified' : 'Pending'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">PAN No.</label>
                    <div className="flex items-center gap-3">
                      <input name="identity.pan" type="text" defaultValue={worker.identity.pan} placeholder="Enter PAN" readOnly={worker.identity.panVerified} className={`w-full border rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-bss-text-primary uppercase focus:outline-none ${worker.identity.panVerified ? 'bg-[#F5F5F7] border-transparent' : 'bg-white border-black/10 focus:border-[#0066CC]'}`} />
                      <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex-shrink-0 ${worker.identity.panVerified ? 'bg-[#E8F5E9] text-bss-green' : 'bg-bss-bg text-bss-text-muted'}`}>{worker.identity.panVerified ? 'Verified' : 'Pending'}</span>
                    </div>
                  </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h3 className="text-[15px] font-semibold text-bss-text-primary">Bank Accounts (Wage Transfer)</h3>
                  {bankVerified ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-bss-green bg-[#E8F5E9] px-2.5 py-1 rounded-full"><CheckCircle2 size={13}/> KYC Verified (Penny Drop)</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#F47A32] bg-[#FFF8F0] px-2.5 py-1 rounded-full"><ShieldCheck size={13}/> KYC pending</span>
                  )}
                </div>
                <div className="rounded-[14px] bg-[#EAF3FF] border border-[#0066CC]/15 px-4 py-3 mb-5 text-[13px] text-[#073B67] font-medium">
                  <strong>Note:</strong> Your <strong>primary account receives your salary</strong>. Keep the primary account active; the secondary account is used only when you choose it (e.g., saving/loan account). Both accounts are registered in <em>Govt. Integrations</em> and must pass KYC through the bank verification API.
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Primary account */}
                  <div className="rounded-2xl border border-[#2F9E67]/30 bg-white overflow-hidden">
                    <div className="px-4 py-3 bg-[#E8F5E9]/60 border-b border-[#2F9E67]/20 flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-bss-text-primary"><CheckCircle2 size={14} className="text-bss-green"/> Primary Account</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-[#2F9E67] px-2 py-0.5 rounded-full">Receives Salary</span>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                      <div>
                        <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Bank Account Number</label>
                        <input name="banking.accountNumber" type="password" defaultValue="" placeholder="Enter account number" className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-mono font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]"/>
                        <p className="text-[10px] text-bss-text-muted mt-1">Current: {maskId(worker.banking.accountNumber, 4) || '—'} · re-enter to change</p>
                      </div>
                      <div>
                        <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">IFSC Code</label>
                        <input name="banking.ifsc" type="text" defaultValue={worker.banking.ifsc} className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-mono font-medium text-bss-text-primary uppercase focus:outline-none focus:border-[#0066CC]"/>
                      </div>
                      <div>
                        <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Bank Name <span className="normal-case font-medium text-bss-text-muted">(auto-filled)</span></label>
                        <input readOnly value={worker.banking.bankName} placeholder="Fetched from IFSC" className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-3 py-2.5 text-[13px] font-medium text-bss-text-primary"/>
                      </div>
                      <div>
                        <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Account Holder Name <span className="normal-case font-medium text-bss-text-muted">(from bank)</span></label>
                        <div className="relative">
                          <input readOnly value={worker.banking.holderName} placeholder="Fetched on verification" className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-3 py-2.5 pr-10 text-[13px] font-medium text-bss-text-primary"/>
                          {worker.banking.nameMatchesAadhaar && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-bss-green" title="Matches your Aadhaar name"><CheckCheck size={17}/></span>}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Branch <span className="normal-case font-medium text-bss-text-muted">(auto-filled)</span></label>
                        <input readOnly value={worker.banking.branch} placeholder="—" className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-3 py-2.5 text-[13px] font-medium text-bss-text-primary"/>
                      </div>
                      <div className="sm:col-span-2 flex flex-wrap items-center gap-3 pt-1">
                        <button type="button" onClick={verifyBank} disabled={bankVerify.busy} className="h-10 px-4 rounded-xl bg-[#073B67] text-white text-[13px] font-bold inline-flex items-center gap-2 hover:bg-[#062D4F] disabled:opacity-50">{bankVerify.busy ? 'Verifying…' : 'Verify via Penny Drop (₹1)'}</button>
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${worker.banking.verificationStatus === 'Verified' ? 'text-bss-green bg-[#E8F5E9]' : 'text-[#F47A32] bg-[#FFF8F0]'}`}><ShieldCheck size={12}/> {worker.banking.verificationStatus === 'Verified' ? 'KYC Verified (NPCI Penny Drop)' : 'KYC pending'}</span>
                      </div>
                      {bankVerify.message && <p role="status" className="sm:col-span-2 text-[12px] text-bss-green bg-[#E8F5E9] border border-[#2F9E67]/20 rounded-lg px-3 py-2">{bankVerify.message}</p>}
                      {bankVerify.error && <p role="alert" className="sm:col-span-2 text-[12px] text-bss-error bg-bss-soft-red border border-bss-border rounded-lg px-3 py-2">{bankVerify.error}</p>}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB: CLASSIFICATION & WORK */}
          {activeTab === 'classification' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div>
                   <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Current Employment Status</label>
                   <DownSelect value={employmentStatus} onChange={setEmploymentStatus} placeholder="Select" options={BssTaxonomies.EmploymentStatus} />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Worker Category</label>
                   <DownSelect value={workerCategory} onChange={setWorkerCategory} placeholder="Select" options={BssTaxonomies.WorkerCategory} />
                </div>
                <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Sector <span className="text-[#FF3B30]">*</span></label>
                    <DownSelect name="classification.sector" value={sector} onChange={setSector} placeholder="Select" options={BssTaxonomies.Sector} />
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Industry <span className="text-[#FF3B30]">*</span></label>
                    <input name="classification.industry" type="text" defaultValue={worker.classification?.industry} className={`w-full bg-white border ${clsErr('classification.industry')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Occupation <span className="text-[#FF3B30]">*</span></label>
                    <DownSelect name="classification.occupation" value={occupation} onChange={setOccupation} placeholder="Select" options={['Bar Bender (Rebar)', 'Mason', 'Carpenter', 'Electrician']} />
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Total Worker Experience (Years) <span className="text-[#FF3B30]">*</span></label>
                    <input name="classification.totalWorkerExperience" type="number" min={0} defaultValue={worker.classification?.totalWorkerExperience} className={`w-full bg-white border ${clsErr('classification.totalWorkerExperience')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                 </div>
              </div>

              {/* Conditional Block: GIG ACTIVE (taxonomy value "Gig active") */}
              {employmentStatus === 'Gig active' && (
                <div className="pt-6 border-t border-black/5 animate-in slide-in-from-top-2">
                  <h3 className="text-[15px] font-semibold text-bss-text-primary mb-4">Gig Platform Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Platform / Aggregator Name <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.gigPlatformName" type="text" defaultValue={worker.classification?.gigPlatformName} className={`w-full bg-white border ${clsErr('classification.gigPlatformName')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Platform Worker ID <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.gigPlatformWorkerId" type="text" defaultValue={worker.classification?.gigPlatformWorkerId} className={`w-full bg-white border ${clsErr('classification.gigPlatformWorkerId')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Date Joined Platform <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.gigDateJoined" type="date" defaultValue={worker.classification?.gigDateJoined} className={`w-full bg-white border ${clsErr('classification.gigDateJoined')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Platform Type <span className="text-[#FF3B30]">*</span></label>
                      <select name="classification.gigPlatformType" defaultValue={worker.classification?.gigPlatformType} className={`w-full bg-white border ${clsErr('classification.gigPlatformType')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`}>
                        {BssTaxonomies.PlatformType.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Service Area <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.gigServiceArea" type="text" defaultValue={worker.classification?.gigServiceArea} className={`w-full bg-white border ${clsErr('classification.gigServiceArea')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Vehicle Type</label>
                      <select name="classification.gigVehicleType" defaultValue={worker.classification?.gigVehicleType} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]">
                        {BssTaxonomies.VehicleType.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Vehicle Ownership</label>
                      <select name="classification.gigVehicleOwnership" defaultValue={worker.classification?.gigVehicleOwnership} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]">
                        <option>Owned</option>
                        <option>Leased / Rented</option>
                        <option>Platform Provided</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Average Hours per Day <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.gigAvgHoursPerDay" type="number" placeholder="Hours" defaultValue={worker.classification?.gigAvgHoursPerDay} className={`w-full bg-white border ${clsErr('classification.gigAvgHoursPerDay')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Average Days per Week <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.gigAvgDaysPerWeek" type="number" placeholder="Days" defaultValue={worker.classification?.gigAvgDaysPerWeek} className={`w-full bg-white border ${clsErr('classification.gigAvgDaysPerWeek')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Driving Licence Number</label>
                      <input name="classification.gigDlNumber" type="text" defaultValue={worker.classification?.gigDlNumber} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Driving Licence Expiry</label>
                      <input name="classification.gigDlExpiry" type="date" defaultValue={worker.classification?.gigDlExpiry} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Block: SELF-EMPLOYED (taxonomy value "Self-employed") */}
              {employmentStatus === 'Self-employed' && (
                <div className="pt-6 border-t border-black/5 animate-in slide-in-from-top-2">
                  <h3 className="text-[15px] font-semibold text-bss-text-primary mb-4">Self Employment Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Business / Enterprise Name <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seBusinessName" type="text" defaultValue={worker.classification?.seBusinessName} className={`w-full bg-white border ${clsErr('classification.seBusinessName')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Employer / Business Name <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seEmployerName" type="text" defaultValue={worker.classification?.seEmployerName} className={`w-full bg-white border ${clsErr('classification.seEmployerName')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Business Type <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seBusinessType" type="text" defaultValue={worker.classification?.seBusinessType} className={`w-full bg-white border ${clsErr('classification.seBusinessType')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Business Registration Status <span className="text-[#FF3B30]">*</span></label>
                      <select name="classification.seRegistrationStatus" defaultValue={worker.classification?.seRegistrationStatus} className={`w-full bg-white border ${clsErr('classification.seRegistrationStatus')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`}>
                        <option>Registered</option>
                        <option>Unregistered</option>
                        <option>Registration Pending</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Business Start Date <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seStartDate" type="date" defaultValue={worker.classification?.seStartDate} className={`w-full bg-white border ${clsErr('classification.seStartDate')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Number of Employees <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seEmployeesCount" type="number" min={0} defaultValue={worker.classification?.seEmployeesCount} className={`w-full bg-white border ${clsErr('classification.seEmployeesCount')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Average Hours/Day <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seAvgHoursPerDay" type="number" placeholder="Hours" defaultValue={worker.classification?.seAvgHoursPerDay} className={`w-full bg-white border ${clsErr('classification.seAvgHoursPerDay')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Average Days/Week <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seAvgDaysPerWeek" type="number" placeholder="Days" defaultValue={worker.classification?.seAvgDaysPerWeek} className={`w-full bg-white border ${clsErr('classification.seAvgDaysPerWeek')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Location <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seLocation" type="text" defaultValue={worker.classification?.seLocation} className={`w-full bg-white border ${clsErr('classification.seLocation')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Block: SEASONAL */}
              {employmentStatus === 'Seasonal' && (
                <div className="pt-6 border-t border-black/5 animate-in slide-in-from-top-2">
                  <h3 className="text-[15px] font-semibold text-bss-text-primary mb-4">Seasonal Work Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Job / Work Type <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seasonalJobType" type="text" defaultValue={worker.classification?.seasonalJobType} className={`w-full bg-white border ${clsErr('classification.seasonalJobType')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Season Start <span className="text-[#FF3B30]">*</span></label>
                        <input name="classification.seasonalStartDate" type="date" defaultValue={worker.classification?.seasonalStartDate} className={`w-full bg-white border ${clsErr('classification.seasonalStartDate')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                      </div>
                      <div>
                        <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Season End <span className="text-[#FF3B30]">*</span></label>
                        <input name="classification.seasonalEndDate" type="date" defaultValue={worker.classification?.seasonalEndDate} className={`w-full bg-white border ${clsErr('classification.seasonalEndDate')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Average Hours/Day <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seasonalAvgHoursPerDay" type="number" defaultValue={worker.classification?.seasonalAvgHoursPerDay} placeholder="Hours" className={`w-full bg-white border ${clsErr('classification.seasonalAvgHoursPerDay')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Average Days/Week <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seasonalAvgDaysPerWeek" type="number" defaultValue={worker.classification?.seasonalAvgDaysPerWeek} placeholder="Days" className={`w-full bg-white border ${clsErr('classification.seasonalAvgDaysPerWeek')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Work Location / Service Area <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seasonalLocation" type="text" defaultValue={worker.classification?.seasonalLocation} className={`w-full bg-white border ${clsErr('classification.seasonalLocation')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Expected Seasonal Income <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seasonalExpectedIncome" type="text" defaultValue={worker.classification?.seasonalExpectedIncome} placeholder="₹" className={`w-full bg-white border ${clsErr('classification.seasonalExpectedIncome')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-black/5">
                <h3 className="text-[15px] font-semibold text-bss-text-primary mb-4">Payment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Payment Frequency <span className="text-[#FF3B30]">*</span></label>
                    <select name="classification.paymentFrequency" defaultValue={worker.classification?.paymentFrequency} className={`w-full bg-white border ${clsErr('classification.paymentFrequency')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`}>
                      <option>Weekly</option>
                      <option>Fortnightly</option>
                      <option>Monthly</option>
                      <option>Per Task / Piece Rate</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Payment Mode <span className="text-[#FF3B30]">*</span></label>
                    <select name="classification.paymentMode" defaultValue={worker.classification?.paymentMode} className={`w-full bg-white border ${clsErr('classification.paymentMode')} rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]`}>
                      <option>Bank Transfer</option>
                      <option>Cheque</option>
                      <option>Cash</option>
                      <option>UPI</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <h3 className="text-[15px] font-semibold text-bss-text-primary mb-4">Consents & Registration (Read Only)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Registration Source</label>
                    <input name="other.registrationSource" type="text" defaultValue={worker.other?.registrationSource} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Consent for Data Sharing</label>
                    <div className="flex items-center gap-2 w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3">
                      <CheckCircle2 size={18} className="text-bss-green"/>
                      <span className="text-[14px] font-medium text-bss-text-primary">{worker.other?.consentDate ? `Granted on ${formatDate(worker.other.consentDate)}` : 'Not granted'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: EMPLOYMENT BINDING (READ ONLY) */}
          {activeTab === 'employment' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-[#E8F5E9] p-5 rounded-2xl border border-[#2F9E67]/20 mb-6">
                <p className="text-[13px] text-bss-green font-medium">These employment and binding details are generated automatically by the system upon your successful binding with a contractor.</p>
              </div>

              {worker.employment.costBreakdown && ((worker.employment.costBreakdown.statutory?.length ?? 0) > 0 || (worker.employment.costBreakdown.custom?.length ?? 0) > 0) && (
                <div className="bg-white border border-black/5 rounded-2xl p-5 mb-6">
                  <h3 className="text-[15px] font-semibold text-bss-text-primary mb-4">Worker Cost &amp; CTC · {worker.employment.costBreakdown.templateCode || 'cost sheet'}</h3>
                  <div className="grid grid-cols-2 gap-y-2 text-[13px]">
                    <span className="text-bss-text-muted">Basic + VDA (wage)</span><span className="font-semibold text-right">₹{(worker.employment.costBreakdown.minimumWage ?? 0).toLocaleString('en-IN')}</span>
                    <span className="text-bss-text-muted">Statutory total</span><span className="font-semibold text-right">₹{(worker.employment.costBreakdown.statutoryTotal ?? 0).toLocaleString('en-IN')}</span>
                    <span className="text-bss-text-muted">Custom total</span><span className="font-semibold text-right">₹{(worker.employment.costBreakdown.customTotal ?? 0).toLocaleString('en-IN')}</span>
                    <span className="font-bold text-bss-text-primary border-t border-black/5 pt-2">Employer cost</span><span className="font-bold text-right border-t border-black/5 pt-2">₹{(worker.employment.costBreakdown.employerCost ?? 0).toLocaleString('en-IN')}</span>
                    <span className="font-bold text-bss-text-primary">CTC (monthly)</span><span className="font-bold text-right text-[#0066CC]">₹{(worker.employment.costBreakdown.ctc ?? worker.employment.ctc ?? 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">{(worker.employment.costBreakdown.statutory ?? []).map(s => <span key={s.component} className="text-[11px] px-2 py-0.5 rounded-full bg-[#F5F5F7] text-bss-text-primary">{s.component} ₹{s.amount.toLocaleString('en-IN')}</span>)}{(worker.employment.costBreakdown.custom ?? []).map(c => <span key={c.name} className="text-[11px] px-2 py-0.5 rounded-full bg-[#E8F0FE] text-[#0066CC]">{c.name} ₹{c.computed.toLocaleString('en-IN')}</span>)}</div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div>
                   <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Employer Name</label>
                   <input name="employment.employerDetails" type="text" defaultValue={worker.employment.employerDetails?.name ?? worker.employment.employer} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Employer BSS ID</label>
                   <input name="employment.employerDetails" type="text" defaultValue={worker.employment.employerDetails?.code} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Employer Email ID</label>
                   <input name="employment.employerDetails" type="text" defaultValue={worker.employment.employerDetails?.email} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Employer State</label>
                  <input name="employment.employerDetails" type="text" defaultValue={worker.employment.employerDetails?.state} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Employer Address</label>
                   <input name="employment.employerDetails" type="text" defaultValue={worker.employment.employerDetails?.address} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Employer Industry</label>
                   <input name="employment.employerDetails" type="text" defaultValue={worker.employment.employerDetails?.industry} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Principal Employer LIN No.</label>
                   <input name="employment.employerDetails" type="text" defaultValue={worker.employment.employerDetails?.lin} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Contractor Name</label>
                   <input name="employment.contractorDetails" type="text" defaultValue={worker.employment.contractorDetails?.name ?? worker.employment.contractor} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Contractor BSS ID</label>
                   <input name="employment.contractorDetails" type="text" defaultValue={worker.employment.contractorDetails?.code} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Contractor Email</label>
                   <input name="employment.contractorDetails" type="text" defaultValue={worker.employment.contractorDetails?.email} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Contractor State</label>
                  <input name="employment.contractorDetails" type="text" defaultValue={worker.employment.contractorDetails?.state} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Contractor Address</label>
                   <input name="employment.contractorDetails" type="text" defaultValue={worker.employment.contractorDetails?.address} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Contractor LIN</label>
                   <input name="employment.contractorDetails" type="text" defaultValue={worker.employment.contractorDetails?.lin} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <h3 className="text-[15px] font-semibold text-bss-text-primary mb-4">Site & Role Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Site Name</label>
                    <input name="employment.siteDetails" type="text" defaultValue={worker.employment.siteDetails?.name ?? worker.employment.site} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Site ID</label>
                    <input name="employment.siteDetails" type="text" defaultValue={worker.employment.siteDetails?.code} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Site Location</label>
                    <input name="employment.siteDetails" type="text" defaultValue={worker.employment.siteDetails?.location} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">State</label>
                    <input name="employment.siteDetails" type="text" defaultValue={worker.employment.siteDetails?.state} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Designation & Department</label>
                    <input type="text" defaultValue={[worker.employment.designation, worker.employment.department].filter(Boolean).join(" - ")} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Nature of Job</label>
                    <input name="employment.natureOfJob" type="text" defaultValue={worker.employment.natureOfJob} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Type of Work</label>
                    <input name="employment.typeOfWork" type="text" defaultValue={worker.employment.typeOfWork} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Date of Joining</label>
                    <input name="employment.doj" type="text" defaultValue={worker.employment.doj} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Employment Status</label>
                    <input name="employment.status" type="text" defaultValue={worker.employment.status} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-green" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Reference Worker ID</label>
                    <input name="employment.refWorkerId" type="text" defaultValue={worker.employment.refWorkerId} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">PF Account</label>
                    <input name="employment.pfAccount" type="text" defaultValue={worker.employment.pfAccount} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <h3 className="text-[15px] font-semibold text-bss-text-primary mb-4">Logistics & Additional Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Shift</label>
                    <input name="employment.shift" type="text" defaultValue={worker.employment.shift} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Camp No.</label>
                    <input name="employment.campNo" type="text" defaultValue={worker.employment.campNo} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Transport Facility</label>
                    <input name="employment.transportFacility" type="text" defaultValue={worker.employment.transportFacility} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-green" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Route</label>
                    <input name="employment.route" type="text" defaultValue={worker.employment.route} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Bus No.</label>
                    <input name="employment.busNo" type="text" defaultValue={worker.employment.busNo} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">ID Card Issue Date</label>
                    <input name="employment.idCardIssueDate" type="text" defaultValue={worker.employment.idCardIssueDate} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">ID Card Validity Till</label>
                    <input name="employment.idCardValidityTill" type="text" defaultValue={worker.employment.idCardValidityTill} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                  </div>
                </div>
              </div>
              


            </div>
          )}

          {/* TAB: SKILLS & EMPLOYABILITY */}
          {activeTab === 'skills' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-[#F5F5F7] rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[15px] font-semibold text-bss-text-primary">Education & Languages</h3>
                  <button type="button" onClick={addEducation} className="text-[#0066CC] text-[13px] font-semibold hover:underline">+ Add Education</button>
                </div>
                {skillsForm.educations.map((edu, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-white rounded-xl p-4 border border-bss-border">
                    <div>
                      <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider mb-2">Qualification / Course</p>
                      <input type="text" value={edu.qualificationCourse} onChange={e => updateEducation(index, 'qualificationCourse', e.target.value)} placeholder="e.g. 12th Standard (HSC)" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider mb-2">Board / University</p>
                      <input type="text" value={edu.boardUniversity} onChange={e => updateEducation(index, 'boardUniversity', e.target.value)} placeholder="e.g. CBSE" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider mb-2">Passing Year</p>
                      <input type="text" inputMode="numeric" value={edu.passingYear} onChange={e => updateEducation(index, 'passingYear', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="e.g. 2014" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div className="flex md:justify-end">
                      {skillsForm.educations.length > 1 && (
                        <button type="button" onClick={() => removeEducation(index)} className="text-[#FF3B30] hover:bg-bss-soft-red rounded-lg p-2" aria-label="Remove education"><Trash2 size={16}/></button>
                      )}
                    </div>
                  </div>
                ))}
                <div>
                  <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider mb-2">Languages Known</p>
                  <input type="text" value={skillsForm.languages} onChange={e => setSkill('languages', e.target.value)} placeholder="Comma separated, e.g. Hindi, English" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[15px] font-semibold text-bss-text-primary">Trades & Skills</h3>
                  <button type="button" onClick={addSkill} className="text-[#0066CC] text-[13px] font-semibold hover:underline">
                    + Add Skill
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {/* Verified certifications — issued via the BSS course system (read-only) */}
                  {(worker.skills?.items ?? []).filter(s => s.verified).map((s, i) => (
                    <div key={s.id ?? `v-${i}`} className="bg-white rounded-xl shadow-sm border border-bss-border overflow-hidden">
                      <div className="p-4 border-b flex justify-between items-center bg-[#073B67] text-white">
                        <div className="flex items-center gap-2">
                          <Award size={18} className="text-[#F47A32]" />
                          <h3 className="font-bold text-white">{s.name || 'Certified Skill'}</h3>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-[#2F9E67] text-white">Verified</span>
                      </div>
                      <div className="p-5 space-y-5">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Sector</p>
                            <p className="text-sm font-semibold text-bss-text-primary mt-1">{worker.classification?.sector || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Experience</p>
                            <p className="text-sm font-semibold text-bss-text-primary mt-1">{s.experienceYears || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Assessment Source</p>
                            <p className="text-sm font-semibold text-bss-text-primary mt-1">Third-Party Assessed</p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-bss-border">
                          <div className="flex items-center gap-2 mb-3">
                            <BadgeCheck size={16} className="text-bss-green" />
                            <h4 className="text-sm font-bold text-bss-text-primary">Certification Details</h4>
                          </div>
                          <div className="bg-[#E8F5E9]/50 p-4 rounded-lg border border-[#2F9E67]/20 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Certificate Name</p>
                              <p className="text-sm font-bold text-bss-text-primary">{s.certification?.name || '—'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Issuing Authority</p>
                              <p className="text-sm font-semibold text-bss-text-primary">{s.certification?.authority || '—'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Cert. Number</p>
                              <p className="text-xs font-mono font-semibold text-[#073B67]">{s.certification?.number || '—'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Validity</p>
                              <p className="text-xs font-semibold text-bss-text-primary">{s.certification?.expiry || '—'}</p>
                            </div>
                            <div className="col-span-4 pt-2 border-t border-[#2F9E67]/20 flex justify-end">
                              <button
                                type="button"
                                onClick={() => setActiveCert({
                                  name: s.certification?.name || s.name || 'Verified Skill',
                                  authority: s.certification?.authority || 'Bharat Shram Setu',
                                  number: s.certification?.number || 'BSS-CERT-VERIFIED',
                                  expiry: s.certification?.expiry || 'Lifetime Verified'
                                })}
                                className="px-3 py-1.5 rounded-lg bg-[#073B67] hover:bg-[#062D4F] text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                              >
                                <Upload size={13} className="rotate-180" /> View & Print Certificate
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Self-declared skills (editable) */}
                  {skillsForm.items.map((s, index) => (
                    <div key={`s-${index}`} className="bg-white rounded-xl shadow-sm border border-bss-border overflow-hidden">
                      <div className="p-4 border-b flex justify-between items-center bg-bss-bg">
                        <div className="flex items-center gap-2">
                          <Award size={18} className="text-bss-text-muted" />
                          <h3 className="font-bold text-bss-text-primary">Self-Declared Skill</h3>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-yellow-100 text-yellow-800">Self-Declared</span>
                      </div>
                      <div className="p-5">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                          <div className="md:col-span-2">
                            <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider mb-2">Skill / Trade</p>
                            <input type="text" value={s.name} onChange={e => updateSkill(index, 'name', e.target.value)} placeholder="e.g. Bar Bender (Rebar)" className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-[13px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider mb-2">Experience</p>
                            <input type="text" value={s.experienceYears} onChange={e => updateSkill(index, 'experienceYears', e.target.value)} placeholder="e.g. 3 Years" className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-[13px] font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]" />
                          </div>
                          <div className="flex md:justify-end">
                            <button type="button" onClick={() => removeSkill(index)} className="text-[#FF3B30] hover:bg-bss-soft-red rounded-lg p-2" aria-label="Remove skill"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {skillsForm.items.length === 0 && (worker.skills?.items ?? []).filter(s => s.verified).length === 0 && (
                    <p className="text-sm text-bss-text-muted">No skills added yet. Use “+ Add Skill” to add a self-declared skill.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: WELFARE & SAFETY */}
          {activeTab === 'welfare' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-[#FFF8F0] p-5 rounded-2xl border border-[#F47A32]/20 mb-6">
                <p className="text-[13px] text-[#F47A32] font-medium">Welfare and safety records are maintained by your employer and site safety team. For detailed records and actions, visit the <a href="/worker/Compliance" className="underline font-semibold">Compliance module</a>.</p>
              </div>

              <div className="bg-[#F5F5F7] rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">PPE Required</p>
                  <p className={`text-sm font-semibold mt-1 ${welfareClass(worker.welfare?.ppeRequired)}`}>{worker.welfare?.ppeRequired ? 'Yes — per site safety policy' : 'No'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Types of PPE Given</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {(worker.welfare?.typesOfPpeGiven ? worker.welfare.typesOfPpeGiven.split(',').map(s => s.trim()).filter(Boolean) : []).map(item => <span key={item} className="text-[10px] font-semibold bg-white border border-bss-border text-[#073B67] px-2 py-0.5 rounded">{item}</span>)}
                    {(!worker.welfare?.typesOfPpeGiven?.trim()) && <span className="text-xs text-bss-text-muted">Not recorded</span>}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Safety Training Completed</p>
                  <p className={`text-sm font-semibold mt-1 ${welfareClass(worker.welfare?.safetyTrainingCompleted)}`}>{worker.welfare?.safetyTrainingCompleted ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Training Date</p>
                  <p className="text-sm font-semibold text-bss-text-primary mt-1">{worker.welfare?.trainingDate || 'Not recorded'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Trainer Name</p>
                  <p className="text-sm font-semibold text-bss-text-primary mt-1">{worker.welfare?.trainerName || 'Not recorded'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Site Induction Status</p>
                  <p className={`text-sm font-semibold mt-1 ${welfareClass(worker.welfare?.siteInductionStatus)}`}>{worker.welfare?.siteInductionStatus || 'Not recorded'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Insurance Status</p>
                  <p className={`text-sm font-semibold mt-1 ${welfareClass(worker.welfare?.insuranceStatus)}`}>{worker.welfare?.insuranceStatus || 'Not recorded'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Accommodation Provided</p>
                  <p className={`text-sm font-semibold mt-1 ${welfareClass(worker.welfare?.accommodationProvided)}`}>{worker.welfare?.accommodationProvided || 'Not recorded'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Police Verification</p>
                  <p className={`text-sm font-semibold mt-1 ${welfareClass(worker.welfare?.policeVerification)}`}>{worker.welfare?.policeVerification || 'Not recorded'}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <h3 className="text-[15px] font-semibold text-bss-text-primary mb-4">Gate Passes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-bss-border overflow-hidden">
                    <div className="px-4 py-3 border-b bg-bss-bg flex justify-between items-center"><span className="text-sm font-bold text-bss-text-primary">Temporary Gate Pass Status</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${(worker.welfare?.tempGatePassStatus || '').toLowerCase() === 'active' ? 'bg-green-100 text-bss-green' : 'bg-orange-100 text-[#F47A32]'}`}>{worker.welfare?.tempGatePassStatus || '—'}</span></div>
                    <div className="p-4 space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-bss-text-muted">Temporary Pass No.</span><span className="font-mono font-semibold text-[#073B67]">{worker.welfare?.tgpNo || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-bss-text-muted">Temporary Gate Pass Start Date</span><span className="font-semibold text-bss-text-primary">{worker.welfare?.tempGatePassStart || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-bss-text-muted">Temporary Gate Pass End Date</span><span className="font-semibold text-bss-text-primary">{worker.welfare?.tempGatePassEnd || '—'}</span></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-bss-border overflow-hidden">
                    <div className="px-4 py-3 border-b bg-bss-bg flex justify-between items-center"><span className="text-sm font-bold text-bss-text-primary">Permanent Gate Pass Status</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${(worker.welfare?.permanentGatePassStatus || '').toLowerCase() === 'active' ? 'bg-green-100 text-bss-green' : 'bg-orange-100 text-[#F47A32]'}`}>{worker.welfare?.permanentGatePassStatus || '—'}</span></div>
                    <div className="p-4 space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-bss-text-muted">Permanent Pass No.</span><span className="font-mono font-semibold text-[#073B67]">{worker.welfare?.pgpNo || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-bss-text-muted">Permanent Gate Pass Start Date</span><span className="font-semibold text-bss-text-primary">{worker.welfare?.permanentGatePassStart || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-bss-text-muted">Permanent Gate Pass End Date</span><span className="font-semibold text-bss-text-primary">{worker.welfare?.permanentGatePassEnd || '—'}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <h3 className="text-[15px] font-semibold text-bss-text-primary mb-4">Medical Fitness Status</h3>
                <div className="bg-[#F5F5F7] rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Medical Examination Status</p>
                    {medicalExaminationStatus ? (
                      <p className={`text-sm font-semibold mt-1 ${medicalStatusTone}`}>{medicalExaminationStatus}</p>
                    ) : (
                      <p className="text-sm font-medium text-bss-text-muted mt-1">Not recorded</p>
                    )}
                    {medicalFitnessStatus && (
                      <p className="text-[11px] text-bss-text-muted mt-0.5">Fitness verdict: {medicalFitnessStatus}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Last Medical Examination</p>
                    <p className="text-sm font-semibold text-bss-text-primary mt-1">{worker.welfare?.lastMedicalExamination || 'Not recorded'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Next Medical Due</p>
                    <p className="text-sm font-semibold text-[#F47A32] mt-1">{worker.welfare?.nextMedicalDue || 'Not recorded'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: OTHER */}
          {activeTab === 'other' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-[#E8F5E9] p-5 rounded-2xl border border-[#2F9E67]/20 mb-6">
                <p className="text-[13px] text-bss-green font-medium">Registration and consent records are captured when your BSS profile is created and cannot be edited here.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div>
                  <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Consent for Registration</label>
                  <div className="flex items-center gap-2 w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3">
                    <CheckCircle2 size={18} className="text-bss-green"/>
                    <span className="text-[14px] font-medium text-bss-text-primary">{worker.other?.consentRegistration ? 'Granted' : 'Not granted'}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Consent for Verification / Data Sharing</label>
                  <div className="flex items-center gap-2 w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3">
                    <CheckCircle2 size={18} className="text-bss-green"/>
                    <span className="text-[14px] font-medium text-bss-text-primary">{worker.other?.consentVerification ? 'Granted' : 'Not granted'}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Consent Date</label>
                  <input name="other.consentDate" type="text" defaultValue={formatDate(worker.other?.consentDate, '')} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Registration Source</label>
                  <input name="other.registrationSource" type="text" defaultValue={worker.other?.registrationSource} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Registered By</label>
                  <input name="other.registeredBy" type="text" defaultValue={worker.other?.registeredBy} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-bss-text-muted uppercase tracking-wider mb-2">Registration Date</label>
                  <input name="other.registrationDate" type="text" defaultValue={formatDate(worker.other?.registrationDate, '')} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-bss-text-primary" readOnly />
                </div>
              </div>
            </div>
          )}

          {/* TAB: GOVT INTEGRATIONS */}
          {activeTab === 'integrations' && (
            <div className="space-y-8 animate-in fade-in">
              <div>
                <h3 className="text-[17px] font-semibold text-bss-text-primary mb-1">Government ID Integrations</h3>
                <p className="text-[14px] text-bss-text-muted mb-6">Connect and verify your government-issued IDs via direct API fetch. Verified IDs automatically fill out your BSS profile.</p>
                
                <div className="space-y-4">
                  {/* Aadhaar */}
                  <div className="flex flex-col md:flex-row gap-4 p-5 rounded-2xl border border-bss-border bg-bss-bg/50">
                    <div className="w-12 h-12 bg-bss-blue-tint text-bss-interactive-blue rounded-full flex items-center justify-center shrink-0">
                      <Fingerprint size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[15px] font-bold text-bss-text-primary">Aadhaar Verification</h4>
                      <p className="text-[13px] text-bss-text-muted mb-3">Fetched from UIDAI via Aadhaar oKYC.</p>
                      {worker.identity.aadhaarVerified ? (
                        <p className="font-mono text-[15px] font-semibold text-bss-text-primary">{aadhaarDisplay || 'Not linked'}</p>
                      ) : (
                        <div className="space-y-2 max-w-sm">
                          <input type="text" inputMode="numeric" value={aadhaarLink.aadhaar} onChange={e => setAadhaarLink(s => ({ ...s, aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12), error: '' }))} disabled={aadhaarLink.sent} placeholder="12-digit Aadhaar number" className="w-full bg-white border border-bss-border rounded-xl px-4 py-2 text-[14px] font-medium tracking-wider focus:outline-none disabled:bg-bss-bg" />
                          {aadhaarLink.sent && <input type="text" inputMode="numeric" value={aadhaarLink.otp} onChange={e => setAadhaarLink(s => ({ ...s, otp: e.target.value.replace(/\D/g, '').slice(0, 6), error: '' }))} placeholder="6-digit OTP" className="w-full bg-white border border-bss-border rounded-xl px-4 py-2 text-[14px] font-medium tracking-[0.3em] focus:outline-none" />}
                          {aadhaarLink.sent && <ResendOtp onSend={sendAadhaarOtp} initialCooldown={aadhaarLink.otpCooldown} />}
                          {aadhaarLink.error && <p className="text-[12px] text-bss-error">{aadhaarLink.error}</p>}
                          {aadhaarLink.notice && <p className="text-[12px] text-bss-green">{aadhaarLink.notice}</p>}
                          <div className="flex gap-2">
                            {!aadhaarLink.sent ? (
                              <button type="button" onClick={sendAadhaarOtp} disabled={aadhaarLink.busy} className="bg-bss-interactive-blue text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:bg-bss-deep-navy disabled:opacity-60">{aadhaarLink.busy ? 'Sending…' : 'Send OTP'}</button>
                            ) : (
                              <>
                                <button type="button" onClick={verifyAadhaarOtp} disabled={aadhaarLink.busy} className="bg-bss-navy text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:bg-bss-deep-navy disabled:opacity-60">{aadhaarLink.busy ? 'Verifying…' : 'Verify & Link'}</button>
                                <button type="button" onClick={() => setAadhaarLink(s => ({ ...s, sent: false, otp: '', notice: '', error: '' }))} className="px-3 py-2 rounded-xl text-[13px] font-semibold text-bss-text-muted hover:text-bss-text-secondary">Change number</button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-start md:justify-end min-w-[140px]">
                      {worker.identity.aadhaarVerified ? (
                        <span className="flex items-center gap-1.5 text-bss-green bg-bss-soft-green px-3 py-1.5 rounded-lg text-[13px] font-bold border border-bss-border"><CheckCircle size={16}/> Verified</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-bss-orange bg-bss-soft-orange px-3 py-1.5 rounded-lg text-[13px] font-bold border border-bss-border"><Clock size={16}/> Pending</span>
                      )}
                    </div>
                  </div>

                  {/* PAN */}
                  <div className="flex flex-col md:flex-row gap-4 p-5 rounded-2xl border border-bss-border bg-bss-bg/50">
                    <div className="w-12 h-12 bg-bss-soft-orange text-bss-orange rounded-full flex items-center justify-center shrink-0">
                      <FileText size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[15px] font-bold text-bss-text-primary">PAN Card Verification</h4>
                      <p className="text-[13px] text-bss-text-muted mb-3">Financial KYC details (NSDL).</p>
                      <p className="font-mono text-[15px] font-semibold uppercase text-bss-text-primary">{panDisplay || 'Not linked'}</p>
                      {(worker.identity.panHolderName || worker.identity.panVerified) && (
                        <p className="text-[13px] text-bss-text-secondary mt-1 inline-flex items-center gap-1.5">
                          <span className="text-bss-text-muted">Name:</span>
                          <span className="font-semibold">{worker.identity.panNameMatchesAadhaar ? (worker.identity.name || worker.identity.panHolderName) : (worker.identity.panHolderName || '—')}</span>
                          {worker.identity.panNameMatchesAadhaar && (
                            <span className="text-bss-green inline-flex" title="Matched with Aadhaar"><CheckCheck size={16}/></span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-start md:justify-end min-w-[140px]">
                      {worker.identity.panVerified ? (
                        <span className="flex items-center gap-1.5 text-bss-green bg-bss-soft-green px-3 py-1.5 rounded-lg text-[13px] font-bold border border-bss-border"><CheckCircle size={16}/> Verified</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-bss-orange bg-bss-soft-orange px-3 py-1.5 rounded-lg text-[13px] font-bold border border-bss-border"><Clock size={16}/> Pending</span>
                      )}
                    </div>
                  </div>

                  {/* UAN */}
                  <div className="flex flex-col md:flex-row gap-4 p-5 rounded-2xl border border-bss-border bg-bss-bg/50">
                    <div className="w-12 h-12 bg-bss-blue-tint text-bss-interactive-blue rounded-full flex items-center justify-center shrink-0">
                      <Database size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[15px] font-bold text-bss-text-primary">UAN Verification</h4>
                      <p className="text-[13px] text-bss-text-muted mb-3">EPFO Universal Account Number.</p>
                      <p className="font-mono text-[15px] font-semibold text-bss-text-primary">{uanDisplay || 'Not linked'}</p>
                    </div>
                    <div className="flex items-center justify-start md:justify-end min-w-[140px]">
                      {uanDisplay ? (
                        <span className="flex items-center gap-1.5 text-bss-green bg-bss-soft-green px-3 py-1.5 rounded-lg text-[13px] font-bold border border-bss-border"><CheckCircle size={16}/> On record</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-bss-orange bg-bss-soft-orange px-3 py-1.5 rounded-lg text-[13px] font-bold border border-bss-border"><Clock size={16}/> Pending</span>
                      )}
                    </div>
                  </div>

                  {/* Bank Account — from the verified banking record */}
                  <div className="flex flex-col md:flex-row gap-4 p-5 rounded-2xl border border-bss-border bg-bss-bg/50">
                    <div className="w-12 h-12 bg-bss-soft-green text-bss-green rounded-full flex items-center justify-center shrink-0">
                      <Building2 size={24} />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <h4 className="text-[15px] font-bold text-bss-text-primary">Bank Account (NPCI Penny Drop KYC)</h4>
                        <p className="text-[13px] text-bss-text-muted mt-0.5">Your salary account, verified via the NPCI bank verification API. Update details in the Banking tab.</p>
                      </div>
                      <div className="rounded-[14px] border border-bss-border bg-white p-4 space-y-4">
                        <p className="flex items-center justify-between gap-2 text-[13px] font-bold text-bss-text-primary"><span className="inline-flex items-center gap-1.5"><CheckCircle size={14} className="text-bss-green"/> {worker.banking.bankName || 'Bank account'}</span>{bankVerified ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-bss-green bg-bss-soft-green border border-bss-border rounded-lg px-2 py-1"><CheckCircle size={13}/> KYC Verified</span> : <span className="inline-flex items-center gap-1 text-[11px] font-bold text-bss-orange bg-bss-soft-orange border border-bss-border rounded-lg px-2 py-1"><Clock size={13}/> Pending</span>}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                          <div>
                            <label className="block text-[11px] font-bold text-bss-text-muted uppercase tracking-wider mb-1.5">Bank Account Number</label>
                            <input name="banking.accountNumber" type="password" defaultValue="" placeholder="Enter account number" className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-mono font-medium text-bss-text-primary focus:outline-none focus:border-[#0066CC]"/>
                            <p className="text-[10px] text-bss-text-muted mt-1">Current: {maskId(worker.banking.accountNumber, 4) || '—'} · re-enter to change</p>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-bss-text-muted uppercase tracking-wider mb-1.5">IFSC Code</label>
                            <input name="banking.ifsc" type="text" defaultValue={worker.banking.ifsc} className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-mono font-medium text-bss-text-primary uppercase focus:outline-none focus:border-[#0066CC]"/>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-bss-text-muted uppercase tracking-wider mb-1.5">Bank Name <span className="normal-case font-medium text-bss-text-muted">(auto-filled)</span></label>
                            <input readOnly value={worker.banking.bankName} placeholder="Fetched from IFSC" className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-3 py-2.5 text-[13px] font-medium text-bss-text-primary"/>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-bss-text-muted uppercase tracking-wider mb-1.5">Account Holder Name <span className="normal-case font-medium text-bss-text-muted">(from bank)</span></label>
                            <div className="relative">
                              <input readOnly value={worker.banking.holderName} placeholder="Fetched on verification" className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-3 py-2.5 pr-10 text-[13px] font-medium text-bss-text-primary"/>
                              {worker.banking.nameMatchesAadhaar && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-bss-green" title="Matches your Aadhaar name"><CheckCheck size={17}/></span>}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-bss-text-muted uppercase tracking-wider select-none mb-1.5">Branch <span className="normal-case font-medium text-bss-text-muted">(auto-filled)</span></label>
                            <input readOnly value={worker.banking.branch} placeholder="—" className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-3 py-2.5 text-[13px] font-medium text-bss-text-primary"/>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-bss-text-muted uppercase tracking-wider mb-1.5">UPI</label>
                            <p className="font-semibold text-bss-text-primary text-[13px]">{worker.banking.upiEnabled ? 'Enabled' : 'Not enabled'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button type="submit" disabled={isSaving} className="h-10 px-4 rounded-xl border border-[#073B67]/25 bg-white text-[#073B67] text-[13px] font-bold inline-flex items-center gap-2 hover:bg-[#073B67]/5 disabled:opacity-50">{isSaving ? 'Saving…' : 'Save details'}</button>
                          <button type="button" onClick={verifyBank} disabled={bankVerify.busy} className="h-10 px-4 rounded-xl bg-[#073B67] text-white text-[13px] font-bold inline-flex items-center gap-2 hover:bg-[#062D4F] disabled:opacity-50">{bankVerify.busy ? 'Verifying…' : 'Verify via Penny Drop (₹1)'}</button>
                        </div>
                        <p className="text-[11px] text-bss-text-muted">Enter your account number and IFSC — the bank name, branch and account-holder name are fetched from the bank for you. A ₹1 test credit confirms the account (NPCI, via Sandbox.co.in).</p>
                      </div>
                      {bankVerify.message && <p role="status" className="text-[12px] text-bss-green bg-bss-soft-green border border-bss-border rounded-lg px-3 py-2">{bankVerify.message}</p>}
                      {bankVerify.error && <p role="alert" className="text-[12px] text-bss-error bg-bss-soft-red border border-bss-border rounded-lg px-3 py-2">{bankVerify.error}</p>}
                    </div>
                  </div>

                  {/* DigiLocker — fetch issued documents */}
                  <div className="flex flex-col md:flex-row gap-4 p-5 rounded-2xl border border-bss-border bg-bss-bg/50">
                    <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center shrink-0">
                      <FileText size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[15px] font-bold text-bss-text-primary">DigiLocker — Fetch Issued Documents</h4>
                      <p className="text-[13px] text-bss-text-muted mb-3">Link your DigiLocker account to pull your government-issued documents (Aadhaar, PAN, certificates) into BSS.</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {([['Aadhaar', digilockerKinds.aadhaar], ['PAN', digilockerKinds.pan], ['EPFO / UAN', digilockerKinds.epfo]] as const).map(([label, ok]) => (
                          <span key={label} className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border ${ok ? 'text-bss-green bg-bss-soft-green border-bss-border' : 'text-bss-text-muted bg-white border-bss-border'}`}>
                            {ok ? <CheckCircle size={12}/> : <Clock size={12}/>} {label}
                          </span>
                        ))}
                      </div>
                      {digilockerStatus === 'linked' && !digilockerFetchError && (
                        <p className="text-[12px] text-bss-green font-semibold mb-2">DigiLocker linked — fetching documents…</p>
                      )}
                      {digilockerStatus === 'error' && digilockerMessage && (
                        <p className="text-[12px] text-[#FF3B30] font-semibold mb-2">{digilockerMessage}</p>
                      )}
                      {!digilockerDocs.length && digilockerErrorText && (
                        <p className="text-[12px] text-[#B45309] bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-2">{digilockerErrorText}</p>
                      )}
                      {digilockerDocs.length > 0 ? (
                        <div className="space-y-2 mt-2">
                          {digilockerDocs.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-bss-border bg-white px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-bss-text-primary truncate">{doc.doctype || 'Document'}</p>
                                <p className="text-[11px] text-bss-text-muted truncate">{[doc.issuer, doc.doc_date].filter(Boolean).join(' · ')}</p>
                                {(doc.downloaded_at || doc.created_at) && <p className="text-[10px] text-bss-text-muted">Fetched {new Date((doc.downloaded_at || doc.created_at) as string).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {doc.file_url && <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-sky-700 hover:underline">View</a>}
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${doc.status === 'DOWNLOADED' ? 'bg-green-100 text-bss-green' : 'bg-orange-100 text-[#F47A32]'}`}>{doc.status || '—'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : !digilockerErrorText ? (
                        <p className="text-[12px] text-bss-text-muted">No DigiLocker documents fetched yet.</p>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-start md:justify-end min-w-[140px]">
                      <button type="button" onClick={linkDigiLocker} disabled={digilockerStatus === 'linking'} className="bg-sky-600 text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:bg-sky-700 flex items-center gap-2 disabled:opacity-60">
                        {digilockerStatus === 'linking' ? <RefreshCw size={16} className="animate-spin" /> : 'Link DigiLocker'}
                      </button>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>
          )}

          {/* ACTION FOOTER */}
          <div className="mt-10 flex justify-end">
            <button 
              type="submit" 
              disabled={isSaving || (activeTab === 'personal' ? !personalDirty : !dirty)}
              title={(activeTab === 'personal' ? personalDirty : dirty) ? undefined : 'Make a change to enable saving'}
              className="bg-bss-navy hover:bg-bss-deep-navy text-white px-8 py-3 rounded-full font-bold text-[14px] shadow-sm transition-all flex justify-center items-center gap-2 min-w-[160px] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>Updating Persona...</>
              ) : (
                <><Save size={18} /> Save Persona</>
              )}
            </button>
          </div>

        </form>
        </div>
      </div>

      {/* Certificate modal */}
      {activeCert && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setActiveCert(null)}>
          <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-bss-border" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-bss-border bg-bss-bg no-print">
              <h2 className="text-sm font-bold text-bss-text-primary">Official BSS Skill Certificate</h2>
              <button onClick={() => setActiveCert(null)} className="w-8 h-8 grid place-items-center rounded-full hover:bg-bss-bg"><X size={16}/></button>
            </div>
            <div className="p-8 text-center bg-gradient-to-b from-white to-blue-50/30 border-b border-bss-border" id="bss-certificate-print-area">
              <div className="w-20 h-20 rounded-2xl bg-[#073B67] text-white flex items-center justify-center mx-auto shadow-md"><Award size={40}/></div>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#073B67] mt-5">Bharat Shram Setu National Skill Registry</p>
              <h3 className="text-2xl font-extrabold text-bss-text-primary mt-2">{activeCert.name}</h3>
              <p className="text-xs text-bss-text-secondary mt-3">This official certificate is proudly awarded to</p>
              <p className="text-xl font-extrabold text-[#073B67] mt-1">{worker.identity.name}</p>
              <p className="text-xs text-bss-text-muted mt-1">BSS ID: <span className="font-mono font-semibold">{worker.identity.bssId}</span></p>
              <div className="my-6 pt-5 border-t border-bss-border/80 max-w-md mx-auto grid grid-cols-2 gap-4 text-left bg-white p-5 rounded-xl border border-bss-border shadow-sm">
                <div><p className="text-[10px] text-bss-text-muted font-bold uppercase tracking-wider">Issued By</p><p className="text-xs font-semibold text-bss-text-primary mt-0.5">{activeCert.authority}</p></div>
                <div><p className="text-[10px] text-bss-text-muted font-bold uppercase tracking-wider">Validity</p><p className="text-xs font-semibold text-bss-text-primary mt-0.5">{activeCert.expiry}</p></div>
                <div><p className="text-[10px] text-bss-text-muted font-bold uppercase tracking-wider">Certificate No.</p><p className="text-xs font-mono font-semibold text-[#073B67] mt-0.5">{activeCert.number}</p></div>
                <div><p className="text-[10px] text-bss-text-muted font-bold uppercase tracking-wider">Verified Skill</p><p className="text-xs font-semibold text-bss-green mt-0.5">{activeCert.name}</p></div>
              </div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-green-800 bg-green-100/80 border border-green-200 px-4 py-1.5 rounded-full"><CheckCircle size={14}/>Cryptographically Verified on BSS Trust Registry</div>
            </div>
            <div className="px-6 py-4 border-t border-bss-border flex gap-3 bg-bss-bg no-print">
              <button onClick={() => window.print()} className="flex-1 h-10 rounded-xl bg-[#073B67] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#062D4F] transition-colors"><Upload size={15} className="rotate-180"/>Print / Save PDF Certificate</button>
              <button onClick={() => setActiveCert(null)} className="h-10 px-5 rounded-xl border border-bss-border text-xs font-bold text-bss-text-secondary hover:bg-bss-bg">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
