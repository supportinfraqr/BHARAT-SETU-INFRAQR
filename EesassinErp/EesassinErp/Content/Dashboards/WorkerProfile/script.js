
$(document).on("click", ".workerProfile .employeeSegment-btn", function () {

    var target = $(this).data("tab");

    $(".workerProfile .employeeSegment-btn")
        .removeClass("active");

    $(this).addClass("active");

    $(".workerProfile .employeeViewPanel")
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


//This is script for edit profile modal

let currentStep = 1;
const totalSteps = 10;

const stepIndicators =
    document.querySelectorAll(".step-item");

function showStep(step) {

    document.querySelectorAll(".form-step")
        .forEach(s => s.style.display = "none");

    document.querySelector(`[data-step="${step}"]`)
        .style.display = "block";

    stepIndicators.forEach((el, index) => {

        el.classList.remove("active", "completed");

        if (index + 1 < step) {
            el.classList.add("completed");
        }
        else if (index + 1 === step) {
            el.classList.add("active");
        }
    });

    document.querySelectorAll(".prev-btn")
        .forEach(btn => {
            btn.classList.toggle("d-none", step === 1);
        });
}

document.addEventListener("click", function (e) {

    if (e.target.closest(".next-btn")) {

        if (currentStep < totalSteps) {
            currentStep++;
            showStep(currentStep);
        }
    }

    if (e.target.closest(".prev-btn")) {

        if (currentStep > 1) {
            currentStep--;
            showStep(currentStep);
        }
    }
});

showStep(1);