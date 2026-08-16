let isRecording = false;
let timerInterval;
let seconds = 0;
let audioChunks = [];
let mediaRecorder = null;
let recognition = null;
let activeAudioStream = null;
let currentAudioUrl = null;
let isSubmitting = false;

function announceStatus(message, isError) {
    $("#formStatus")
        .text(message || "")
        .toggleClass("workerLodgeGrievanceStatusSuccess", Boolean(message) && !isError);
}

function setRecordingStatus(message) {
    $("#recordingMessage").text(message || "");
}

function setSubmitState(submitting) {
    isSubmitting = submitting;
    $("#btnSave").prop("disabled", submitting).attr("aria-busy", submitting ? "true" : "false");
    $("#btnSaveText").toggleClass("d-none", submitting);
    $("#btnSaveLoader").toggleClass("d-none", !submitting);
}

function stopAudioStream() {
    if (activeAudioStream) {
        activeAudioStream.getTracks().forEach(function (track) {
            track.stop();
        });
        activeAudioStream = null;
    }
}

function clearFieldError(selector, errorSelector) {
    $(selector).removeAttr("aria-invalid");
    $(errorSelector).text("");
}

function getTranscriptText() {
    const transcript = $("#aiText");
    return transcript.is("input, textarea") ? (transcript.val() || "") : (transcript.text() || "");
}

function setTranscriptText(text) {
    const transcript = $("#aiText");
    if (transcript.is("input, textarea")) {
        transcript.val(text);
    } else {
        transcript.text(text);
    }
}

function setTimerText(text) {
    const timerValue = $("#grievanceTimerValue");
    if (timerValue.length) {
        timerValue.text(text);
    } else {
        $("#grievanceTimer").text(text);
    }
}

function validateGrievance() {
    const subject = $.trim($("#Subject").val() || "");
    const details = $.trim(getTranscriptText());
    let isValid = true;

    clearFieldError("#Subject", "#subjectError");
    clearFieldError("#aiText", "#aiTextError");
    announceStatus("");

    if (!subject) {
        $("#Subject").attr("aria-invalid", "true");
        $("#subjectError").text("Enter a subject for your grievance.");
        isValid = false;
    }

    if (!details && !window.recordedAudioBlob) {
        $("#aiText").attr("aria-invalid", "true");
        $("#aiTextError").text("Describe your grievance or make an audio recording.");
        isValid = false;
    }

    if (!isValid) {
        announceStatus("Check the highlighted fields before submitting.", true);
        $("[aria-invalid='true']").first().trigger("focus");
    }

    return isValid;
}
function startTimer() {

    seconds = 0;

    timerInterval = setInterval(function () {

        seconds++;

        const hrs = String(Math.floor(seconds / 3600)).padStart(2, "0");
        const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
        const secs = String(seconds % 60).padStart(2, "0");

        setTimerText(`${hrs}:${mins}:${secs}`);

    }, 1000);
}

function stopTimer() {

    clearInterval(timerInterval);
}


async function startRecording() {

    try {

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
            setRecordingStatus("Audio recording is not available in this browser. You can type your grievance instead.");
            $("#aiCard").removeClass("d-none");
            $("#aiText").trigger("focus");
            return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true
        });

        activeAudioStream = stream;

        audioChunks = [];

        $("#audioPreviewWrapper").show();
        $("#listening").removeClass("d-none");
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = function (e) {
            audioChunks.push(e.data);
        };

        mediaRecorder.onstop = function () {

            const audioBlob = new Blob(audioChunks, {
                type: "audio/webm"
            });

             

            window.recordedAudioBlob =
                audioBlob;


            if (currentAudioUrl) {
                URL.revokeObjectURL(currentAudioUrl);
            }

            currentAudioUrl = URL.createObjectURL(audioBlob);

            $("#audioPlayer").attr("src", currentAudioUrl);

            $("#audioPreviewWrapper").show();
            $("#listening").addClass("d-none");
            $("#footerActions")
                .removeClass("d-none");

            stopAudioStream();

          /*  uploadAudio(audioBlob);*/
        };

        mediaRecorder.start();

        startSpeechToText();

        isRecording = true;

        startTimer();

        $("#recordIcon")
            .removeClass("bi-mic-fill")
            .addClass("bi-stop-fill");

        $("#recordActionText")
            .text("CLICK TO STOP RECORDING");

        $("#recordBtn")
            .attr("aria-label", "Stop recording")
            .attr("aria-pressed", "true");

        $("#aiCard")
            .removeClass("d-none");

        setRecordingStatus("Recording started. Select stop when you have finished.");

    }
    catch (err) {

        stopAudioStream();
        const permissionDenied = err && (err.name === "NotAllowedError" || err.name === "SecurityError");
        setRecordingStatus(permissionDenied
            ? "Microphone access was not allowed. Enable microphone permission or type your grievance instead."
            : "The recording could not start. Try again or type your grievance instead.");
        $("#aiCard").removeClass("d-none");
        $("#aiText").trigger("focus");
    }
}
 
 

function stopRecording() {


    if (recognition) {
        recognition.stop();
    }

    let text = getTranscriptText();

    if (text.trim() !== "") {
        translateText(
            text,
            $("#ddlLanguage").val()
        );
    }

    if (mediaRecorder &&
        mediaRecorder.state !== "inactive") {

        mediaRecorder.stop();
    }

    stopTimer();

    isRecording = false;

    $("#recordIcon")
        .removeClass("bi-stop-fill")
        .addClass("bi-mic-fill");

   
    $("#listening").addClass("d-none");

    $("#recordActionText")
        .text("CLICK TO START RECORDING");

    $("#recordBtn")
        .attr("aria-label", "Start recording")
        .attr("aria-pressed", "false");

    setRecordingStatus("Recording completed. Review the audio and transcription before submitting.");
}


 
 
$(document).on("click", "#recordBtn", function () {

    if (!isRecording) {

        startRecording();

    }
    else {

        stopRecording();

    }

});


$(document).ready(function () {
    $("#audioPreviewWrapper").hide();
    $("#listening").addClass("d-none");


    $("#btnSave").click(function () {
        if (!isSubmitting) {
            SaveGrievance();
        }

    });
$("#Subject").on("input", function () {
    clearFieldError("#Subject", "#subjectError");
});
$("#aiText").on("input", function () {
    clearFieldError("#aiText", "#aiTextError");
});
$("#ddlLanguage").change(function () {

    let text = getTranscriptText();

    if (text.trim() === "")
        return;

    translateText(
        text,
        $(this).val()
    );

});
});

function translateText(text, targetLanguage) {

    setRecordingStatus("Translating the transcription...");

    $.get(
        "https://translate.googleapis.com/translate_a/single",
        {
            client: "gtx",
            sl: "auto",
            tl: targetLanguage.split('-')[0],
            dt: "t",
            q: text
        },
        function (data) {

            let translated = "";

            data[0].forEach(function (item) {
                translated += item[0];
            });

            setTranscriptText(translated);

            setRecordingStatus("Translation completed. Review the text before submitting.");

        }
    ).fail(function () {
        setRecordingStatus("Translation is temporarily unavailable. Your original transcription has been preserved.");
    });

}
function startSpeechToText() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        setRecordingStatus("Live transcription is not supported in this browser. Your audio will still be recorded.");
        return;
    }

    recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.lang =
        $("#ddlLanguage").val();

    recognition.onresult = function (event) {

        let transcript = "";

        for (let i = 0; i < event.results.length; i++) {

            transcript +=
                event.results[i][0].transcript + " ";
        }

        setTranscriptText(transcript);

        clearFieldError("#aiText", "#aiTextError");

        //$("#Subject").val(
        //    $.trim(transcript).substring(0, 50)
        //);
    };

    recognition.onerror = function () {
        setRecordingStatus("Live transcription stopped. Your audio recording is still available.");
    };

    recognition.start();
}


$(document).on("click", "#btnUploadLetter", function () {

    $("#fileLetter").click();

});

$(document).on("change", "#fileLetter", function () {

    let files = this.files;

    const fileList = $("#uploadedFilesList").empty();
    $("#fileLetterError").text("");

    for (let i = 0; i < files.length; i++) {
        const isAcceptedImage = /\.(jpe?g|png)$/i.test(files[i].name) &&
            (!files[i].type || /^(image\/jpeg|image\/png)$/i.test(files[i].type));

        if (!isAcceptedImage) {
            $("#fileLetterError").text("Remove unsupported files. Only JPG and PNG images can be uploaded.");
            $(this).val("");
            fileList.empty();
            return;
        }

        const item = $("<div>").addClass("border p-2 mb-2");
        $("<span>").text(files[i].name).appendTo(item);
        $("<small>")
            .addClass("text-muted")
            .text(` (${(files[i].size / 1024).toFixed(2)} KB)`)
            .appendTo(item);
        fileList.append(item);
    }

});


function SaveGrievance() {
    if (isSubmitting || !validateGrievance()) {
        return;
    }

    setSubmitState(true);
    announceStatus("Submitting your grievance. Please wait.");

    BharatSetuApi.grievances.create({
        subject: $("#Subject").val(),
        details: getTranscriptText(),
        audio: window.recordedAudioBlob || null,
        documents: Array.from($("#fileLetter")[0].files || [])
    }).then(function () {
            setSubmitState(false);
            ResetGrievanceForm();
            announceStatus("Grievance submitted successfully. Opening your grievances list.");
            showMsgBox("1");
            setTimeout(function () {
                window.location.href = "/grievances/WorkerGrievances";
            }, 1000);
        })
        .catch(function (error) {
            setSubmitState(false);
            const message = error && error.message
                ? error.message
                : "Your grievance could not be submitted. Check your connection and try again.";
            announceStatus(message, true);
            showMsgBox(message);
        });
}


function ResetGrievanceForm() {

    // Text fields
    $("#Subject").val("");
    setTranscriptText("");

    // Audio
    window.recordedAudioBlob = null;

    if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
        currentAudioUrl = null;
    }

    $("#audioPlayer").attr("src", "");
    $("#audioPreviewWrapper").hide();

    // Uploaded files
    $("#fileLetter").val("");
    $("#uploadedFilesList").html("");

    // Recording UI
    $("#listening").addClass("d-none");

    $("#recordIcon")
        .removeClass("bi-stop-fill")
        .addClass("bi-mic-fill");

    $("#recordActionText")
        .text("CLICK TO START RECORDING");

    $("#recordBtn")
        .attr("aria-label", "Start recording")
        .attr("aria-pressed", "false");

    $("#recordingMessage")
        .text("");

    // Timer
    stopTimer();
    setTimerText("00:00:00");

    // Footer Actions
    $("#footerActions").removeClass("d-none");

    isRecording = false;
}

$(window).on("beforeunload", function () {
    stopTimer();
    stopAudioStream();
    if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
    }
});
