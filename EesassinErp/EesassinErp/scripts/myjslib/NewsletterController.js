app.NewsletterController = function ($scope, $element, $filter, myService, $http) {
    $scope.SetFocus('#ddlVT');
    $scope.disableDelete = true;
    //var collectionobj1 = {};
    //collectionobj1.Action = 12;
    //collectionobj1.ClientId = $scope.PartyId;
    //collectionobj1.Id = "3028";
    //$scope.FireEmailForNewsletter(collectionobj1);

    tinyMCE.init({
        selector: "text1"
    })

    $scope.selectedOptions = [];

    $scope.isChecked = false;
    $scope.toggleSelectAll = function () {
        if ($scope.isChecked) {
            // If checkbox is checked, select all parties
            $scope.selectedOptions = $scope.AllPartyList.map(function (party) {
                return party.PartyId.toString();
            });
        } else {
            // If checkbox is unchecked, clear all selections
            $scope.selectedOptions = [];
        }
     //   console.log($scope.selecteAll);
    };


    $scope.tinymceOptions = {
        plugins: 'link image code',
        toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | code',
        setup: function (editor) {
            editor.on('change', function () {
                $scope.$apply(function () {
                    $scope.Summary = editor.getContent();
                });
            });
        }
    };
    $scope.Summary = 'This is the initial content of the text editor.';

    $scope.AllState = function () {
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 28, "PartyId": 1 });
        getData.then(function (response) {
            $scope.AllStateList = response.data.Result;
        });
    }
    $scope.AllParty = function () {
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 5, "PartyType": "Client" });
        getData.then(function (response) {
            $scope.AllPartyList = response.data.Result;
        });
    }

    $scope.Adminshow = function (input, imgfileid) {
        if ($('#fuCandidatePhoto').val().split('.').pop().toLowerCase() == 'pdf') {
            if (input.files && input.files[0]) {
                var filerdr = new FileReader();
                filerdr.onload = function (e) {
                    $scope.AdminFileDoc = e.target.result;

                    $scope.$applyAsync();
                }
                filerdr.readAsDataURL(input.files[0]);
            }
            else {
                $scope.Image = '';
                $scope.$applyAsync();
            }
        }
        else {
            showMsgBox('999', 'Warning', 'Please Select only Pdf', 'warning', 'btn-warning');
            $('#fuCandidatePhoto').val('');
            return;
        }

    };
    $scope.BindAllEmployeeList = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.ActionType = 4;
        var getData = myService.methode('POST', ("../RetailSection/GetEmployeeMaster"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.AllEmployeeList = response.data.Result;
            $scope.hideLoader();
        });
        $scope.hideLoader();
    };


    

    $scope.AllDepartment = function () {
        var getData = myService.methode('POST', ("../Newsletter/GetDepartments"),null);
        getData.then(function (response) {
            $scope.NoticeDepartmentList = response.data.Result;
            $scope.hideLoader();
        });
    }

    $scope.ChkIsClient = function (id) {
        $scope.PartyType = id;
        $scope.AllParty();
        $scope.$applyAsync();
    }

    $scope.SaveRecord = function () {
        if (isValidate()) {
            
                $scope.AfterverifyRecord()
          
        }
    }

    $scope.AfterverifyRecord = function () {
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            collectionobj.StateCentralActtitle = $scope.ActTittle;
            collectionobj.DateOfNotification = $scope.DateNot;
            collectionobj.SATE_CODE = $scope.StateId;
            collectionobj.SelectedClients = $scope.selectedOptions; //$scope.PartyId;
            collectionobj.EffectiveDateOfNotification = $scope.EffectiveDate;
            collectionobj.NotificationNumber = $scope.NotificationNumber;
            collectionobj.DepartmentId = $scope.DepartmentId;
           // collectionobj.UploadDocPath = $scope.AdminFileDoc;
            collectionobj.SubjectLine = $scope.SubjectLine;
             $scope.Summary = CKEDITOR.instances.txtHeaderTemplate.getData();
            collectionobj.Summary = $scope.Summary;
            collectionobj.NewsCategory = $scope.NewsCategory;

            var formData = new FormData();
            formData.append('file', $scope.AdminFileDoc ? $scope.AdminFileDoc : null);
            formData.append('StateCentralActtitle', $scope.ActTittle ? $scope.ActTittle:'');
            formData.append('DateOfNotification', $filter('date')($scope.DateNot, 'dd/MM/yyyy HH:mm:ss'));
            formData.append('SATE_CODE', $scope.StateId);
            formData.append('SelectedClients', $scope.selectedOptions);
            formData.append('EffectiveDateOfNotification', $filter('date')($scope.EffectiveDate, 'dd/MM/yyyy HH:mm:ss'));
            formData.append('NotificationNumber', $scope.NotificationNumber ? $scope.NotificationNumber:'');
            formData.append('DepartmentId', $scope.DepartmentId);
            formData.append('SubjectLine', $scope.SubjectLine);
            formData.append('NewsCategory', $scope.NewsCategory);
            formData.append('Summary', '');
            if ($scope.Save == "Save") {
                formData.append('ActionType',1);
            }
            else {
                formData.append('Id', $scope.hfId);
                formData.append('ActionType', 2);
            }
            console.log(collectionobj);
            $http.post("../Newsletter/InsertUpdateNewsletter", formData, {
                transformRequest: angular.identity,
                headers: { 'Content-Type': undefined }
            }).then(function (response) {
                      var status = response.data.Result >= "1" ? "1" : response.data.Result;
                status = response.data.Result == "2" ? response.data.Result : status;
                if ($scope.Save == "Save") {
                    collectionobj.Id = response.data.Result;
                }
                else {
                    collectionobj.Id = $scope.hfId;
                }
                var getData = myService.methode('POST', ("../Newsletter/UpdateNewsletterSummary"), JSON.stringify(collectionobj));
            getData.then(function (response1) {
                if (showMsgBox(status)) {
                    collectionobj.Action = 20;
                    collectionobj.ClientId =  $scope.selectedOptions[0];
                    collectionobj.Id = response.data.Result;
                    $scope.FireEmailForNewsletter(collectionobj);
                    $scope.ClearControl(1);
                }
            });
            }, function (error) {
                console.error('Error', error);
            });
        }
    }
    $scope.DeleteRecord = function () {
        //deleteConfirmbox("Do you want to delete this record?", $scope.deleteRecord);
        showMsgBox('999', 'Warning', 'Delete Option Not Availabe , Please Inactive Party', 'warning', 'btn-warning')
    };

    $scope.deleteRecord = function () {
        debugger;
        //var collectionobj = {};
        //collectionobj.ActionType = 3;
        //collectionobj.PartyId = $scope.hfId;  
        //var getData = myService.methode('POST', ("../PartyMaster/InsertUpdateDelPartyMaster"), JSON.stringify(collectionobj));
        //getData.then(function (response) {
        //    if (showMsgBox(response.data.Result)) {
        //        $scope.ClearControl(1);
        //    }
        //});
    };
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
        $scope.disableAdd = false;
        $scope.disableEdit = false;
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.disableClear = false;
        $scope.IsAdd = true;
        $scope.IsEdit = true;
        $scope.IsDelete = true;
        $scope.IsPrint = true;
        $scope.PartyId = "";
        $scope.selectedOptions = [];
        $scope.SubjectLine = "";
        $scope.Summary = "";
        CKEDITOR.instances.txtHeaderTemplate.setData("");
        $scope.ActTittle = "";
        $scope.DepartmentId = "";
        $scope.NewsCategory = "";
        $scope.NotificationNumber = "";
        $scope.DateNot = "";
        $scope.StateId = "";
        $scope.EffectiveDate = "";
        $scope.AdminFileDoc = "";
        if (flag == 0) {
            showMsgBox('4');
        };

    }
    /*Search Button Click Event*/
    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };

    $scope.started = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.ActionType = 4;
        debugger;
        var getData = myService.methode('POST', ("../Newsletter/GetNewsletterForSearchDT"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                  //  { "HeaderText": "Party Type", "HeaderValue": "PartyType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Subject Line", "HeaderValue": "SubjectLine", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Party Name", "HeaderValue": "PartyName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Act Title", "HeaderValue": "StateCentralActtitle", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Date Of Notification", "HeaderValue": "DateOfNotification", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "State", "HeaderValue": "STATE_NM", "Width": "100%", "ShowColumn": "NO", "ImageColumn": "No" },
                    { "HeaderText": "Effective Date", "HeaderValue": "EffectiveDateOfNotification", "Width": "100%", "ShowColumn": "NO", "ImageColumn": "No" },
                    { "HeaderText": "Notification Number", "HeaderValue": "NotificationNumber", "Width": "100%", "ShowColumn": "NO", "ImageColumn": "No" },
                    { "HeaderText": "Department Name", "HeaderValue": "DepartmentName", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "NewsLetter", "HeaderValue": "NewsLetter", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                 //   { "HeaderText": "PartyId", "HeaderValue": "PartyId", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                //    { "HeaderText": "SATE_CODE", "HeaderValue": "SATE_CODE", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                //    { "HeaderText": "DepartmentId", "HeaderValue": "DepartmentId", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                //    { "HeaderText": "UploadDocPath", "HeaderValue": "UploadDocPath", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                ];

            $scope.PartyMasterList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val();  //$scope.PartyMasterList[0].PartyId;
                $scope.PartyMasterList = $filter('filter')($scope.PartyMasterList, { 'Id': $scope.hfId });
                $scope.SubjectLine = row[1];
                $scope.ActTittle = row[3];
                $scope.DateNot = row[4];
                $scope.EffectiveDate = row[6];
                $scope.DateNot = new Date($scope.PartyMasterList[0].DateOfNotification);
                $scope.EffectiveDate = new Date($scope.PartyMasterList[0].EffectiveDateOfNotification);
                $scope.NotificationNumber = row[7];
               // $scope.PartyId = $scope.PartyMasterList[0].PartyId.toString();
                $scope.selectedOptions = $scope.PartyMasterList[0].PartyId.split(',');
                $scope.StateId = $scope.PartyMasterList[0].SATE_CODE.toString();
                $scope.DepartmentId = $scope.PartyMasterList[0].DepartmentId.toString();
                $scope.AdminFileDoc = $scope.PartyMasterList[0].UploadDocPath;
                $scope.NewsCategory = $scope.PartyMasterList[0].NewsCategory;
                $scope.Summary = $scope.PartyMasterList[0].Summary;
                CKEDITOR.instances.txtHeaderTemplate.setData($scope.Summary);
                $scope.Save = "Edit";
                $scope.$applyAsync();
                $scope.disableDelete = true;
                $scope.disableAdd = false;
                $scope.$apply();
                //collapse box
                $('.br-pageheader').fadeIn();
                $('#collapseinputbox').fadeIn();
                $('#CollapseSearchTableList').fadeOut();

                $scope.SetFocus('#ddlState', true);
                $scope.hideLoader();


            });
        });
        $scope.hideLoader();
    };

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

    $scope.PrintRecord = function () {
        var tblheader =
            [
                { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                //  { "HeaderText": "Party Type", "HeaderValue": "PartyType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Subject Line", "HeaderValue": "SubjectLine", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Party Name", "HeaderValue": "PartyName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Act Title", "HeaderValue": "StateCentralActtitle", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Date Of Notification", "HeaderValue": "DateOfNotification", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "State", "HeaderValue": "STATE_NM", "Width": "100%", "ShowColumn": "NO", "ImageColumn": "No" },
                { "HeaderText": "Effective Date", "HeaderValue": "EffectiveDateOfNotification", "Width": "100%", "ShowColumn": "NO", "ImageColumn": "No" },
                { "HeaderText": "Notification Number", "HeaderValue": "NotificationNumber", "Width": "100%", "ShowColumn": "NO", "ImageColumn": "No" },
                { "HeaderText": "Department Name", "HeaderValue": "DepartmentName", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
            ];
        $scope.PrintMaster(tblheader, $scope.PartyMasterList, window.document.title);
    };
}