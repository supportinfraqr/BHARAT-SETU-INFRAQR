app.CommunicationController = function ($scope, $element, $filter, myService) {
    $scope.SetFocus('#txtFarmCode');
    $scope.IsSumitted = 0; 
    $scope.StatusId = "0";
    $scope.SortId = "2";


     
    $scope.application = [];   

    $scope.selected = function() {
        $scope.application = $filter('filter')($scope.tableDatas, {
            checked: true
        });
    }

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
     
    
    $scope.BindCommunication = function () {
        $scope.ClickShow = false;
        var collectionobj = {};
        collectionobj.Action = 3;
        collectionobj.Id = MapId;
        collectionobj.VendorId = $scope.SortId;
        collectionobj.AuditorId = $scope.StatusId;

        if ($scope.SearchCom == '' || $scope.SearchCom == 'undefined' || $scope.SearchCom == undefined) {
            $scope.SearchCom = '';
        }
        collectionobj.ConversationId = $scope.SearchCom;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.InvoiceList = response.data;
        });
    };

   
    $scope.BindAllDocument = function () {
        var collectionobj = {};
        collectionobj.Action = 6;
        var getData = myService.methode('POST', "../DocumentMaster/GetDocumentMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.AllDocument = response.data;
        });
    }
    var DocName = "";
    $scope.SetMessage = function ()
    {
        $scope.dataList = [];
        $scope.dataList = $filter('filter')($scope.AllDocument, { 'Id': $scope.ReqNewDoc });
        DocName = $scope.dataList[0].DocumentName;
        if (DocName != undefined || DocName != '')
        { 
            $scope.Message = 'Please Upload this ' + DocName + ' Document  for Further Communication';

        }
      
    }
    $scope.GetDocument = function (Id, ConversationId) {
        $scope.ClickShow = true;
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.Id = Id;
        collectionobj.Updatedby = MapId;
        collectionobj.ConversationId = ConversationId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.Pendding = response.data[0].Pendding;
            $scope.Submit = response.data[0].Submit;
            $scope.Reject = response.data[0].Reject;
            $scope.TotalDoc = response.data[0].TotalDoc;
            $scope.InDocList = response.data;   
        });
    };
    $scope.ConversationId = '';
    $scope.SetValues = function (Id, ConversationId) {
        $scope.ClickShow = true;
      
        $scope.GetDocument(Id, ConversationId);
        var collectionobj = {};
        collectionobj.Action =43 ;
        collectionobj.Id = Id;
        collectionobj.Updatedby = MapId;
        collectionobj.ConversationId = ConversationId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.InList = response.data;
            $scope.InvoiceNo = response.data[0].InvoiceNo;
            $scope.RegInvoiceNo = response.data[0].RegInvoiceNo;
            $scope.IsSumitted = response.data[0].Status;
            $scope.Location = response.data[0].Location;
            $scope.VendorName = response.data[0].VendorName;
            $scope.VendorId = response.data[0].VendorId;
            
            $scope.ClientName = response.data[0].ClientName;
            $scope.ClientId = response.data[0].ClientId;
            $scope.ConversationId = response.data[0].ConversationId;
            $scope.IDATE = response.data[0].IDATE;
            $scope.InvoiceType = response.data[0].InvoiceType;
            $scope.TypeInvoice = response.data[0].TypeInvoice
            $scope.HeaderInvoice = response.data[0].HeaderInvoice;  
           
            if ($scope.HeaderInvoice == "Unique No : ") {
                $scope.WhichDate = "Created Date : ";
            }
            else {
                $scope.WhichDate = "Invoice Date :";
            }
        });
    };
  

    $scope.SendMessage = function () {
        var collectionobj = {};
        collectionobj.Action = 44;
        collectionobj.InvoiceNo = $scope.RegInvoiceNo;
        collectionobj.ConversationId = $scope.ConversationId; 
        collectionobj.Conversation = $scope.Message;
        collectionobj.DocumentId = $scope.ReqNewDoc;
        collectionobj.DocumentName = DocName;
        collectionobj.Updatedby = MapId;
        var getData = myService.methode('POST', "../Communication/IUDCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) { 
            $scope.SetValues($scope.RegInvoiceNo, $scope.ConversationId);
            showMsgBox('999', 'Approve', response.data.Result, 'success', 'btn-success')

        });
    }
    $scope.FinalSubmittion = function () {
        for (var i = 0; i < $scope.InDocList.length; i++) {
            if ($scope.InDocList[i].Status !=1) {
                showMsgBox('999', 'Approval Require', 'Please Approve Document of ' + $scope.InDocList[i].DocumentName, 'warning', 'btn-warning')
                return;
            }
        }
        $scope.SaveFinalSubmittion();
    }
    $scope.SaveFinalSubmittion = function () {
        var collectionobj = {};
        collectionobj.Action = 20;
        collectionobj.InvoiceNo = $scope.RegInvoiceNo;
        collectionobj.Conversation = $scope.Message;
        collectionobj.ConversationId = $scope.ConversationId;
        collectionobj.Id = $scope.ClientId;
        var getData = myService.methode('POST', "../Communication/IUDCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.SetValues($scope.RegInvoiceNo, $scope.ConversationId);
            //if ($scope.InvoiceType == 'Regular') {
            //    $scope.FireEmail(3, $scope.RegInvoiceNo,'');
            //}
            showMsgBox('999', 'Final Submittion', response.data.Result, 'success', 'btn-success')
            $scope.FireEmail(3, $scope.RegInvoiceNo, '');
        });
    }
  
    $scope.ApproveRecord = function (Id,SNO)
    {
        $scope.ConversationId = Id;
        var collectionobj = {};
        collectionobj.Action = 6;
        collectionobj.Id = Id;
        collectionobj.InvoiceNo = $scope.RegInvoiceNo;
        collectionobj.SNO = SNO;
        var getData = myService.methode('POST', "../Communication/IUDCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.GetDocument($scope.RegInvoiceNo, $scope.ConversationId);
            $scope.SetValues($scope.RegInvoiceNo, $scope.ConversationId);
            showMsgBox('999', 'Approve', response.data.Result, 'success', 'btn-success');
            $scope.FireEmail(17, $scope.RegInvoiceNo, $scope.ClientId);

        });
    }

    $scope.ReqRecord = function (Id, SNO) {
        var collectionobj = {};
        collectionobj.Action = 7; 
        collectionobj.Id = Id;
        collectionobj.InvoiceNo = $scope.RegInvoiceNo;
        collectionobj.SNO = SNO;
        var getData = myService.methode('POST', "../Communication/IUDCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.GetDocument($scope.RegInvoiceNo, $scope.ConversationId);
            $scope.SetValues($scope.RegInvoiceNo, $scope.ConversationId);
            showMsgBox('999', 'Reject', response.data.Result, 'success', 'btn-success')
           
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
    $scope.FarmerMasterList = [];
   
    
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