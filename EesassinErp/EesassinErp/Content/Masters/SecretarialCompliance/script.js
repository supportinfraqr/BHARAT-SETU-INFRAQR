// Compliance Details Modal Trigger
document.addEventListener("click", function (e) {
    if (e.target.classList.contains("store-code-link")) {
        e.preventDefault();

        // You can update content dynamically here if needed:
        //document.getElementById("cd_rule").innerText = "Foreign Exchange Rule XYZ";
        //document.getElementById("cd_section").innerText = "Section 12(3)";
        //document.getElementById("cd_form").innerText = "FC-GPR";
        //document.getElementById("cd_risk").innerText = "High";
        //document.getElementById("cd_description").innerText =
        //    "To report the financial performance of overseas Joint Ventures (JV) or Wholly Owned Subsidiaries (WOS)...";

        const modal = new bootstrap.Modal(document.getElementById("complianceDetailsModal"));
        modal.show();
    }
});
document.addEventListener("click", function (e) {
    if (e.target.classList.contains("event-link")) {
        e.preventDefault();

        const modal = new bootstrap.Modal(document.getElementById("eventModal"));
        modal.show();
    }
});