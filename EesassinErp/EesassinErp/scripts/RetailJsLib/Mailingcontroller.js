app.MailingController = function ($scope, $element, $filter, $sce, myService, $timeout) {

    $scope.SaveRecord = function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {}; 
            collectionobj.PartyId = $scope.PartyId;
            collectionobj.MailFor = $scope.MailFor;
            collectionobj.TemplateId = $scope.TemplateId;
            collectionobj.To = $scope.To;
            collectionobj.CC = $scope.CC;
            collectionobj.BCC = $scope.BCC;
            if ($scope.Save == "Save") {
                collectionobj.Action = 4;
            }
            else {
                collectionobj.Action = 5;
                collectionobj.Id = $scope.hfId;
            }
            var getData = myService.methode('POST', ("../RetailSection/iudMailing"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.ClearControl(1);
                }
            });
        }
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
        $scope.vendoc = true;
        $scope.disableAdd = false;
        $scope.disableEdit = false;
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.disableClear = false;
        $scope.IsAdd = true;
        $scope.IsEdit = true;
        $scope.IsDelete = true;
        $scope.IsPrint = true;
        $scope.PartyId = '';
        $scope.MailFor = '';
        $scope.TemplateId = '';
        $scope.To = '';
        $scope.CC = '';
        $scope.BCC = '';
        $scope.Save = "Save"
        if (flag == 0) {
            showMsgBox('4');
        };

    }
    $scope.DeleteRecord = function () {
        deleteConfirmbox("Do you want to delete this record?", $scope.deleteRecord);
    };

    $scope.deleteRecord = function () {

        debugger;
        var collectionobj = {};
        collectionobj.Action =  7;
        collectionobj.Id = $scope.hfId;

        var getData = myService.methode('POST', ("../RetailSection/iudMailing"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.ClearControl(1);
            }
        });
    }

    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse'); 
        $scope.started();
    };


    $scope.MasterList = [];
    $scope.started = function () {
        var collectionobj = {};
        collectionobj.Action = 6;
        debugger;
        var getData = myService.methode('POST', "../RetailSection/MailingSearching", '{obj:' + JSON.stringify(collectionobj) + '}');
             getData.then(function (response) {

            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "HeaderValue": "MailingId", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Party Name", "HeaderValue": "PartyName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Mail For", "HeaderValue": "MailFor", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Template", "HeaderValue": "TemplateName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "To", "HeaderValue": "To", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "CC", "HeaderValue": "CC", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "BCC", "HeaderValue": "BCC", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                ];

            $scope.MasterList = response.data.Result.Table;
                 loadDataUsingPreDefinedColumn(tblheader, response.data.Result.Table);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();


                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = row[0];
                $scope.FilerList = [];
                $scope.FilerList = $filter('filter')($scope.MasterList, { 'MailingId': $scope.hfId });

                $scope.PartyId = $scope.FilerList[0].PartyId.toString();
                $scope.MailFor = $scope.FilerList[0].MailFor;
                $scope.TemplateId = $scope.FilerList[0].TemplateId.toString();

                $scope.To = $scope.FilerList[0].To;
                $scope.CC = $scope.FilerList[0].CC;
                $scope.BCC = $scope.FilerList[0].BCC;

                $scope.Save = "Edit";
                $scope.disableDelete = false;
                $scope.$apply();
                //collapse box
                $('.br-pageheader').fadeIn();
                $('#collapseinputbox').fadeIn();
                $('#CollapseSearchTableList').fadeOut();
 
                $scope.hideLoader();


            });
        });
    };





    $scope.Template = {
        TemplateName: '',
        Subject: '',
        Body: ''
    };

    $scope.openTemplatePopup = function () {

        $('#templateModal').modal('show');

        setTimeout(function () {
            if (CKEDITOR.instances['txtPopupTemplate']) {
                CKEDITOR.instances['txtPopupTemplate'].destroy(true);
            }
            CKEDITOR.replace('txtPopupTemplate');
        }, 300);
    };

    $scope.InsertTemplate = function () {

        $scope.Template.Body =
            CKEDITOR.instances['txtPopupTemplate'].getData();

        if (!$scope.Template.TemplateName || !$scope.Template.Subject) {
            alert('Please fill all mandatory fields');
            return;
        }

        var obj = {
            TemplateName: $scope.Template.TemplateName,
            Subject: $scope.Template.Subject,
            Detail: $scope.Template.Body,
              Action:  '1'
        };

        myService.methode(
            'POST',
            '../Retailsection/iudMailing',
            JSON.stringify(obj)
        ).then(function (response) { 
            if (response.data.Result === '1' || response.data.Result === '2' || response.data.Result === '-1') {
                showMsgBox(response.data.Result);
                $('#templateModal').modal('hide');
                $scope.Template.Subject = '';
                $scope.Template.TemplateName = '';
                $scope.Template.Body = '';
                $scope.Bindtemplte();
                // yaha template dropdown reload kar sakte ho
            } else {
                alert('Something went wrong');
            }
        });
    };


    $scope.updateTemplate = function () {

        $scope.Template.Body =
            CKEDITOR.instances['txtPopupTemplate'].getData();

        if (!$scope.Template.TemplateName || !$scope.Template.Subject) {
            alert('Please fill all mandatory fields');
            return;
        }

        var obj = {
            Id: $scope.SelectedTemplate.TemplateId,
            TemplateName: $scope.Template.TemplateName,
            Subject: $scope.Template.Subject,
            Detail: $scope.Template.Body,
            Action: '2'
        };

        myService.methode(
            'POST',
            '../Retailsection/iudMailing',
            JSON.stringify(obj)
        ).then(function (response) {
            if (response.data.Result === '1' || response.data.Result === '2' || response.data.Result === '-1') {
                showMsgBox(response.data.Result);
                $('#templateModal').modal('hide');
                $scope.Template.Subject = '';
                $scope.Template.TemplateName = '';
                $scope.Template.Body = '';
                $scope.Bindtemplte();
                // yaha template dropdown reload kar sakte ho
            } else {
                alert('Something went wrong');
            }
        });
    };

    $scope.AllParty = function () {
        $scope.UserNames = '';
        $scope.Password = '';
        $scope.AllPartyList = "";
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 5, "PartyType": "Client" });
        getData.then(function (response) {
            debugger;
            $scope.AllPartyList = response.data.Result;
        });
    }


    $scope.Bindtemplte = function () {
        var collectionobj = {};
        collectionobj.Action = 3;  
        var getData = myService.methode('POST', "../RetailSection/MailingSearching", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.templatelist = response.data.Result.Table;
        });
    }
    $scope.Placeholders = ['UserName', 'Link', 'Password', 'PartyName'];
   
     
    $scope.insertCKField = function (field) {

        if (!CKEDITOR.instances['txtPopupTemplate']) return;

        var editor = CKEDITOR.instances['txtPopupTemplate'];
        var text = "'+" + field + "+'";

        editor.focus();
        editor.insertText(text);
    };

    $scope.settemplate = function (x) {
        $scope.Template.TemplateName = x.TemplateName
        $scope.Template.Subject = x.Subject
        $scope.Template.Body = x.Detail
        CKEDITOR.instances['txtPopupTemplate'].setData($scope.Template.Body);
    }
     

}

