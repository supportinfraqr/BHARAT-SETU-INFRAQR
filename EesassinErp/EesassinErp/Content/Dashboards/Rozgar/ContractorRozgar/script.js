document.addEventListener("DOMContentLoaded", function () {

    /* ==========================================
       GRID / TABLE TOGGLE
    ========================================== */

    const viewButtons = document.querySelectorAll(".contractorRozgarViewBtn");
    const gridView = document.querySelector(".contractorRozgarGridView");
    const tableView = document.querySelector(".contractorRozgarTableView");

    viewButtons.forEach(button => {

        button.addEventListener("click", function () {

            viewButtons.forEach(btn => {
                btn.classList.remove("active");
            });

            this.classList.add("active");

            const viewType = this.dataset.view;

            if (viewType === "table") {
                gridView.classList.add("d-none");
                tableView.classList.remove("d-none");
            }
            else {
                tableView.classList.add("d-none");
                gridView.classList.remove("d-none");
            }
        });

    });

    /* ==========================================
       FILTER ACCORDION
    ========================================== */

    const accordionButtons = document.querySelectorAll(".contractorRozgarAccordionBtn");

    accordionButtons.forEach(button => {

        button.addEventListener("click", function () {

            const parent = this.closest(".contractorRozgarAccordionItem");
            const body = parent.querySelector(".contractorRozgarAccordionBody");

            if (!body) return;

            parent.classList.toggle("active");

            if (parent.classList.contains("active")) {
                body.style.display = "grid";

                const icon = this.querySelector("i");
                if (icon) {
                    icon.classList.remove("bi-chevron-right");
                    icon.classList.add("bi-chevron-down");
                }
            }
            else {
                body.style.display = "none";

                const icon = this.querySelector("i");
                if (icon) {
                    icon.classList.remove("bi-chevron-down");
                    icon.classList.add("bi-chevron-right");
                }
            }

        });

    });

});