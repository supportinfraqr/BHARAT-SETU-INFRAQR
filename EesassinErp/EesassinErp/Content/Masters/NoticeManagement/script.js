// Report Notice Modal Draft Edit

document.addEventListener("DOMContentLoaded", function () {

    const draftBody = document.querySelector(".noticeManagementPage .notice-draft-body");
    const editBtn = document.querySelector(".noticeManagementPage .edit-draft-btn");
    const saveBtn = document.querySelector(".noticeManagementPage .save-draft-btn");
    const cancelBtn = document.querySelector(".noticeManagementPage .cancel-draft-btn");
    const downloadBtn = document.querySelector(".noticeManagementPage .download-draft-btn");
    const trailBtn = document.querySelector(".noticeManagementPage .trail-btn");

    const trailModalEl = document.querySelector(".draftTrail-modal");
    const trailTableBody = document.querySelector(".draft-trail-body");

    if (!draftBody || !editBtn || !saveBtn || !cancelBtn || !downloadBtn || !trailBtn) return;

    let originalDraftContent = "";
    let version = 1;
    let trailData = [];

    // ENTER EDIT MODE
    editBtn.addEventListener("click", function () {
        originalDraftContent = draftBody.innerHTML;

        draftBody.setAttribute("contenteditable", "true");
        draftBody.focus();

        editBtn.classList.add("d-none");
        downloadBtn.classList.add("d-none");
        trailBtn.classList.add("d-none");

        saveBtn.classList.remove("d-none");
        cancelBtn.classList.remove("d-none");
    });

    // SAVE
    saveBtn.addEventListener("click", function () {
        const newContent = draftBody.innerHTML;

        if (newContent !== originalDraftContent) {
            const now = new Date();

            trailData.push({
                version: "v" + version++,
                datetime: now.toLocaleString(),
                before: originalDraftContent,
                after: newContent
            });
        }

        draftBody.setAttribute("contenteditable", "false");

        editBtn.classList.remove("d-none");
        downloadBtn.classList.remove("d-none");
        trailBtn.classList.remove("d-none");

        saveBtn.classList.add("d-none");
        cancelBtn.classList.add("d-none");
    });

    // CANCEL
    cancelBtn.addEventListener("click", function () {
        draftBody.innerHTML = originalDraftContent;
        draftBody.setAttribute("contenteditable", "false");

        editBtn.classList.remove("d-none");
        downloadBtn.classList.remove("d-none");
        trailBtn.classList.remove("d-none");

        saveBtn.classList.add("d-none");
        cancelBtn.classList.add("d-none");
    });

    // OPEN TRAIL MODAL
    trailBtn.addEventListener("click", function () {

        const trailList = document.querySelector(".draft-trail-list");
        trailList.innerHTML = "";

        if (trailData.length === 0) {
            trailList.innerHTML = `
            <div class="trail-empty">
                No changes recorded yet
            </div>`;
        } else {
            trailData.forEach(item => {
                trailList.innerHTML += `
                <div class="trail-item">
                    <div class="trail-header">
                        <span class="trail-version">${item.version}</span>
                        <span class="trail-date">${item.datetime}</span>
                    </div>

                    <div class="trail-change">
                        <details>
                            <summary>View change</summary>

                            <small><strong>Before:</strong></small>
                            <div>${item.before}</div>

                            <small><strong>After:</strong></small>
                            <div>${item.after}</div>
                        </details>
                    </div>
                </div>`;
            });
        }

        new bootstrap.Modal(
            document.querySelector(".draftTrail-modal")
        ).show();
    });


});
