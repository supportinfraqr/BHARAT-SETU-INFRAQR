app.ClientCommunicationController = function ($scope, $element, $filter, myService) {
    $scope.SetFocus('#txtFarmCode');
    $scope.ComFreeze = false;
    $scope.Controlbyuser = '0';


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
        if ($scope.Controlbyuser == undefined || $scope.Controlbyuser == "")
        {
            $scope.Controlbyuser = '0';
        }
        var collectionobj = {};
        collectionobj.Action = 9;
        collectionobj.Id = LoginId;
        if ($scope.SearchCom == '' || $scope.SearchCom == 'undefined' || $scope.SearchCom == undefined) {
            $scope.SearchCom = '';
        }
        collectionobj.ConversationId = $scope.SearchCom;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.InvoiceList = response.data;
        });
    };


      
    $scope.BindControl = function () {
        var collectionobj = {};
        $scope.ComFreeze = false;
        $scope.InDocList = "";
        collectionobj.Id = $scope.VendorId;
        collectionobj.VendorId = $scope.Controlbyuser;
        collectionobj.Updatedby = MapId;
        collectionobj.Action = 36;


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
    $scope.SetMessage = function (Message) {
        $scope.Message = 'Please Upload this ' + Message + ' Document  for Further Communication';

    }
    var ConvertionId = '';
    $scope.GetDocument = function (Id, ConversationId) {

        $scope.ConversationId = Id;

        var collectionobj = {};
        collectionobj.Action = 37; 
        collectionobj.Id = Id;
        collectionobj.Updatedby = MapId;
        collectionobj.ConversationId = ConversationId;
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
                $scope.InvoiceNo = response.data[0].InvoiceNo;
                $scope.ClientName = response.data[0].Name;
                $scope.Location = response.data[0].Location;
                $scope.HeaderInvoice = response.data[0].HeaderInvoice;

                if ($scope.HeaderInvoice == "Unique No : ") {
                    $scope.WhichDate = "Created Date : ";
                }
                else {
                    $scope.WhichDate = "Invoice Date :";
                }


                $scope.InDocList = response.data;
                $scope.$applyAsync();

            }

        });
    };



    $scope.ConversationId = '';
    $scope.SetValues = function (Id, ConversationId)
    {
        $scope.ComFreeze = true;
         
        $scope.GetDocument(Id, ConversationId);
       
    };


     
}