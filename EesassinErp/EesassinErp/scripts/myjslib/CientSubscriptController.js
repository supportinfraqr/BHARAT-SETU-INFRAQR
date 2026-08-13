app.BranchMasterController = function ($scope, $element, $filter, myService) {
    $scope.SetFocus('#txtusername');
    $scope.disableDelete = true;

    $scope.AllCountry = function () {
        var getData = myService.methode('POST', (APIURLPath + "UserSubscription/GetCountryList"), { "ActionType": 27 });
        getData.then(function (response) {
            debugger;
            $scope.AllCountryList = response.data; 
        });
    }
    $scope.AllState = function () {
        var getData = myService.methode('POST', (APIURLPath + "UserSubscription/GetStateList"), { "ActionType": 28, "CountryId": $scope.CountryId });
        getData.then(function (response) {
            debugger;
            $scope.AllStateList = response.data;
        });
    }
    $scope.AllCity = function () {
        var getData = myService.methode('POST', (APIURLPath + "UserSubscription/GetCityList"), {
            "ActionType": 29, "CityId": 0, "StateId": $scope.StateId, "CountryId": $scope.CountryId
        });
        getData.then(function (response) {
            debugger;
            $scope.AllCityList = response.data;
        });
    }
    $scope.AllPincode = function () {
        if ($("#txtpincode").val().length == 6) {
            var getData = myService.methode('POST', (APIURLPath + "UserSubscription/GetPinCodeList"), { "ActionType": 30, "PinCode": $scope.PinCode });
            getData.then(function (responsest) {
                debugger;
                if (responsest.data.length > 0) {
                    $("#ddlcity").empty();
                    $("#ddlstate").empty();
                    $("#ddlcountry").val(1);
                    for (var i = 0; i < responsest.data.length; i++) {
                        if (responsest.data[i].ty == 1) {
                            $("#ddlcity").append('<option value="' + responsest.data[i].val + '">' + responsest.data[i].txt + '</option>');
                        } else if (responsest.data[i].ty == 2) {
                            $("#ddlstate").append('<option value="' + responsest.data[i].val + '">' + responsest.data[i].txt + '</option>');
                        }
                    } 
                }
            });
        }
    }


    $scope.SaveRecord = function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            collectionobj.Name = $scope.UName;
            collectionobj.Uaddress = $scope.Uaddress;
            collectionobj.PinCode = $scope.PinCode;
            collectionobj.CountryId = $("#ddlcountry").val();
            collectionobj.StateId = $("#ddlstate").val();
            collectionobj.CityId = $("#ddlcity").val();
            collectionobj.Gstnno = $scope.Gstnno;
            collectionobj.RegComName = $scope.RegComName;
            collectionobj.EmailId = $scope.EmailId;
            collectionobj.MobileNo = $scope.MobileNo;
            collectionobj.Status = 1;
            collectionobj.OrganizationId = 1;
            collectionobj.LastLoginId = LoginId;
            collectionobj.CompanyId = 1;
            collectionobj.CreatedBy = LoginId;
            collectionobj.Admin = LoginId;
            collectionobj.AdminRoleFlag = loginType;
            collectionobj.OrgId = 1;
            collectionobj.RowId = $scope.hfId;
            if ($scope.Save == "Save") {
                collectionobj.ActionType = 1;
            }
            else {
                collectionobj.ActionType = 2;
            }
            var getData = myService.methode('POST', (APIURLPath + "UserSubscription/ClientSubscription"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data)) {
                    $scope.ClearControl(1);
                }
            });
        }
    }

    $scope.fileuploadClick = function (fuControlId) {
        $(fuControlId).click();
    }
    $scope.DeleteRecord = function () {
        deleteConfirmbox("Do you want to delete this record?", $scope.Delete);
    };
    $scope.Delete = function () {
        if (isValidate()) {
            var collectionobj = {};
            collectionobj.RowId = $scope.hfId;
            collectionobj.CreatedBy = LoginId;
            collectionobj.IsDeleted = 1;
            collectionobj.ActionType = 3;
            var getData = myService.methode('POST', (APIURLPath + "UserSubscription/ClientSubscription"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data)) {
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
        $scope.UName = "";
        $scope.Uaddress = "";
        $scope.PinCode = "";
        $("#ddlcountry").val(0).change();
        $("#ddlstate").val(0).change();
        $("#ddlcity").val(0); 
        $scope.Gstnno = "";
        $scope.RegComName = "";
        $scope.EmailId = "";
        $scope.MobileNo = "";
        $scope.hfId = 0;
        $scope.disableAdd = false;
        $scope.disableEdit = true;
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.disableClear = false;
        $scope.IsAdd = true;
        $scope.IsEdit = true;
        $scope.IsDelete = true;
        $scope.IsPrint = true;
        $scope.ServiceListMaster = [];
        if (flag == 0) {
            showMsgBox('4');
        };

    }
    $scope.ServiceListMaster = [];
    /*Search Button Click Event*/
    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };

    $scope.started = function () {
        var collectionobj = {};
        collectionobj.ActionType = 0;
        var getData = myService.methode('POST', (APIURLPath + "UserSubscription/GetUserListDT"), { "ActionType": 0 });
        getData.then(function (response) {
            debugger;
            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "ROWID", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" }, 
                    { "HeaderText": "NAME", "HeaderValue": "NAME", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "USER NAME", "HeaderValue": "USERNAME", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "PASSWORD", "HeaderValue": "PASSWORD", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Address", "HeaderValue": "UAddress", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "PinCode", "HeaderValue": "PinCode", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Country", "Value": "CountryID", "HeaderValue": "CountryName", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "" }, 
                    { "HeaderText": "State", "Value": "StateID", "HeaderValue": "STATE_NM", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "" }, 
                    { "HeaderText": "City", "Value": "CityID", "HeaderValue": "CITY_NAME", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "" }, 
                    { "HeaderText": "GST NO", "HeaderValue": "GSTNNO", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Reg. Com. Name", "HeaderValue": "RegComName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Email ID", "HeaderValue": "EmailID", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Mobile No", "HeaderValue": "MobileNo", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                ];

            $scope.ServiceListMaster = response.data;
            loadDataUsingPreDefinedColumn(tblheader, response.data);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader(); 
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val();
                $scope.UName = row[1];
                $scope.Uaddress = row[4];
                $scope.PinCode = row[5];
                $("#txtpincode").change();
                //$scope.AllCountry();
                setTimeout(function () {
                    $("#ddlcountry").val($(this).find("td").eq(6).find('input[type="hidden"]').val()).change();
                }, 100); 
                //$scope.AllState();
                setTimeout(function () {
                    $("#ddlstate").val($(this).find("td").eq(7).find('input[type="hidden"]').val()).change();
                }, 100); 
                //$scope.AllCity();
                setTimeout(function () {
                    $("#ddlcity").val($(this).find("td").eq(8).find('input[type="hidden"]').val()); 
                }, 100); 
                $scope.Gstnno = row[9];
                $scope.RegComName = row[10]; 
                $scope.EmailId = row[11]; 
                $scope.MobileNo = row[12]; 
                $scope.Save = "Edit";
                $scope.disableDelete = false;
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
                { "HeaderText": "Sr.No.", "Value": "ROWID", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                { "HeaderText": "NAME", "HeaderValue": "NAME", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "USER NAME", "HeaderValue": "USERNAME", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "PASSWORD", "HeaderValue": "PASSWORD", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Address", "HeaderValue": "UAddress", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "PinCode", "HeaderValue": "PinCode", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Country", "Value": "CountryID", "HeaderValue": "CountryName", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "" },
                { "HeaderText": "State", "Value": "StateID", "HeaderValue": "STATE_NM", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "" },
                { "HeaderText": "City", "Value": "CityID", "HeaderValue": "CITY_NAME", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "" },
                { "HeaderText": "GST NO", "HeaderValue": "GSTNNO", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Reg. Com. Name", "HeaderValue": "RegComName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Email ID", "HeaderValue": "EmailID", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Mobile No", "HeaderValue": "MobileNo", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
            ];
        $scope.PrintMaster(tblheader, $scope.ServiceListMaster, window.document.title);
    };
}