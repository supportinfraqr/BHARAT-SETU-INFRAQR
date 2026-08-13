app.GrivancesController = function ($scope, $element, $filter, myService) {




    $scope.BindTiles = function () {
        var collectionobj = {};
        collectionobj.Action = 10;
        collectionobj.Id = LoginId;
        collectionobj.UserId = MapId
        var getData = myService.methode('POST', "../Grievances/getGrivances", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.BindTilesList = response.data.Result;
            $scope.InProgressCount = response.data.Result.filter(function (item) {
                return item.CStatus !== 'Complete' &&
                    item.CStatus !== 'ReOpen';
            }).length;

            $scope.OpenCount = response.data.Result.filter(function (item) {
                return item.CStatus == 'ReOpen'
            }).length;

            $scope.Resolved = response.data.Result.filter(function (item) {
                return item.CStatus == 'Complete'
            }).length;


        });
    }


    $scope.BindCommunication = function () {
        var collectionobj = {};

        var urlParams = new URLSearchParams(window.location.search);
        collectionobj.GId = urlParams.get('Id');
        collectionobj.Action = 12;
        collectionobj.Id = LoginId;
        collectionobj.UserId = MapId
        collectionobj.Reaction = $('#message').val();
        var getData = myService.methode('POST', "../Grievances/getGrivances", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.Communication = response.data.Result;
            $('#message').val('');

        });
    }







    $scope.BindGrivances = function (PartyId) {
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.Id = LoginId;
        var getData = myService.methode('POST', "../Grievances/getGrivances", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.GrivancesList = response.data.Result;
        });
    }


    $scope.BindGrivancesDetail = function () {
        var collectionobj = {};
        collectionobj.Action = 6;

        var urlParams = new URLSearchParams(window.location.search);
        collectionobj.Id = urlParams.get('Id');
        collectionobj.UserId = LoginId
        var getData = myService.methode('POST', "../Grievances/getGrivances", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.GrivancesDetailList = response.data.Result;
        });
    }


    $scope.BindTracking = function () {
        var collectionobj = {};
        collectionobj.Action = 9;

        var urlParams = new URLSearchParams(window.location.search);
        collectionobj.Id = urlParams.get('Id');
        collectionobj.UserId = LoginId
        var getData = myService.methode('POST', "../Grievances/getGrivances", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.GrivancesTracking = response.data.Result;
        });
    }

    $scope.UpdateASMarked = function () {
        var collectionobj = {};
        collectionobj.Action = 7;

        var urlParams = new URLSearchParams(window.location.search);
        collectionobj.Id = urlParams.get('Id');
        collectionobj.UserId = LoginId
        var getData = myService.methode('POST', "../Grievances/getGrivances", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.Result[0].Message == '-1') {
                showMsgBox('Allready Marked as Resolved.');
                $scope.BindTracking();
				$scope.BindGrivances();
            }
            else { $scope.GrivancesTracking = response.data.Result; }
        });
    }



    $scope.UpdateAsReOpen = function () {
        var collectionobj = {};
        collectionobj.Action = 8;
        var urlParams = new URLSearchParams(window.location.search);
        collectionobj.Id = urlParams.get('Id');
        collectionobj.UserId = LoginId
        var getData = myService.methode('POST', "../Grievances/getGrivances", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.Result[0].Message == '-1') {
                showMsgBox('Allready Marked as Resolved.');
                $scope.BindTracking();
				$scope.BindGrivances();
            }
            else { $scope.GrivancesTracking = response.data.Result; }

        });
    }

    $scope.Reaction = function () {
        var collectionobj = {};
        collectionobj.Action = 11;

        var urlParams = new URLSearchParams(window.location.search);
        collectionobj.Id = urlParams.get('Id');
        collectionobj.Reaction = $('#VendorReaction').val();
        collectionobj.Documents = $scope.LetterAttachment_Preview;
        var getData = myService.methode('POST', "../Grievances/getGrivances", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.Result[0].Message == '1') {
                //showMsgBox('Reaction Update Successfully');
                showMsgBox("1");
                $scope.BindTracking();
                $scope.BindGrivances();
            }

        });
    }
    $scope.ClientReaction = function () {
        var collectionobj = {};
        collectionobj.Action = 13;

        var urlParams = new URLSearchParams(window.location.search);
        collectionobj.Id = urlParams.get('Id');
        collectionobj.Reaction = $('#ClientReaction').val();
        var getData = myService.methode('POST', "../Grievances/getGrivances", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.Result[0].Message == '1') {
                //showMsgBox('Reaction Update Successfully');
                showMsgBox("1");
                $scope.BindTracking();
                $scope.BindGrivances();
            }

        });
    }


    $scope.uploadFile = function (fieldName, input) {
        if (input.files && input.files[0]) {
            var file = input.files[0];
            var maxSize = 3 * 1024 * 1024;
            var allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg'];

            var extension = file.name.split('.').pop().toLowerCase();
            if (allowedExtensions.indexOf(extension) === -1) {
                swal("Invalid File", "Only PDF, PNG, JPG and JPEG files are allowed.", "error");
                input.value = '';
                return;
            }
            if (file.size > maxSize) {
                swal("File Too Large", "Maximum allowed file size is 3 MB.", "error");
                input.value = '';
                return;
            }
            var fileNameField = fieldName.replace("FilePath", "FileName");
            $scope[fileNameField] = file.name;

            var filerdr = new FileReader();

            filerdr.onload = function (e) {
                $scope[fieldName + "_Preview"] = e.target.result;
                $scope.$applyAsync();
            };

            filerdr.readAsDataURL(file);
        }
    };

    $scope.Approveletter = function (Id) {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Id = Id;
        collectionobj.LoginId = LoginId;
        collectionobj.Action = 14;
        $scope.hideLoader();
        var getData = myService.methode('POST', ("../Grievances/ApproveLetter"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            showMsgBox(response.data.Result);
            $scope.BindGrivances();
        });
    }

    $scope.Viewletter = function (Id) {

        $scope.IsDownloading = true;
        var collectionobj = {};
        collectionobj.Action = 15;
        collectionobj.Id = Id;
        collectionobj.UserId = MapId
        var getData = myService.methode('POST', "../Grievances/getGrivances", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            $scope.Viewletterdetails = response.data.Result[0];

            var text = ($scope.Viewletterdetails.Details || "").toLowerCase();

            if (text.includes("salary") || text.includes("wages") || text.includes("payment")) {
                $scope.subject = "Salary Payment Issue";
            }
            else if (text.includes("overtime") || text.includes("ot")) {
                $scope.subject = "Overtime Payment Issue";
            }
            else if (text.includes("pf") || text.includes("uan") || text.includes("epf")) {
                $scope.subject = "PF Related Issue";
            }
            else if (text.includes("esic") || text.includes("esi")) {
                $scope.subject = "ESIC Related Issue";
            }
            else if (text.includes("bonus")) {
                $scope.subject = "Bonus Payment Issue";
            }
            else if (text.includes("leave") || text.includes("holiday")) {
                $scope.subject = "Leave Related Issue";
            }
            else if (text.includes("harassment") || text.includes("abuse") || text.includes("misbehave")) {
                $scope.subject = "Workplace Harassment";
            }
            else if (text.includes("termination") || text.includes("fired") || text.includes("removed")) {
                $scope.subject = "Employment Termination Issue";
            }
            else if (text.includes("transfer")) {
                $scope.subject = "Transfer Related Issue";
            }
            else if (text.includes("attendance")) {
                $scope.subject = "Attendance Dispute";
            }
            else if (text.includes("id card") || text.includes("identity card")) {
                $scope.subject = "ID Card Issue";
            }
            else if (text.includes("uniform")) {
                $scope.subject = "Uniform Related Issue";
            }
            else if (text.includes("safety") || text.includes("accident")) {
                $scope.subject = "Workplace Safety Issue";
            }
            else if (text.includes("canteen") || text.includes("food")) {
                $scope.subject = "Canteen Facility Issue";
            }
            else if (text.includes("accommodation") || text.includes("hostel")) {
                $scope.subject = "Accommodation Issue";
            }
            else if (text.includes("contractor")) {
                $scope.subject = "Contractor Related Complaint";
            }
            else if (text.includes("manager") || text.includes("supervisor")) {
                $scope.subject = "Supervisor Complaint";
            }
            else if (text.includes("deduction")) {
                $scope.subject = "Salary Deduction Issue";
            }
            else if (text.includes("bank")) {
                $scope.subject = "Bank Account Issue";
            }
            else if (text.includes("insurance")) {
                $scope.subject = "Insurance Related Issue";
            }
            else if (text.includes("gratuity")) {
                $scope.subject = "Gratuity Issue";
            }
            else {
                $scope.subject = "General Worker Grievance";
            }

            $scope.DownloadGrievancePDF();
        });
    }

    $scope.DownloadGrievancePDF = function () {
        var element = document.getElementById('grievanceLetterTemplate');
        element.style.display = "block";
        element.style.position = "absolute";
        element.style.left = "-99999px";
        element.style.top = "0";

        setTimeout(function () {

            html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            }).then(function (canvas) {

                var imgData = canvas.toDataURL('image/png');

                var pdf = new jspdf.jsPDF('p', 'mm', 'a4');

                var pdfWidth = pdf.internal.pageSize.getWidth();
                var pdfHeight = pdf.internal.pageSize.getHeight();

                var imgWidth = pdfWidth;
                var imgHeight = (canvas.height * pdfWidth) / canvas.width;

                var heightLeft = imgHeight;
                var position = 0;

                pdf.addImage(
                    imgData,
                    'PNG',
                    0,
                    position,
                    imgWidth,
                    imgHeight
                );

                heightLeft -= pdfHeight;

                while (heightLeft > 0) {

                    position = -(imgHeight - heightLeft);

                    pdf.addPage();

                    pdf.addImage(
                        imgData,
                        'PNG',
                        0,
                        position,
                        imgWidth,
                        imgHeight
                    );

                    heightLeft -= pdfHeight;
                }

                pdf.save('GrievanceLetter.pdf');

                // Dobara hide kar do
                element.style.display = "none";

            }).catch(function (err) {

                console.error('PDF Error:', err);

                element.style.display = "none";

            });

        }, 100);
        $scope.IsDownloading = false;
    };

}