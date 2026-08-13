
let userActivityChartInstance = null;
let userStatusChartInstance = null;

document.addEventListener("DOMContentLoaded", function () {


    /* ================= Toggle Buttons Logic ================= */

    const toggleButtons = document.querySelectorAll(
        ".contractorSetup .btn-pill"
    );

    const sections = document.querySelectorAll(
        ".contractorSetup .section-card"
    );

    toggleButtons.forEach(btn => {
        btn.addEventListener("click", function () {

            toggleButtons.forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-pressed", "false");
            });

            sections.forEach(sec => {
                sec.classList.add("d-none");
                sec.classList.remove("active");
            });

            this.classList.add("active");
            this.setAttribute("aria-pressed", "true");

            const target = document.querySelector(this.dataset.target);

            if (target) {
                target.classList.remove("d-none");
                target.classList.add("active");

                // If Overview opened → reload charts
                if (target.id === "overview") {
                    setTimeout(function () {
                        loadOverviewCharts();
                    }, 100);
                }
            }
        });
    });

    /* ================= Initial Load ================= */

    loadOverviewCharts();

});

/*===========Dropdown logic inside add party modal=============*/
document.addEventListener("DOMContentLoaded", function () {

    const wrapper = document.querySelector(".vendor-search-wrapper");
    const input = wrapper.querySelector(".vendor-search-input");
    const menu = wrapper.querySelector(".vendor-search-menu");
    const items = menu.querySelectorAll(".dropdown-item");

    input.addEventListener("input", function () {
        const value = this.value.toLowerCase();
        let hasMatch = false;

        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (text.includes(value) && value !== "") {
                item.style.display = "block";
                hasMatch = true;
            } else {
                item.style.display = "none";
            }
        });

        menu.classList.toggle("show", hasMatch);
    });

    items.forEach(item => {
        item.addEventListener("click", function () {
            input.value = this.textContent;
            menu.classList.remove("show");
        });
    });

    document.addEventListener("click", function (e) {
        if (!e.target.closest(".vendor-search-wrapper")) {
            menu.classList.remove("show");
        }
    });

});


//  This is for tabs inside the add site Modal 
$(document).on("click", ".siteSegment-btn", function () {

    var target = $(this).data("tab");

    $(".siteSegment-btn").removeClass("active");
    $(this).addClass("active");

    $(".employeeManualPanel").removeClass("active");
    $("#" + target).addClass("active");

});
