document.addEventListener("DOMContentLoaded", function () {
    const root = document.querySelector(".employeeMasterPage");
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
            });
        });
    })();

});


/* ================= File upload name display inside Modal ================= */
document.addEventListener("change", function (e) {
    if (e.target.classList.contains("upload-input")) {
        const fileNameSpan = e.target
            .closest(".upload-row")
            .querySelector(".file-name");

        if (e.target.files.length > 0) {
            fileNameSpan.textContent = e.target.files[0].name;
        } else {
            fileNameSpan.textContent = "No file chosen";
        }
    }
});

//  This is for tabs inside the Manual Entry section of Add Worker Modal 
$(document).on("click", ".employeeSegment-btn", function () {

    var target = $(this).data("tab");

    $(".employeeSegment-btn").removeClass("active");
    $(this).addClass("active");

    $(".employeeManualPanel").removeClass("active");
    $("#" + target).addClass("active");

});



// This is for the View Profile modal
$(document).on("click", "#employeeViewProfile .employeeSegment-btn", function () {

    var target = $(this).data("tab");

    $("#employeeViewProfile .employeeSegment-btn")
        .removeClass("active");

    $(this).addClass("active");

    $("#employeeViewProfile .employeeViewPanel")
        .removeClass("active");

    $("#" + target).addClass("active");

});


// This is for Share profile modal to stack over current modal
function closeEmployeeSharePopup() {

    $(".employeeSharePopup").removeClass("active");

}

$(document).on("click", ".employeeOpenSharePopup", function () {

    $(".employeeSharePopup").addClass("active");

});

$(document).on("click", ".employeeShareClose", function () {

    closeEmployeeSharePopup();

});

$(document).on("click", ".employeeSharePopupOverlay", function () {

    closeEmployeeSharePopup();

});

$(document).on("keydown", function (e) {

    if (e.key === "Escape") {

        closeEmployeeSharePopup();

    }

});