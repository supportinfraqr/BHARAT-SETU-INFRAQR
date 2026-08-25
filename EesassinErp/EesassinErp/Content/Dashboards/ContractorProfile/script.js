$(document).ready(function () {

    $(".contractorProfile .contractorProfileMenuBtn").on("click", function () {

        var target = $(this).data("target");

        $(".contractorProfile .contractorProfileMenuBtn")
            .removeClass("active");

        $(this).addClass("active");

        $(".contractorProfile .contractorProfileTab")
            .removeClass("active");

        $("#" + target).addClass("active");

    });

});


//This is script for edit profile modal(copy from vendor registration)
// NOTE: step-wizard (currentStep/showStep) is handled inline in contractorProfile.cshtml
//       so it is NOT duplicated here to avoid 'currentStep already declared'.

    /* MULTI SELECT */
    const display = document.getElementById("multiDisplay");
    const dropdown = document.getElementById("multiDropdown");

    display.addEventListener("click", () => {
        dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
    });

    dropdown.addEventListener("change", () => {
        const checks = dropdown.querySelectorAll("input[type=checkbox]");
    const selected = [];

        checks.forEach(c => {
            if (c.checked && c.value !== "all") {
        selected.push(c.value);
            }
        });

    display.value = selected.join(", ");
    });

    /* CLOSE ON OUTSIDE CLICK */
    document.addEventListener("click", function (e) {
        if (!e.target.closest(".multi-select")) {
        dropdown.style.display = "none";
        }
    });


    window.onload = function () {

        var input = document.getElementById("ServicesOffered");
        var dropdown = document.getElementById("serviceDropdown");

        // open dropdown
        input.addEventListener("click", function (e) {
            e.stopPropagation();
            dropdown.style.display = "block";
        });

        // checkbox change
        dropdown.addEventListener("change", function () {
            var selected = [];
            var checkboxes = dropdown.querySelectorAll("input[type='checkbox']");

            checkboxes.forEach(function (cb) {
                if (cb.checked) {
                    selected.push(cb.value);
                }
            });

            input.value = selected.join(", ");
        });

        // close on outside click
        document.addEventListener("click", function (e) {
            if (!dropdown.contains(e.target) && e.target !== input) {
                dropdown.style.display = "none";
            }
        });

    };


    document.addEventListener("DOMContentLoaded", function () {

        // OPEN DROPDOWN
        document.querySelectorAll(".multi-input").forEach(function (input) {
            input.addEventListener("click", function (e) {
                e.stopPropagation();

                // close all first
                document.querySelectorAll(".multi-select-dropdown").forEach(d => d.style.display = "none");

                var targetId = this.getAttribute("data-target");
                document.getElementById(targetId).style.display = "block";
            });
        });

        // SELECT VALUES
        document.querySelectorAll(".multi-select-dropdown").forEach(function (dropdown) {

            dropdown.addEventListener("change", function () {
                var selected = [];

                dropdown.querySelectorAll("input[type='checkbox']").forEach(function (cb) {
                    if (cb.checked) selected.push(cb.value);
                });

                // find linked input
                var input = document.querySelector('[data-target="' + dropdown.id + '"]');
                input.value = selected.join(", ");
            });

        });

        // CLOSE ON OUTSIDE CLICK
        document.addEventListener("click", function () {
            document.querySelectorAll(".multi-select-dropdown").forEach(d => d.style.display = "none");
        });

    });