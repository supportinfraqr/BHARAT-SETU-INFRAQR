app.VendorCommunicationController = function ($scope, $element, $filter, myService) {
    $scope.SetFocus('#txtFarmCode');
    $scope.ComFreeze = false;

    $scope.downloadAll = function () {
        $scope.selectedone = [];

        for (let i = 0; i < $scope.InDocList.length; i += 1) 
        {
            setTimeout(function () {
                //if ($scope.InDocList[i].IsDefault == true) {
                    $scope.selectedone.push($scope.InDocList[i].DocumentFile);
                    $scope.id = $scope.InDocList[i].name;
                    var link = document.createElement('a');
                    var ext = /^.+\.([^.]+)$/.exec($scope.InDocList[i].DocumentFile);
                    var extension = '';

                    if (ext[1] == 'pdf') {
                        extension = '.pdf'
                        link.href = $scope.InDocList[i].DocumentFile;
                        link.download = $scope.InDocList[i].InvoiceNo + '_' + $scope.InDocList[i].DocumentName + extension;
                        link.click();
                        link.remove();

                    }
                    else if (ext[1] == 'jpeg') {
                        extension = '.jpeg'
                        link.href = $scope.InDocList[i].DocumentFile;
                        link.download = $scope.InDocList[i].InvoiceNo + '_' + $scope.InDocList[i].DocumentName + extension;
                        link.click();
                        link.remove();
                    }

                //}
            }, i * 200);
        }

    }

     

    $scope.SetValue = function (ID, fuCandidatePhoto) {
        Index = ID;
        $(fuCandidatePhoto).click();
    }
    $scope.show = function (input, imgfileid)
    { 
       // fileName = document.querySelector(input.id).value;
        if (input.files && input.files[0]) {
            var filerdr = new FileReader();
            filerdr.onload = function (e) {
                $scope.FileDoc = e.target.result;
              
                $scope.$applyAsync(); 
            }
            filerdr.readAsDataURL(input.files[0]);
        }
        else {
            $scope.Image = '';
            $scope.$applyAsync(); 
        }
    };
    
    $scope.ValidateFileDoc = function (InvoiceNo, SNO, DocumentName, DocumentId, FormatFile, index, ConversationId)
    {
        fileName = document.querySelector('#fuCandidatePhoto' + index).value;
        if (fileName != "")
        {
            extension = fileName.substring(fileName.lastIndexOf('.') + 1);
            if (FormatFile == extension) {
                $scope.UploadDocument(InvoiceNo, SNO, DocumentName, DocumentId, FormatFile, index, ConversationId);
            }
            else if(FormatFile == 'image')
            {
                if(extension=='jpg')
                {
                    $scope.UploadDocument(InvoiceNo, SNO, DocumentName, DocumentId, FormatFile, index, ConversationId);
                }
                else if(extension=='png')
                {
                    $scope.UploadDocument(InvoiceNo, SNO, DocumentName, DocumentId, FormatFile, index, ConversationId);
                }
                else {
                    showMsgBox('999', 'Rejected', 'File Not Correct Format,please Upload in jpg or png format', 'warning', 'btn-warning');
                    return;
                }
            }
            else {
                showMsgBox('999', 'Rejected', 'File Not Correct Format,please Upload in ' + FormatFile + ' format', 'warning', 'btn-warning');
                return;
            }
        } else {
            showMsgBox('999', 'OOps !', 'File Not Found,Please Upload in proper way.', 'warning', 'btn-warning');
            return;
        }
        
    }
    

    $scope.UploadDocument = function (InvoiceNo, SNO, DocumentName, DocumentId, FormatFile, index, ConversationId) {
        debugger;
       if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
          
              
            collectionobj.InvoiceId = InvoiceNo;
            collectionobj.ConversationId = ConversationId;
            collectionobj.SNO = SNO;
            collectionobj.DocumentName = DocumentName;
            collectionobj.DocumentId = DocumentId;
            collectionobj.FileDoc = $scope.FileDoc; 
            collectionobj.CreatedBy = LoginId;  
            collectionobj.ActionType = 8;
           
            var getData = myService.methode('POST', "../VenInvoice/UploadDoc", '{obj:' + JSON.stringify(collectionobj) + '}');

            getData.then(function (response) {
             
                $scope.GetDocument($scope.RegInvoiceNo);
                //$scope.FireEmail(15, InvoiceNo, MapId);
                showMsgBox(response.data.Result);
             
            });
        }
    }


    
    $scope.BindCommunication = function () {
        if ($scope.Controlbyuser == undefined || $scope.Controlbyuser == "")
        {
            $scope.Controlbyuser = 'Draft';
             
        }
        if ($scope.SearchCom == '' || $scope.SearchCom == 'undefined' || $scope.SearchCom== undefined)
        {
            $scope.SearchCom = '';
        }
        
        var collectionobj = {}; 
        collectionobj.Action = 13;
        collectionobj.Id = LoginId;
        collectionobj.ConversationId = $scope.SearchCom;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.InvoiceList = response.data;
        });
    };



    $scope.ChkDefaultFile = function () {
        for (var i = 0; i < $scope.InDocList.length; i++) {
            if ($scope.InDocList[i].IsUpload == '' && $scope.InDocList[i].IsDefault == true) {
                showMsgBox('999', 'Auditor Requirement', 'Please Attact Document of ' + $scope.InDocList[i].DocumentName, 'warning', 'btn-warning')
                return;
            }
        }
        $scope.SaveAuditorRecord();
    }

    $scope.SaveAuditorRecord = function ()
    {
        
        var collectionobj = {};
        collectionobj.InvoiceId = $scope.RegInvoiceNo;
        collectionobj.ClientId = $scope.ClientId;
        collectionobj.ConversationId = $scope.ConversationId;
        collectionobj.CreatedBy = LoginId;
        collectionobj.ActionType = 16
        var getData = myService.methode('POST', "../VenInvoice/ApproveUploadDoc", '{obj:' + JSON.stringify(collectionobj) + '}'); 
        getData.then(function (response) {
            showMsgBox('999', 'Approve', response.data.Result, 'success', 'btn-success')
            $scope.BindControl();
            $scope.FireEmail(2, $scope.RegInvoiceNo,'');
            });
    }

    $scope.BindControl = function () {
        var collectionobj = {};
        $scope.ComFreeze = false;
        $scope.InvoiceList = "";
        collectionobj.Id = LoginId;
        $scope.InDocList = "";
        if ($scope.Controlbyuser == 'Draft') {
            collectionobj.Action = 13;
           
        }
        else if ($scope.Controlbyuser == '0') {
            collectionobj.Action = 9;
        }
        else if ($scope.Controlbyuser == '1') {
            collectionobj.Action = 23;
        }

        if ($scope.SearchCom == '' || $scope.SearchCom == 'undefined' || $scope.SearchCom == undefined) {
            $scope.SearchCom = '';
        }
        collectionobj.ConversationId = $scope.SearchCom;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.InvoiceList = response.data;

        });
    }
    $scope.BindAllDocument = function () {
        var collectionobj = {};
        collectionobj.Action = 6;
        var getData = myService.methode('POST', "../DocumentMaster/GetDocumentMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.AllDocument = response.data;
        });
    }
    $scope.SetMessage = function (Message)
    {
        $scope.Message = 'Please Upload this '+ Message + ' Document  for Further Communication';

    }
    var ConvertionId = '';
    $scope.GetDocument = function (Id) { 
       
        var collectionobj = {};
        if ($scope.Controlbyuser == 'Draft') {
            collectionobj.Action = 14;
        }
        else if ($scope.Controlbyuser == '0') {
            collectionobj.Action = 10;
        }
        else if ($scope.Controlbyuser == '1')
        {
            collectionobj.Action = 24;
        }
     
        collectionobj.Updatedby = LoginId;
        collectionobj.Id = Id;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.InDocList = '';
                    $scope.Pendding = response.data[0].Pendding;
                    $scope.Submit = response.data[0].Submit;
                    $scope.Reject = response.data[0].Reject;
                    $scope.NewReq = response.data[0].NewReq;
                    $scope.TotalDoc = response.data[0].TotalDoc;
                    $scope.IDATE = response.data[0].InvDate;
                    $scope.ClientName = response.data[0].Name;
                    $scope.ClientId = response.data[0].ClientId;
                    $scope.Location = response.data[0].Location;
                    $scope.RegInvoiceNo = response.data[0].RegInvoiceNo;
                    $scope.InvoiceNo = response.data[0].InvoiceNo;
                    $scope.HeaderInvoice = response.data[0].HeaderInvoice;
                   
                    $scope.DayLeft = response.data[0].DayLeft; 
                     
                    if ($scope.DayLeft =="0")
                    {
                        $('.lbldayleft').css('color','red');
                        $scope.DayLeft = 'Day Left : Uploading Time Expire, Please Contact to Admin';
                        $scope.TimeLeftMsg = true;
                       
                    }
                    else {
                        $('.lbldayleft').css('color','green');
                        $scope.DayLeft = 'Last day of document submision: ' + response.data[0].WIEndDate + ' ;  Day Left :' + $scope.DayLeft;
                        $scope.TimeLeftMsg = false;
                    }
                    if ($scope.HeaderInvoice == "Unique No : ") {
                        $scope.WhichDate = "Created Date : ";
                    }
                    else {
                        $scope.WhichDate = "Invoice Date :";
                    }
                    $scope.ConversationId = response.data[0].ConversationId;
                    $scope.InDocList = response.data;
                    $scope.$applyAsync();

            }
          
        });
    };


    $scope.ReDocbind = function (Id) {

        var collectionobj = {};
        if ($scope.Controlbyuser == 'Draft') {
            collectionobj.Action = 14;
        }
        else if ($scope.Controlbyuser == '0') {
            collectionobj.Action = 10;
        }
        else if ($scope.Controlbyuser == '1') {
            collectionobj.Action = 24;
        }

        collectionobj.Updatedby = LoginId;
        collectionobj.Id = Id;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {  
                $scope.TimeLeft = response.data[0].TimeLeft; 
                if ($scope.TimeLeft == "00:00:00") {
                    $scope.TimeLeft='Uploading Time Expire, Please Contact to Admin'
                    $scope.TimeLeftMsg = true;
                    $scope.GetDocument(Id);
                }
                else {
                    $scope.TimeLeftMsg = false;
                }
                  
            }

        });
    };
 
    $scope.TimeLeftMsg = false;
    $scope.timmerforcheck = function (timeleft, Id)
    {
        var i = 360;
        setInterval(() => {
            if (i == 0)
            {
                document.location.href = "../Communication/vCommunication";
                return;
            }
            else{
                $scope.ReDocbind(Id);
            } 
            i = i - 1;  
        }, 3000);
    }

    $scope.ConversationId = '';
    $scope.SetValues = function (Id) {
        $scope.ComFreeze = true;
        $scope.ConversationId = Id;
        $scope.GetDocument(Id);
        var collectionobj = {};
        collectionobj.Action =4 ;
        collectionobj.Id = Id;
        collectionobj.Updatedby = LoginId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0)
            { 
                $scope.InList = response.data; 
                //if (response.data[0].InvoiceNo != "")
                //{
                //    $scope.InvoiceNo = response.data[0].InvoiceNo;
                //} 
            }
 
        });
    };
    

    $scope.SendMessage = function () {
        if ($('textarea#btn-input').val() != '')
        {
            var collectionobj = {};
            collectionobj.Action = 12;
            collectionobj.InvoiceNo = $scope.RegInvoiceNo;
            collectionobj.ConversationId = $scope.ConversationId;
            collectionobj.Conversation = $('textarea#btn-input').val();
            var getData = myService.methode('POST', "../Communication/IUDCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                $scope.SetValues($scope.RegInvoiceNo);
                showMsgBox('999', 'Vendor To Auditor', response.data.Result, 'success', 'btn-success')
            });

        }
       
    }

    $scope.UploadDoc = function (Id, SNO) {
        var collectionobj = {};
        collectionobj.Action = 11;
        collectionobj.Id = Id;
        collectionobj.SNO = SNO;
        var getData = myService.methode('POST', "../Communication/IUDCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.GetDocument(Id);
            $scope.SetValues(Id);
            showMsgBox(response.data.Result)

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

    $scope.ReqRecord = function (Id, SNO) {
        var collectionobj = {};
        collectionobj.Action = 7; 
        collectionobj.Id = Id;
        collectionobj.SNO = SNO;
        var getData = myService.methode('POST', "../Communication/IUDCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.GetDocument(Id);
            $scope.SetValues(Id);
            showMsgBox(response.data.Result)
           
        });
    }
     

    $scope.ClearControl = function (flag) {
        if (flag == 1) {
            $scope.ResetControl(flag);
        }
        else {
            clearConfirmbox("Do you want to clear fields?", function () { $scope.ResetControl(0); });
        }
    };

    $scope.ResetControl = function (flag) {
        debugger;
        $scope.Save = "Save";
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.FarmerId = "";
        $scope.BindFarm();
        $scope.Description = "";
        $scope.IsActive = "";
        $scope.SetFocus('#txtFarmCode');
        $scope.hfId = "";
        $scope.FarmerMasterList = [];
        if (flag == 0) {
            showMsgBox('4');
        };

    } 
    /*Search Button Click Event*/
    

   

    /*Refresh Search Table Record*/
    $(document).on("click", ".RefreshSearchTable", function (e) {
        debugger;
        var panelToRefresh = $(this).closest('.panel').find('.refresh-container');
        var dataToRefresh = $(this).closest('.panel').find('.panel-wrapper');
        var loadingAnim = panelToRefresh.find('.loading-progress');
        panelToRefresh.show();
        setTimeout(function () {
            loadingAnim.addClass('la-animate');
        }, 100);
        $scope.started();
        return false;
    });
 
}