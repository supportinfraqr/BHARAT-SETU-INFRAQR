let isRecording = false;
let timerInterval;
let seconds = 0;
function startTimer() {

    seconds = 0;

    timerInterval = setInterval(function () {

        seconds++;

        const hrs = String(Math.floor(seconds / 3600)).padStart(2, "0");
        const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
        const secs = String(seconds % 60).padStart(2, "0");

        $("#grievanceTimer").text(`${hrs}:${mins}:${secs}`);

    }, 1000);
}

function stopTimer() {

    clearInterval(timerInterval);
}


async function startRecording() {

    try {

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true
        });

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


            const audioUrl =
                URL.createObjectURL(audioBlob);

            $("#audioPlayer").attr("src", audioUrl);

            $("#audioPreviewWrapper").show();
            $("#listening").addClass("d-none");
            $("#footerActions")
                .removeClass("d-none");

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

        $("#aiCard")
            .removeClass("d-none");

        $("#recordingMessage")
            .text("Recording started...");

    }
    catch (err) {

        console.log(err);

        alert("Microphone permission denied");
    }
}
 
 

function stopRecording() {


    if (recognition) {
        recognition.stop();
    }

    let text = $("#aiText").val();

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

    if (recognition) {
        recognition.stop();
    }

    stopTimer();

    isRecording = false;

    $("#recordIcon")
        .removeClass("bi-stop-fill")
        .addClass("bi-mic-fill");

   
    $("#listening").addClass("d-none");

    $("#recordActionText")
        .text("CLICK TO START RECORDING");

    $("#recordingMessage")
        .text("Recording completed.");
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

        SaveGrievance();

    });
$("#ddlLanguage").change(function () {

    let text = $("#aiText").val();

    if (text.trim() === "")
        return;

    translateText(
        text,
        $(this).val()
    );

});
});

function translateText(text, targetLanguage) {

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

            $("#aiText").val(translated);

        }
    );

}
function startSpeechToText() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        alert("Speech Recognition not supported");

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

        $("#aiText").val(transcript);

        //$("#Subject").val(
        //    $.trim(transcript).substring(0, 50)
        //);
    };

    recognition.start();
}


$(document).on("click", "#btnUploadLetter", function () {

    $("#fileLetter").click();

});

$(document).on("change", "#fileLetter", function () {

    let files = this.files;

    $("#uploadedFilesList").html("");

    for (let i = 0; i < files.length; i++) {

        $("#uploadedFilesList").append(
            `<div class="border p-2 mb-2">
                ${files[i].name}
                <small class="text-muted">
                    (${(files[i].size / 1024).toFixed(2)} KB)
                </small>
            </div>`
        );
    }

});


function SaveGrievance() {
    $("#btnSave").prop("disabled", true);

    $("#btnSaveText").addClass("d-none");
    $("#btnSaveLoader").removeClass("d-none");
    var formData = new FormData();

    formData.append("AiText", $("#aiText").val());
    formData.append("LoginId", LoginId);
    formData.append("Subject", $("#Subject").val());
    

    if (window.recordedAudioBlob) {

        formData.append(
            "AudioFile",
            window.recordedAudioBlob,
            "recording.webm"
        );
    }

	 function generateUniqueFileName() {
		return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, function () {
			return Math.floor(Math.random() * 16).toString(16);
		});
	}

	let files = $("#fileLetter")[0].files;

	for (let i = 0; i < files.length; i++) {

		let file = files[i];

		// 32 character unique name
		let uniqueName = generateUniqueFileName();

		let extension = file.name.substring(file.name.lastIndexOf('.'));

		let uniqueFileName = uniqueName + extension;

		let uniqueFile = new File(
			[file],
			uniqueFileName,
			{
				type: file.type,
				lastModified: file.lastModified
			}
		);

		formData.append(
			"Document_" + i,
			uniqueFile
		);
	}
    $.ajax({

        url: "/Grievances/UploadDocuments",
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,

        success: function (res) {
            $("#btnSave").prop("disabled", false);
            $("#btnSaveText").removeClass("d-none");
            $("#btnSaveLoader").addClass("d-none");
            ResetGrievanceForm();
            showMsgBox("1");
			setTimeout(function () {
				window.location.href = "/grievances/WorkerGrievances"; 
			}, 1000);         
        },

        error: function (xhr, status, error) {
            $("#btnSave").prop("disabled", false);
            $("#btnSaveText").removeClass("d-none");
            $("#btnSaveLoader").addClass("d-none");
            showMsgBox("Error : " + error);

            console.log(xhr.responseText);

        }

    });
}


function ResetGrievanceForm() {

    // Text fields
    $("#Subject").val("");
    $("#aiText").val("");

    // Audio
    window.recordedAudioBlob = null;

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

    $("#recordingMessage")
        .text("");

    // Timer
    stopTimer();
    $("#grievanceTimer").text("00:00:00");

    // Footer Actions
    $("#footerActions").removeClass("d-none");

    isRecording = false;
}