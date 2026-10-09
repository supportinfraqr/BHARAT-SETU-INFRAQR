"use client";

import React, { useRef, useState } from "react";
import { Download, Printer, X, ShieldCheck, UserRound } from "lucide-react";
import WorkerQr from "@/components/qr/WorkerQr";
import { formatCardDate } from "@/lib/cardDate";

export type EmploymentCardProps = {
  companyName?: string;
  companySub?: string;
  workerName: string;
  designation?: string;
  bssId: string;
  mobile?: string;
  uan?: string;
  esic?: string;
  department?: string;
  campNo?: string;
  routeBusNo?: string;
  photoUrl?: string;
  contractorName?: string;
  contractorId?: string;
  contractorContact?: string;
  contractorEmail?: string;
  siteName?: string;
  siteId?: string;
  siteCode?: string;
  siteAddress?: string;
  supervisorName?: string;
  supervisorContact?: string;
  emergencyName?: string;
  emergencyNumber?: string;
  emergencyRelation?: string;
  bloodGroup?: string;
  issueDate?: string;
  validTill?: string;
  /** Site colour for the card header (defaults to the BSS site orange). */
  siteColour?: string;
  /** Optional diagonal watermark (e.g. "EXPIRED") drawn over the cards. */
  watermark?: string;
  onClose?: () => void;
};

export default function WorkerEmploymentCard({
  companyName = "—",
  workerName = "",
  designation = "Mason",
  bssId = "",
  mobile = "—",
  uan = "—",
  esic = "—",
  department = "Civil Works",
  campNo = "Skilled",
  routeBusNo = "—",
  photoUrl,
  contractorName = "—",
  contractorId = "—",
  contractorContact = "—",
  contractorEmail = "",
  siteName = "—",
  siteId = "—",
  siteCode,
  siteAddress = "—",
  supervisorName = "—",
  supervisorContact = "—",
  emergencyName = "—",
  emergencyNumber = "—",
  emergencyRelation = "—",
  bloodGroup = "—",
  issueDate,
  validTill,
  siteColour = "#F47A32",
  watermark,
  onClose,
}: EmploymentCardProps) {
  const [isExporting, setIsExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Real issue/validity dates come from the worker's employment record; fall
  // back to a 3-year window (issue = today, valid = issue + 3 years). Every
  // date is rendered day-month-year (e.g. "09 Oct 2026").
  const parseCardDate = (v?: string) => {
    if (!v) return null;
    const parsed = new Date(v);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const issueDateObj = parseCardDate(issueDate) ?? new Date();
  const validDateObj = parseCardDate(validTill) ?? (() => {
    const d = new Date(issueDateObj);
    d.setFullYear(d.getFullYear() + 3);
    return d;
  })();
  const resolvedIssue = formatCardDate(issueDateObj);
  const resolvedValid = formatCardDate(validDateObj);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!containerRef.current || isExporting) return;
    setIsExporting(true);
    try {
      await document.fonts.ready;
      const [{ toPng }, { jsPDF }] = await Promise.all([
        import("html-to-image"),
        import("jspdf"),
      ]);

      const cards = containerRef.current.querySelectorAll<HTMLElement>(".card");
      if (cards.length < 2) return;

      const frontImg = await toPng(cards[0], { pixelRatio: 3, cacheBust: true });
      const backImg = await toPng(cards[1], { pixelRatio: 3, cacheBust: true });

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      pdf.setProperties({
        title: `Employment Card - ${workerName} - ${bssId}`,
      });

      pdf.addImage(frontImg, "PNG", 20, 20, 80, 120);
      pdf.addImage(backImg, "PNG", 110, 20, 80, 120);
      pdf.save(`Employment_Card_${bssId}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl max-w-4xl w-full p-6 text-slate-100 relative my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Worker Employment Card</h2>
              <p className="text-xs text-slate-400">Formal Employment Credential</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer size={15} /> Print Card
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Download size={15} /> {isExporting ? "Generating..." : "Download PDF"}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="w-9 h-9 grid place-items-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Card Viewport / Printable Container */}
        <div className="bg-[#d5d8dc] p-6 rounded-xl overflow-x-auto flex justify-center" ref={containerRef}>
          <div className="cards flex gap-8 items-stretch justify-center flex-wrap w-fit mx-auto">

            {/* FRONT SIDE */}
            <section className="card">
              <img aria-hidden="true" src="/login-bg.jpg" className="absolute z-0 inset-0 w-full h-full object-cover object-bottom opacity-[0.22] pointer-events-none" alt="" />

              {/* Coloured header — linked site colour */}
              <div className="text-white text-center pt-3 px-4 pb-0 relative z-10" style={{ background: siteColour }}>
                <div className="mb-1.5">
                  <div className="text-[13px] font-extrabold leading-tight tracking-tight">{companyName}</div>
                  <div className="text-[9px] font-mono font-bold text-white/90 tracking-[0.08em] mt-0.5">{siteCode || siteId || siteName || "—"}</div>
                </div>
                <div className="flex h-[4px] w-full">
                  <div className="flex-1 bg-[#FF9933]" />
                  <div className="flex-1 bg-white" />
                  <div className="flex-1 bg-[#138808]" />
                </div>
              </div>

              {/* Front Body */}
              <div className="p-4 pt-3.5 pb-10 flex-1 relative z-10 flex flex-col">
                <div className="w-[120px] h-[134px] mx-auto mb-1.5 border-2 border-slate-300 rounded-xl overflow-hidden bg-slate-100 shadow-xs flex items-center justify-center">
                  {photoUrl && photoUrl !== "/worker-profile.png" ? (
                    <img src={photoUrl} alt={workerName} className="w-full h-full object-cover" />
                  ) : (
                    <UserRound size={52} className="text-slate-400" />
                  )}
                </div>

                <div className="text-center text-[15px] font-extrabold text-slate-900 tracking-wide mt-0.5">{workerName.toUpperCase()}</div>
                <div className="w-fit mx-auto my-1 px-3.5 py-0.5 border border-emerald-400 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold">{designation || "Mason"}</div>

                <div className="grid grid-cols-2 gap-3 text-[10px] mt-2">
                  <div className="flex flex-col gap-1.5">
                    <div>
                      <label className="block text-[#64748B] font-bold text-[8.5px] tracking-wider mb-0.5">BSS ID</label>
                      <strong className="block text-[#0F172A] text-[11.5px] font-extrabold font-mono">{bssId}</strong>
                    </div>
                    <div>
                      <label className="block text-[#64748B] font-bold text-[8.5px] tracking-wider mb-0.5">UAN NO.</label>
                      <strong className="block text-[#0F172A] text-[11.5px] font-extrabold">{uan || "—"}</strong>
                    </div>
                    <div>
                      <label className="block text-[#64748B] font-bold text-[8.5px] tracking-wider mb-0.5">ESIC NO.</label>
                      <strong className="block text-[#0F172A] text-[11.5px] font-extrabold">{esic || "—"}</strong>
                    </div>
                    <div>
                      <label className="block text-[#64748B] font-bold text-[8.5px] tracking-wider mb-0.5">CAMP NO.</label>
                      <strong className="block text-[#0F172A] text-[11.5px] font-extrabold">{campNo || "Skilled"}</strong>
                    </div>
                    <div>
                      <label className="block text-[#64748B] font-bold text-[8.5px] tracking-wider mb-0.5">ROUTE/BUS NO.</label>
                      <strong className="block text-[#0F172A] text-[11.5px] font-extrabold">{routeBusNo || "—"}</strong>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div>
                      <label className="block text-[#64748B] font-bold text-[8.5px] tracking-wider mb-0.5">MOBILE NUMBER</label>
                      <strong className="block text-[#0F172A] text-[11.5px] font-extrabold">{mobile || "—"}</strong>
                    </div>
                    <div>
                      <label className="block text-[#64748B] font-bold text-[8.5px] tracking-wider mb-0.5">DEPARTMENT</label>
                      <strong className="block text-[#0F172A] text-[11.5px] font-extrabold">{department || "Civil Works"}</strong>
                    </div>
                    <div className="relative w-[96px] h-[96px] bg-white p-1 rounded-lg border border-slate-300 shadow-xs flex items-center justify-center mt-1">
                      <WorkerQr bssId={bssId} size={220} />
                      <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="w-[26px] h-[26px] bg-white rounded-full grid place-items-center shadow-md border border-blue-900/30 p-[2px]">
                          <img src="/bss-original-logo.png" alt="" className="w-full h-full object-contain rounded-full" />
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Front Footer */}
              <div className="absolute left-0 right-0 bottom-0 h-[32px] bg-[#07182b] text-white flex justify-center items-center text-[8.5px] font-bold tracking-wider gap-3 z-20">
                <span>✓ Verified Worker</span>
                <span className="text-white/30">|</span>
                <span><span className="text-sky-400">👤</span> Formal Employment</span>
                <span className="text-white/30">|</span>
                <span><span className="text-amber-400">↗</span> Better Opportunities</span>
              </div>
            </section>

            {/* BACK SIDE */}
            <section className="card">
              <img aria-hidden="true" src="/login-bg.jpg" className="absolute z-0 inset-0 w-full h-full object-cover object-bottom opacity-[0.22] pointer-events-none" alt="" />

              <div aria-hidden="true" className="relative z-20 h-2 w-full shrink-0" style={{ background: siteColour }} />
              <div className="relative z-10 flex h-[4px] w-full shrink-0">
                <div className="flex-1 bg-[#FF9933]" />
                <div className="flex-1 bg-white" />
                <div className="flex-1 bg-[#138808]" />
              </div>

              <div className="p-3 pb-10 flex-1 relative z-10 flex flex-col gap-1.5">
                {/* Contractor Section */}
                <div className="border border-slate-300 border-l-[3px] border-l-[#153C71] bg-white p-2 rounded-md shadow-2xs">
                  <h3 className="m-0 text-[#153C71] text-[11px] font-extrabold mb-0.5">Contractor Details</h3>
                  <div className="text-[10.5px] font-extrabold text-slate-900">{contractorName || "—"}</div>
                  <div className="flex flex-wrap justify-between items-center text-slate-600 text-[8.5px] mt-0.5 gap-x-2">
                    <span>Contractor ID: <b className="text-slate-900">{contractorId || "—"}</b></span>
                    <span>Contact: <b className="text-slate-900">{contractorContact || "—"}</b></span>
                    {contractorEmail ? <span>Email: <b className="text-slate-900">{contractorEmail}</b></span> : null}
                  </div>
                </div>

                {/* Site Section */}
                <div className="border border-slate-300 border-l-[3px] border-l-[#153C71] bg-white p-2 rounded-md shadow-2xs">
                  <h3 className="m-0 text-[#153C71] text-[11px] font-extrabold mb-0.5">Site Details</h3>
                  <div className="text-[10.5px] font-extrabold text-slate-900">{siteName || "—"}</div>
                  <div className="flex justify-between items-center text-slate-600 text-[8.5px] mt-0.5">
                    <span>{siteAddress || "—"}</span>
                    <span>Site ID: <b className="text-slate-900">{siteCode || siteId || "—"}</b></span>
                  </div>
                </div>

                {/* Supervisor Section */}
                <div className="border border-slate-300 border-l-[3px] border-l-[#153C71] bg-white p-2 rounded-md shadow-2xs">
                  <h3 className="m-0 text-[#153C71] text-[11px] font-extrabold mb-0.5">Supervisor Detail</h3>
                  <div className="text-[10.5px] font-extrabold text-slate-900">{supervisorName || "—"}</div>
                  <div className="text-slate-600 text-[8.5px] mt-0.5">
                    <span>Contact No.: <b className="text-slate-900">{supervisorContact || "—"}</b></span>
                  </div>
                </div>

                {/* Emergency & Blood Group */}
                <div className="grid grid-cols-2 gap-2 my-0.5">
                  <div className="bg-[#FFF3F3] border border-rose-200 border-l-[3px] border-l-rose-600 p-2 rounded-lg text-[8px] relative">
                    <div className="text-rose-600 font-extrabold text-[8.5px] mb-1">☎ EMERGENCY CONTACT</div>
                    <div className="text-slate-700">Name: <b className="text-slate-900">{emergencyName || "—"}</b></div>
                    <div className="text-slate-700">Number: <b className="text-slate-900">{emergencyNumber || "—"}</b></div>
                    <div className="text-slate-700">Relation: <b className="text-slate-900">{emergencyRelation || "—"}</b></div>
                  </div>

                  <div className="bg-[#FFF3F3] border border-rose-200 border-l-[3px] border-l-rose-600 p-2 rounded-lg text-[8px] relative">
                    <div className="text-rose-600 font-extrabold text-[8.5px] mb-1">♦ BLOOD GROUP</div>
                    <span className="absolute top-1.5 right-2 text-[18px] font-black text-rose-600">{bloodGroup || "—"}</span>
                    <div className="text-slate-500 text-[7.5px] mt-4">In case of emergency please contact</div>
                  </div>
                </div>

                {/* Notice Container */}
                <div className="mt-auto bg-[#F1F5F9] border border-slate-200 p-2 rounded-lg text-[8px] leading-snug text-slate-600 space-y-0.5">
                  <p className="m-0">• This employment card must always be carried &amp; displayed for security &amp; identification.</p>
                  <p className="m-0">• Loss or theft of this card should be reported immediately to the Contractor — <b>{contractorName || "—"}</b>{contractorContact ? <> · <b>{contractorContact}</b></> : null}{contractorEmail ? <> · <b>{contractorEmail}</b></> : null}.</p>
                  <p className="m-0">• This card is not transferable &amp; must be returned immediately on cessation of employment.</p>
                </div>

                {/* Issue & Validity Dates */}
                <div className="flex justify-between items-center text-[8.5px] px-1">
                  <div>
                    <span className="text-slate-500 font-bold uppercase text-[8px]">Issue Date</span>
                    <strong className="block text-[11px] font-extrabold font-mono text-slate-900">{resolvedIssue}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 font-bold uppercase text-[8px]">Valid Till</span>
                    <strong className="block text-[11px] font-extrabold font-mono text-slate-900">{resolvedValid}</strong>
                  </div>
                </div>
              </div>

              {/* Back Footer */}
              <div className="absolute left-0 right-0 bottom-0 h-[32px] bg-[#07182b] text-white flex items-center justify-center text-[7.5px] font-bold tracking-wider z-20 px-2 text-center">
                This card is the property of the issuing organisation. Misuse is punishable under applicable laws.
              </div>
            </section>

          </div>
        </div>

        {watermark && (
          <div aria-hidden className="pointer-events-none absolute inset-0 z-30 grid place-items-center overflow-hidden">
            <span className="text-[72px] font-black uppercase tracking-[0.35em] text-red-500/15 -rotate-[24deg] whitespace-nowrap">{watermark}</span>
          </div>
        )}

        {/* Scoped CSS (print + card frame) */}
        <style jsx>{`
          .cards {
            display: flex;
            gap: 32px;
            align-items: stretch;
            justify-content: center;
            flex-wrap: wrap;
          }

          .card {
            width: 374px;
            min-height: 560px;
            height: auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            position: relative;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
            border: 1px solid #cbd5e1;
            color: #0f172a;
            font-family: Arial, Helvetica, sans-serif;
            text-align: left;
            display: flex;
            flex-direction: column;
          }

          @media print {
            body * {
              visibility: hidden;
            }
            .cards, .cards * {
              visibility: visible;
            }
            .cards {
              position: absolute;
              left: 0;
              top: 0;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
