app.ChatbotSupportController = function ($scope, $element, $filter, $sce, myService) {


    $scope.AllChatbotLoad = function () {
        var collectionobj = {};
        collectionobj.Action = 4;  
        var getData = myService.methode('POST', ("../Chat/SearchChatbot"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.chatbotList = response.data.Result;
            $scope.TicketNo = ''; 
            $scope.ComFreeze = false;
            $scope.Summary = '';

            $scope.FileUpload  = '';

            $scope.Suggestion =  '';


            $scope.approvalComment = '';
        });
    }
    $scope.SetValues = function (TicketNo) {
        $scope.TicketNo = TicketNo;
        $scope.SearchMasterList = $scope.chatbotList
        $scope.SearchMasterList = $filter('filter')($scope.SearchMasterList, { 'TicketNo': TicketNo });
        $scope.ComFreeze = true;
        $scope.Summary = $scope.SearchMasterList[0].Detail;
        $scope.FileUpload = $scope.SearchMasterList[0].FileUpload;
        $scope.Suggestion = $scope.SearchMasterList[0].Suggestion;
       
        $scope.approvalComment = 'Ticket No: ' + TicketNo +' — The issue has been resolved; kindly check. Thank you for your patience.'
    };



    $scope.Approve = function () {
        debugger;
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.TicketNo = $scope.TicketNo;
        collectionobj.Detail = $scope.approvalComment;
        var getData = myService.methode('POST', ("../Chat/Approve"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.AllChatbotLoad();
            }
        });
    }
     
    $scope.isopentab1 = true;
    $scope.isopentab2 = false;

    $scope.tabl1 = function (Id) {
        $scope.isopentab1 = true;
        $scope.isopentab2 = false;
    };
    $scope.tabl2 = function (Id) {
        $scope.isopentab1 = false;
        $scope.isopentab2 = true;
      
    }; 



}