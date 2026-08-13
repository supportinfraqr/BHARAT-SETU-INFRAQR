app.AdminDashBoardController = function ($scope, $element, $filter, myService) {
    $scope.LoginType = loginType;
    $scope.LoginId = sessionStorage.getItem("LoginId");
  
    $scope.IsAdmin = true;
    $scope.IsStaff = false;
 
};