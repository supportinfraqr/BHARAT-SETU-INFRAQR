
/*==================NAVBAR & STATUS BAR ================== */

// Toggle search field with animation
const searchIcon = document.getElementById("search-icon");
const searchField = document.getElementById("search-field");
const searchWrapper = document.querySelector(".search-wrapper");

searchIcon.addEventListener("click", (e) => {
    e.stopPropagation(); // prevent body click
    searchField.classList.toggle("show");
    if (searchField.classList.contains("show")) searchField.focus();
});

// Close search when clicking outside
document.body.addEventListener("click", (e) => {
    if (!searchWrapper.contains(e.target)) {
        searchField.classList.remove("show");
    }
});

// Handle role selection
const roles = document.querySelectorAll(".role-option");
const selectedRole = document.getElementById("selected-role");

roles.forEach(role => {
    role.addEventListener("click", e => {
        e.preventDefault();
        selectedRole.textContent = role.textContent;
    });
});


/*==================CONTAINER 2 ================== */


/*======== PAYROLL FILES MODAL ========= */

document.addEventListener('DOMContentLoaded', function () {
    const payrollModal = new bootstrap.Modal(document.getElementById('payrollFilesModal'));

    document.querySelectorAll('.openPayrollFiles').forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            payrollModal.show();
        });
    });
});


/*================== TABLE PAGINATION ==================*/

const rowsPerPage = 10;
let currentPage = 1;
let showAll = false;

const table = document.querySelector(".container2 table tbody");
const allRows = Array.from(table.querySelectorAll("tr"));
const totalPages = Math.ceil(allRows.length / rowsPerPage);

function renderTable() {
    allRows.forEach((row, index) => {
        row.style.display = showAll
            ? ""
            : (index >= (currentPage - 1) * rowsPerPage && index < currentPage * rowsPerPage)
                ? ""
                : "none";
    });

    // Scroll to top of table
    document.querySelector("#container2 .small-table-wrapper").scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("nextPage").addEventListener("click", () => {
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
    }
});

document.getElementById("prevPage").addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
});

document.getElementById("viewAllRows").addEventListener("click", () => {
    showAll = !showAll;
    document.getElementById("viewAllRows").textContent = showAll ? "Show 10 Rows" : "View All Rows";
    renderTable();
});

renderTable();


// TOGGLE BUTTON
(function () {
    const container = document.querySelector(".dashboard"); // parent wrapper
    if (!container) return;

    const tabs = container.querySelectorAll(".toggle-pill .btn-pill");
    const sections = container.querySelectorAll(".section-card");

    tabs.forEach(tab => {
        tab.addEventListener("click", function () {

            // 1. Toggle active pill
            tabs.forEach(t => {
                t.classList.remove("active");
                t.setAttribute("aria-pressed", "false");
            });

            this.classList.add("active");
            this.setAttribute("aria-pressed", "true");

            // 2. Show/Hide cards
            const target = this.getAttribute("data-target");

            sections.forEach(card => {
                if ("#" + card.id === target) {
                    card.classList.remove("d-none");
                    card.classList.add("active");
                } else {
                    card.classList.add("d-none");
                    card.classList.remove("active");
                }
            });

        });
    });
})();


// ESIC Edit Form
function openESICEditModal(btn) {
    const modalEl = document.getElementById("esicEditModal");
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl, {
        backdrop: 'static',
        keyboard: true
    });
    modal.show();
}

// Update Button
function updateESICForm() {
    alert("✅ ESIC data updated successfully!");
    bootstrap.Modal.getInstance(document.getElementById("esicEditModal")).hide();
}
