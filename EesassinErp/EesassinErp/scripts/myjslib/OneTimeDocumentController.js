app.OneTimeDocumentController = function ($scope, $element, $filter, myService) {
    $scope.SetFocus('#txtSNO');
   
    $scope.DocumentList = [];


    $scope.BindVendor = function () {
        var collectionobj = {};
        collectionobj.Action = 31;
        collectionobj.Updatedby = MapId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.VendorList = response.data
            }

        });
    };

    $scope.DocumentList.push({
        SNO: "",
        Description: "",
        FileDoc: "",
        VaildFrom: "",
        VaildTo: "" 
    });
    var Index = "";
    $scope.SetValue = function (ID, fuCandidatePhoto) {
        Index = ID;
        $(fuCandidatePhoto).click();
    }
    $scope.show = function (input, imgfileid) {
        if (input.files && input.files[0]) {
            var filerdr = new FileReader();
            filerdr.onload = function (e) {
                $scope.InOneTimeDocList[Index].FileDoc = e.target.result;
                $scope.$applyAsync(); 
            }
            filerdr.readAsDataURL(input.files[0]);
        }
        else {
            $scope.Image = '';
            $scope.$applyAsync(); 
        }
    };
    $scope.UploadValidDoc = function(DocumentName, Id, Index, AllowFileUpload, AllowExpire)
    {
        if ($scope.InOneTimeDocList[Index].Description == "")
        {
            showMsgBox('999', 'Validation', 'Field not empty', 'warning', 'btn-warning')
            return;
        }
        if ($scope.InOneTimeDocList[Index].Description != null) {
            var deslength = $scope.InOneTimeDocList[Index].Description.replace(/ /g, '').length;

            if (DocumentName == 'PAN') {
                if (deslength > 10 || deslength < 10)
                {
                    showMsgBox('999', 'Validation', 'Enter a Valid PAN, Should be 10 charcter', 'warning', 'btn-warning')
                }
                else {
                    $scope.AfterCheckPAN(DocumentName, Id, Index, AllowFileUpload, AllowExpire);
                }
            }
            else if (DocumentName == 'SIN')
            {
                if (deslength > 21 || deslength < 21) {
                    showMsgBox('999', 'Validation', 'Enter a Valid SIN,Sholud be 21 charcter', 'warning', 'btn-warning')
                }
                else {
                    $scope.AfterCheckPAN(DocumentName, Id, Index, AllowFileUpload, AllowExpire);
                }
            }
            else if (DocumentName == 'CIN') {
                if (deslength > 21 || deslength < 21) {
                    showMsgBox('999', 'Validation', 'Enter a Valid CIN,Sholud be 21 charcter', 'warning', 'btn-warning')
                }
                else {
                    $scope.AfterCheckPAN(DocumentName, Id, Index, AllowFileUpload, AllowExpire);
                }
            } 
            else if (DocumentName == 'PIN CODE') {
                if (deslength !=6) {
                    showMsgBox('999', 'Validation', 'Enter a Valid PIN CODE,Sholud be 6 charcter', 'warning', 'btn-warning')
                }
                else {
                    $scope.AfterCheckPAN(DocumentName, Id, Index, AllowFileUpload, AllowExpire);
                }
            }
            else if (DocumentName == 'Contact No') 
            {
                var smobileno = $scope.InOneTimeDocList[Index].Description;
                var filter = /^[0-9]+$/;
              
                if(deslength == 10)
                {
                    if (filter.test(smobileno)) {
                        $scope.AfterCheckPAN(DocumentName, Id, Index, AllowFileUpload, AllowExpire);
                        
                    }
                    else {
                        showMsgBox('999', 'Validation', 'Enter a Valid Contact No, Sholud be 10 DIGITS', 'warning', 'btn-warning')
                    } 
                }
                else { showMsgBox('999', 'Validation', 'Enter a Valid Contact No, Sholud be 10 DIGITS', 'warning', 'btn-warning') }
            
            }
            else if (DocumentName == 'Email Id')
            { 
                var semail = $scope.InOneTimeDocList[Index].Description;
                var filter = /^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;
                if (filter.test(semail))
                {
                    $scope.AfterCheckPAN(DocumentName, Id, Index, AllowFileUpload, AllowExpire);
                }
                else {
                    showMsgBox('999', 'Validation', 'Enter a Valid Email Id', 'warning', 'btn-warning')
                }
            }
            else {
                $scope.AfterCheckPAN(DocumentName, Id, Index, AllowFileUpload, AllowExpire);
            }
        }
        else {
            showMsgBox('999', 'Validation', 'Field not empty', 'warning', 'btn-warning')
        }
    }

    $scope.AfterCheckPAN = function (DocumentName, Id, Index, AllowFileUpload, AllowExpire)
    {
        if ($scope.InOneTimeDocList[Index].Description != null)
        { 
            if ($scope.InOneTimeDocList[Index].AllowExpire == 1)
            {
                if ($scope.InOneTimeDocList[Index].VaildFrom == null) {
                    showMsgBox('999', 'Validation', 'Enter a Valid Date', 'warning', 'btn-warning')
                }
                else if ($scope.InOneTimeDocList[Index].VaildTo == null) {
                    showMsgBox('999', 'Validation', 'Enter a Valid Date', 'warning', 'btn-warning')
                }
               else if ($scope.InOneTimeDocList[Index].AllowFileUpload == 1) {

                    if ($scope.InOneTimeDocList[Index].FileDoc == null) {

                        showMsgBox('999', 'Validation', 'Upload a file', 'warning', 'btn-warning')
                    }
                    else {
                        $scope.UploadDocument(Id, Index);
                    }
                }
                else {
                    $scope.UploadDocument(Id, Index);
                }
                 
            }
            else {
                if ($scope.InOneTimeDocList[Index].AllowFileUpload == 1) {

                    if ($scope.InOneTimeDocList[Index].FileDoc ==null) { 

                        showMsgBox('999', 'Validation', 'Upload a file', 'warning', 'btn-warning')
                    }
                    else {
                        $scope.UploadDocument(Id, Index);
                    }
                }
                else {
                    $scope.UploadDocument(Id, Index);
                }
            }
        }
        else {
            showMsgBox('999', 'Validation', 'Field not empty', 'warning', 'btn-warning')
        }

        
    }
    $scope.UploadDocument = function (DocumentId, Index) {
        debugger;
       
            $scope.showLoader();
 
            var collectionobj = {}; 
            collectionobj.Id = DocumentId;
            collectionobj.Description = $scope.InOneTimeDocList[Index].Description;
            collectionobj.FileDoc = $scope.InOneTimeDocList[Index].FileDoc;
            collectionobj.VaildFrom = moment($scope.InOneTimeDocList[Index].VaildFrom, "DD-MMM-YYYY").format('YYYY-MM-DD') == 'Invalid date' ? '' : moment($scope.InOneTimeDocList[Index].VaildFrom, "DD-MMM-YYYY").format('YYYY-MM-DD');
            collectionobj.VaildTo = moment($scope.InOneTimeDocList[Index].VaildTo, "DD-MMM-YYYY").format('YYYY-MM-DD') == 'Invalid date' ? '' : moment($scope.InOneTimeDocList[Index].VaildTo, "DD-MMM-YYYY").format('YYYY-MM-DD');
            collectionobj.Action = 1;
            collectionobj.Createdby = LoginId;
           
            var getData = myService.methode('POST', "../DocumentMaster/IUDOneTimeDocumentMaster", '{obj:' + JSON.stringify(collectionobj) + '}');

            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.BindDocument();
                    //$scope.ClearControl(1);
                }
            }); 
      
    }

    $scope.PrintRecord = function () {

        var popupWin = window.open('', '_blank');
        popupWin.document.open();
        print = $('#printDiv').html();
        var head = '<html><head><title>One Time Document</title><head><style>.hidecss { display: none };.showcss{display: block}</style></head><body onload="window.print()" class="dt-print-view">' + print + '</body></html>';
        popupWin.document.write(head); 
        setTimeout(function () { popupWin.document.close(); }, 1000);
    };

    $scope.BindDocument = function (UserId) {
         

        if (UserId == "" || UserId == undefined || UserId == "undefined")
        { UserId=LoginId }

        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.Id = UserId;
        var getData = myService.methode('POST', "../DocumentMaster/GetOneTimeDocumentMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.InOneTimeDocList = response.data;
        });
    };
    $scope.IsView = '0';
    $scope.AllUserListsLoad = function (PartyId) {
        var collectionobj = {};
        collectionobj.ActionType = 6;
        collectionobj.Id = PartyId;
        var getData = myService.methode('POST', "../RetailSection/GetEmployeeMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.AllUserList = response.data.Result;
            $scope.IsView = '1';
        });
    }
    $scope.SaveAuditorRecord = function ()
    {  
        var collectionobj = {};
        collectionobj.InvoiceId = $scope.InvoiceNo;
        collectionobj.ActionType = 16
        var getData = myService.methode('POST', "../VenInvoice/ApproveUploadDoc", '{obj:' + JSON.stringify(collectionobj) + '}');

        getData.then(function (response) {
            showMsgBox('999', 'Approve', response.data.Result, 'success', 'btn-success')
        
            });
    }

 
    $scope.ApproveRecord = function (Id,SNO)
    {
        var collectionobj = {};
        collectionobj.Action = 11;
        collectionobj.Id = Id;
        collectionobj.SNO = SNO;
        var getData = myService.methode('POST', "../Communication/IUDCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.GetDocument(Id);
            $scope.SetValues(Id);
            showMsgBox('999', 'Upload', response.data.Result, 'success', 'btn-success') 

        });
    }
   
}