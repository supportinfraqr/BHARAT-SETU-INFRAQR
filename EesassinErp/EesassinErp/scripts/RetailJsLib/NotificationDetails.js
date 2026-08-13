app.controller("NotificationDetailsCtrl",
    function ($scope, myService, $sce) {
        $scope.newsletterDetail = {};

        // ✅ URL se query string value nikalne ka function
        function GetQueryStringValues(key) {
            var urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(key);
        }
        // ✅ BindExecuter - Newsletter fetch karke id se match karo
        $scope.BindExecuter = function (id) {
            $scope.showLoader();
            var collectionobj = {
                Id: LoginId 
            };
            myService.methode(
                'POST',
                "../Newsletter/GetNewsletterForSearchDT",
                JSON.stringify(collectionobj)
            ).then(function (response) {
                if (response.data.Result != null && response.data.Result.length > 0) {
                    $scope.newsletterAll = response.data.Result;
                    console.log($scope.newsletterAll);
                    for (var i = 0; i < response.data.Result.length; i++) {
                        if (response.data.Result[i].Id == id) {
                            $scope.newsletterDetail = response.data.Result[i];
                            $scope.newsletter = [response.data.Result[i]];
                            $scope.trustedSummary = $sce.trustAsHtml($scope.newsletterDetail.Summary);
                            break;
                        }
                    }
                }
                $scope.hideLoader();
            }, function (error) {
                console.log(error);
            });
        };

        $scope.downloadFile = function (url) {
            console.log(url);
            var link = document.createElement('a');
            link.href = url;
            link.download = '';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        // here is end News And Updates method code 

        $scope.getNewsupdatesn = function () {
            var collectionobj = {};
            collectionobj.Id = LoginId;

            var getData = myService.methode(
                'POST',
                "../RetailSection/GetNewsletter",
                '{obj:' + JSON.stringify(collectionobj) + '}'
            );

            getData.then(function (response) {
                $scope.newsupdatesn = response.data.Result || [];
                $scope.notificationsn = $scope.newsupdatesn.map(function (item) {
                    return {
                        id: item.Id,
                        title: item.NewsCategory,
                        msg: item.SubjectLine,
                        type: item.NewsCategory,
                        time: moment(item.CreatedDate).fromNow(),
                        read: false,
                        url: '../Dashboard/NotificationDetails?Notification%20Detail&id=' + item.Id
                    };
                });

            })
                .catch(function (error) {

                    console.error("Error fetching news updates:", error);
                    $scope.newsupdatesn = [];
                    $scope.notificationsn = [];
                    $scope.unreadCount = 0;

                });

        };

        $scope.BindCompliances = function (catename) {
            $scope.notificationsn = $scope.newsupdatesn
                .filter(function (x) {
                    return x.NewsCategory &&
                        x.NewsCategory.trim() == catename;
                })
                .map(function (item) {
                    return {
                        id: item.Id,
                        title: item.NewsCategory,
                        msg: item.SubjectLine,
                        type: catename,
                        time: moment(item.CreatedDate).fromNow(),
                        read: false,
                        url: '../Dashboard/NotificationDetails?Notification%20Detail&id=' + item.Id
                    };
                });
            $scope.$applyAsync();
        };

        $scope.ShowDetailsFunction = function () {
            window.location.href = '/Home/Details';
        };

        angular.element(document).ready(function () {
            var id = GetQueryStringValues('id');  // e.g. URL: /page?id=123
            if (id != null && id != '') {
                $scope.BindExecuter(id);
            }
        });
    }
);