document.addEventListener("DOMContentLoaded", function () {

    const tabs = document.querySelectorAll(".workerRegistrationTab");

    tabs.forEach(tab => {

        tab.addEventListener("click", function () {

            tabs.forEach(btn => btn.classList.remove("active"));

            document
                .querySelectorAll(".workerRegistrationTabContent")
                .forEach(content => {
                    content.classList.remove("active");
                });

            this.classList.add("active");

            document
                .getElementById(this.dataset.target)
                .classList.add("active");

        });

    });

});