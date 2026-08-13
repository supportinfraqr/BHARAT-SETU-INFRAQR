 
    $("#btnUploadFile").click(function () {
        if ($("#excelfile").val() != "") {
            var regex = /^([a-zA-Z0-9\s_\\.\-:])+(.xlsx|.xls)$/;
            /*Checks whether the file is a valid excel file*/
            if (!regex.test($("#excelfile").val().toLowerCase())) {
                alert("Please upload a valid Excel file!");
                return false;
            }
            else {
                UploadSelectedExcelsheet();
            }
        }
        else
        {
            alert("Please upload a Excel file!");
            return false;
        }
    });
//UploadSelectedImagesForPersonalisation();

function UploadSelectedExcelsheet() {
    var data = new FormData();
    var i = 0;
    var fl = $("#excelfile").get(0).files[0];

    if (fl != undefined) {
            
        data.append("file", fl);

    }        
    var Url = Path("RetailSectionController", "UploadExcelsheet");

    $.ajax({
        type: "POST",
        url: Url,
        contentType: false,
        processData: false,
        data: data,
        success: function (result)
        { 
            alert(result);
            return false;
        },
        error: function (xhr, status, p3, p4) {
            var err = "Error " + " " + status + " " + p3 + " " + p4;
            if (xhr.responseText && xhr.responseText[0] == "{")
                err = JSON.parse(xhr.responseText).Message;
            alert(err);
            return false;
        }
    });
} 