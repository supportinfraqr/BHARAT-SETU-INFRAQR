app.SubsidiaryController = function ($scope, $element, $filter, myService) {
    $scope.ListSet = [];
    $scope.AddListSet = function () {
        $scope.ListSet.push({
            Srno: "",
            GroupId: "",
            GroupUserId: "",
            SubcidiaryId: "",
            SubcidiaryUserId: "",


        });
        var $index = $scope.ListSet.length - 1;
        setTimeout(function () {
            $('#txtSrno' + $index).focus();
        }, 500);
    };
    $scope.RemoveListSet = function (index) {
        $scope.ListSet.splice(index, 1)
    };
    $scope.UpListSet = function (index) {
        x = index, y = index - 1;
        var obj = $scope.Sauda_Detail[x];
        $scope.ListSet[x] = $scope.ListSet.splice(y, 1, obj)[0];
    };
    $scope.DownListSet = function (index) {
        x = index;
        if (index == $scope.ListSet.length - 1)
            y = 0;
        else
            y = index + 1;
        var obj = $scope.ListSet[x];
        $scope.ListSet[x] = $scope.ListSet.splice(y, 1, obj)[0];
    };


    $scope.BindGroup = function () {
        var collectionobj = {};
        collectionobj.Action = 1;
        var getData = myService.methode('POST', ("../retail/SearchMainRetailDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.AllGroupPartyList = response.data.Result;;
        });
    }
    $scope.BindGroupUser = function (index) {
        var collectionobj = {};
        collectionobj.Action = 2;
        collectionobj.Id = $scope.ListSet[index].GroupId;
        var getData = myService.methode('POST', ("../RETAIL/SearchMainRetailDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.AllGroupUserList[index]  = response.data.Result;
        });
    }
    $scope.AllGroupPartyList = [];
    $scope.AllGroupUserList = [];
    $scope.SubsidiarypartyList = [];
    $scope.SubsidiaryUserList = [];
    $scope.BindSubsidiaryparty= function (index) {
        var collectionobj = {};
        collectionobj.Action = 3;
        collectionobj.Id = $scope.ListSet[index].GroupId;
        var getData = myService.methode('POST', ("../RETAIL/SearchMainRetailDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.SubsidiarypartyList[index] = response.data.Result;
        });
    }
    $scope.BindSubsidiaryUser = function (index) {
        var collectionobj = {};
        collectionobj.Action = 2;
        collectionobj.Id = $scope.ListSet[index].SubcidiaryId;
        var getData = myService.methode('POST', ("../RETAIL/SearchMainRetailDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.SubsidiaryUserList[index] = response.data.Result;

        });
    }

    $scope.AllPartySiteCList = [];

    $scope.SaveAfterValidate = function () {
        if (isValidate()) {
            for (var i = 0; i < $scope.ListSet.length; i++)
            {
                $scope.showLoader();
                var collectionobj = {};
                collectionobj.GroupId = $scope.ListSet[i].GroupId;
                collectionobj.GroupUserId = $scope.ListSet[i].GroupUserId;;
                collectionobj.SubcidiaryId = $scope.ListSet[i].SubcidiaryId;
                collectionobj.SubcidiaryUserId = $scope.ListSet[i].SubcidiaryUserId;
                collectionobj.Id = $scope.ListSet[i].Srno;
                collectionobj.Action = 4;
                var getData = myService.methode('POST', "../RETAIL/verifyvalid", '{obj:' + JSON.stringify(collectionobj) + '}');
                getData.then(function (response) {
                    var msg = response.data.Result[0].msg; 
                    // Check if the msg starts with '-1'
                    if (msg.indexOf('-1') === 0) {
                        // Split the string by '|'
                        var parts = msg.split('|');

                        // Extract the ID and trim spaces
                        var id = parts[1].trim();

                        // Show the message box with the ID
                        showMsgBox('999', 'Duplicate Record', 'Please Check Row :' + id, 'warning', 'btn-warning');
                    }
                    $scope.hideLoader();
                });
            }
        }
    }

    $scope.SaveRecord  = function()
     {
        if ($scope.Save == "Save") {
            $scope.NowUpdate();
        }
        else {
            $scope.UpdateRecord();
        }
    }

    $scope.NowUpdate= function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            collectionobj.SubcidiaryListSet = $scope.ListSet;
            collectionobj.CreatedBy = LoginId; 
            if ($scope.Save == "Save") {
                collectionobj.Action = 5;
            } 
            var getData = myService.methode('POST', "../RETAIL/InsertMainRetailDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');

            getData.then(function (response) {
                if (response.data.Result == "1") {
                    showMsgBox('999', 'Save', "Save Successfully", 'success', 'btn-success');
                    $scope.ClearControl(1);
                   
                }
                else {
                    showMsgBox('999', 'Duplicate', response.data.Result, 'warning', 'btn-warning');
                }

            });
        }
    }
   

    $scope.Delete = function () {
        if (isValidate()) {
            var collectionobj = {};
            collectionobj.VendorInvId = $scope.hfId;
            collectionobj.CreatedBy = LoginId;
            collectionobj.IsDeleted = 1;
            collectionobj.ActionType = 3;
            var getData = myService.methode('POST', "../Mapping/InsertUpdateDelMapping", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.ClearControl(1);
                }
            });
        }
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
        $scope.ListSet = [];
        $scope.AddListSet();

        $scope.disableAdd = false;
        $scope.disableEdit = true;
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.disableClear = false;
        $scope.IsAdd = true;
        $scope.IsEdit = true;
        $scope.IsDelete = true;
        $scope.IsPrint = true;
        if (flag == 0) {
            showMsgBox('4');
        };
    }
    $scope.MappingList = [];
    /*Search Button Click Event*/
    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };

    $scope.started = function () {
        var collectionobj = {};
        collectionobj.Action = 6; 
        var getData = myService.methode('POST', "../RETAIL/verifyvalid", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Group Party", "HeaderValue": "GroupParty", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Group User", "HeaderValue": "GroupUser", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Subsidiary Party", "HeaderValue": "SubsidiaryParty", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Subsidiary User", "HeaderValue": "SubsidiaryUser", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                ];

            $scope.MappingList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                $scope.IsHide = true;
 
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val();

                $scope.hfId = parseInt($scope.hfId, 10);
                $scope.MappingList = $filter('filter')($scope.MappingList, { 'Id': $scope.hfId }, true); 

                
                $scope.ListSet[0].Id = $scope.MappingList[0].Id;

                $scope.ListSet[0].GroupId = $scope.MappingList[0].GroupId;
                $scope.EDITBindGroupUser($scope.MappingList[0].GroupId);

                setTimeout(function () {
                    $scope.ListSet[0].GroupUserId = $scope.MappingList[0].GroupUserid
                }, 100);
                $scope.EDITSubsidiaryparty($scope.MappingList[0].GroupId);
                setTimeout(function () {
                    $scope.ListSet[0].SubcidiaryId = $scope.MappingList[0].SubcidiaryId
                }, 200);
                $scope.EDITSubsidiaryUser($scope.MappingList[0].SubcidiaryId);
                setTimeout(function () {
                    $scope.ListSet[0].SubcidiaryUserId = $scope.MappingList[0].SubcidiaryUserId
                }, 400);
              
             
                $scope.Save = "Edit";
                //$scope.disableDelete = false;
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
    };

    $scope.EDITBindGroupUser = function (GroupId) {
        var collectionobj = {};
        collectionobj.Action = 2;
        collectionobj.Id = GroupId;
        var getData = myService.methode('POST', ("../RETAIL/SearchMainRetailDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.AllGroupUserList[0] = response.data.Result;
        });
    }
    $scope.EDITSubsidiaryparty = function (GroupId) {
        var collectionobj = {};
        collectionobj.Action = 3;
        collectionobj.Id = GroupId;
        var getData = myService.methode('POST', ("../RETAIL/SearchMainRetailDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.SubsidiarypartyList[0] = response.data.Result;
        });
    }
    $scope.EDITSubsidiaryUser = function (SubcidiaryId) {
        var collectionobj = {};
        collectionobj.Action = 2;
        collectionobj.Id = SubcidiaryId;
        var getData = myService.methode('POST', ("../RETAIL/SearchMainRetailDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.SubsidiaryUserList[0] = response.data.Result;

        });
    }

    $scope.UpdateRecord = function () {
        if (isValidate()) { 
                $scope.showLoader();
                var collectionobj = {};
                collectionobj.GroupId = $scope.ListSet[0].GroupId;
                collectionobj.GroupUserId = $scope.ListSet[0].GroupUserId;;
                collectionobj.SubcidiaryId = $scope.ListSet[0].SubcidiaryId;
                collectionobj.SubcidiaryUserId = $scope.ListSet[0].SubcidiaryUserId;
                collectionobj.Id = $scope.hfId;
                collectionobj.Action = 7;
                var getData = myService.methode('POST', "../RETAIL/verifyvalid", '{obj:' + JSON.stringify(collectionobj) + '}');
                getData.then(function (response) { 
                    showMsgBox('999', 'Alert', response.data.Result[0].msg, 'warning', 'btn-warning');
                    $scope.hideLoader();
                    if(response.data.Result[0].msg =='Update Successfully')
                    { 
                        $scope.ClearControl(1);
                    }
                });    
            }
        } 
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
                { "HeaderText": "Group Party", "HeaderValue": "GroupParty", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Group User", "HeaderValue": "GroupUser", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Subsidiary Party", "HeaderValue": "SubsidiaryParty", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Subsidiary User", "HeaderValue": "SubsidiaryUser", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

            ];
        $scope.PrintMaster(tblheader, $scope.MappingList, window.document.title);
    };
}
