/* ===== License Master: minimal, safe ===== */
(function () {
    document.addEventListener("DOMContentLoaded", function () {

        const root = document.querySelector(".licenseMasterPage");
        if (!root) return;

        /* ===== MODAL OPEN (store code only) ===== */
        const modalEl = document.getElementById("licenseMasterModal");
        if (modalEl) {
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

            root.querySelectorAll(".store-code-link").forEach(link => {
                link.addEventListener("click", function (e) {
                    e.preventDefault();      // only anchor navigation
                    modal.show();            // open modal
                });
            });
        }

        /* ===== PAGINATION ===== */
        const tableBody = root.querySelector("#licMasterTableBody");
        const prevBtn = root.querySelector("#licMasterPrev");
        const nextBtn = root.querySelector("#licMasterNext");
        const viewAllBtn = root.querySelector("#viewAllRows");
        const paginationWrap = root.querySelector("#licMasterPaginationWrap");
        const pageInfo = root.querySelector("#licMasterPageInfo");

        if (!tableBody) return;

        const allRows = Array.from(tableBody.querySelectorAll("tr"));
        let currentPage = 1;
        const pageSize = 10;
        let showingAll = false;

        function renderPage() {
            tableBody.innerHTML = "";

            if (showingAll) {
                allRows.forEach(r => tableBody.appendChild(r));
                paginationWrap.style.display = "none";
                pageInfo.textContent = `${allRows.length} rows shown`;
                return;
            }

            paginationWrap.style.display = "";

            const start = (currentPage - 1) * pageSize;
            const end = start + pageSize;

            allRows.slice(start, end).forEach(r => tableBody.appendChild(r));
            pageInfo.textContent = `Showing ${start + 1} - ${Math.min(end, allRows.length)} of ${allRows.length}`;
        }

        prevBtn?.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                renderPage();
            }
        });

        nextBtn?.addEventListener("click", () => {
            if (currentPage < Math.ceil(allRows.length / pageSize)) {
                currentPage++;
                renderPage();
            }
        });

        viewAllBtn?.addEventListener("click", () => {
            showingAll = !showingAll;
            viewAllBtn.textContent = showingAll ? "Show 10 Rows" : "View All Rows";
            renderPage();
        });

        renderPage();
    });
})();


// Showing text on hover on input fields

    document.addEventListener("input", function (e) {
    const el = e.target;
    if (!el.matches(".small-table-wrapper input.form-control")) return;

    el.setAttribute("data-bs-toggle", "tooltip");
    el.setAttribute("data-bs-title", el.value);

    const tooltip = bootstrap.Tooltip.getOrCreateInstance(el);
    tooltip.setContent({'.tooltip-inner': el.value });
});




/* Open View More Modal*/

(function () {
    document.addEventListener("DOMContentLoaded", function () {

        const root = document.querySelector(".licenseMasterPage");
        if (!root) return;

        const viewModal = document.getElementById("licenseMasterViewModal");
        if (!viewModal) return;

        root.addEventListener("click", function (e) {
            const viewBtn = e.target.closest(".js-view-license");
            if (!viewBtn) return;

            e.preventDefault();
            bootstrap.Modal.getOrCreateInstance(viewModal).show();
        });

    });
})();
