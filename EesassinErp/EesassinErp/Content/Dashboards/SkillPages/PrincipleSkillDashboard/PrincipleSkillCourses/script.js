document.addEventListener("DOMContentLoaded", function () {

    /*====================================================
    STEP ELEMENTS
====================================================*/

    const courseStep1 =
        document.getElementById("courseStep1");

    const courseStep2 =
        document.getElementById("courseStep2");

    const btnStep1Next =
        document.getElementById("btnStep1Next");

    const btnStep2Back =
        document.getElementById("btnStep2Back");

    const btnStep2Next =
        document.getElementById("btnStep2Next");

    const courseStep3 =
        document.getElementById("courseStep3");

    const btnStep3Back =
        document.getElementById("btnStep3Back");

    const btnSaveCourse =
        document.getElementById("btnSaveCourse");

    const btnReplaceCertificate =
        document.getElementById("btnReplaceCertificate");

    const btnPreviewCertificate =
        document.getElementById("btnPreviewCertificate");

    const certificateUpload =
        document.getElementById("certificateUpload");

    const certificatePreviewImage =
        document.getElementById("certificatePreviewImage");

    //if (btnStep2Next) {

    //    btnStep2Next.addEventListener("click", function () {

    //        alert("Step 3 Coming Next");

    //    });

    //}

    /*====================================================
STEP NAVIGATION
====================================================*/

    function showStep(stepNumber) {

        courseStep1.classList.add("d-none");
        courseStep2.classList.add("d-none");
        courseStep3.classList.add("d-none");

        switch (stepNumber) {

            case 1:

                courseStep1.classList.remove("d-none");

                break;

            case 2:

                courseStep2.classList.remove("d-none");

                break;

            case 3:

                courseStep3.classList.remove("d-none");

                break;

        }

    }

    /*====================================================
    STEP BUTTONS
====================================================*/

    btnStep1Next.addEventListener("click", function () {

        showStep(2);

        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    });


    if (btnStep2Next) {

        btnStep2Next.addEventListener("click", function () {

            showStep(3);

            window.scrollTo({

                top: 0,

                behavior: "smooth"

            });

        });

    }


    if (btnStep3Back) {

        btnStep3Back.addEventListener("click", function () {

            showStep(2);

            window.scrollTo({

                top: 0,

                behavior: "smooth"

            });

        });

    }

    /*====================================================
REPLACE CERTIFICATE
====================================================*/

    if (btnReplaceCertificate) {

        btnReplaceCertificate.addEventListener("click", function () {

            certificateUpload.click();

        });

    }

    if (certificateUpload) {

        certificateUpload.addEventListener("change", function () {

            if (!this.files.length)
                return;

            const reader = new FileReader();

            reader.onload = function (e) {

                certificatePreviewImage.src = e.target.result;

            };

            reader.readAsDataURL(this.files[0]);

        });

    }

    if (btnPreviewCertificate) {

        btnPreviewCertificate.addEventListener("click", function () {

            alert("Certificate Preview will be added later.");

        });

    }

    if (btnSaveCourse) {

        btnSaveCourse.addEventListener("click", function () {

            alert("Course Saved Successfully.");

        });

    }


    /*====================================================
        ELEMENTS
    ====================================================*/

    const courseTitleInput = document.getElementById("courseTitleInput");
    const previewCourseTitle = document.getElementById("previewCourseTitle");

    const courseCoverInput = document.getElementById("courseCoverInput");
    const coursePreviewImage = document.getElementById("coursePreviewImage");

    const btnSaveModule = document.getElementById("btnSaveModule");

    const moduleTemplate = document.getElementById("moduleTemplate");
    const videoTemplate = document.getElementById("videoTemplate");

    const moduleContainer = document.getElementById("courseModulesContainer");

    const emptyModuleState = document.getElementById("emptyModuleState");

    const moduleModal = document.getElementById("addModuleModal");

    let moduleCount = 0;

    /*====================================================
        LIVE COURSE TITLE
    ====================================================*/

    courseTitleInput.addEventListener("input", function () {

        const value = this.value.trim();

        previewCourseTitle.textContent =
            value.length ? value : "Course Title";

    });

    /*====================================================
        LIVE COVER IMAGE
    ====================================================*/

    courseCoverInput.addEventListener("change", function () {

        if (!this.files.length) return;

        const reader = new FileReader();

        reader.onload = function (e) {

            coursePreviewImage.src = e.target.result;

        };

        reader.readAsDataURL(this.files[0]);

    });


    /*====================================================
        SAVE MODULE
    ====================================================*/

    btnSaveModule.addEventListener("click", function () {

        const moduleName =
            document.getElementById("moduleNameInput").value.trim();

        const moduleDescription =
            document.getElementById("moduleDescriptionInput").value.trim();

        const publish =
            document.getElementById("modulePublishInput").checked;

        if (moduleName === "") {

            alert("Please enter module name.");

            return;

        }

        moduleCount++;

        emptyModuleState.style.display = "none";

        collapseAllModules();

        const clone =
            moduleTemplate.content.cloneNode(true);

        const card =
            clone.querySelector(".courseModuleCard");

        card.dataset.module = moduleCount;

        card.querySelector(".moduleNumber").textContent =
            "Module " + String(moduleCount).padStart(2, "0");

        card.querySelector(".moduleTitle").textContent =
            moduleName;

        card.querySelector(".moduleTitleInput").value =
            moduleName;

        card.querySelector(".moduleDescriptionInput").value =
            moduleDescription;

        card.querySelector(".moduleToggle").checked =
            publish;

        moduleContainer.appendChild(clone);

        const newCard =
            moduleContainer.lastElementChild;

        newCard
            .querySelector(".moduleCollapse")
            .classList.remove("d-none");

        resetModuleModal();

        bootstrap.Modal.getInstance(moduleModal).hide();

        updateModuleNumbers();

    });

    /*====================================================
    RESET MODAL
====================================================*/

    function resetModuleModal() {

        document.getElementById("moduleNameInput").value = "";

        document.getElementById("moduleDescriptionInput").value = "";

        document.getElementById("moduleDurationInput").value = "";

        document.getElementById("moduleSequenceInput").value = "";

        document.getElementById("modulePublishInput").checked = false;

    }

    /*====================================================
    MODULE NUMBERING
====================================================*/

    function updateModuleNumbers() {

        const modules =
            moduleContainer.querySelectorAll(".courseModuleCard");

        modules.forEach(function (module, index) {

            module.dataset.module = index + 1;

            module.querySelector(".moduleNumber").textContent =
                "Module " +
                String(index + 1).padStart(2, "0");

        });

        moduleCount = modules.length;

        if (moduleCount === 0) {

            emptyModuleState.style.display = "";

        }

    }

    /*====================================================
    COLLAPSE ALL
====================================================*/

    function collapseAllModules() {

        const bodies =
            moduleContainer.querySelectorAll(".moduleCollapse");

        bodies.forEach(function (body) {

            body.classList.add("d-none");

        });

    }

    /*====================================================
    CLICK EVENTS
====================================================*/

    document.addEventListener("click", function (e) {

        /*==============================
            DELETE MODULE
        ==============================*/

        if (e.target.closest(".btnModuleDelete")) {

            const card =
                e.target.closest(".courseModuleCard");

            if (confirm("Delete this module?")) {

                card.remove();

                updateModuleNumbers();

            }

        }

        /*==============================
            COLLAPSE
        ==============================*/

        if (e.target.closest(".btnCollapseModule")) {

            const card =
                e.target.closest(".courseModuleCard");

            const body =
                card.querySelector(".moduleCollapse");

            body.classList.toggle("d-none");

        }

    });

    /*====================================================
    ADD VIDEO
====================================================*/

    document.addEventListener("click", function (e) {

        const addVideoBtn = e.target.closest(".btnAddVideo");

        if (!addVideoBtn) return;

        const moduleCard = addVideoBtn.closest(".courseModuleCard");

        const container =
            moduleCard.querySelector(".moduleVideosContainer");

        const emptyState =
            moduleCard.querySelector(".emptyVideoState");

        const clone =
            videoTemplate.content.cloneNode(true);

        container.appendChild(clone);

        emptyState.style.display = "none";

        updateVideoNumbers(moduleCard);

    });

    /*====================================================
    DELETE VIDEO
====================================================*/

    document.addEventListener("click", function (e) {

        const deleteBtn =
            e.target.closest(".btnDeleteVideo");

        if (!deleteBtn) return;

        if (!confirm("Delete this video?"))
            return;

        const videoCard =
            deleteBtn.closest(".moduleVideoCard");

        const moduleCard =
            deleteBtn.closest(".courseModuleCard");

        videoCard.remove();

        updateVideoNumbers(moduleCard);

    });


    /*====================================================
    VIDEO NUMBERING
====================================================*/

    function updateVideoNumbers(moduleCard) {

        const container =
            moduleCard.querySelector(".moduleVideosContainer");

        const videos =
            container.querySelectorAll(".moduleVideoCard");

        const emptyState =
            moduleCard.querySelector(".emptyVideoState");

        videos.forEach(function (video, index) {

            video.querySelector(".videoNumber").textContent =
                "Video " +
                String(index + 1).padStart(2, "0");

        });

        if (videos.length === 0) {

            emptyState.style.display = "";

        }

        else {

            emptyState.style.display = "none";

        }

    }

    /*====================================================
    MODULE THUMBNAIL
====================================================*/

    document.addEventListener("change", function (e) {

        const input =
            e.target;

        if (!input.closest(".moduleThumbnailUpload"))
            return;

        if (!input.files.length)
            return;

        const reader =
            new FileReader();

        const upload =
            input.closest(".moduleThumbnailUpload");

        reader.onload = function (ev) {

            upload.innerHTML =

                '<img src="' +
                ev.target.result +
                '" class="img-fluid rounded">';

        };

        reader.readAsDataURL(input.files[0]);

    });

    /*====================================================
    VIDEO THUMBNAIL
====================================================*/

    document.addEventListener("change", function (e) {

        const input =
            e.target;

        if (!input.closest(".videoThumbnailUpload"))
            return;

        if (!input.files.length)
            return;

        const reader =
            new FileReader();

        const upload =
            input.closest(".videoThumbnailUpload");

        reader.onload = function (ev) {

            upload.innerHTML =

                '<img src="' +
                ev.target.result +
                '" class="img-fluid rounded">';

        };

        reader.readAsDataURL(input.files[0]);

    });

    /*====================================================
    VIDEO PREVIEW
====================================================*/

    document.addEventListener("change", function (e) {

        const input =
            e.target;

        if (!input.closest(".videoUploadArea"))
            return;

        if (!input.files.length)
            return;

        const file =
            input.files[0];

        const url =
            URL.createObjectURL(file);

        const upload =
            input.closest(".videoUploadArea");

        upload.innerHTML =

            '<video controls style="width:100%;border-radius:12px;">' +

            '<source src="' +
            url +
            '">' +

            '</video>';

    });





});