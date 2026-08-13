var cropper = null;
var stream = null;
$(document).ready(function () {
    $("#photoPreview").hide();

    $("#broswerpanel").css({
        "pointer-events": "none",
        "opacity": "0.5"
    });

    $("#btnBrowse").click(function () {
        $("#docFile").click();
    });
});
$(document).on("click", "#aadhaarCard", function () {

    $("#broswerpanel").css({
        "pointer-events": "auto",
        "opacity": "1"
    });

});
var docName = "";
var finalname = '';
$(document).on("click", ".autoFillDocDocCard", function () {

    var card = $(this);
    var MName = $("#MName").text().trim();

    function OpenUploadPanel() {
        $("#broswerpanel").css({
            "pointer-events": "auto",
            "opacity": "1"
        });

        docName = card.data("doc");
        $("#uploadTitle").text("Upload " + docName);
    }

  

    if (MName === "") {

        Swal.fire({
            title: "Enter Employee Details",
            html: `
<style>
.empTable{
    width:100%;
    border-collapse:separate;
    border-spacing:0 12px;
}

.empTable td:first-child{
    width:180px;
    font-weight:600;
    font-size:14px;
    color:#2c3e50;
    vertical-align:middle;
    padding-right:12px;
}

.empTable td:last-child{
    width:auto;
}

.empTable input{
    width:100%;
    height:42px;
    border:1px solid #d9d9d9;
    border-radius:8px;
    padding:0 12px;
    font-size:14px;
    outline:none;
    transition:.2s;
}

.empTable input:focus{
    border-color:#0d6efd;
    box-shadow:0 0 0 3px rgba(13,110,253,.15);
}

.req{
    color:#dc3545;
}
</style>

<table class="empTable">

<tr>
    <td>Name <span class="req">*</span></td>
    <td>
        <input type="text"
               id="txtMemberName"
               placeholder="As per Aadhaar">
    </td>
</tr>

<tr>
    <td>Aadhaar No. <span class="req">*</span></td>
    <td>
        <input type="text"
               id="txtAadhaar"
               maxlength="12"
               placeholder="12 Digit Aadhaar Number">
    </td>
</tr>
<tr>
    <td>State <span class="req">*</span></td>
    <td>
        <select id="txtState" class="form-control" style="height:42px;border-radius:8px;">
            <option value="">Select State</option>
        </select>
    </td>
</tr>
<tr>
    <td>PAN No.</td>
    <td>
        <input type="text"
               id="txtPAN"
               maxlength="10"
               placeholder="ABCDE1234F">
    </td>
</tr>

<tr>
    <td>UAN No.</td>
    <td>
        <input type="text"
               id="txtUAN"
               maxlength="12"
               placeholder="Enter UAN Number">
    </td>
</tr>

<tr>
    <td>ESIC No.</td>
    <td>
        <input type="text"
               id="txtESIC"
               maxlength="17"
               placeholder="Enter ESIC Number">
    </td>
</tr>

</table>
`,
            width: "650px",
            allowOutsideClick: false,
            allowEscapeKey: false,
            showCloseButton: true,
            showCancelButton: true,
            confirmButtonText: "Save",
            confirmButtonColor: "rgb(1,25,56)",


            didOpen: () => {

                var states = [
                    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
                    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
                    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
                    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
                    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
                    "Uttar Pradesh", "Uttarakhand", "West Bengal",
                    "Andaman and Nicobar Islands", "Chandigarh",
                    "Dadra and Nagar Haveli and Daman and Diu",
                    "Delhi", "Jammu and Kashmir", "Ladakh",
                    "Lakshadweep", "Puducherry"
                ];

                var ddl = $("#txtState");

                $.each(states, function (_, s) {
                    ddl.append('<option value="' + s + '">' + s + '</option>');
                });

            },

            preConfirm: () => {

                var name = $("#txtMemberName").val().trim();
                var state = $("#txtState").val().trim();
                var aadhaar = $("#txtAadhaar").val().trim();
                var pan = $("#txtPAN").val().trim().toUpperCase();
                var uan = $("#txtUAN").val().trim();
                var esic = $("#txtESIC").val().trim();

                if (name == "") {
                    Swal.showValidationMessage("Please enter your name.");
                    return false;
                }

                if (!/^\d{12}$/.test(aadhaar)) {
                    Swal.showValidationMessage("Please enter a valid 12-digit Aadhaar Number.");
                    return false;
                }
                var state = $("#txtState").val();

                if (state == "") {
                    Swal.showValidationMessage("Please select State.");
                    return false;
                }
                 
                if (pan != "" && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
                    Swal.showValidationMessage("Invalid PAN Number.");
                    return false;
                }
                if (uan != "" && !/^\d{12}$/.test(uan)) {
                    Swal.showValidationMessage("Please enter a valid 12-digit UAN Number.");
                    return false;
                }
                 
                if (esic != "" && !/^\d{10,17}$/.test(esic)) {
                    Swal.showValidationMessage("Please enter a valid ESIC Number.");
                    return false;
                }
                return {
                    Name: name,
                    Aadhaar: aadhaar,
                    state: state,
                    PAN: pan,
                    UAN: uan,
                    ESIC: esic
                };
            }

        }).then((result) => {

            if (result.isConfirmed) {

                var formData = new FormData();

                formData.append("Name", result.value.Name);
                formData.append("AdharCardNumber", result.value.Aadhaar);
                formData.append("state", result.value.state);
                formData.append("PANNumber", result.value.PAN);
                formData.append("PreviousUAN", result.value.UAN);
                formData.append("PreviousESI", result.value.ESIC);

                $.ajax({
                    url: "/worker/UploadName",
                    type: "POST",
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function (res) {

                        SelectAlldetail();
                        OpenUploadPanel();

                    }
                });
            }
        });

        return;
    }

    OpenUploadPanel();

});
//$(document).on("click", ".autoFillDocDocCard", function () {

//    var card = $(this);
//    var MName = $("#MName").text().trim();

//    function OpenUploadPanel() {

//        $("#broswerpanel").css({
//            "pointer-events": "auto",
//            "opacity": "1"
//        });

//          docName = card.data("doc");
//        $("#uploadTitle").text("Upload " + docName);
//    }
   
//    if (MName === "") {

//        Swal.fire({
//            title: "Enter Your Name",
//            html: `
//                <label style="font-weight:600;margin-bottom:8px;display:block;">
//                    Enter your name as per Aadhaar Card
//                </label>

//                <input type="text"
//                       id="txtMemberName"
//                       class="swal2-input"
//                       placeholder="Enter Full Name"
//                       style="margin:0;width:100%;">
//            `,
//            allowOutsideClick: false,
//            allowEscapeKey: false,
//            showCloseButton: true,       
//            showCancelButton: true,
//            showConfirmButton: true,
//            CloseButtonText: "Close",
//            confirmButtonText: "Save",
//            confirmButtonColor: "rgb(1,25,56)",
//            cancelButtonColor: "#6c757d",
//            preConfirm: () => {

//                var newname = $("#txtMemberName").val().trim();

//                if (newname === "") {
//                    Swal.showValidationMessage("Please enter your name.");
//                    return false;
//                }

//                return newname;
//            }

//        }).then((result) => {

//            if (result.isConfirmed) { 
//                var formData = new FormData();
//                finalname = result.value;
//                formData.append("Name", result.value);

//                $.ajax({
//                    url: "/worker/UploadName",
//                    type: "POST",
//                    data: formData,
//                    processData: false,
//                    contentType: false,
//                    success: function (res) { 
//                        SelectAlldetail();
//                    }
//                })

             
//            }

//        });

//        return;
//    }
     
//    OpenUploadPanel();

//});
//================ Upload =================//

$(document).on("click", "#btnUpload", function () {

    $("#filePhoto").click();

});

//================ File Select =================//

$(document).on("change", "#filePhoto", function (e) {

    var file = e.target.files[0];

    if (!file) return;

    var reader = new FileReader();

    reader.onload = function (ev) {

        openCropper(ev.target.result);

    };

    reader.readAsDataURL(file);

});

//================ Camera =================//

$(document).on("click", "#btnCamera", async function () {

    try {

        stream = await navigator.mediaDevices.getUserMedia({
            video: true
        });

        $("#video")[0].srcObject = stream;

        var modal = new bootstrap.Modal(document.getElementById("cameraModal"));
        modal.show();

    }
    catch (e) {

      /*  alert("Camera permission denied.");*/
        Swal.fire('Error', 'Camera permission denied.', 'error');
        return;
    }

});

//================ Capture =================//

$(document).on("click", "#btnCapture", function () {

    var video = document.getElementById("video");
    var canvas = document.getElementById("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    var ctx = canvas.getContext("2d");

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (stream) {

        stream.getTracks().forEach(function (track) {

            track.stop();

        });

    }

    bootstrap.Modal.getInstance(document.getElementById("cameraModal")).hide();

    openCropper(canvas.toDataURL("image/png"));

});

//================ Cropper =================//

function openCropper(image) {

    $("#cropImage").attr("src", image);

    var modal = new bootstrap.Modal(document.getElementById("cropModal"));
    modal.show();

    setTimeout(function () {

        if (cropper) {

            cropper.destroy();

        }

        cropper = new Cropper(document.getElementById("cropImage"), {

            aspectRatio: 1,
            viewMode: 1,
            autoCropArea: 1,
            dragMode: "move",
            background: false,
            responsive: true

        });

    }, 300);

}

//================ Crop =================//

$(document).on("click", "#btnCrop", function () {

    if (!cropper) return;

    var canvas = cropper.getCroppedCanvas({

        width: 300,
        height: 300

    });

    $("#imgProfile").attr("src", canvas.toDataURL("image/png"));

    bootstrap.Modal.getInstance(document.getElementById("cropModal")).hide();
    SetProfileImage(canvas.toDataURL("image/png"))
    SavePhoto();

});

//================ Save =================//



function SetProfileImage(imagePath) {

    if (imagePath && imagePath.trim() !== "") {
        $("#imgProfile")
            .attr("src", imagePath)
            .show();

        $("#defaultUserIcon").hide();
    }
    else {
        $("#imgProfile").hide();
        $("#defaultUserIcon").show();
    }
}
$(document).ready(function () {
    SelectAlldetail();
});
//function SelectAlldetail() {

//    var formData = new FormData();

//    $.ajax({
//        url: "/worker/getdetailocr",
//        type: "POST",
//        data: formData,
//        processData: false,
//        contentType: false,
//        success: function (res) {
//            if (typeof res === "string") {
//                res = JSON.parse(res);
//            }
//            if (!res.Result || res.Result.length === 0)
//                return;

//            var data = res.Result[0];
//            var completed = 0;
         
//            if (data.Name && data.Name != "0") {
//                $("#MName").text(data.Name);
//                $("#welcomeDiv").show();
//            }
//            else {
//                $("#welcomeDiv").hide();
//            }
            
//            // Photo
//            if (data.photo && data.photo != "0") {

//                $("#imgProfile")
//                    .attr("src", data.photo + "?t=" + new Date().getTime()) 
//                    .show();
//                completed++;
//                $("#defaultUserIcon").hide();
//                $("#photoPreview").show();
//                $("#imgProfile").show(); 
//            }
//            else {
                
//                $("#photoPreview").hide();
//                $("#imgProfile").hide();
//                $("#defaultUserIcon").show();
//            }

//            // PAN
//            if (data.PANNumber != "0" && data.PANNumber != null && data.PANNumber != "") {
//                $("#PANPending").hide();
//                $("#PANComplete").show();
//                completed++;
//            } else {
//                $("#PANPending").show();
//                $("#PANComplete").hide();
//            }

//            // Aadhaar
//            if (data.AdharCardNumber != "0" && data.AdharCardNumber != null && data.AdharCardNumber != "") {
//                $("#AadhaarPending").hide();
//                $("#AadhaarComplete").show();
//                completed++;
//            } else {
//                $("#AadhaarPending").show();
//                $("#AadhaarComplete").hide();
//            }

//            // ESI
//            if (data.PreviousESI != "0" && data.PreviousESI != null && data.PreviousESI != "") {
//                $("#ESIPending").hide();
//                $("#ESIComplete").show();
//                completed++;
//            } else {
//                $("#ESIPending").show();
//                $("#ESIComplete").hide();
//            }

//            // UAN
//            if (data.PreviousUAN != "0" && data.PreviousUAN != null && data.PreviousUAN != "") {
//                $("#UANPending").hide();
//                $("#UANComplete").show();
//                completed++;
//            } else {
//                $("#UANPending").show();
//                $("#UANComplete").hide();
//            }

//            // Progress
//            var percentage = (completed / 5) * 100;

//            $("#ProgressBar").css("width", percentage + "%");
//            $("#ProgressText").text(percentage + "%");

//            if (parseInt(percentage) === 100) {
//                $("#btnNext").prop("disabled", false);
//            } else {
//                $("#btnNext").prop("disabled", true);
//            }
//        }
//    });
//}
 
function SelectAlldetail() {

    var formData = new FormData();

    Swal.fire({
        title: "Verifying Documents",
        html: `
            <div style="margin-top:10px">
                <i class="fa fa-spinner fa-spin" style="font-size:40px;color:#3085d6;"></i>
                <br><br>
                <b>Please wait...</b><br>
                We are verifying your uploaded documents.
            </div>
        `,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false
    });

    $.ajax({
        url: "/worker/getdetailocr",
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,

        success: function (res) {

            Swal.close();

            if (typeof res === "string") {
                res = JSON.parse(res);
            }

            if (!res.Result || res.Result.length === 0)
                return;

            var data = res.Result[0];
            var completed = 0;

            

            if (data.Name && data.Name != "0") {
                $("#MName").text(data.Name);
                $("#welcomeDiv").show();
            }
            else {
                $("#welcomeDiv").hide();
            }

            // Photo
            if (data.photo && data.photo != "0") {

                $("#imgProfile")
                    .attr("src", data.photo + "?t=" + new Date().getTime())
                    .show();
                completed++;
                $("#defaultUserIcon").hide();
                $("#photoPreview").show();
                $("#imgProfile").show();
            }
            else {

                $("#photoPreview").hide();
                $("#imgProfile").hide();
                $("#defaultUserIcon").show();
            }

            // PAN
            if (data.PANNumber != "0" && data.PANNumber != null && data.PANNumber != "") {
                $("#PANPending").hide();
                $("#PANComplete").show();
                completed++;
            } else {
                $("#PANPending").show();
                $("#PANComplete").hide();
            }

            // Aadhaar
            if (data.AdharCardNumber != "0" && data.AdharCardNumber != null && data.AdharCardNumber != "") {
                $("#AadhaarPending").hide();
                $("#AadhaarComplete").show();
                completed++;
            } else {
                $("#AadhaarPending").show();
                $("#AadhaarComplete").hide();
            }



            // ESI
            if (data.PreviousESI != "0" && data.PreviousESI != null && data.PreviousESI != "") {
                $("#ESIPending").hide();
                $("#ESIComplete").show();
                completed++;
            } else {
                $("#ESIPending").show();
                $("#ESIComplete").hide();
            }

            // UAN
            if (data.PreviousUAN != "0" && data.PreviousUAN != null && data.PreviousUAN != "") {
                $("#UANPending").hide();
                $("#UANComplete").show();
                completed++;
            } else {
                $("#UANPending").show();
                $("#UANComplete").hide();
            }





            var isPANVerified = (data.PANNumber != "0" &&
                data.PANNumber != null &&
                data.PANNumber != "");

            // Aadhaar
            var isAadhaarVerified = (data.AdharCardNumber != "0" &&
                data.AdharCardNumber != null &&
                data.AdharCardNumber != "");

           
            // Progress
            var percentage = (completed / 5) * 100;

            $("#ProgressBar").css("width", percentage + "%");
            $("#ProgressText").text(percentage + "%");

            if (parseInt(percentage) === 100) {
               
              /*  $("#btnNext").prop("disabled", false).css({"background": "#022B5E","cursor": "pointer" });*/
                window.location.href = '../Dashboard/Workerdashboard';
            } else {
            
           /*     $("#btnNext").prop("disabled", true).css({ "background": "#a4b1c1", "cursor": "not-allowed" });*/
            }

            if (isPANVerified && isAadhaarVerified) {
                $("#btnNext").show();
            } else {
                $("#btnNext").hide();
            }

        },
        error: function () {
            Swal.close();

            Swal.fire({
                icon: "error",
                title: "Verification Failed",
                text: "Something went wrong. Please try again."
            });
        }
    });
}
function SavePhoto() {

    if (!cropper) {

        //alert("Please upload/capture photo first.");
        //return;

        Swal.fire('Error', 'Please upload/capture photo first.', 'error');
        return;

    }

    cropper.getCroppedCanvas({

        width: 300,
        height: 300

    }).toBlob(function (blob) {

        var formData = new FormData();

        formData.append("Photo", blob, "ProfilePhoto.png");
      

        $.ajax({

            url: "/Worker/SavePhoto",

            type: "POST",

            data: formData,

            processData: false,

            contentType: false,

            success: function () {
                $("#photoPreview").show();
              /*  alert("Photo Saved Successfully.");*/
                Swal.fire('success', 'Photo Saved Successfully.', 'success');
               
                SelectAlldetail();
            },

            error: function () {

               /* alert("Error while saving photo.");*/
                Swal.fire('Error', 'Error while saving photo.', 'Error');
                return
            }

        });

    });

}



function redirection()
{
    if(loginType = '7')
    {
        window.location.href = '../RetailSection/NewWorkerRegistraton';
        return;
    }
    else if (loginType = '6')
    {
        window.location.href = '../RetailSection/ContractorRegistration';
        return;
    }
    else if (loginType = '5') {
        window.location.href = '../RetailSection/PrincipleEmployerRegistration';
        return;
    }
}
function redirectotdashboard() {
    window.location.href = '../Dashboard/Workerdashboard';
    return;
}



$(document).ready(function () {
    $("#docFile").change(function () {

        var file = this.files[0];

        if (!file)
            return;


        Swal.fire({
            title: 'Live Document Verification',
            html: `
        <div style="margin-top:10px">
            <i class="fa fa-spinner fa-spin" style="font-size:40px;color:#3085d6;"></i>
            <br><br>
            <b>Please wait...</b><br>
            We're securely verifying your document.
            <br><br>
            <small>This may take a few seconds.</small>
        </div> `,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false
        });
         
          
            var formData = new FormData();

        

      

        var docType = "";

        switch (docName) {
            case "Aadhaar Card":
                docType = "aadhaar";
                break;

            case "PAN Card":
                docType = "pan";
                break;

            case "UAN Card":
                docType = "uan";
                break;

            case "ESIC Card":
                docType = "esic";
                break;

            default:
                Swal.fire('Error', 'Please select a valid document type.', 'error');
                return;
        }
        formData.append("Name", finalname),
            formData.append("EmpName", $("#MName").text()),
        formData.append("DocName", docType);
        formData.append("Photo", file);
            $.ajax({
                url: "/worker/SaveDocument",
                type: "POST",
                data: formData,
                processData: false,
                contentType: false,
               
                success: function (res)
                {

                    if (res.NameMismatch) {

                        Swal.fire({
                            icon: "warning",
                            title: `Hello ${$("#MName").text().trim()}`,
                            html: `
                <div style="font-size:15px;line-height:24px"> 
                    ${res.OCRName}<br><br> 
                    Are you sure you uploaded the correct document?
                </div>`,
                            showCancelButton: true,
                            confirmButtonText: "Yes, Continue",
                            cancelButtonText: "Upload Again",
                            confirmButtonColor: "rgb(1,25,56)",
                            cancelButtonColor: "#d33"
                        }).then((result) => {

                            if (result.isConfirmed)
                            {
                                Swal.fire({
                                    title: "Please Wait",
                                    html: `
       <div style="font-size:15px;">
            📄 We are processing your document.
            <br><br>
            This may take a few seconds.
        </div>
    `,
                                    allowOutsideClick: false,
                                    allowEscapeKey: false,
                                    showConfirmButton: false,
                                    showCloseButton: false,
                                    didOpen: () => {
                                        Swal.showLoading();
                                    }
                                });
                                var formData = new FormData(); 
                                var docType = ""; 
                                switch (docName) {
                                    case "Aadhaar Card":
                                        docType = "aadhaar";
                                        break;

                                    case "PAN Card":
                                        docType = "pan";
                                        break;

                                    case "UAN Card":
                                        docType = "uan";
                                        break;

                                    case "ESIC Card":
                                        docType = "esic";
                                        break;

                                    default:
                                        Swal.fire('Error', 'Please select a valid document type.', 'error');
                                        return;
                                }

                                formData.append("Name", finalname),
                                    formData.append("EmpName", $("#MName").text()),
                                    formData.append("DocName", docType);
                                formData.append("Photo", file);
                                $.ajax({
                                    url: "/worker/AgainSaveDocument",
                                    type: "POST",
                                    data: formData,
                                    processData: false,
                                    contentType: false,

                                    success: function (res) {
                                        Swal.close();
                                        SelectAlldetail();
                                        
                                    }
                                });
                               

                                
                            }

                        });
                   
                        return;
                    }

                    Swal.fire({
                        icon: "success",
                        title: "Document Uploaded Successfully",
                        timer: 1500,
                        showConfirmButton: false
                    });
                    SelectAlldetail();
                }
            });

      

    });

});