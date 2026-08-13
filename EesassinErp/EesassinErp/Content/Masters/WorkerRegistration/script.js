document.addEventListener("DOMContentLoaded", function () {

    const tabs = document.querySelectorAll(".workerRegistrationTab");

    tabs.forEach(tab => {

        tab.addEventListener("click", function () {

            tabs.forEach(btn => btn.classList.remove("active"));

            document.querySelectorAll(".workerRegistrationTabContent")
                .forEach(content => {
                    content.classList.remove("active");
                });

            this.classList.add("active");

            const target = document.getElementById(this.dataset.target);

            if (target) {
                target.classList.add("active");
            }

        });

    });

});