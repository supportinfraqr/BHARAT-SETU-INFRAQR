// ================= STACKED MODAL MANAGER =================
document.addEventListener('show.bs.modal', function (event) {

    const openModals = document.querySelectorAll('.modal.show').length;
    const zIndex = 1055 + (openModals * 20);

    // Set modal z-index
    event.target.style.zIndex = zIndex;

    // Adjust backdrop
    setTimeout(function () {
        const backdrops = document.querySelectorAll('.modal-backdrop:not(.modal-stack)');
        backdrops.forEach(function (backdrop) {
            backdrop.style.zIndex = zIndex - 10;
            backdrop.classList.add('modal-stack');
        });
    }, 0);

});

// Fix body scroll when closing stacked modal
document.addEventListener('hidden.bs.modal', function () {
    if (document.querySelectorAll('.modal.show').length > 0) {
        document.body.classList.add('modal-open');
    }
});


// ================= Compliance Details Modal Trigger =================
document.addEventListener("click", function (e) {
    if (e.target.classList.contains("store-code-link")) {
        e.preventDefault();

        // Update content dynamically if needed
        const modalElement = document.getElementById("complianceDetailsModal");
        const modal = new bootstrap.Modal(modalElement);

        modal.show();
    }
});


// ================= Event Modal Trigger =================
document.addEventListener("click", function (e) {
    if (e.target.classList.contains("event-link")) {
        e.preventDefault();

        const modalElement = document.getElementById("eventModal");
        const modal = new bootstrap.Modal(modalElement);

        modal.show();
    }
});