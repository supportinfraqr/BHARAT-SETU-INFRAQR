app.InvoiceDeleteController = function ($scope, $element, $filter, myService) {
   
    $scope.disableDelete = true;
    
    $scope.DeleteRecord = function (Id, InvoiceNo, BatchNo)
    {
        $scope.Id = Id;
            $scope.InvoiceNo = InvoiceNo;
            $scope.BatchNo=BatchNo;
            deleteConfirmbox("Permanently delete Invoice, Do you want to delete this record?", $scope.IsDeleteRecord);
    };
    $scope.IsDeleteRecord = function ()
    {
        var collectionobj = {};
        collectionobj.Action = 46;
        collectionobj.InvoiceNo = $scope.InvoiceNo;
        collectionobj.ConversationId = $scope.BatchNo;
        collectionobj.Id = $scope.Id;
        collectionobj.Updatedby = LoginId;
        var getData = myService.methode('POST', "../Communication/IUDCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.ClearControl();
                $scope.BindDraftInvoiceDetail();
            }
        });
    }

    $scope.ClearControl=function()
    {
        $scope.Id = "";
        $scope.InvoiceNo = "";
        $scope.BatchNo = "";
    }


    $scope.BindDraftInvoiceDetail = function () {

        var collectionobj = {};
        collectionobj.Action = 45
        collectionobj.Id = LoginId; 
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.DraftInvoiceDetail = response.data;
        });
    };
    $scope.BindINBACTCH = function (ConversationId) {

        var collectionobj = {};
        collectionobj.Action = 45
        collectionobj.Id = LoginId;
        collectionobj.ConversationId = ConversationId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.BatchList = response.data;
        });
    };
}