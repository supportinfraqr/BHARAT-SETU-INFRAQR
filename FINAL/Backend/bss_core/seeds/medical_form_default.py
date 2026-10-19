# -*- coding: utf-8 -*-
# GENERATED — default occupational health-examination form (Gazette Form-VIII / Form-IX)
# HTML replica, seeded as the Central MedicalFormTemplate. Author per state in the studio.

MEDICAL_FORM_HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FORM-VIII / FORM-IX — Health Examination</title>
<style>
  @page { size: 11in 8.5in; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { background: #e6e9ee; font-family: "Times New Roman", Times, "Liberation Serif", serif; color: #000; font-size: 12pt; line-height: 1.3; }
  .page { position: relative; width: 11in; height: 8.5in; margin: 18px auto; background: #fff; padding: 0.42in 1.0in 0.45in 1.0in; box-shadow: 0 2px 10px rgba(0,0,0,.18); overflow: hidden; }
  .rh { display: flex; justify-content: space-between; align-items: baseline; font-size: 10.5pt; padding-bottom: 3px; border-bottom: 3.5px double #000; margin-bottom: 30px; }
  .rh .mid { flex: 1; text-align: center; }
  .rh .sc { font-variant: small-caps; }
  .rh .hi { font-family: "Noto Sans Devanagari", "Mangal", "Lohit Devanagari", serif; font-size: 9.5pt; }
  .center { text-align: center; }
  .b { font-weight: bold; }
  .u { text-decoration: underline; }
  p { margin: 0 0 17px; }
  .tight p { margin-bottom: 2px; }
  .dash { border-top: 1px dashed #000; margin: 10px 0 14px; width: 92%; }
  .sigrow { display: flex; justify-content: space-between; margin: 4px 0 0; }
  .sigrow span:last-child { margin-right: 1.2in; }
  .photo { position: absolute; right: 0.95in; top: 1.08in; width: 1.53in; height: 1.33in; border: 1.6px solid #1f2d4d; }
  .photo span { position: absolute; left: 13px; top: 15px; font-size: 9.5pt; font-family: Arial, sans-serif; border: 1px solid #555; padding: 2px 30px 2px 4px; }
  .photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  ol.alpha, ul.plain { margin: 0; padding: 0; list-style: none; }
  .ind1 { padding-left: 0.45in; }
  .ind2 { padding-left: 0.8in; }
  .ind3 { padding-left: 1.15in; }
  .row { display: flex; gap: 10px; }
  .row .k { min-width: 0.34in; }
  table.g { border-collapse: collapse; font-size: 11pt; }
  table.g td, table.g th { border: 1px solid #000; padding: 1px 5px; vertical-align: top; text-align: left; font-weight: normal; }
  .std { font-size: 11.4pt; line-height: 1.3; text-align: justify; }
  .std ol { margin: 0; padding-left: 0.62in; }
  .std li { padding-left: 0.08in; }
  .std li { margin-bottom: 4px; }
  .std .sub { padding-left: 0.1in; }
  .std .sub p { margin-bottom: 12px; }
  .vtab td { padding: 0 0 0 0; }
  .vtab td:first-child { width: 1.25in; }
  /* Fill-in slot: dotted leader by default; recorded values print in ink blue. */
  .f { white-space: pre-wrap; }
  .f.filled { color: #0b2a6b; font-family: "Courier New", Courier, monospace; font-size: 10.5pt; font-weight: bold; border-bottom: 1px dotted #0b2a6b; padding: 0 3px; }
  .note-annex { font-size: 9pt; }
  @media print {
    body { background: #fff; }
    .page { margin: 0; box-shadow: none; page-break-after: always; break-after: page; }
  }
</style>
</head>
<body>

<!-- ======================= FORM-VIII ======================= -->
<section data-form="VIII">

<div class="page" data-page="256">
  <div class="rh"><span>256</span><span class="mid">THE GAZETTE OF INDIA : EXTRAORDINARY</span><span class="sc">[Part II—Sec. 3(i)]</span></div>

  <div class="center" style="margin-top:4px;margin-bottom:14px;">
    <div class="b">FORM-VIII</div>
    <div class="b">(See rule 5(2))</div>
    <div>HEALTH EXAMINATION</div>
    <div>(Except mine employees)</div>
  </div>
  <div class="photo"><span>photo</span><span class="f" style="display:none"></span></div>

  <p class="b u" style="margin-bottom:3px;">PART –A (Sl.No.1-11) : To be filled by the Employee:</p>
  <p>1. Name of employee<span class="f">{{self.name}}</span>2. Gender<span class="f">{{self.gender}}</span> 3. Age (with DOB)<span class="f">{{self.age_dob}}</span></p>
  <p>4. Company<span class="f">{{self.company}}</span> 5.Designation<span class="f">{{self.designation}}</span>5(a). UAN:<span class="f">{{self.uan}}</span> 5(b) Aadhaar Number (after obtaining consent)<span class="f">{{self.aadhaar}}</span></p>
  <p>6. In-charge Employer / Executive Contacts<span class="f">{{exam.incharge}}</span></p>
  <p>7. Complete personal /plant Address &nbsp;<span class="f">{{self.address}}</span></p>
  <p>8. Mobile /Phone <span class="f">{{self.mobile}}</span> 9.Email<span class="f">{{self.email}}</span></p>
  <p style="margin-bottom:6px;">10. Medical illness (Current) and under treatment &amp; medication, If any<span class="f">{{exam.illness}}</span></p>
  <div class="dash"></div>
  <p style="margin-bottom:0;">11. Nature of Job (furnish more details, if hazardous and work-related viz. Physical, Chemical, Biological, Ergonomic etc)</p>
  <p style="margin-bottom:0;"><span class="f">{{exam.nature}}</span></p>
  <div class="sigrow" style="margin-bottom:6px;"><span>Date: <span class="f">{{exam.date}}</span></span><span>Signature of Employee</span></div>
  <div class="dash" style="width:94%;"></div>
  <p class="b u" style="margin-bottom:0;">PART-B:</p>
  <p class="u" style="margin-bottom:3px;">12.Medical Test Carried out &amp; Reports &nbsp;to be Attached as Annexure . Medical Officer’s interpretation/ Opinion of the Tests below (To be indicated only if abnormal , with reference to the attached Test reports) :</p>
  <div class="tight ind1">
    <p>a.&nbsp;&nbsp; Ht. (in cm) <span class="f">{{test.height}}</span></p>
    <p>b.&nbsp;&nbsp; Wt. (in Kg) <span class="f">{{test.weight}}</span></p>
    <p>c.&nbsp;&nbsp; Chest measurement:</p>
  </div>
</div>

<div class="page" data-page="257">
  <div class="rh"><span class="hi">[भाग II—खण्ड 3(i)]</span><span class="mid hi">भारत का राजपत्र : असाधारण</span><span>257</span></div>
  <div class="tight">
    <p class="ind2">(i)&nbsp;&nbsp;&nbsp; On inspiration <span class="f">{{test.chest.insp}}</span>cm</p>
    <p class="ind2">(ii)&nbsp;&nbsp; On expiration <span class="f">{{test.chest.exp}}</span> cm</p>
    <p class="ind1">(d)&nbsp;&nbsp; Waist Circumference <span class="f">{{test.waist}}</span></p>
    <p class="ind1">(e)&nbsp;&nbsp; Body Mass Index: <span class="f">{{test.bmi}}</span></p>
    <p class="ind1">(f)&nbsp;&nbsp;&nbsp; Vision (Ophthalmologist tests):</p>
    <p class="ind3">i.&nbsp;&nbsp;&nbsp;&nbsp; Visual Acuity both Right &amp; left eyes <span class="f">{{test.vision}}</span></p>
    <p class="ind3">ii.&nbsp;&nbsp;&nbsp; Colour Vision<span class="f">{{test.colour}}</span></p>
    <p class="ind1">(g)&nbsp; Blood Pressure (mm Hg)<span class="f">{{test.bp}}</span></p>
    <p class="ind1">(h)&nbsp; Complete Blood Count: (Hb, TLC, DLC, Platelets)<span class="f">{{test.cbc}}</span></p>
    <p class="ind1">(i)&nbsp;&nbsp; Fasting Blood Sugar <span class="f">{{test.fbs}}</span></p>
    <p class="ind1">(j)&nbsp;&nbsp; Post Prandial Blood Sugar<span class="f">{{test.ppbs}}</span></p>
    <p class="ind1">(k)&nbsp; SpO<sub>2</sub><span class="f">{{test.spo2}}</span></p>
    <p class="ind1">(l)&nbsp;&nbsp; Blood Urea <span class="f">{{test.urea}}</span></p>
    <p class="ind1">(m) S. Creatinine <span class="f">{{test.creatinine}}</span></p>
    <p class="ind1">(n)&nbsp; S. Bilirubin (Total + direct) <span class="f">{{test.bilirubin}}</span></p>
    <p class="ind1">(o)&nbsp; SGOT <span class="f">{{test.sgot}}</span></p>
    <p class="ind1">(p)&nbsp; SGPT<span class="f">{{test.sgpt}}</span></p>
    <p class="ind1">(q)&nbsp; Lipid profile (S. Cholesterol / Triglyceride / S.HDL) <span class="f">{{test.lipid}}</span></p>
    <p class="ind1">(r)&nbsp;&nbsp; S. TSH <span class="f">{{test.tsh}}</span></p>
    <p class="ind1">(s)&nbsp;&nbsp; X-ray Chest (PA view) <span class="f">{{test.xray}}</span></p>
    <p class="ind1">(t)&nbsp;&nbsp; ECG<span class="f">{{test.ecg}}</span></p>
    <p style="padding-left:0.38in;">(u)&nbsp; Others if any<span class="f">{{exam.others}}</span></p>
  </div>
  <div class="dash" style="width:94%;margin-top:4px;margin-bottom:6px;"></div>
  <p style="margin-bottom:3px;">13.Final Diagnosis/ Opinion / Treatment if any, advise by qualified medical practitioner <span class="f">{{exam.diagnosis}}</span></p>
  <p>14. Does the person have seizure (s) related disorders or difficulty in working at height ? If yes, specify the works to be avoided: &nbsp;&nbsp; <span class="f">{{exam.seizure}}</span> (Not applicable)</p>
  <div class="sigrow" style="margin-top:18px;"><span>Date: <span class="f">{{exam.date}}</span></span><span style="text-align:center;">Signature of the qualified medical practitioner<br>SEAL<br><span class="f">{{exam.doctor}}</span></span></div>
</div>

</section>

<!-- ======================= FORM-IX ======================= -->
<section data-form="IX">

<div class="page" data-page="258">
  <div class="rh"><span>258</span><span class="mid">THE GAZETTE OF INDIA : EXTRAORDINARY</span><span class="sc">[Part II—Sec. 3(i)]</span></div>
  <p style="margin:-14px 0 12px;">.</p>
  <div class="center b" style="margin-bottom:12px;">
    <div>FORM- IX</div>
    <div>(For mine employees only)</div>
    <div style="font-weight:normal;">[See rule 109, rule 113(1) , rule 119(1) and rule 142]</div>
    <div>Report of medical examination</div>
    <div>(To be issued in triplicate)</div>
  </div>
  <p>Certificate No<span class="f">{{exam.certNo}}</span></p>
  <p style="text-align:justify;text-indent:0.5in;">Certified that Shri/ Smt. /Miss<span class="f">{{self.name}}</span> employed as <span class="f">{{self.designation}}</span> in <span class="f">{{site.name}}</span>mine, Employee number<span class="f">{{self.bssId}}</span> . &nbsp;has been examined for an Initial/Periodical Medical Examination. Employee appears to be<span class="f">{{self.age}}</span> years of age. The findings of the examining authority are given in the attached sheet. It is considered that Shri/Smt. /Miss<span class="f">{{self.name}}</span></p>
  <div class="row"><span class="k">(a)</span><span style="padding-left:0.3in;">is medically fit for any employment in mines.</span></div>
  <div class="row"><span class="k">(b)</span><span style="padding-left:0.3in;">is suffering from<span class="f">{{custom.ix_suffering}}</span> and is medically unfit for</span></div>
  <div style="padding-left:0.72in;">(i)&nbsp; any employment in mine; or<br>(ii)&nbsp; any employment below ground; or<br>(iii)&nbsp; any employment or work<span class="f">{{custom.ix_unfit_work}}</span></div>
  <p style="margin-top:12px;text-align:justify;">(c ) Employee is suffering from<span class="f">{{custom.ix_cure}}</span> and should get the disease/disability cured/controlled and be re-examined within a period of <span class="f">{{custom.ix_months}}</span>months. Employee shall appear for re-examination with the result of the test of<b>…………</b> and the opinion of the …………Specialist from………… Employee may be permitted/not permitted to carry on their duties during this period.</p>
  <p class="b" style="margin-top:18px;">Space for affixing Passport<br>Size Photograph of the<br>Candidate.</p>
  <div style="display:flex;justify-content:space-between;margin-top:-6px;"><span style="margin-left:2.1in;">Place : <span class="f">{{site.location}}</span></span><span style="text-align:right;">Signature &amp; name of the examining authority<br>With date and seal<br><span class="f">{{exam.doctor}}</span></span></div>
</div>

<div class="page" data-page="259">
  <div class="rh"><span class="hi">[भाग II—खण्ड 3(i)]</span><span class="mid hi">भारत का राजपत्र : असाधारण</span><span>259</span></div>
  <p class="b">Report of the examining authority</p>
  <p>(to be filled in for every medical examination whether initial or periodical or re-examination or after cure/control of disability).</p>
  <p style="margin-bottom:0;">Annexure to Certificate No<span class="f">{{exam.certNo}}</span>as result of medical examination on <span class="f">{{exam.date}}</span></p>
  <p>Identification Mark<span class="f">{{custom.id_mark}}</span></p>
  <p style="text-align:right;margin:26px 0 18px;">Left thumb impression and &nbsp;Signature of The candidate</p>
  <div class="tight">
    <p>1. General development- <span style="padding-left:1.1in;"><span class="f">{{custom.general_dev}}</span></span></p>
    <p>2. Height<span class="f">{{test.height}}</span>Cms.</p>
    <p>3. Weight<span class="f">{{test.weight}}</span>kg.</p>
  </div>
  <div class="tight" style="margin-top:12px;">
    <p>4. Eyes :</p>
    <p class="ind1" style="padding-left:0.2in;">(i)&nbsp;&nbsp; Visual acuity-Distant vision (with or without glasses): &nbsp;&nbsp;&nbsp; Right eye<span class="f">{{test.vision.right}}</span>Left eye<span class="f">{{test.vision.left}}</span></p>
    <p style="padding-left:0.2in;">(ii)&nbsp; any organic disease of eyes</p>
    <p style="padding-left:0.2in;">(iii) night blindness</p>
    <p style="padding-left:0.2in;">(iv)&nbsp; Color blindness (to be tested in &nbsp;IME )</p>
    <p style="padding-left:0.2in;">(v)Squint</p>
  </div>
  <div class="tight" style="margin-top:12px;">
    <p>5.&nbsp;&nbsp; Ears :</p>
    <p>(i)&nbsp;&nbsp; Hearing: right ear<span class="f">{{test.audiometry.right}}</span>Left ear <span class="f">{{test.audiometry.left}}</span></p>
    <p>(ii)&nbsp; Any organic diseases.</p>
    <p>(iii)&nbsp; Audiometry Findings :</p>
  </div>
  <table class="g" style="width:100%;">
    <tr><td style="width:33%;">Conduction Type</td><td style="width:33%;">Left Ear</td><td>Right Ear</td></tr>
    <tr><td>Ear Conduction</td><td>Normal/Abnormal</td><td>Normal/Abnormal</td></tr>
    <tr><td>Bone Conduction</td><td>Normal/Abnormal</td><td>Normal/Abnormal</td></tr>
  </table>
  <p>Enclosed Audiometry Report.</p>
  <div class="tight"><p>6.&nbsp;&nbsp; Respiratory system.</p><p class="ind1" style="padding-left:0.25in;">Auscultatory Finding:</p></div>
</div>

<div class="page" data-page="260">
  <div class="rh"><span>260</span><span class="mid">THE GAZETTE OF INDIA : EXTRAORDINARY</span><span class="sc">[Part II—Sec. 3(i)]</span></div>
  <div class="tight">
    <p style="padding-left:0.25in;">Chest measurement :</p>
    <p style="padding-left:0.2in;">(i)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;after full inspiration <span class="f">{{test.chest.insp}}</span>cms.</p>
    <p style="padding-left:0.2in;">(ii)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;after full expiration<span class="f">{{test.chest.exp}}</span>cms.</p>
  </div>
  <p style="margin:14px 0 0;">Result of Lung Function Test (Spirometry)</p>
  <table class="g" style="width:80%;">
    <tr><td style="width:36%;">Parameters</td><td style="width:16%;">Predicted<br>Value</td><td style="width:24%;">Performed Value</td><td>% of Predicted</td></tr>
    <tr><td>Forced Vital Capacity &nbsp;(FVC)</td><td></td><td></td><td></td></tr>
    <tr><td>Forced Vital Capacity 1 FEV1</td><td></td><td></td><td></td></tr>
    <tr><td>FEV1/FVC</td><td></td><td></td><td></td></tr>
    <tr><td>Peak Expiratory Flow</td><td></td><td></td><td></td></tr>
  </table>
  <p>Enclose Spirometry Report</p>
  <div class="tight">
    <p>7. Circulatory system:</p>
    <p style="padding-left:0.25in;">Blood Pressure <span class="f">{{test.bp}}</span></p>
    <p style="padding-left:0.25in;">Pulse <span class="f">{{test.pulse}}</span></p>
  </div>
  <p style="margin:12px 0 0;">Cardiological Assessment</p>
  <table class="g" style="width:80%;">
    <tr><td style="width:28%;" rowspan="3">Auscultation</td><td style="width:28%;">S1</td><td></td></tr>
    <tr><td>S2</td><td></td></tr>
    <tr><td>Additional Sound</td><td></td></tr>
    <tr><td colspan="2">Electrocardiograph (12 leads) findings :</td><td>Normal/Abnormal</td></tr>
    <tr><td colspan="2">Echocardiography finding (to be tested in &nbsp;IME)</td><td>Normal/Abnormal</td></tr>
  </table>
  <div class="tight">
    <p>Enclose ECG</p>
    <p>Enclose &nbsp;Echocardiography report</p>
    <p>8.&nbsp; Abdomen :</p>
    <p style="padding-left:0.25in;">Tenderness.</p>
    <p style="padding-left:0.25in;">Liver.</p>
    <p style="padding-left:0.25in;">Spleen.</p>
    <p style="padding-left:0.25in;">Tumour.</p>
    <p style="padding-left:0.25in;">Ultrasonography of Whole Abdomen (to be tested in &nbsp;IME )</p>
  </div>
</div>

<div class="page" data-page="261">
  <div class="rh"><span class="hi">[भाग II—खण्ड 3(i)]</span><span class="mid hi">भारत का राजपत्र : असाधारण</span><span>261</span></div>
  <div class="tight">
    <p style="padding-left:0.3in;">(Enclose Ultrasonography report)</p>
    <p>9.&nbsp;&nbsp; Nervous system:</p>
    <p style="padding-left:0.25in;">History of fits or epilepsy</p>
    <p style="padding-left:0.25in;">Paralysis.</p>
    <p style="padding-left:0.25in;">Mental health.</p>
  </div>
  <p style="margin:14px 0 0;">Neurological Assessment</p>
  <table class="g" style="width:59%;">
    <tr><td style="width:54%;">Findings</td><td>Normal/Abnormal</td></tr>
    <tr><td>Superficial Reflexes</td><td></td></tr>
    <tr><td>Deep Reflexes</td><td></td></tr>
    <tr><td>Peripheral Circulation</td><td></td></tr>
    <tr><td>Vibrational Syndromes</td><td></td></tr>
  </table>
  <p style="margin:14px 0 0;">Special Tests for Manganese exposure</p>
  <table class="g" style="width:59%;">
    <tr><td colspan="2">Behavioral Disturbances</td><td style="width:30%;">Present/Not Present</td></tr>
    <tr><td style="width:33%;border-bottom:none;"></td><td>Speech Defect</td><td>Present/Not Present</td></tr>
    <tr><td style="border-top:none;border-bottom:none;">Neurological Disturbances</td><td>Tremor</td><td>Present/Not Present</td></tr>
    <tr><td style="border-top:none;border-bottom:none;"></td><td>Adiadocokinesia</td><td>Present/Not Present</td></tr>
    <tr><td style="border-top:none;"></td><td>Emotional Changes</td><td>Present/Not Present</td></tr>
  </table>
  <div class="tight" style="margin-top:14px;">
    <p>10. Locomotory system</p>
    <p>11. Skin.</p>
    <p>12. Hydrocele.</p>
    <p>13. Hernia.</p>
    <p>14. Teeth</p>
    <p>15. Speech</p>
    <p>16. Pathological Investigations:</p>
  </div>
  <table class="g" style="width:59%;">
    <tr><td style="width:7%;">S.No.</td><td style="width:50%;">Tests</td><td>Findings</td></tr>
    <tr><td>1</td><td>Blood-Tc,Dc,Hb,ESR, Platelets</td><td>WNL/Abnormal</td></tr>
    <tr><td>2</td><td>Blood Sugar- Fasting &amp; PP</td><td>WNL/Abnormal</td></tr>
  </table>
</div>

<div class="page" data-page="262">
  <div class="rh"><span>262</span><span class="mid">THE GAZETTE OF INDIA : EXTRAORDINARY</span><span class="sc">[Part II—Sec. 3(i)]</span></div>
  <table class="g" style="width:59%;">
    <tr><td style="width:7%;">3</td><td style="width:50%;">HbA1c(to be tested in &nbsp;&nbsp;IME &nbsp;and for diabetic person during PME )</td><td>WNL/Abnormal</td></tr>
    <tr><td>4</td><td>Lipid profile</td><td>WNL/Abnormal</td></tr>
    <tr><td>5</td><td>Blood Urea, Creatinine</td><td>WNL/Abnormal</td></tr>
    <tr><td>6</td><td>Urine (Reaction, Albumin, Sugar)</td><td>WNL/Abnormal</td></tr>
    <tr><td>7</td><td>Stool Routine</td><td>WNL/Abnormal</td></tr>
    <tr><td>8</td><td>Sputum test for AFB(For Food handling employee)</td><td></td></tr>
    <tr><td>9.</td><td>Hemoglobin &nbsp;Electrophoresis &nbsp;for sickle cell disease /trait (to be tested in IME )</td><td>WNL/Abnormal</td></tr>
    <tr><td>10.</td><td>Bilirubin</td><td>WNL/Abnormal</td></tr>
    <tr><td>11.</td><td>SGOT</td><td>WNL/Abnormal</td></tr>
    <tr><td>12.</td><td>SGPT</td><td>WNL/Abnormal</td></tr>
    <tr><td>13.</td><td>delta aminolevulinic acid in urine ( for person exposed to Lead)</td><td>WNL/Abnormal<br><br></td></tr>
  </table>
  <p>Enclose all Investigation &nbsp;Reports.</p>
  <p style="margin:14px 0 0;">17. Skiagram of chest.</p>
  <p style="margin:0;">ILO Classification of Chest Radiograph :</p>
  <table class="g" style="width:59%;">
    <tr><td style="width:33%;">Profusion of Pneumoconiotic opacities</td><td style="width:30%;">Grades</td><td>Types</td></tr>
    <tr><td>Present/Absent</td><td></td><td></td></tr>
  </table>
  <p>Enclose Chest Radiograph</p>
  <div class="tight" style="margin-top:14px;">
    <p>18.Any other abnormality. <span class="f">{{exam.otherAbnormality}}</span></p>
    <p>19. Any other test considered necessary by the examining authority.</p>
    <p>20. Any opinion of specialist considered necessary.</p>
  </div>
  <div style="display:flex;justify-content:space-between;margin-top:22px;"><span>Place: <span class="f">{{site.location}}</span></span><span style="margin-right:1.1in;">Signature &amp; name of the examining authority<br>With date and seal<br><span class="f">{{exam.doctor}}</span></span></div>
</div>

<div class="page std" data-page="263">
  <div class="rh"><span class="hi">[भाग II—खण्ड 3(i)]</span><span class="mid hi">भारत का राजपत्र : असाधारण</span><span>263</span></div>
  <p class="b center" style="margin-bottom:14px;">Medical Standard of Fitness for Persons to be employed in Mines (Initial Medical Examination).</p>
  <ol>
    <li>The person shall be in good physical and mental health and free from any physical defect, likely to interfere with efficient employment in mines.</li>
    <li>Speech must be without serious impediment.</li>
    <li>Teeth shall be in good condition and where necessary, the employee shall be provided with dentures for effective mastication (well filled teeth shall be considered as sound). The gums shall be in healthy condition.</li>
    <li>Skin: - There shall be no evidence of extensive and chronic skin disease or ulceration. In the case of an infective type of skin disease, the candidate may be declared fit after undergoing a treatment.</li>
    <li>Hearing in each ear shall be good and there shall be no sign of disease of the ear. Audiometric examination shall be normal and the person shall be free from deafness in each ear.</li>
    <li>Distant vision of eye with or without glass should not be less than &nbsp;following standard :
      <div class="sub">
        <div style="margin-bottom:10px;">a)&nbsp; For underground workers
          <table class="vtab" style="margin-left:0.25in;"><tr><td>Better eye</td><td>6/6</td></tr><tr><td>Worse eye</td><td>6/9</td></tr></table></div>
        <div style="margin-bottom:9px;">b)&nbsp; For surface/opencast workers
          <table class="vtab" style="margin-left:0.25in;"><tr><td>Better &nbsp;eye</td><td>6/9</td></tr><tr><td>Worse eye</td><td>6/12</td></tr></table></div>
        <p>c)&nbsp; Intra-ocular lens implant: In the case of a person who has undergone intraocular lens implant, if the visual activity with intra-ocular lens is according to the standards laid down, the person concerned may be considered fit</p>
        <p>d)&nbsp; Fundus examination: In myopia -2Diopter or more, Fundus examination should be carried out and the results recorded. In the event of pathological condition being present, which is likely to be progressive and affect the efficiency of the candidate, he shall be declared unfit.</p>
        <p>e)&nbsp; Color vision: - The testing of color vision is compulsory and the results should be normal. The Ishihara's Plates shall be used for testing color vision.</p>
        <p>f)&nbsp; There should be no night blindness for persons employed below ground and for persons employed in open cast working in shifts other than in morning’s shifts.</p>
      </div>
    </li>
  </ol>
</div>

<div class="page std" data-page="264">
  <div class="rh"><span>264</span><span class="mid">THE GAZETTE OF INDIA : EXTRAORDINARY</span><span class="sc">[Part II—Sec. 3(i)]</span></div>
  <div class="sub" style="padding-left:0.8in;">
    <p>g)&nbsp; Any organic disease or a progressive refractive error which is likely to result in lowering the visual acuity should be considered a disqualification.</p>
    <p>h)&nbsp; Squint:-Presence of binocular vision is essential, squint even if the visual acuity is of prescribed standard, should be considered a disqualification.</p>
    <p>i)&nbsp;&nbsp; One eyed person - Presence of binocular vision is essential, one functional eye should be considered a disqualification.</p>
    <p>j)&nbsp;&nbsp; There shall be no Nystagmus.</p>
  </div>
  <ol start="7">
    <li>Respiratory system: Chest must be well formed Respiratory system should be sound and free from any chronic laryngeal, bronchial pulmonary disease. Tuberculosis of lungs if not active should not be a disqualification.
      <div class="sub" style="margin-top:8px;">
        <p>a)&nbsp; A full sized postero-anterior chest radiograph (not less than 11 inch. X 14 inch.) enough to include thoracic inlet and both costophrenic angles obtained by an X-ray machine (analog /digital) of atleast 300 Milli-Ampere strength shall be classified as per ILO international Classification of Radiographs of Pneumoconiosis by Medical Officer trained in such ILO classification. X-ray shall be classified using LED view box accommodating at least four chest radiographs of 14 inch. X 17inch size.</p>
        <p>b)&nbsp; Lung function tests (spirometry) to record forced vital capacity (FVC) and forced expiratory volume in one second (FEVI) shall be made. Findings of spirometry shall be within normal limit.</p>
      </div>
    </li>
    <li style="margin-bottom:15px;">Circulatory system: - There should be no evidence of cardiac or vascular disease which may interfere with their efficient employment in a mine. The Blood pressure shall not be more than 130/80 mm Hg. Detailed cardiovascular assessment of employees should be done. This should include 12 leads electrocardiogram, echocardiography and complete lipid profile.</li>
    <li style="margin-bottom:15px;">Locomotor System: The limbs, hands, fingers, feet and toes should be well formed and developed &amp; without any deformity any deformity and function of all limbs should be within normal limits.</li>
    <li style="margin-bottom:15px;">There should not be any evidence of disease of abdominal organs which is likely to affect their efficient discharge of duty in a mine. Ultrasonography (whole abdomen) report shall be normal.</li>
    <li>In case the candidate has hernia, he may be declared fit after he has been successfully operated for the same.</li>
  </ol>
</div>

<div class="page std" data-page="265">
  <div class="rh"><span class="hi">[भाग II—खण्ड 3(i)]</span><span class="mid hi">भारत का राजपत्र : असाधारण</span><span>265</span></div>
  <ol start="12">
    <li style="margin-bottom:15px;">Hydrocele if present should not be large enough to impede the normal activities of the person. If it is large enough he may be declared fit after being successfully operated.</li>
    <li style="margin-bottom:15px;">The nervous system should be sound. Persons with history of epilepsy or any other type of organic or historical fits should not be declared fit for employment in a mine. Detailed neurological examinations including testing of all major superficial and deep reflexes shall be done.</li>
    <li style="margin-bottom:15px;">Fasting, Post- prandial Blood sugar and Glycoslated Hb level (HbA1c) shall be tested .GlycoslatedHb level (HbA1c) by a medical specialist as Diabetes Mellitus is known to damage of target organs. GlycoslatedHb level (HbA1c) shall not be more than 6.0. Only such cases of well controlled Diabetes Mellitus with no associated complications may be considered for appointment.</li>
    <li style="margin-bottom:15px;">Serum Urea and Creatinine shall be within normal limit.</li>
    <li style="margin-bottom:15px;">Bilirubin, SGOT and SGPT shall be within normal limit.</li>
    <li style="margin-bottom:15px;">Routine Stool shall be within normal limit.</li>
    <li style="margin-bottom:15px;">The medical examination should include examination of urine. Mere presence of albumin and sugar in the urine without any gross organic disease producing signs and symptoms should not be a disability.</li>
    <li>There should not be sickle cell disease /trait. Hemoglobin Electrophoresis test shall be done.</li>
  </ol>
  <p class="b center" style="margin:22px 0 12px;">Medical Standard of Fitness for Persons Employed (Periodical Medical Examination)</p>
  <ol>
    <li style="margin-bottom:15px;">The person should be in good mental and bodily health and free from any physical defect likely to interfere with their efficient employment in a mine.</li>
    <li>Speech must be without serious impediment.</li>
  </ol>
</div>

<div class="page std" data-page="266">
  <div class="rh"><span>266</span><span class="mid">THE GAZETTE OF INDIA : EXTRAORDINARY</span><span class="sc">[Part II—Sec. 3(i)]</span></div>
  <ol start="3">
    <li style="margin-bottom:14px;">Teeth shall be in good condition and where necessary, the employee shall be provided with dentures, where necessary, for effective mastication (well filled teeth will be considered as sound). The Gums should be in healthy condition.</li>
    <li style="margin-bottom:14px;">Locomotor System: The limbs should be well formed and developed, and the function of all the limbs should be within normal limits. Any deformity should be recorded. There should be no deformity or paralysis which may interfere with their efficient employment in a mine.</li>
    <li style="margin-bottom:14px;">Skin: - There shall be no evidence of extensive and chronic skin disease or ulceration. In case of infective skin disease, the candidate maybe declared fit after he has undergoing a treatment. All occupational skin diseases should be noted.</li>
    <li>Eye :
      <p style="margin:6px 0 2px;">(a) Vision with or without glass should not be less than the following standard:</p>
      <table class="vtab" style="margin-left:0.5in;"><tr><td>i. Better eye</td><td>6/9</td></tr><tr><td>ii. Worse eye</td><td>6/12</td></tr></table>
      <p style="margin:2px 0;">(b) There should be no night blindness for persons employed below ground and for persons employed in open cast working in shifts other than in morning’s shifts.</p>
      <p style="margin:2px 0 10px;">(c) A person having only one eye which functions normally should not be employed below ground, For employment on surface the vision of such a person in the other eye should be 6/9with or without glasses.</p>
    </li>
    <li style="margin-bottom:14px;">Hearing should be good, any progressive disease affecting hearing/or occupational deafness should be recorded. Audiometric examination shall be conducted in every case.</li>
    <li>Respiratory System: Respiratory system should be sound and free from any chronic laryngeal, bronchial pulmonary disease. Tuberculosis of lungs if not active should not be a disqualification.
      <div class="sub" style="margin-top:8px;">
        <p>a)&nbsp; A full sized postero-anterior chest radiograph (not less than 14 inch. X11 inch.) enough to include thoracic inlet and both costophrenic angles obtained by an X-ray machine (analog /digital) of at least 300 mA Milli-Ampere strength shall be classified as per ILO international Classification of Radiographs of Pneumoconiosis by Radiologist / Medical Officer trained in such ILO classification.</p>
        <p>b)&nbsp; Lung function tests (spirometry) to record forced vital capacity (FVC) and forced expiratory volume in one second (FEVI) shall be made. Findings of spirometry shall be within normal limit.</p>
      </div>
    </li>
  </ol>
</div>

<div class="page std" data-page="267">
  <div class="rh"><span class="hi">[भाग II—खण्ड 3(i)]</span><span class="mid hi">भारत का राजपत्र : असाधारण</span><span>267</span></div>
  <ol start="9">
    <li style="margin-bottom:15px;">Circulatory system – There should be no evidence of any heart or vascular disease which may interfere with their efficient employment in a mine. Detailed cardiovascular assessment of employees should be done. This should include 12 leads electrocardiogram and complete lipid profile. The Blood pressure shall not be more than 140/90 mm Hg.</li>
    <li style="margin-bottom:15px;">There should not be any evidence of disease of abdominal organs which is likely to affect their efficient discharge of duty in a mine.</li>
    <li style="margin-bottom:15px;">The nervous system should be sound. Persons with history of epilepsy or any other type of organic or historical fits should not be declared fit detailed neurological examinations including testing of all major superficial and deep reflexes shall be done.</li>
    <li style="margin-bottom:15px;">Persons exposed to manganese, In addition to the basic neurological examination, special emphasis should be given to behavioral and neurological disturbances such as speech defect, tremor, impairment of equilibrium, adiadochokinesia and emotional changes.</li>
    <li style="margin-bottom:15px;">Persons exposed to lead; PME should include delta aminolevulinic acid in urine.</li>
    <li style="margin-bottom:15px;">Persons engaged in food handling and preparation and handling of stemming material activities should undergo routine sputum for Acid Fast Bacilli (AFB).</li>
    <li style="margin-bottom:15px;">Fasting &amp; Post- prandial Blood sugar shall be tested. Diabetes shall be under controlled. Target organ shall not be affected by diabetes.</li>
    <li style="margin-bottom:15px;">Serum Urea and Creatinine shall be within normal limit.</li>
    <li style="margin-bottom:15px;">Bilirubin, SGOT and SGPT shall be within normal limit.</li>
    <li style="margin-bottom:15px;">Routine Stool shall be within normal limit.</li>
    <li style="margin-bottom:15px;">In case the candidate has hernia he may be declared fit after he has been successfully operated for the same.</li>
    <li>Hydrocele if present should not be large enough to impede the normal activities off the candidate. In such cases he may be declared fit after being successfully operated.</li>
  </ol>
  <p style="margin-top:12px;text-align:justify;">The medical examination should include examination of urine and of other system for evidence of disease. Mere presence of albumin and sugar in the urine without any gross organic disease producing signs and symptoms should not be considered as a disability.</p>
</div>

</section>
</body>
</html>
"""
