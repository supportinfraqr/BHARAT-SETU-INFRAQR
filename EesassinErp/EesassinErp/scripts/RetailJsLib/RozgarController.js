app.RozgarController = function ($scope, $element, $filter, myService, $http) {
    var IDD = 0;

    // for Contractor 

    $scope.BindSiteList = function () {
        var collectionobj = {};
        collectionobj.Action = 34;
        collectionobj.LoginId = MapId;
        debugger;
        var getData = myService.methode('POST', "../DashBoard/GetUserRegistration", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.SiteList = response.data.Result;
        });
    }


    // Add New Method For Send Request to Worker by aadarsh
    $scope.SendContractorReq = function () {
        if ($scope.showbtn === "Send Consent") {
            if ($scope.Showworkerdetail === 0) {
                showMsgBox('999', 'Alert',
                    'Please Find Worker ID And then Press Button',
                    'warning', 'btn-warning');
                return;
            }
            if ($scope.SiteId == undefined || $scope.SiteId == null || $scope.SiteId == "") {
                showMsgBox('999', 'Alert', 'Please Select Site Name', 'warning', 'btn-warning');
                return;
            }
            var collectionobj = {
                ActionType: 21,
                EmployeeCode: $scope.EmployeeCode,
                LoginId: LoginId,
                PartyId: MapId,
                SiteId: $scope.SiteId,
                DOJ: $scope.Jdate,
            };

            var getData = myService.methode(
                'POST',
                "../RetailSection/SendReqToWorker",
                '{obj:' + JSON.stringify(collectionobj) + '}'
            );

            getData.then(function (response) {

                showMsgBox(response.data.Result);
                $scope.showbtn = "Pending Consent"
            });

        }
    };

    $scope.BindEmployerDetail = function () {
        var collectionobj = {};
        collectionobj.Action = 9;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../Rozgar/GetRozgarDetail", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.PricipleEmployer = response.data.Result;
        });
    }

    $scope.BindInActiveWorkers = function (isAction) {
        var collectionobj = {};
        collectionobj.Action = isAction;
        var getData = myService.methode('POST', "../Rozgar/GetRozgarDetail", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.WorkerDetails = response.data.Result;
            $scope.Statlist = [...new Set($scope.WorkerDetails.map(function (item) { return item.State; }).filter(function (state) {
                return state &&
                    state.trim() !== "" && state.trim() !== ",";
            }))];
            $scope.Citylist = [...new Set($scope.WorkerDetails.map(function (item) { return item.City ? item.City.trim() : ""; }).filter(function (city) { return city !== "" && city.replace(/,/g, "").trim() !== ""; }))];
            $scope.TotalPost = response.data.Result[0].TotalPost;
        });
    }

    $scope.GetApplicantDetail = function (job, jtitle, pdt, status) {
        $scope.title = jtitle;
        $scope.postdays = pdt;
        $scope.poststatus = status;
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.LoginId = LoginId;
        collectionobj.Jobno = job;
        var getData = myService.methode('POST', "../Rozgar/SearchApplyForm", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.ApplicantDetail = response.data.Result;
            $scope.TotalApplication = response.data.Result[0].TotalApplication;
            $scope.TotalHires = response.data.Result[0].TotalHires;
            $scope.UnderProcess = response.data.Result[0].UnderProcess;
        });
    };

    $scope.closejobpost = function (id,no, flag) {
        swal({
            title: "Are you sure?",
            text: "Do you want to close this post?",
            type: "warning",
            showCancelButton: true,
            confirmButtonClass: 'btn-warning',
            confirmButtonText: "Yes, Close it!",
            cancelButtonText: "Cancel",
            closeOnConfirm: false
        }, function (isConfirm) {
            if (isConfirm) {
                swal.close();
                $scope.UpdatePostFlag(id,no, flag);
            }
        });
    };

    $scope.UpdatePostFlag = function (id, jobno, isflag) {
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            collectionobj.Action = 2;
            collectionobj.id = id;
            collectionobj.Jobno = jobno;
            collectionobj.Loginid = LoginId;
            collectionobj.isflag = isflag;

            var getData = myService.methode('POST', "../Rozgar/ApplyForm", JSON.stringify(collectionobj));
            getData.then(function (response) {
                showMsgBox(response.data.Result);
                $scope.GetApplicantDetail();
            });
        }
    };
    $scope.closepost = function (no, flag) {
        swal({
            title: "Are you sure?",
            text: "Do you want to close this post?",
            type: "warning",
            showCancelButton: true,
            confirmButtonClass: 'btn-warning',
            confirmButtonText: "Yes, Close it!",
            cancelButtonText: "Cancel",
            closeOnConfirm: false
        }, function (isConfirm) {
            if (isConfirm) {
                swal.close();
                $scope.CloseOpening(no, flag);
            }
        });
    };

    $scope.CloseOpening = function (jobno, isflag) {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 2;
        collectionobj.id = jobno;
        collectionobj.Loginid = LoginId;
        collectionobj.isflag = isflag;

        var getData = myService.methode(
            'POST',
            "../Rozgar/SavejobPost",
            JSON.stringify(collectionobj)
        );

        getData.then(function (response) {
            showMsgBox(response.data.Result);
            $scope.hideLoader();
            $scope.$applyAsync();
        })
            .catch(function (error) {
                console.error('Error:', error);
                $scope.hideLoader();
            });
    };
    $scope.ViewProfile = function (dattt) {
        $scope.EmployeeName = dattt.EmployeeName;
        $scope.Role = dattt.Role;
        $scope.PresentAddress = dattt.PresentAddress;
        $scope.Deprtment = dattt.Deprtment;
        $scope.MobileNumber = dattt.MobileNumber;
        $scope.CoreSkills = dattt.CoreSkills;
        $scope.Certification = dattt.Certification;
        $scope.Tillnow = dattt.Tillnow;
        $scope.NatureJob = dattt.NatureJob;
        $scope.TypeWork = dattt.TypeWork;
        $scope.SiteName = dattt.SiteName;
        $scope.LocationCode = dattt.LocationCode;
        $scope.EmployeeCode = dattt.EmployeeCode;
        $scope.EmployeeEmailId = dattt.EmployeeEmailId;
        $scope.Flag = dattt.Flag;
        if ($scope.Flag == 1) {
            $scope.IsButtonDisabled = true;
            $scope.hirenow = "Hired";
        }
       else if ($scope.Flag == 0) {
            $scope.IsButtonDisabled = true;
            $scope.hirenow = "Pending Concent";
        }
        else if ($scope.Flag == 2) {
            $scope.IsButtonDisabled = true;
            $scope.hirenow = "Concent Cancelled";
        }
        else {
            $scope.IsButtonDisabled = false;
            $scope.hirenow = "Hire Now";
        }
        
    }

    $scope.SavejobPost = function () {
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            collectionobj.Action = 1;
            collectionobj.id = IDD;
            collectionobj.JobTitle = $scope.JobTitle;
            collectionobj.Description = $scope.Description;
            collectionobj.JobCategory = $scope.JobCategory;
            collectionobj.Location = $scope.Location;
            collectionobj.MinSallery = $scope.MinSallery;
            collectionobj.MaxSallery = $scope.MaxSallery;
            collectionobj.RequiredSkills = $scope.RequiredSkills;
            collectionobj.State = $scope.State;
            collectionobj.City = $scope.City;
            collectionobj.Experience = $scope.Experience;
            collectionobj.Loginid = LoginId;
            collectionobj.saveflag = 1;
            collectionobj.isflag = 0;

            var getData = myService.methode('POST', "../Rozgar/SavejobPost", JSON.stringify(collectionobj));
            getData.then(function (response) {
                $scope.hideLoader();
                $scope.jno = response.data.Result;
                $scope.BindPostedJob($scope.jno);

            });
        }
    };

    $scope.redirecturl = function () {
        window.location.href = "../Rozgar/JobHistory";
    }

    $scope.BindPostedJob = function (Jobno) {
        var collectionobj = {};
        collectionobj.Action = 4;
        collectionobj.LoginId = LoginId;
        collectionobj.id = Jobno;
        var getData = myService.methode('POST', "../Rozgar/GetRozgarDetail", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.Rozgarddetail = response.data.Result[0];
        });
    }

    $scope.BindJobHistory = function () {
        $scope.showLoader();
        $scope.record = "10";
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../Rozgar/GetRozgarDetail", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.JobHistory = response.data.Result;
            $scope.TotalPost = response.data.Result[0].TotalPost;
            $scope.Totalapplication = response.data.Result[0].TotalApplication;
            $scope.TotalHires = response.data.Result[0].TotalHires;
            $scope.hideLoader();
        });
        $scope.hideLoader();
    }

    // here is bind all posting job detail for Worker
    $scope.BindPostDetails = function () {
        $scope.tenrecord = "10";
        var collectionobj = {};
        collectionobj.Action = 6;
        var getData = myService.methode('POST', "../Rozgar/GetRozgarDetail", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.PostDetails = response.data.Result;
            $scope.TotalRecords = response.data.Result.length;
        });
    }

    $scope.Searchbyjobno = function (jobno) {
        var collectionobj = {};
        collectionobj.Action = 10;
        collectionobj.id = jobno;
        var getData = myService.methode('POST', "../Rozgar/GetRozgarDetail", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.JobDetail = response.data.Result[0];
        });
    }

    $scope.OpenApplyform = function (job) {
        $scope.Rozgardetail = angular.copy(job);
        $scope.Jobno = $scope.Rozgardetail.Jobno;
        $scope.GetWorkerDetail();
    };

    $scope.ViewPostDetail = function (job) {
        $scope.ViewPost = angular.copy(job);
        $scope.Jobno = $scope.ViewPostDetail.Jobno;
    };

    $scope.GetWorkerApplyPost = function () {
        var collectionobj = {};
        collectionobj.Action = 4;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../Rozgar/SearchApplyForm", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.ApplyForms = response.data.Result;
        });
    }

    $scope.ApplyPost = function (title) {
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            collectionobj.Action = 1;
            collectionobj.id = 0;
            collectionobj.JobTitle = title;
            collectionobj.Fullname = $scope.Fullname;
            collectionobj.WorkType = $scope.WorkType;
            collectionobj.EmailID = $scope.EmailID;
            collectionobj.Mobileno = $scope.Mobileno;
            collectionobj.CurrentLocation = $scope.CurrentLocation;
            collectionobj.Jobno = $scope.Jobno;
            collectionobj.Loginid = LoginId;
            collectionobj.isflag = 0;

            var getData = myService.methode('POST', "../Rozgar/ApplyForm", JSON.stringify(collectionobj));
            getData.then(function (response) {
                showMsgBox(response.data.Result);
                $scope.Fullname = '';
                $scope.WorkType = '';
                $scope.EmailID = '';
                $scope.Mobileno = '';
                $scope.CurrentLocation = '';
                $scope.hideLoader();
            });
        }
    };

    $scope.GetWorkerDetail = function () {
        var collectionobj = {};
        collectionobj.Action = 6;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../Rozgar/SearchApplyForm", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.EmployeeDetail = response.data.Result[0];
            $scope.Fullname = $scope.EmployeeDetail.EmployeeName;
            $scope.CurrentLocation = $scope.EmployeeDetail.PresentAddress;
            $scope.Mobileno = $scope.EmployeeDetail.MobileNumber;
            $scope.EmailID = $scope.EmployeeDetail.EmployeeEmailID;
        });
    }

    $scope.ChkStatus = function () {
        if ($scope.Flag === 2) {
           
            showMsgBox('999', 'Alert', 'Consent Already Cancelled at Worker Side', 'warning', 'btn-warning');
            $scope.showbtn = "Consent Cancelled";
            $(".contractorRozgarHireSection").hide();
            return;
        }
        else if ($scope.Flag ===1) {
            $scope.showbtn = "Consent Approved";
            showMsgBox('999', 'Alert', 'Consent Already Approved from Worker', 'warning', 'btn-warning');
            $(".contractorRozgarHireSection").hide();
            return;
        }
        else if ($scope.Flag === 0) {
            $scope.showbtn = "Consent Pending";
            showMsgBox('999', 'Alert', 'Consent Already Approved from Worker', 'warning', 'btn-warning');
            $(".contractorRozgarHireSection").hide();
            return;
        }
        else {
            $scope.showbtn = "Send Consent";
        }
    }
}