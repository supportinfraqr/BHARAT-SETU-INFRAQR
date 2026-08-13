document.addEventListener("DOMContentLoaded", function () {
    const root = document.querySelector(".establishCompPage");
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
