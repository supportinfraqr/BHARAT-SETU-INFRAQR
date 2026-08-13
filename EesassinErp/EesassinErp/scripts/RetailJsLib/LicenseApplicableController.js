app.LicenseApplicableController = function ($scope, $element, $filter, myService) {

    
    $scope.UserDetails = [];
    $scope.loading = false;

    // 🔹 Load License Data
    $scope.BindLicense = function () {
        $scope.loading = true;

        var collectionobj = {}; 
        collectionobj.ActionType = 12;

        var getData = myService.methode(
            'POST',
            "../RetailSection/GetStoreDocumentDetails",
            JSON.stringify({ obj: collectionobj })
        );

        getData.then(function (response) {
            $scope.loading = false;
            if (response.data && response.data.Result.Table && response.data.Result.Table.length > 0) {
                $scope.UserDetails = response.data.Result.Table;
            } else {
                $scope.UserDetails = []; 
            }
        }).catch(function (error) {
            $scope.loading = false;
            console.error("Error loading license details:", error);
            swal("Error", "Failed to load data. Please try again later.", "error");
        });
    };


    // 🔹 Approve License
    $scope.ApprovedLicense = function (Id) {
        if (!Id) return;

        var collectionobj = {
            Id: Id,
            ActionType: 13
        };

        var getData = myService.methode(
            'POST',
            "../RetailSection/ApproveLicense",
            JSON.stringify(collectionobj)
        );

        getData.then(function (response) {
            swal("Success", "License approved successfully!", "success");
            $scope.BindLicense();
        }).catch(function (error) {
            console.error("Error approving license:", error);
            swal("Error", "Approval failed. Try again.", "error");
        });
    };


    // 🔹 Confirm Approval
    $scope.ActiveConfirmbox = function (Id) {
        if (!Id) return;

        swal({
            title: "Are you sure?",
            text: "You are about to approve this license.",
            type: "warning",
            showCancelButton: true,
            confirmButtonClass: 'btn-warning',
            confirmButtonText: "Yes, approve it!",
            cancelButtonText: "Cancel",
            closeOnConfirm: false
        }, function (isConfirm) {
            if (isConfirm) {
                swal.close(); // ✅ Close SweetAlert manually
                $scope.ApprovedLicense(Id);
            }
        });
    };

 
};
