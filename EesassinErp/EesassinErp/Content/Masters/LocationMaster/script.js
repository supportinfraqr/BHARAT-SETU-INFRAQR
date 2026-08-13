/* location-master.js
   Handles:
   - View / Import toggle
   - Basic client-side search
   - Basic client-side pagination skeleton
   - View All Rows toggling
*/

// script.js (scoped to .locationMasterPage)
document.addEventListener("DOMContentLoaded", function () {
    const root = document.querySelector(".locationMasterPage");
    if (!root) return;

    /* ---------------- Toggle single capsule (View / Import) ---------------- */
    (function setupToggle() {
        const tabs = root.querySelectorAll(".toggle-pill .btn-pill");
        tabs.forEach(tab => {
            tab.addEventListener("click", function () {
                // active state on capsule
                tabs.forEach(t => {
                    t.classList.remove("active");
                    t.setAttribute("aria-pressed", "false");
                });
                this.classList.add("active");
                this.setAttribute("aria-pressed", "true");

                // show/hide sections
                const target = this.getAttribute("data-target");
                root.querySelectorAll(".section-card").forEach(card => {
                    if ("#" + card.id === target) {
                        card.classList.remove("d-none");
                        card.classList.add("active");
                    } else {
                        card.classList.add("d-none");
                        card.classList.remove("active");
                    }
                });

                // reset search/pagination when switching to View
                if (target === "#viewCard") {
                    resetPaginationAndSearch();
                }
            });
        });
    })();

    /* ---------------- Search (recalculates pages) ---------------- */
    const searchInput = root.querySelector("#lmSearch");
    const searchBtn = root.querySelector("#lmSearchBtn");
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            applyFilterAndPagination();
        });
    }
    if (searchBtn) {
        searchBtn.addEventListener("click", () => {
            applyFilterAndPagination();
        });
    }

    /* ---------------- Pagination logic (client-side) ---------------- */
    const tableBody = root.querySelector("#lmTableBody");
    const prevBtn = root.querySelector("#lmPrev");
    const nextBtn = root.querySelector("#lmNext");
    const viewAllBtn = root.querySelector("#viewAllRows");
    const paginationWrap = root.querySelector("#lmPaginationWrap");
    const pageInfo = root.querySelector("#lmPageInfo");

    let allRows = [];            // array of <tr> elements (original)
    let filteredRows = [];       // after search filter
    let currentPage = 1;
    const pageSize = 10;
    let totalPages = 1;
    let showingAll = false;

    function initRowsFromDOM() {
        // Capture initial rows from DOM (these could be server-rendered)
        allRows = Array.from(tableBody.querySelectorAll("tr"));
        // Keep them in memory but don't mutate original DOM nodes; we'll re-append when rendering.
    }

    function calculatePages() {
        totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
        if (currentPage > totalPages) currentPage = totalPages;
    }

    function renderPage() {
        // Clear tbody
        tableBody.innerHTML = "";

        if (showingAll) {
            // show all filtered rows
            filteredRows.forEach(r => tableBody.appendChild(r));
            // Hide pagination controls
            if (paginationWrap) paginationWrap.style.display = "none";
            if (pageInfo) pageInfo.textContent = `${filteredRows.length} rows shown`;
            return;
        }

        // Ensure pagination controls visible
        if (paginationWrap) paginationWrap.style.display = "";

        calculatePages();

        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        const pageRows = filteredRows.slice(start, end);

        pageRows.forEach(r => tableBody.appendChild(r));

        // Update page info
        if (pageInfo) pageInfo.textContent = `Showing ${Math.min(filteredRows.length, start + 1)} - ${Math.min(filteredRows.length, end)} of ${filteredRows.length}`;
    }

    function applyFilterAndPagination() {
        const q = (searchInput && searchInput.value.trim().toLowerCase()) || "";
        // Rebuild filteredRows (use clones of original rows to avoid duplicates)
        filteredRows = allRows.filter(tr => {
            if (!q) return true;
            const text = tr.innerText.toLowerCase();
            return text.includes(q);
        });

        // Reset to first page
        currentPage = 1;
        showingAll = false;
        viewAllBtn.textContent = "View All Rows";
        renderPage();
    }

    function resetPaginationAndSearch() {
        if (searchInput) {
            searchInput.value = "";
        }
        filteredRows = [...allRows];
        currentPage = 1;
        showingAll = false;
        if (viewAllBtn) viewAllBtn.textContent = "View All Rows";
        renderPage();
    }

    // Prev / Next handlers
    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (showingAll) return;
            if (currentPage > 1) {
                currentPage--;
                renderPage();
            }
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (showingAll) return;
            if (currentPage < totalPages) {
                currentPage++;
                renderPage();
            }
        });
    }

    // View All Rows toggle - hides pagination controls when showing all
    if (viewAllBtn) {
        viewAllBtn.addEventListener("click", () => {
            showingAll = !showingAll;
            if (showingAll) {
                viewAllBtn.textContent = "Show 10 Rows";
            } else {
                viewAllBtn.textContent = "View All Rows";
            }
            renderPage();
        });
    }

    /* ---------------- init ---------------- */
    initRowsFromDOM();
    // Initially no search, filteredRows = allRows
    filteredRows = [...allRows];

    // If more than pageSize rows, show first page; otherwise show all
    if (filteredRows.length <= pageSize) {
        showingAll = true; // small set → show all, but keep paginationWrap hidden for UX
        renderPage();
        // but set viewAllBtn text to "Show 10 Rows" so user can toggle to paginate if desired
        if (viewAllBtn) viewAllBtn.textContent = "Show 10 Rows";
    } else {
        showingAll = false;
        renderPage();
    }

    /* Reset pagination after filtering via any external changes (helpful if server replaces rows) */
    // Expose a small API on root for other scripts to call if needed:
    root.locationMaster = {
        refresh: function () {
            initRowsFromDOM();
            filteredRows = [...allRows];
            currentPage = 1;
            showingAll = false;
            if (viewAllBtn) viewAllBtn.textContent = "View All Rows";
            renderPage();
        }
    };
});

// New Location Modal 
(() => {
        document.addEventListener('DOMContentLoaded', function () {
            // New Location modal instance
            const newLocationBtn = document.getElementById('btnNewLocation');
            const btnNewLocationEDIT = document.getElementById('btnNewLocationEDIT');
            const newLocationModalEl = document.getElementById('lmNewLocationModal');
            const newLocationModal = newLocationModalEl ? bootstrap.Modal.getOrCreateInstance(newLocationModalEl, { backdrop: 'static', keyboard: true }) : null;

            // open modal on button click
            if (newLocationBtn && newLocationModal) {
                newLocationBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    // reset form fields if you want fresh state (keeps current values otherwise)
                    // newLocationModalEl.querySelectorAll('input, select, textarea').forEach(el => el.value = '');
                    newLocationModal.show();
                });
            }
            if (btnNewLocationEDIT && newLocationModal) {
                btnNewLocationEDIT.addEventListener('click', function (e) {
                    e.preventDefault();
                    // reset form fields if you want fresh state (keeps current values otherwise)
                    // newLocationModalEl.querySelectorAll('input, select, textarea').forEach(el => el.value = '');
                    newLocationModal.show();
                });
            }

            // wire doc choose buttons -> hidden file inputs
            document.addEventListener('click', function (e) {
                const choose = e.target.closest('.doc-choose-btn');
                if (!choose) return;
                const tgt = choose.dataset.target;
                if (!tgt) return;
                const input = document.querySelector(tgt);
                if (input) input.click();
            });

            // small file input preview toggle (shows download text when file selected - client-side only)
            document.addEventListener('change', function (e) {
                const input = e.target;
                if (!input || input.type !== 'file') return;
                const tr = input.closest('tr');
                if (!tr) return;
                const downloadDiv = tr.querySelector('.archModalDoc-download, .arch-newlocation-download');
                // if a file chosen, show the "download" placeholder (UI-only)
                if (input.files && input.files.length) {
                    if (downloadDiv) downloadDiv.classList.remove('d-none');
                } else {
                    if (downloadDiv) downloadDiv.classList.add('d-none');
                }
            });

            // Save button (UI-only)
            const saveBtn = document.getElementById('saveNewLocationBtn');
            if (saveBtn) {
                saveBtn.addEventListener('click', function () {
                    // minimal UI feedback — adapt to your actual save flow
                    saveBtn.textContent = 'Saved';
                    saveBtn.disabled = true;
                    setTimeout(() => { saveBtn.textContent = 'Save'; saveBtn.disabled = false; }, 1000);
                });
            }
        });
})();





/* ================ Request Form modal logic (scoped) ================ */
(function () {
    document.addEventListener("DOMContentLoaded", function () {
        const root = document.querySelector(".locationMasterPage");
        if (!root) return;

        const modalEl = root.querySelector("#lmRequestModal");
        if (!modalEl) return;

        // Use Bootstrap modal
        const lmModal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: true });

        // Open modal when a store-code link is clicked
        root.querySelectorAll(".store-code-link").forEach(link => {
            link.addEventListener("click", function (e) {
                e.preventDefault();
                const storeCode = this.getAttribute("data-storecode") || this.innerText;
                const storeId = this.getAttribute("data-storeid") || "";

                // you can fetch license rows for this store via AJAX here.
                // For now we'll just show the modal and set title / demo content.

                // set title (optional)
                const titleEl = modalEl.querySelector("#lmRequestModalLabel");
                if (titleEl) titleEl.textContent = `Request Form — ${storeCode}`;

                // (Optional) If you want to dynamically load different rows per store, do it here.
                // For demo we leave demo rows already in modal.

                // Reset row states: show Approve active, hide upload & genlink
                modalEl.querySelectorAll(".lm-approve-btn").forEach(b => {
                    b.disabled = false;
                    b.classList.remove("disabled");
                    b.classList.remove("btn-secondary");
                    b.classList.add("btn-outline-primary");
                });
                modalEl.querySelectorAll(".lm-upload-btn, .lm-genlink-btn").forEach(btn => {
                    btn.classList.add("d-none");
                    // hide any displayed generated links area
                    const gl = btn.closest("td") ? btn.closest("tr").querySelector(".lm-generated-link") : null;
                    if (gl) gl.style.display = "none";
                });
                // clear file inputs
                modalEl.querySelectorAll(".lm-hidden-file").forEach(f => f.value = "");

                lmModal.show();
            });
        });

        // Back button — close with small transform animation
        const backBtn = modalEl.querySelector("#lmModalBackBtn");
        if (backBtn) {
            backBtn.addEventListener("click", function () {
                // animate a tiny slide then hide
                backBtn.style.transform = "translateX(-6px)";
                setTimeout(() => {
                    backBtn.style.transform = "";
                    lmModal.hide();
                }, 140);
            });
        }

        // Approve button handler: disable (but visible) + show upload + genlink
        modalEl.addEventListener("click", function (e) {
            const approveBtn = e.target.closest(".lm-approve-btn");
            if (approveBtn) {
                e.preventDefault();
                // keep button visible but disabled
                approveBtn.disabled = true;
                approveBtn.classList.add("disabled");
                approveBtn.classList.remove("btn-outline-primary");
                approveBtn.classList.add("btn-secondary");

                const tr = approveBtn.closest("tr");
                if (!tr) return;

                // show Upload and Generate Link buttons
                const uploadBtn = tr.querySelector(".lm-upload-btn");
                const genLinkBtn = tr.querySelector(".lm-genlink-btn");
                if (uploadBtn) uploadBtn.classList.remove("d-none");
                if (genLinkBtn) genLinkBtn.classList.remove("d-none");
            }
        });

        // Generate Link button: when clicked, reveal a generated link (demo)
        modalEl.addEventListener("click", function (e) {
            const genBtn = e.target.closest(".lm-genlink-btn");
            if (!genBtn) return;
            const tr = genBtn.closest("tr");
            if (!tr) return;
            const display = tr.querySelector(".lm-generated-link");
            if (!display) return;

        });

        // View icon (eye) — show details (for demo we just console.log)
        modalEl.addEventListener("click", function (e) {
            const viewBtn = e.target.closest(".lm-view-btn");
            if (!viewBtn) return;
            const tr = viewBtn.closest("tr");
            if (!tr) return;
            // Example action: show license details; here we will just alert or log
            const license = tr.querySelector(".lm-license-link") ? tr.querySelector(".lm-license-link").innerText : "License";
            // You can replace with a detailed modal or AJAX fetch
            console.log("View license details:", license);
        });

        // License name clicked — demo: open a new tab for license details or console
        modalEl.addEventListener("click", function (e) {
            const licLink = e.target.closest(".lm-license-link");
            if (!licLink) return;
            e.preventDefault();
            const lic = licLink.innerText.trim();
            // Demo behavior: open a small detail dialog or console; we'll console log for now
            console.log("License clicked:", lic);
            // Optionally open a detail modal or page:
            // window.open(`/License/Details?name=${encodeURIComponent(lic)}`, "_blank");
        });

        

    }); // DOMContentLoaded
})();

/* ================= Upload PAGE logic (scoped) ================= */
(function () {
    document.addEventListener("DOMContentLoaded", function () {
        const root = document.querySelector(".locationMasterPage");
        if (!root) return;

        // Elements
        const uploadModalEl = root.querySelector("#lmUploadPageModal");
        const uploadModal = uploadModalEl ? new bootstrap.Modal(uploadModalEl, { backdrop: 'static', keyboard: true }) : null;
        const lmUploadBack = root.querySelector("#lmUploadBack");
        const lmSaveDraft = root.querySelector("#lmSaveDraft");
        const lmSubmitUpload = root.querySelector("#lmSubmitUpload");
        const lmUploadLocationCode = root.querySelector("#lmUploadLocationCode");

        // When Click Here in Request Modal is clicked, show this upload page
        root.addEventListener("click", function (e) {
            const uploadBtn = e.target.closest(".lm-upload-btn");
            if (!uploadBtn) return;

            e.preventDefault();

            // if the request modal is open, close it gracefully
            const reqModalEl = root.querySelector("#lmRequestModal");
            if (reqModalEl) {
                const reqModalObj = bootstrap.Modal.getInstance(reqModalEl);
                try { reqModalObj && reqModalObj.hide(); } catch (er) { }
            }

            // set the Location Code dynamically if possible (traverse to store code)
            const tr = uploadBtn.closest("tr");
            let storeCode = null;
            if (tr) {
                // try to find store code in the current request modal row (if any)
                const licenseCell = tr.querySelector(".lm-license-link");
                // fallback: use attribute from bounding context or keep default
                storeCode = tr.dataset.storecode || null;
            }

            // For demo we can use data attribute on the clicked row or pass via global selection.
            // If you want different location code to show, add code to set it here.
            if (lmUploadLocationCode && uploadBtn.dataset && uploadBtn.dataset.location) {
                lmUploadLocationCode.textContent = uploadBtn.dataset.location;
            } else {
                // leave default or set from global selected store (if available)
            }

            // Show upload page modal
            if (uploadModal) uploadModal.show();
        });

        // Back action: close upload modal AND re-open request modal
        if (lmUploadBack) {
            lmUploadBack.addEventListener("click", function () {
                this.style.transform = "translateX(-6px)";

                setTimeout(() => {
                    this.style.transform = "";

                    // 1. Hide upload modal through Bootstrap
                    if (uploadModal) uploadModal.hide();

                    // 2. RE-SHOW request form modal via the Bootstrap instance
                    const reqModalEl = root.querySelector("#lmRequestModal");
                    if (reqModalEl) {
                        const reqModalObj = bootstrap.Modal.getInstance(reqModalEl);
                        if (reqModalObj) {
                            reqModalObj.show(); // reopen smoothly
                        }
                    }
                }, 120);
            });
        }

        // Save draft / Submit handlers (no backend — just keep UI behavior)
        if (lmSaveDraft) lmSaveDraft.addEventListener("click", () => {
            lmSaveDraft.textContent = "Saved";
            lmSaveDraft.disabled = true;
            setTimeout(() => { lmSaveDraft.textContent = "Save as Draft"; lmSaveDraft.disabled = false; }, 1200);
            console.log("Save draft clicked (UI only)");
        });
        if (lmSubmitUpload) lmSubmitUpload.addEventListener("click", () => {
            lmSubmitUpload.textContent = "Submitting...";
            lmSubmitUpload.disabled = true;
            setTimeout(() => { lmSubmitUpload.textContent = "Submit"; lmSubmitUpload.disabled = false; }, 1400);
            console.log("Submit clicked (UI only)");
        });

        // Upload drop click & drag/drop behavior
        root.querySelectorAll(".lm-upload-drop").forEach(drop => {
            const targetInputId = drop.getAttribute("data-target-input");
            const input = drop.querySelector("input[type=file]") || (targetInputId ? document.getElementById(targetInputId) : null);

            // click to open input
            drop.addEventListener("click", function () {
                if (input) input.click();
            });

            // when file chosen, show preview for images and indicate uploaded
            if (input) {
                input.addEventListener("change", function () {
                    const file = this.files && this.files[0];
                    if (!file) return;
                    const trParent = drop.closest(".lm-upload-card");
                    const previewWrap = trParent ? trParent.querySelector(".lm-preview") : null;

                    if (file.type && file.type.startsWith("image/") && previewWrap) {
                        const reader = new FileReader();
                        reader.onload = function (ev) {
                            previewWrap.innerHTML = `<img src="${ev.target.result}" alt="preview" />`;
                            previewWrap.style.display = "block";
                        };
                        reader.readAsDataURL(file);
                    } else {
                        // non-image: just show filename text
                        if (previewWrap) {
                            previewWrap.innerHTML = `<div class="small text-muted">${file.name}</div>`;
                            previewWrap.style.display = "block";
                        }
                    }
                });

                // basic drag and drop
                drop.addEventListener("dragover", function (ev) { ev.preventDefault(); drop.classList.add("lm-dragover"); });
                drop.addEventListener("dragleave", function () { drop.classList.remove("lm-dragover"); });
                drop.addEventListener("drop", function (ev) {
                    ev.preventDefault();
                    drop.classList.remove("lm-dragover");
                    const files = ev.dataTransfer.files;
                    if (files && files.length) {
                        input.files = files;
                        // trigger change
                        const changeEvent = new Event('change');
                        input.dispatchEvent(changeEvent);
                    }
                });
            }
        });
    });
})();

/* ================= License Copy modal (scoped) ================= */
document.addEventListener("click", function (e) {
    if (e.target.classList.contains("open-license-copy")) {
        e.preventDefault();
        const modal = new bootstrap.Modal(document.getElementById("licenseCopyModal"));
        modal.show();
    }
});

// DYNAMIC LICENSE PROGRESS (use later)
function setLicenseProgress(percent) {
    const circle = document.querySelector(".fg-circle");
    const text = document.getElementById("licensePercent");

    let max = 377;
    let offset = max - (max * percent) / 100;

    circle.style.strokeDashoffset = offset;
    text.innerText = percent + "%";
}

/* ================= View More modal  ================= */

document.addEventListener('click', function (e) {
    const open = e.target.closest('.open-view-more');
    if (!open) return;

    e.preventDefault();

    // hide any other bootstrap modal quickly (so no double-backdrop)
    document.querySelectorAll('.modal.show').forEach(m => {
        try {
            const inst = bootstrap.Modal.getInstance(m);
            inst && inst.hide();
        } catch (er) { /* ignore */ }
    });

    // populate header/storecode if provided
    const storeCode = open.dataset.storecode || open.closest('tr')?.querySelector('.store-code-link')?.dataset.storecode || open.closest('tr')?.querySelector('.store-code-link')?.innerText || '';
    const headerSpan = document.getElementById('vmStoreCodeHeader');
    const storeCodeInput = document.getElementById('txtStoreCode_vm');
    if (headerSpan) headerSpan.textContent = storeCode || '—';
    if (storeCodeInput) storeCodeInput.value = storeCode || '';

    // show modal
    const modalEl = document.getElementById('lmViewMoreModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: 'static', keyboard: true });
    modal.show();
});

/* Top-right back inside modal: hide modal */
document.getElementById('lmViewMoreBackBtn')?.addEventListener('click', function () {
    const el = document.getElementById('lmViewMoreModal');
    const m = bootstrap.Modal.getOrCreateInstance(el);
    m.hide();
});

/* Update store button (UI-only placeholder) */
document.getElementById('lmUpdateStoreBtn')?.addEventListener('click', function () {
    this.textContent = 'Updating...';
    this.disabled = true;
    setTimeout(() => { this.textContent = 'Update Store'; this.disabled = false; }, 1200);
    console.log('Update Store clicked (UI only)');
});


/* ================= Manage Project JS (scoped) - category <> docs linking ================= */
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        const root = document.querySelector('.locationMasterPage');
        if (!root) return;

        // modal elements
        const pmModalEl = root.querySelector('#lmProjectModal');
        const pmModal = pmModalEl ? bootstrap.Modal.getOrCreateInstance(pmModalEl, { backdrop: 'static', keyboard: true }) : null;
        const pmVersionEl = root.querySelector('#lmVersionModal');
        const vModal = pmVersionEl ? bootstrap.Modal.getOrCreateInstance(pmVersionEl) : null;

        // dummy docs per category (4-5 each)
        const docsByCategory = {
            legal: [
                'Project Charter',
                'Lease Agreement',
                'Certificate of Title',
                'NOC from Municipality',
                'Legal Due Diligence Report'
            ],
            financial: [
                'Business Case',
                'Financial Model',
                'Tax Returns (3 yrs)',
                'Bank Statements',
                'Cap Table'
            ],
            environmental: [
                'Environmental Clearance',
                'Impact Assessment',
                'Waste Management Plan',
                'Emissions Report',
                'Site Survey'
            ],
            market: [
                'Market Study',
                'Demographic Report',
                'Competitor Analysis',
                'Footfall/Traffic Study',
                'Trade Area Analysis'
            ]
        };

        // version storage (UI-only)
        const _pmVersions = [];

        // elements
        /*const pmDocsList = root.querySelector('#pmDocsList');*/
        const pmChecklistProgress = root.querySelector('#pmChecklistProgress');
        const pmOpenVersionHistoryBtn = root.querySelector('#pmOpenVersionHistory');
        const pmVersionListUl = root.querySelector('#pmVersionList');
        const pmSelectAll = root.querySelector('#pmSelectAllDocs');

        // track active category (default legal)
        let activeCategory = 'legal';

        // helper: populate docs table for a category
        function populateDocsFor(category) {
           // activeCategory = category;
           // // highlight active checklist label
           // root.querySelectorAll('.pm-check-label').forEach(el => {
           //     el.classList.toggle('active-cat', el.dataset.category === category);
           // });

           // // build rows
           ///* pmDocsList.innerHTML = '';*/
           // const docs = docsByCategory[category] || [];
            //docs.forEach((docName, idx) => {
            //    const safeId = 'pm_doc_' + category + '_' + idx;
            //    const tr = document.createElement('tr');
            //    tr.innerHTML = `  `;
            //    pmDocsList.appendChild(tr);
            //});
        }

        // safety: escape HTML
        function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }

        // initial populate
        populateDocsFor(activeCategory);

        // open handler (delegated)
        root.addEventListener('click', function (e) {
            const open = e.target.closest('.open-manage-project');
            if (!open) return;
            e.preventDefault();

            // hide other modals
            document.querySelectorAll('.modal.show').forEach(m => {
                try { const inst = bootstrap.Modal.getInstance(m); inst && inst.hide(); } catch (er) { }
            });

            //const storeCode = open.dataset.storecode
            //    || open.closest('tr')?.querySelector('.store-code-link')?.dataset.storecode
            //    || open.closest('tr')?.querySelector('.store-code-link')?.innerText
            //    || '—';
            //root.querySelector('#pmStoreCodeHeader').textContent = storeCode;

            //// reset UI
            //root.querySelectorAll('.pm-doc-uploaded').forEach(td => td.textContent = '—');
            //root.querySelectorAll('.pm-doc-uploader').forEach(td => td.textContent = '—');
            //root.querySelectorAll('.pm-doc-input').forEach(inp => inp.value = '');
            //root.querySelectorAll('.pm-doc-done').forEach(chk => chk.checked = false);
            //root.querySelectorAll('.pm-check-toggle').forEach(chk => { chk.checked = false; updateCheckUI(chk); });
            updateChecklistProgress();

            // open modal
            pmModal && pmModal.show();
        });

        // Back button
        root.querySelector('#pmBackBtn')?.addEventListener('click', function () {
            const inst = bootstrap.Modal.getInstance(pmModalEl) || pmModal;
            inst && inst.hide();
        });

        // checklist toggle UI update
        function updateCheckUI(checkbox) {
            const li = checkbox.closest('.pm-check-item');
            const statusEl = li.querySelector('.pm-status-badge');
            if (!statusEl) return;
            if (checkbox.checked) {
                statusEl.textContent = 'Complete';
                statusEl.className = 'pm-status-badge text-success';
            } else {
                statusEl.textContent = 'Incomplete';
                statusEl.className = 'pm-status-badge text-danger';
            }
        }

        // handle change events (checklist & file inputs & doc done check)
        root.addEventListener('change', function (e) {
            const t = e.target;

            // checklist toggles
            if (t.classList.contains('pm-check-toggle')) {
                updateCheckUI(t);
                updateChecklistProgress();
                return;
            }

            // file inputs for docs
            if (t.classList.contains('pm-doc-input')) {
                const file = t.files && t.files[0];
                const row = t.closest('tr');
                if (!file || !row) return;
                const uploadedTd = row.querySelector('.pm-doc-uploaded');
                const uploaderTd = row.querySelector('.pm-doc-uploader');
                const statusCell = row.querySelector('.pm-doc-status');
                if (uploadedTd) uploadedTd.textContent = new Date().toLocaleString();
                if (uploaderTd) uploaderTd.textContent = 'You (UI)';
                if (statusCell) statusCell.innerHTML = '<span class="badge" style="background-color: #dff6e9; color: #197a3a;">Uploaded</span>';
                // show view button (UI-only)
                row.querySelector('.pm-view-btn')?.classList.remove('d-none');

                // add version entry
                const docName = row.querySelector('td:nth-child(2)')?.innerText?.trim() || 'Document';
                addVersionEntry(docName, file.name);

                return;
            }

            // document "done" checkbox -> toggle status label
            if (t.classList.contains('pm-doc-done')) {
                const row = t.closest('tr');
                const statusCell = row.querySelector('.pm-doc-status');
                if (t.checked) {
                    statusCell.innerHTML = '<span class="badge bg-success text-white">Done</span>';
                } else {
                    // if uploaded, keep uploaded; else pending
                    const uploaded = row.querySelector('.pm-doc-uploaded')?.textContent;
                    if (uploaded && uploaded !== '—') {
                        statusCell.innerHTML = '<span class="badge bg-info text-dark">Uploaded</span>';
                    } else {
                        statusCell.innerHTML = '<span class="badge bg-warning text-dark">Pending</span>';
                    }
                }
                updateChecklistProgress();
            }

            // pmSelectAll
            if (t === pmSelectAll) {
                const checked = t.checked;
                root.querySelectorAll('.pm-doc-done').forEach(c => c.checked = checked);
                // trigger change to update statuses
                root.querySelectorAll('.pm-doc-done').forEach(c => c.dispatchEvent(new Event('change')));
            }
        });

        // click handler for upload btns, view btns, and clickable labels
        root.addEventListener('click', function (e) {
            // upload button (delegated)
            const upl = e.target.closest('.pm-upload-btn');
            if (upl) {
                e.preventDefault();
                const tgt = upl.dataset.target;
                const inp = root.querySelector(tgt);
                if (inp) inp.click();
                return;
            }

            // view button (UI-only: just alert)
            const viewBtn = e.target.closest('.pm-view-btn');
            if (viewBtn) {
                e.preventDefault();
                alert('View document (UI-only)');
                return;
            }

            // version history open
            if (e.target.closest('#pmOpenVersionHistory')) {
                //populateVersionList();
                //vModal && vModal.show();
                return;
            }

            // category label clicked (span)
            const lbl = e.target.closest('.pm-check-label');
            if (lbl) {
                const cat = lbl.dataset.category;
                if (cat) {
                    populateDocsFor(cat);
                    // UPDATE THE CATEGORY LABEL IN HEADER
                    const labelMap = {
                        legal: "Legal ",
                        financial: "Financial ",
                        environmental: "Environmental ",
                        market: "Market ",
                    };

                    const text = labelMap[cat] || cat;
                    const labelSpan = root.querySelector('#pmActiveCategoryLabel');
                    if (labelSpan) labelSpan.textContent = text;

                    // scroll top of docs
                    const scrollWrap = root.querySelector('.pm-doc-scroll-wrap');
                    if (scrollWrap) scrollWrap.scrollTop = 0;
                }
                return;
            }
        });


        // keyboard accessibility for labels (Enter/Space)
        root.addEventListener('keydown', function (e) {
            if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('pm-check-label')) {
                e.preventDefault();
                e.target.click();
            }
        });

        // Add checklist item (UI-only)
        root.querySelector('#pmAddChecklist')?.addEventListener('click', function () {
            const ul = root.querySelector('#pmChecklist');
            const id = 'custom_' + Date.now();
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex align-items-center justify-content-between pm-check-item';
            li.dataset.key = id;
            li.innerHTML = `
        <div>
          <label class="form-check mb-0 d-flex align-items-center gap-2">
            <input class="form-check-input pm-check-toggle" type="checkbox" />
            <span class="ms-1 pm-check-label" data-category="${id}" tabindex="0" role="button"><input class="form-control form-control-sm pm-inline-input pm-assignee" placeholder="New Item" /></span>
          </label>
          <div class="small text-muted mt-1">Assigned to: <input class="form-control form-control-sm pm-inline-input pm-assignee" placeholder="Name" /></div>
        </div>
        <div class="text-end">
          <input type="date" class="form-control form-control-sm pm-date" />
        <button class="btn btn-sm" id="pmAddChecklist">+ Add item</button>
        </div>
      `;
            ul.appendChild(li);
            updateChecklistProgress();
        });

        // Progress calc
        root.querySelector('#pmCalcProgress')?.addEventListener('click', updateChecklistProgress);
        function updateChecklistProgress() {
            //const items = root.querySelectorAll('.pm-check-item');
            //if (!items.length) { pmChecklistProgress.textContent = '0%'; return; }
            //const done = root.querySelectorAll('.pm-check-item .pm-check-toggle:checked, .pm-doc-done:checked').length;
            //// We compute done/total using checklist items only to avoid skew - keep simple: checklist toggles
            //const checklistDone = root.querySelectorAll('.pm-check-item .pm-check-toggle:checked').length;
            //const pct = Math.round((checklistDone / items.length) * 100);
            //pmChecklistProgress.textContent = pct + '%';
        }

        // Version management functions
        function addVersionEntry(docName, fileName) {
            _pmVersions.unshift({ doc: docName, name: fileName, when: new Date().toLocaleString() });
            populateVersionList();
        }

        function populateVersionList() {
            if (!pmVersionListUl) return;
            pmVersionListUl.innerHTML = '';
            if (!_pmVersions.length) {
                pmVersionListUl.innerHTML = '<li class="list-group-item small text-muted">No versions yet (UI-only).</li>';
                return;
            }
            _pmVersions.forEach(v => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.innerHTML = `<strong>${escapeHtml(v.doc)}</strong><div class="small text-muted">${escapeHtml(v.name)} — ${escapeHtml(v.when)}</div>`;
                pmVersionListUl.appendChild(li);
            });
        }

        //// Download checklist (UI-only)
        //root.querySelector('#pmDownloadChecklist')?.addEventListener('click', function () {
        //    alert('Download checklist (UI-only)');
        //});

        // Save/Submit/Cancel (UI-only behaviour kept)
        root.querySelector('#pmSaveDraftBtn')?.addEventListener('click', function () {
            this.textContent = 'Saved'; this.disabled = true;
            setTimeout(() => { this.textContent = 'Save Draft'; this.disabled = false; }, 1000);
        });
        root.querySelector('#pmSubmitApprovalBtn')?.addEventListener('click', function () {
            this.textContent = 'Submitting...'; this.disabled = true;
            setTimeout(() => { this.textContent = 'Submit'; this.disabled = false; alert('Submit for Approval (UI-only)'); }, 1200);
        });
        root.querySelector('#pmCancelProject')?.addEventListener('click', function () {
            if (!confirm('Cancel project? (UI-only)')) return;
            root.querySelectorAll('.pm-status-badge').forEach(s => s.textContent = 'Cancelled');
            pmModal && pmModal.hide();
        });

        // notes helper
        root.querySelector('#pmAddNote')?.addEventListener('click', function () {
            const notes = root.querySelector('.pm-notes');
            if (!notes || !notes.value.trim()) return;
            alert('Note added (UI-only): ' + notes.value.slice(0, 120)); notes.value = '';
        });

        // initial progress calc
        updateChecklistProgress();
    });
})();



/* ================= Architect Modal JS (REPLACEMENT) ================= */
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        const root = document.querySelector('.locationMasterPage');
        if (!root) return;

        // modal elements
        const archModalEl = root.querySelector('#lmArchitectModal');
        const archModal = archModalEl ? bootstrap.Modal.getOrCreateInstance(archModalEl, { backdrop: 'static', keyboard: true }) : null;
        const archVersionEl = root.querySelector('#lmArchVersionModal');
        const vModal = archVersionEl ? bootstrap.Modal.getOrCreateInstance(archVersionEl) : null;

        // initial activityData (keeps your original sample entries + subActivities)
        const activityData = {
            fire_safety: {
                id: 'fire_safety',
                title: 'Fire Safety',
                contractorCompany: 'Fire Secure Pvt Ltd',
                contractorName: 'SecureTech Fire Services',
                license: 'FSE-9988',
                phone: '+91 98765 43210',
                email: 'contact@securetechfire.in',
                start: '2025-02-01',
                end: '2026-04-15',
                notes: 'Responsible for fire suppression systems and egress planning.',
                drawings: [],
                subActivities: [
                    { name: 'Fire Extinguishers', assigned: 'Ajay', status: false, start: '2025-02-03', end: '2025-02-10' },
                    { name: 'Exit Signage', assigned: 'Meera', status: false, start: '2025-02-05', end: '2025-02-12' },
                    { name: 'Sprinkler Layout', assigned: 'Rohit', status: false, start: '2025-02-07', end: '2025-02-20' }
                ]
            },
            electrical: {
                id: 'electrical',
                title: 'Electrical',
                contractorCompany: 'BrightVolt Engineering',
                contractorName: 'BrightVolt Engineers',
                license: 'ELE-3344',
                phone: '+91 90012 34567',
                email: 'hello@brightvolt.com',
                start: '2025-03-01',
                end: '2026-05-30',
                notes: 'Power distribution, panel schedules and lighting design.',
                drawings: [],
                subActivities: [
                    { name: 'Main Distribution', assigned: 'Suresh', status: false, start: '2025-03-02', end: '2025-03-10' },
                    { name: 'Lighting Layout', assigned: 'Priya', status: true, start: '2025-03-05', end: '2025-03-12' }
                ]
            },
            hvac: {
                id: 'hvac',
                title: 'HVAC',
                contractorCompany: 'CoolFlow Solutions',
                contractorName: 'CoolFlow HVAC',
                license: 'HVAC-5566',
                phone: '+91 91234 56789',
                email: 'support@coolflow.in',
                start: '2025-03-15',
                end: '2026-06-10',
                notes: 'Duct routing, AHU locations and balancing',
                drawings: [],
                subActivities: [
                    { name: 'AHU Placement', assigned: 'Karan', status: false, start: '2025-03-20', end: '2025-04-01' },
                    { name: 'Duct Routing', assigned: 'Nina', status: false, start: '2025-04-02', end: '2025-04-20' }
                ]
            },
            civil: {
                id: 'civil',
                title: 'Civil',
                contractorCompany: 'BuildRight Constructions',
                contractorName: 'BuildRight',
                license: 'CIV-2211',
                phone: '+91 99887 66554',
                email: 'site@buildright.co',
                start: '2025-01-10',
                end: '2026-08-01',
                notes: 'Foundations, columns and structural finishing.',
                drawings: [],
                subActivities: [
                    { name: 'Foundation', assigned: 'Vikram', status: true, start: '2025-01-15', end: '2025-02-15' },
                    { name: 'Slab Pouring', assigned: 'Arun', status: false, start: '2025-02-20', end: '2025-03-10' }
                ]
            },
            plumbing: {
                id: 'plumbing',
                title: 'Plumbing',
                contractorCompany: 'FlowWorks',
                contractorName: 'FlowWorks Plumbing',
                license: 'PLM-7788',
                phone: '+91 97777 12345',
                email: 'plumbing@flowworks.in',
                start: '2025-02-20',
                end: '2026-07-01',
                notes: 'Water supply, drainage and sanitary installation.',
                drawings: [],
                subActivities: [
                    { name: 'Drain Routing', assigned: 'Sahil', status: false, start: '2025-02-25', end: '2025-03-15' },
                    { name: 'Fixture Installation', assigned: 'Kavita', status: false, start: '2025-03-16', end: '2025-04-05' }
                ]
            }
        };

        // generate 2 placeholder drawings (SVG data URI) per activity for initial preview
        function makeSvgDataUrl(label, idx) {
            const w = 460, h = 260;
            const accent = '#fdebe0';
            const text = label + ' — ' + (idx + 1);
            const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>
                <rect width='100%' height='100%' fill='${accent}'/>
                <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Inter, Arial' font-size='20' fill='#333'>${text}</text>
            </svg>`;
            return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
        }
        Object.keys(activityData).forEach(k => {
            activityData[k].drawings = [
                { type: 'Floor Plan', name: `${activityData[k].title} - floor.svg`, data: makeSvgDataUrl(activityData[k].title + ' Floor', 0), when: new Date().toLocaleString() },
                { type: 'Layout', name: `${activityData[k].title} - layout.svg`, data: makeSvgDataUrl(activityData[k].title + ' Layout', 1), when: new Date().toLocaleString() }
            ];
        });

        // UI references
        const archActivitiesWrap = root.querySelector('#archActivitiesWrap');
        const galleryWrap = root.querySelector('#archGallery');
        const archContractorCompany = root.querySelector('#archContractorCompany');
        const archContractorName = root.querySelector('#archContractorName');
        const archContractorLicense = root.querySelector('#archContractorLicense');
        const archContractorPhone = root.querySelector('#archContractorPhone');
        const archContractorEmail = root.querySelector('#archContractorEmail');
        const archStartDate = root.querySelector('#archStartDate');
        const archEndDate = root.querySelector('#archEndDate');
        const archContractorNotes = root.querySelector('#archContractorNotes');
        const activityDetailsBody = root.querySelector('#activityDetailsBody');
        const activityNameLabel = root.querySelector('#activityNameLabel');
        const archIssuesList = root.querySelector('#archIssuesList');
        const archIssuesCount = root.querySelector('#archIssuesCount');
        const archComplianceAlert = root.querySelector('#archComplianceAlert');

        // storage for uploaded files & versions (UI-only)
        const _archFiles = []; // {activityId, type, name, data, when}
        const _archVersions = [];
        const _archIssues = {}; // map activityId => [issue strings]

        // activeActivity default
        let activeActivity = Object.keys(activityData)[0];

        // ---------------- render activity list (left)
        function renderActivityList() {
            archActivitiesWrap.innerHTML = '';
            // iterate through activityData in order of keys
            Object.keys(activityData).forEach(key => {
                const item = activityData[key];
                const btn = document.createElement('div');
                btn.className = 'list-group-item activity-item d-flex justify-content-between align-items-start p-3';
                if (key === activeActivity) btn.classList.add('active');
                btn.dataset.activity = key;
                // left: editable title (inline input) — user can type to rename
                btn.innerHTML = `
                    <div style="flex:1;">
                      <input class="form-control form-control-sm activity-item-title" data-activity="${key}" value="${escapeHtml(item.title)}" />
                      <div class="small text-muted mt-1">${escapeHtml(item.notes || '')}</div>
                    </div>
                    <div class="text-end small text-muted activity-meta">Contractor: ${escapeHtml(item.contractorName || '—')}</div>
                `;
                archActivitiesWrap.appendChild(btn);
            });
        }

        // ---------------- select activity (loads details/contractor/drawings)
        function selectActivity(activityId) {
            if (!activityData[activityId]) return;
            activeActivity = activityId;
            // highlight active
            root.querySelectorAll('.activity-item').forEach(el => el.classList.toggle('active', el.dataset.activity === activityId));
            // populate right-hand pieces
            renderContractorInfo(activityId);
            renderActivityDetails(activityId);
            renderGalleryFor(activityId);
            renderComplianceFor(activityId);
            // update header label
            if (activityNameLabel) activityNameLabel.textContent = activityData[activityId].title || 'Activity';
            const subtitle = root.querySelector('#archSubtitle');
            if (subtitle) subtitle.textContent = `Activity: ${activityData[activityId].title || activityId}`;
        }

        // ---------------- contractor info render
        function renderContractorInfo(activityId) {
            const d = activityData[activityId] || {};
            archContractorCompany.value = d.title || '';
            archContractorName.value = d.contractorName || '';
            archContractorLicense.value = d.license || '';
            archContractorPhone.value = d.phone || '';
            archContractorEmail.value = d.email || '';
            archStartDate.value = d.start || '';
            archEndDate.value = d.end || '';
            archContractorNotes.value = d.notes || '';
        }

        // ---------------- render activity details table (sub-activities)
        function renderActivityDetails(activityId) {
            activityDetailsBody.innerHTML = '';
            const rows = (activityData[activityId] && activityData[activityId].subActivities) ? activityData[activityId].subActivities : [];
            rows.forEach((r, i) => {
                const tr = document.createElement('tr');
                tr.dataset.idx = i;
                tr.innerHTML = `
                    <td><input class="form-control form-control-sm activity-subinput" data-field="name" value="${escapeHtml(r.name || '')}" /></td>
                    <td class="text-center"><input type="checkbox" class="form-check-input sub-status-checkbox" ${r.status ? 'checked' : ''} /></td>
                    <td><input class="form-control form-control-sm activity-subinput" data-field="assigned" value="${escapeHtml(r.assigned || '')}" /></td>
                    <td><input type="date" class="form-control form-control-sm activity-subinput" data-field="start" value="${r.start || ''}" /></td>
                    <td><input type="date" class="form-control form-control-sm activity-subinput" data-field="end" value="${r.end || ''}" /></td>
                    <td class="text-center"><button class="btn btn-sm btn-outline-danger remove-sub-row">Remove</button></td>
                `;
                activityDetailsBody.appendChild(tr);
            });
        }

        // ---------------- gallery render for activity (drawings)
        function renderGalleryFor(activityId) {
            galleryWrap.innerHTML = '';
            const base = (activityData[activityId] && activityData[activityId].drawings) ? activityData[activityId].drawings : [];
            const local = _archFiles.filter(f => f.activityId === activityId);
            const combined = [...local, ...base];
            if (!combined.length) {
                const blank = document.createElement('div');
                blank.className = 'arch-blank text-center p-4';
                blank.innerHTML = '<div class="mb-2">No blueprints uploaded yet</div><div class="small text-muted">Upload Floor Plan, HVAC, Electrical layout etc.</div>';
                galleryWrap.appendChild(blank);
                return;
            }
            combined.forEach((f, idx) => {
                const t = document.createElement('div');
                t.className = 'arch-thumb';
                const src = f.data || f; // data or direct
                t.innerHTML = `<div class="thumb-img-wrap"><img src="${src.data || src}" alt="${escapeHtml(f.name || ('drawing ' + idx))}"></div>
                    <div class="meta"><div class="fw-semibold small">${escapeHtml(f.type || '')}</div><div class="small">${escapeHtml(f.name || '')}</div></div>`;
                // preview
                t.addEventListener('click', () => {
                    const w = window.open('', '_blank');
                    w.document.write(`<title>${escapeHtml(f.name || 'preview')}</title><div style="padding:10px;background:#fff;"><img src="${src.data || src}" style="max-width:100%;height:auto;display:block;margin:0 auto;"></div>`);
                });
                galleryWrap.appendChild(t);
            });
        }

        // ---------------- compliance per activity
        function renderComplianceFor(activityId) {
            const arr = _archIssues[activityId] || [];
            if (!arr.length) {
                archComplianceAlert.classList.add('d-none');
                archIssuesList.innerHTML = '';
                archIssuesCount.textContent = '0';
                return;
            }
            archComplianceAlert.classList.remove('d-none');
            archIssuesList.innerHTML = '';
            arr.forEach(it => {
                const li = document.createElement('li');
                li.className = 'small';
                li.textContent = it;
                archIssuesList.appendChild(li);
            });
            archIssuesCount.textContent = String(arr.length);
        }

        // ---------------- helper escape
        function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

        // ---------------- initial render of list and default selection
        function initialRender() {
            renderActivityList();
            selectActivity(activeActivity);
        }

        initialRender();

        // ---------------- DELEGATED EVENTS ----------------
        // clicks: selecting activity, add activity, refresh, add/remove sub-row, version open, add issue, resolve
        root.addEventListener('click', function (e) {
            // open modal triggers (support your existing triggers)
            //const op = e.target.closest('.open-architect-form, .open-view-architect');
            //if (op) {
            //    e.preventDefault();
            //    // set header store code if any
            //    const storeCode = op.dataset.storecode
            //        || op.closest('tr')?.querySelector('.store-code-link')?.dataset.storecode
            //        || op.closest('tr')?.querySelector('.store-code-link')?.innerText
            //        || '—';
            //    root.querySelector('#archStoreCodeHeader').textContent = storeCode;
            //    // ensure list is visible/updated
            //    renderActivityList();
            //    selectActivity(activeActivity);
            //    archModal && archModal.show();
            //    return;
            //}

            //// activity item click (but not when editing the input inside it)
            //const activityItem = e.target.closest('.activity-item');
            //if (activityItem && !e.target.classList.contains('activity-item-title')) {
            //    const aid = activityItem.dataset.activity;
            //    if (aid && activityData[aid]) selectActivity(aid);
            //    return;
            //}

            //// Add Activity: create blank activity (NO prompt)
            //if (e.target.closest('#archAddActivity')) {
            //    // unique id
            //    const id = 'custom_' + Date.now();
            //    activityData[id] = {
            //        id,
            //        title: '',
            //        contractorCompany: '',
            //        contractorName: '',
            //        license: '',
            //        phone: '',
            //        email: '',
            //        start: '',
            //        end: '',
            //        notes: '',
            //        drawings: [],
            //        subActivities: []
            //    };
            //    renderActivityList();
            //    // focus the new activity's title input
            //    const input = archActivitiesWrap.querySelector(`.activity-item-title[data-activity="${id}"]`);
            //    if (input) {
            //        // select it
            //        selectActivity(id);
            //        setTimeout(() => input.focus(), 80);
            //    } else {
            //        selectActivity(id);
            //    }
            //    return;
            //}

            //// Refresh activities
            //if (e.target.closest('#archRefreshActivities')) {
            //    renderActivityList();
            //    selectActivity(activeActivity);
            //    return;
            //}

            //// Add Issue
            //if (e.target.closest('#archAddIssue')) {
            //    const text = prompt('Describe the issue (UI-only):');
            //    if (!text) return;
            //    _archIssues[activeActivity] = _archIssues[activeActivity] || [];
            //    _archIssues[activeActivity].unshift(text + ' — ' + new Date().toLocaleString());
            //    renderComplianceFor(activeActivity);
            //    return;
            //}

            //// Resolve All
            //if (e.target.closest('#archResolveAll')) {
            //    if (!confirm('Resolve all issues? (UI-only)')) return;
            //    _archIssues[activeActivity] = [];
            //    renderComplianceFor(activeActivity);
            //    return;
            //}

            //// Add sub-activity row
            //if (e.target.closest('#addSubActivityRow')) {
            //    if (!activityData[activeActivity]) return;
            //    activityData[activeActivity].subActivities.push({ name: 'New sub-activity', assigned: '', status: false, start: '', end: '' });
            //    renderActivityDetails(activeActivity);
            //    return;
            //}

            //// Remove sub row
            //if (e.target.closest('.remove-sub-row')) {
            //    const tr = e.target.closest('tr');
            //    if (!tr) return;
            //    const idx = Number(tr.dataset.idx);
            //    if (!Number.isFinite(idx)) return;
            //    if (!confirm('Remove sub-activity?')) return;
            //    activityData[activeActivity].subActivities.splice(idx, 1);
            //    renderActivityDetails(activeActivity);
            //    return;
            //}

            //// open versions (if you have permit/version buttons elsewhere)
            //if (e.target.closest('.arch-permit-version') || e.target.closest('#openArchVersions')) {
            //    // populate and show version modal if exists
            //    if (vModal) {
            //        // populate simple list if you maintain _archVersions
            //        const listEl = root.querySelector('#archVersionList');
            //        if (listEl) {
            //            listEl.innerHTML = '';
            //            if (!_archVersions.length) {
            //                listEl.innerHTML = '<li class="list-group-item small text-muted">No versions yet (UI-only).</li>';
            //            } else {
            //                _archVersions.forEach(v => {
            //                    const li = document.createElement('li');
            //                    li.className = 'list-group-item';
            //                    li.innerHTML = `<strong>${escapeHtml(v.type)}</strong><div class="small text-muted">${escapeHtml(v.name)} — ${escapeHtml(v.when)}</div>`;
            //                    listEl.appendChild(li);
            //                });
            //            }
            //        }
            //        vModal.show();
            //    }
            //    return;
            //}
        });

        // ---------------- DELEGATED INPUT CHANGE EVENTS ----------------
        root.addEventListener('input', function (e) {
            // inline edit of activity title inside list
            if (e.target.classList.contains('activity-item-title')) {
                const aid = e.target.dataset.activity;
                if (!aid || !activityData[aid]) return;
                activityData[aid].title = e.target.value;
                // update activity header label if active
                if (aid === activeActivity) {
                    if (activityNameLabel) activityNameLabel.textContent = e.target.value || 'Activity';
                    renderContractorInfo(aid);
                }
                // keep list live
                // no need to re-render whole list (we edited value in place)
                return;
            }
        });

        // change events for sub-activity inputs, checkboxes, and file uploads
        root.addEventListener('change', function (e) {
            const t = e.target;

            // sub-activity table edits (text/date)
            if (t.closest('#activityDetailsTable')) {
                const tr = t.closest('tr');
                if (!tr) return;
                const idx = Number(tr.dataset.idx);
                if (!Number.isFinite(idx) || !activityData[activeActivity]) return;
                // if checkbox (status)
                if (t.classList.contains('sub-status-checkbox')) {
                    activityData[activeActivity].subActivities[idx].status = !!t.checked;
                    return;
                }
                // inputs with data-field
                const field = t.dataset.field;
                if (field) {
                    activityData[activeActivity].subActivities[idx][field] = t.value;
                }
                return;
            }

            // file inputs for drawings
            if (t.classList.contains('arch-file-input')) {
                const file = t.files && t.files[0];
                if (!file) return;
                const type = t.dataset.type || 'File';
                const reader = new FileReader();
                const act = activeActivity || Object.keys(activityData)[0];
                reader.onload = function (ev) {
                    _archFiles.unshift({ activityId: act, type, name: file.name, data: ev.target.result, when: new Date().toLocaleString() });
                    _archVersions.unshift({ type: `${activityData[act]?.title || act} — ${type}`, name: file.name, when: new Date().toLocaleString() });
                    renderGalleryFor(act);
                };
                reader.readAsDataURL(file);
                t.value = '';
                return;
            }
        });

        // ---------------- initial call to populate UI
        renderActivityList();
        selectActivity(activeActivity);

        // ---------------- back/cancel/save handlers (same as before)
        root.querySelector('#archBackBtn')?.addEventListener('click', () => {
            const inst = bootstrap.Modal.getInstance(archModalEl) || archModal;
            inst && inst.hide();
        });
        root.querySelector('#archCancelBtn')?.addEventListener('click', () => { archModal && archModal.hide(); });

        root.querySelector('#archSaveDraftBtn')?.addEventListener('click', function () {
            this.textContent = 'Saved'; this.disabled = true;
            setTimeout(() => { this.textContent = 'Save Draft'; this.disabled = false; }, 1100);
        });
        root.querySelector('#archSubmitBtn')?.addEventListener('click', function () {
            this.textContent = 'Submitting...'; this.disabled = true;
            setTimeout(() => { this.textContent = 'Submit'; this.disabled = false; alert('Submitted for review (UI-only)'); }, 1200);
        });

    });
})();




/* ================= Import tab  ================= */

(function () {
    document.addEventListener("DOMContentLoaded", function () {
        const root = document.querySelector(".locationMasterPage");
        if (!root) return;

        const fileInput = root.querySelector("#locationImportFile");
        const previewBox = root.querySelector("#importFilePreview");
        const saveBtn = root.querySelector("#importSaveBtn");
        const cancelBtn = root.querySelector("#importCancelBtn");

        /* ------- 1. File Select Preview ------- */
        fileInput.addEventListener("change", function () {
            const file = this.files[0];
            if (!file) return;

            previewBox.classList.remove("d-none");
            previewBox.innerHTML = `
                <div class="p-2 border rounded bg-light">
                    <strong>Selected File:</strong><br>
                    ${file.name}
                </div>
            `;
        });

        /* ------- 2. Save button (No Upload Doc Modal Trigger) ------- */
        saveBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation(); // IMPORTANT: prevent bubbling to upload doc script

            if (!fileInput.files.length) {
                alert("Please select a file first.");
                return;
            }

            saveBtn.textContent = "Saved";
            saveBtn.disabled = true;

            setTimeout(() => {
                saveBtn.textContent = "Save";
                saveBtn.disabled = false;
            }, 1200);
        });

        /* ------- 3. Cancel button ------- */
        cancelBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();

            fileInput.value = "";
            previewBox.innerHTML = "";
            previewBox.classList.add("d-none");
        });
    });
})();


/* ================= KPI  ================= */

document.addEventListener("DOMContentLoaded", function () {

    const total = locations.length;
    const needsValidation = locations.filter(x => x.needsValidation).length;
    const recent = 5; // Example
    const qualityScore = "92%"; // Example

    document.getElementById("kpiTotalLocations").textContent = total;
    document.getElementById("kpiNeedsValidation").textContent = needsValidation;
    document.getElementById("kpiRecentActivities").textContent = recent;
    document.getElementById("kpiQualityScore").textContent = qualityScore;
});


/*================Compliance Document Modal script=====================*/
    // Rows ADD, REMOVE, UPDATE

(function () {
    const modal = document.getElementById('lmCompDocModal');
    if (!modal) return;

    const tableBody = modal.querySelector('#lm-compDoc-TableBody');

    // FIRST darkOrange button = Add Row
    const addRowBtn = modal.querySelector('.table-toolbar .btn-darkOrange');

    /* ---------- ROW TEMPLATE (UPDATED TO MATCH TABLE) ---------- */
    function createRow() {
        return `
        <tr>
            <td class="lm-serial"></td>

            <td>
                <input type="text" class="form-control form-control-sm">
            </td>

            <!-- Other Locations -->
            <td>
                <div class="dropdown lm-multiselect">
                    <button class="form-select form-select-sm lm-multiselect-btn"
                            type="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false">
                        <span class="lm-multiselect-text">Select</span>
                        <span class="lm-multiselect-caret"></span>
                    </button>

                    <ul class="dropdown-menu">
                        <li>
                            <label class="dropdown-item d-flex align-items-center gap-2">
                                <input type="checkbox" value="Location A">
                                <span>Location A</span>
                            </label>
                        </li>
                        <li>
                            <label class="dropdown-item d-flex align-items-center gap-2">
                                <input type="checkbox" value="Location B">
                                <span>Location B</span>
                            </label>
                        </li>
                        <li>
                            <label class="dropdown-item d-flex align-items-center gap-2">
                                <input type="checkbox" value="Location C">
                                <span>Location C</span>
                            </label>
                        </li>
                    </ul>
                </div>
            </td>

            <!-- Remarks -->
            <td>
                <div class="d-flex align-items-center gap-2" style="min-width:150px;">
                    <input type="text" class="form-control form-control-sm">
                    
                </div>
            </td>

            <td>
                <input type="date" class="form-control form-control-sm">
            </td>

            <td>
                <input type="date" class="form-control form-control-sm">
            </td>

            <td>
                <label class="btn btn-sm btn-upload px-3" style="white-space:nowrap; cursor:pointer;">
                    Choose File
                    <input type="file" hidden>
                </label>
            </td>

            <td>
                <button class="btn btn-sm btn-view">View</button>
            </td>

            <td>
                <button class="btn btn-sm btn-view">Download</button>
            </td>

            <td>
                <button class="btn btn-sm btn-submit px-3">Save</button>
            </td>

            <td class="action-menu">
                <button class="btn btn-sm" data-bs-toggle="dropdown">
                    <i class="bi bi-three-dots-vertical"></i>
                </button>

                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item lm-row-update">Update</a></li>
                    <li><a class="dropdown-item lm-row-remove text-danger">Remove</a></li>
                </ul>
            </td>
        </tr>`;
    }

    /* ---------- SERIAL NUMBER UPDATE ---------- */
    function updateSerialNumbers() {
        tableBody.querySelectorAll('tr').forEach((row, index) => {
            const serialCell = row.querySelector('.lm-serial');
            if (serialCell) serialCell.textContent = index + 1;
        });
    }

    /* ---------- ADD ROW ---------- */
    addRowBtn.addEventListener('click', function () {
        tableBody.insertAdjacentHTML('beforeend', createRow());
        updateSerialNumbers();
    });

    /* ---------- UPDATE / REMOVE ---------- */
    tableBody.addEventListener('click', function (e) {

        // UPDATE → insert new row below
        const updateBtn = e.target.closest('.lm-row-update');
        if (updateBtn) {
            const currentRow = updateBtn.closest('tr');
            if (!currentRow) return;

            currentRow.insertAdjacentHTML('afterend', createRow());
            updateSerialNumbers();
            return;
        }

        // REMOVE → confirm then delete
        const removeBtn = e.target.closest('.lm-row-remove');
        if (removeBtn) {
            const row = removeBtn.closest('tr');
            if (!row) return;

            const confirmed = confirm('Are you sure you want to remove this document row?');
            if (!confirmed) return;

            row.remove();
            updateSerialNumbers();
        }
    });

})();


