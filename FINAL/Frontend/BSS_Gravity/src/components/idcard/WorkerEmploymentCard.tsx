"use client";

import React, { useRef, useState } from "react";
import { Download, Printer, X, ShieldCheck, UserRound } from "lucide-react";
import WorkerQr from "@/components/qr/WorkerQr";

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
  siteAddress?: string;
  supervisorName?: string;
  supervisorContact?: string;
  emergencyName?: string;
  emergencyNumber?: string;
  emergencyRelation?: string;
  bloodGroup?: string;
  issueDate?: string;
  validTill?: string;
  onClose?: () => void;
};

export default function WorkerEmploymentCard({
  companyName = "ADANI INFRA PVT LTD",
  workerName = "RAMESH KUMAR",
  designation = "Mason",
  bssId = "BSS-W9MQKMHMQYKU",
  mobile = "—",
  uan = "—",
  esic = "—",
  department = "Civil Works",
  campNo = "Skilled",
  routeBusNo = "—",
  photoUrl,
  contractorName = "BuildWell Contractors Pvt Ltd",
  contractorId = "BSS-C0000000004",
  contractorContact = "4444444444",
  contractorEmail = "",
  siteName = "Demo Metro Site",
  siteId = "DEMO-SITE-001",
  siteAddress = "Sector 21, Navi Mumbai",
  supervisorName = "Site Supervisor",
  supervisorContact = "—",
  emergencyName = "Family Contact",
  emergencyNumber = "—",
  emergencyRelation = "Relative",
  bloodGroup = "O+",
  issueDate = "29/06/2023",
  validTill = "29/06/2028",
  onClose,
}: EmploymentCardProps) {
  const [isExporting, setIsExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
              <h2 className="text-lg font-bold text-white">Official Worker Employment Card</h2>
              <p className="text-xs text-slate-400">Official Formal Employment Credential</p>
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
        <div className="bg-[#d5d8dc] p-8 rounded-xl overflow-x-auto flex justify-center" ref={containerRef}>
          <div className="cards flex gap-8 items-stretch justify-center flex-wrap">
            
            {/* FRONT SIDE */}
            <section className="card">
              {/* Construction Watermark */}
              <img aria-hidden="true" src="/login-bg.jpg" className="watermark-bg" alt="" />

              <div className="front-header">
                <div className="card-title">EMPLOYMENT CARD</div>
                <div className="company-name">{companyName}</div>

                {/* 3-Color Line */}
                <div className="tricolor-bar">
                  <div className="stripe orange" />
                  <div className="stripe white" />
                  <div className="stripe green" />
                </div>
              </div>

              <div className="front-body">
                {/* Photo */}
                <div className="photo-frame">
                  {photoUrl && photoUrl !== "/worker-profile.png" ? (
                    <img src={photoUrl} alt={workerName} className="photo-img" />
                  ) : (
                    <div className="photo-placeholder">
                      <UserRound size={52} className="text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Worker Name & Role Badge */}
                <div className="worker-name">{workerName.toUpperCase()}</div>
                <div className="role-pill">{designation}</div>

                {/* Info Grid */}
                <div className="info-grid">
                  <div className="grid-left">
                    <div className="field">
                      <label>BSS ID</label>
                      <strong className="mono">{bssId}</strong>
                    </div>
                    <div className="field">
                      <label>UAN NO.</label>
                      <strong>{uan}</strong>
                    </div>
                    <div className="field">
                      <label>ESIC NO.</label>
                      <strong>{esic}</strong>
                    </div>
                    <div className="field">
                      <label>CAMP NO.</label>
                      <strong>{campNo}</strong>
                    </div>
                    <div className="field">
                      <label>ROUTE/BUS NO.</label>
                      <strong>{routeBusNo}</strong>
                    </div>
                  </div>

                  <div className="grid-right">
                    <div className="field">
                      <label>MOBILE NUMBER</label>
                      <strong>{mobile}</strong>
                    </div>
                    <div className="field">
                      <label>DEPARTMENT</label>
                      <strong>{department}</strong>
                    </div>

                    {/* QR Code */}
                    <div className="qr-container relative">
                      <WorkerQr bssId={bssId} size={220} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Front Footer */}
              <div className="front-footer">
                <span>✓ Verified Worker</span>
                <span className="divider">|</span>
                <span><span style={{ color: "#38bdf8" }}>👤</span> Formal Employment</span>
                <span className="divider">|</span>
                <span><span style={{ color: "#fbbf24" }}>↗</span> Better Opportunities</span>
              </div>
            </section>

            {/* BACK SIDE */}
            <section className="card">
              {/* Construction Watermark */}
              <img aria-hidden="true" src="/login-bg.jpg" className="watermark-bg" alt="" />

              {/* Back header — tricolour strip only (matches the worker ID card; no E-SHRAM/BOCW) */}
              <div className="tricolor-bar">
                <div className="stripe orange" />
                <div className="stripe white" />
                <div className="stripe green" />
              </div>

              <div className="back-body">
                {/* Contractor Details */}
                <div className="info-card">
                  <h3 className="card-heading">Contractor Details</h3>
                  <div className="card-main-text">{contractorName}</div>
                  <div className="card-sub-row">
                    <span>Contractor ID: <b>{contractorId}</b></span>
                    <span>Contact: <b>{contractorContact}</b></span>
                  </div>
                </div>

                {/* Site Details */}
                <div className="info-card">
                  <h3 className="card-heading">Site Details</h3>
                  <div className="card-main-text">{siteName}</div>
                  <div className="card-sub-row">
                    <span>{siteAddress}</span>
                    <span>Site ID: <b>{siteId}</b></span>
                  </div>
                </div>

                {/* Supervisor Detail */}
                <div className="info-card">
                  <h3 className="card-heading">Supervisor Detail</h3>
                  <div className="card-main-text">{supervisorName}</div>
                  <div className="card-sub-row">
                    <span>Contact No.: <b>{supervisorContact}</b></span>
                  </div>
                </div>

                {/* Emergency & Blood Group */}
                <div className="emergency-grid">
                  <div className="red-card emergency-box">
                    <div className="red-heading">☎ EMERGENCY CONTACT</div>
                    <div className="red-line">Name: <b>{emergencyName}</b></div>
                    <div className="red-line">Number: <b>{emergencyNumber}</b></div>
                    <div className="red-line">Relation: <b>{emergencyRelation}</b></div>
                  </div>

                  <div className="red-card blood-box">
                    <div className="red-heading">♦ BLOOD GROUP</div>
                    <div className="blood-badge">{bloodGroup}</div>
                    <div className="blood-sub font-normal">In case of emergency please contact</div>
                  </div>
                </div>

                {/* Notice Box */}
                <div className="notice-box">
                  <p>• This identity card must always be carried & displayed for security & identification.</p>
                  <p>• Loss or theft of this card should be reported to the Contractor — <b>{contractorName}</b>{contractorEmail ? <> · <b>{contractorEmail}</b></> : null}{contractorContact ? <> · <b>{contractorContact}</b></> : null}.</p>
                  <p>• This card is not transferable & must be returned immediately on cessation of employment.</p>
                </div>

                {/* Dates */}
                <div className="dates-row">
                  <div>
                    <span className="date-label">Issue Date</span>
                    <div className="date-value">{issueDate}</div>
                  </div>
                  <div className="text-right">
                    <span className="date-label">Valid Till</span>
                    <div className="date-value">{validTill}</div>
                  </div>
                </div>
              </div>

              {/* Back Footer */}
              <div className="back-footer">
                This card is the property of the issuing organisation. Misuse is punishable under applicable laws.
              </div>
            </section>

          </div>
        </div>

        {/* Scoped CSS styling */}
        <style jsx>{`
          .cards {
            display: flex;
            gap: 40px;
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

          .watermark-bg {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center bottom;
            opacity: 0.22;
            pointer-events: none;
            z-index: 0;
          }

          /* FRONT HEADER */
          .front-header {
            background: #07182b;
            color: #ffffff;
            text-align: center;
            padding: 12px 16px 0;
            position: relative;
            z-index: 1;
          }

          .card-title {
            font-size: 15px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: 1.5px;
            text-transform: uppercase;
          }

          .company-name {
            font-size: 10.5px;
            font-weight: 700;
            color: #cbd5e1;
            margin: 4px 0 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .tricolor-bar {
            display: flex;
            height: 4px;
            width: 100%;
          }

          .stripe { flex: 1; }
          .stripe.orange { background: #ff9933; }
          .stripe.white { background: #ffffff; }
          .stripe.green { background: #138808; }

          /* FRONT BODY */
          .front-body {
            padding: 14px 20px 42px;
            flex: 1;
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
          }

          .photo-frame {
            width: 120px;
            height: 134px;
            margin: 0 auto 6px;
            border: 2px solid #cbd5e1;
            border-radius: 12px;
            overflow: hidden;
            background: #f1f5f9;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          }

          .photo-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .photo-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .worker-name {
            text-align: center;
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 0.2px;
            margin-top: 2px;
          }

          .role-pill {
            width: fit-content;
            margin: 4px auto 14px;
            padding: 2px 14px;
            border: 1px solid #34d399;
            border-radius: 20px;
            background: #ecfdf5;
            color: #047857;
            font-size: 11px;
            font-weight: 700;
          }

          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            font-size: 10px;
          }

          .grid-left, .grid-right {
            display: flex;
            flex-direction: column;
            gap: 7px;
          }

          .field label {
            display: block;
            color: #64748b;
            font-weight: 700;
            font-size: 8.5px;
            letter-spacing: 0.3px;
            margin-bottom: 1px;
          }

          .field strong {
            display: block;
            color: #0f172a;
            font-size: 11.5px;
            font-weight: 800;
            letter-spacing: 0.1px;
          }

          .field strong.mono {
            font-family: monospace;
          }

          .qr-container {
            width: 96px;
            height: 96px;
            background: #ffffff;
            padding: 4px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 4px;
          }

          /* FOOTERS */
          .front-footer, .back-footer {
            height: 32px;
            background: #07182b;
            color: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 8.5px;
            font-weight: 700;
            letter-spacing: 0.4px;
            position: relative;
            z-index: 2;
            gap: 12px;
          }

          .divider {
            color: rgba(255, 255, 255, 0.3);
          }

          /* BACK SIDE */
          .back-top {
            height: 42px;
            background: #050505;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 22px;
            font-weight: 800;
            font-size: 15px;
            letter-spacing: 0.5px;
            font-family: monospace;
            z-index: 1;
          }

          .back-body {
            padding: 12px 14px 40px;
            flex: 1;
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            gap: 7px;
          }

          .info-card {
            border: 1px solid #cbd5e1;
            border-left: 3px solid #153c71;
            background: #ffffff;
            padding: 7px 9px;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          }

          .card-heading {
            margin: 0 0 2px;
            color: #153c71;
            font-size: 11px;
            font-weight: 800;
          }

          .card-main-text {
            font-size: 10.5px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 2px;
          }

          .card-sub-row {
            display: flex;
            justify-content: space-between;
            font-size: 8.5px;
            color: #475569;
          }

          .card-sub-row b {
            color: #0f172a;
          }

          .emergency-grid {
            display: grid;
            grid-template-columns: 1.25fr 0.9fr;
            gap: 8px;
            margin-top: 2px;
          }

          .red-card {
            border-radius: 8px;
            background: #fff3f3;
            border: 1px solid #fecdd3;
            border-left: 3px solid #e11d48;
            padding: 7px 8px;
            position: relative;
          }

          .red-heading {
            color: #e11d48;
            font-size: 8.5px;
            font-weight: 800;
            margin-bottom: 4px;
          }

          .red-line {
            font-size: 8px;
            color: #334155;
            margin-bottom: 1px;
          }

          .red-line b {
            color: #0f172a;
          }

          .blood-badge {
            position: absolute;
            top: 6px;
            right: 8px;
            font-size: 18px;
            font-weight: 900;
            color: #e11d48;
          }

          .blood-sub {
            font-size: 7.5px;
            color: #64748b;
            margin-top: 18px;
            line-height: 1.2;
          }

          .notice-box {
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 7px 9px;
            font-size: 8px;
            line-height: 1.4;
            color: #475569;
          }

          .notice-box p {
            margin: 0;
          }

          .dates-row {
            display: flex;
            justify-content: space-between;
            font-size: 8.5px;
            padding: 0 4px;
            margin-top: auto;
          }

          .date-label {
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 8px;
          }

          .date-value {
            font-size: 11px;
            font-weight: 800;
            color: #0f172a;
            font-family: monospace;
          }

          .back-footer {
            font-size: 7.5px;
            padding: 0 10px;
            text-align: center;
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
