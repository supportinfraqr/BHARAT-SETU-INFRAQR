var myLoginApp = angular.module('myLoginApp', []);
myLoginApp.service("myLoginService", function ($http) {

    this.methode = function (methodType, virtualUrl, dataList) {

        var response = $http({
            method: methodType,
            url: virtualUrl,
            data: dataList,
            contentType: 'application/json; charset=utf-8',
            datatype: 'json'
        });

        return response;
    };
});

myLoginApp.controller('myLoginController', function ($scope, myLoginService) {
    $('#txtPassWord').attr("placeholder", "Enter Password");
    $('#txtContactNo').focus();

    $scope.flag = false;
    $scope.IshideOtp = false;
    $scope.hidemobile = true;
    $scope.IshideSubmit = false;
    $scope.PassWordEnterKey = function (event) {
        if (typeof (event.keyCode) === 'undefined') return;
        var keyCode = event.keyCode;
        if (keyCode == 13) {
            $scope.Login();
        }
    };


    $scope.Login = function ()
    {
        if ($('#txtContactNo').val() == "")
        {
            //if ($scope.MobileNo.length == 10)
            //{
            //    $scope.Recover();
            //}
            //else {
            //    $("#lblmsg").text("Please enter a valid contact no.");
            //    $("#msgbox").fadeIn().delay(300).fadeOut();
            //}
            $("#lblmsg").text("Please enter a valid Contact No or Emaild Id");
            $("#lblmsg").attr('style', 'color:red');
            $("#msgbox").fadeIn().delay(300).fadeOut();
        }
        else {

            if ($('#txtContactNo').val().match(/^\d+$/)) {
                $scope.WHEREOTPGO = "Phone";
            }
            else {
                $scope.WHEREOTPGO = "Email";
            }

            $scope.Recover();
        }
        //else {
        //    $("#lblmsg").text("Please enter a valid contact no.");
        //    $("#msgbox").fadeIn().delay(300).fadeOut();
        //}
       
    }

    $scope.WHEREOTPGO = "";
    $scope.verifypass = function()
    {
        if ($scope.Otp == $scope.notp)
        {
            $scope.IshideOtp = false;
            $scope.hidemobile = false;
            $scope.IshideSubmit = true;
            $('#txtPassWord').attr("placeholder", "Enter New Password");
            $('#txtPassWord').val('');
        }
        else {
            $("#lblmsg").text("Invalid Otp");
            $("#msgbox").fadeIn().delay(300).fadeOut();
        }
    }
    $scope.Recover = function () {
        if (isValidate()) {
            $('#btnLogin').html('<i class="fa fa-spinner fa-spin"></i>&nbsp; Please wait')
            $('#btnLogin').prop('disabled', true);
            debugger;
            var collectionobj = {};
            collectionobj.Username = $scope.MobileNo; 
            collectionobj.Action = "8";
            var getDetails = myLoginService.methode('POST', '../Login/chkUserId', '{obj:' + JSON.stringify(collectionobj) + '}');
            getDetails.then(function (response) {
                debugger;
                if (response.data.length > 0)
                {
                    $scope.Otp = response.data[0].Otp;
                    if ($scope.WHEREOTPGO == "Phone") {
                        $scope.okpass(); 
                    }
                    else { 
                        $scope.okemailpass();
                    }
                    //$scope.Otp = response.data[0].Otp;
                    //$scope.okpass();
                }
                else {
                    $("#lblmsg").text("Please enter a registered contact no. or email id");
                    $("#lblmsg").attr('style', 'color:red');
                    $('#btnLogin').html('Send Otp')
                    $('#btnLogin').prop('disabled', false);
                    $("#msgbox").fadeIn().delay(300).fadeOut();
                }

            });
        }
    };
    $scope.ResetPass = function ()
    {
        if ($scope.Otp == $scope.notp)
        {
            $('#btnLogin2').html('<i class="fa fa-spinner fa-spin"></i>&nbsp; Please wait')
            $('#btnLogin2').prop('disabled', true);
            debugger;

           
            var collectionobj = {};
            collectionobj.Username = $scope.MobileNo;
            collectionobj.Password = $scope.NewPassword;
            collectionobj.notp = $scope.Otp;
            collectionobj.Action = "10";
            var getDetails = myLoginService.methode('POST', '../Login/chkUserId', '{obj:' + JSON.stringify(collectionobj) + '}');
            getDetails.then(function (response)
            {
                debugger;
                if (response.data[0].Msg==2)
                {
                   
                    $("#lblmsg").text("Congrates, Password Changed");
                    $("#lblmsg").attr('style', 'color:green');
                    //showMsgBox('999', 'Success', 'Congrates, Password Changed', 'Success', 'btn-Success');
                    //return;
                    setTimeout(window.top.location.href = '../Login/Login', 150);
                   
                }
                else {
                    $("#lblmsg").text("Something went wrong, please try again.");
                    $("#lblmsg").attr('style', 'color:red');
                    $('#btnLogin2').html('Submit')
                    $('#btnLogin2').prop('disabled', false);
                }
                $("#msgbox").fadeIn().delay(3000).fadeOut();
            });
        }
        
    };
     
    $scope.okemailpass = function () {
        $('#btnLogin2').html('<i class="fa fa-spinner fa-spin"></i>&nbsp; Please wait')
        $('#btnLogin2').prop('disabled', true);
        debugger;
        var collectionobj = {};
        collectionobj.Id = $scope.Otp;
        collectionobj.ClientId = $scope.MobileNo;
        collectionobj.Action = "19";
        var getDetails = myLoginService.methode('POST', '../SendEmail/SendEmail', '{obj:' + JSON.stringify(collectionobj) + '}');
        getDetails.then(function (response) {

            $('#txtOtp').val('');
            $('#btnLogin2').html('Submit')
            $('#btnLogin2').prop('disabled', false);
            $("#lblmsg").text("Otp Send on your Email Id");
            $("#lblmsg").attr('style', 'color:green');
            $("#msgbox").fadeIn().delay(300).fadeOut();
            $scope.IshideOtp = true;
            $scope.hidemobile = false;
            $scope.IshideSubmit = false;
        });
    };
    $scope.okpass = function () { 
            $('#btnLogin2').html('<i class="fa fa-spinner fa-spin"></i>&nbsp; Please wait')
            $('#btnLogin2').prop('disabled', true);
            debugger;
            var collectionobj = {};
            collectionobj.Msg =  $scope.Otp;
            collectionobj.ContactNo = $scope.MobileNo;
            collectionobj.Action = "1";
            var getDetails = myLoginService.methode('POST', '../Login/SendGeneralSMS', '{obj:' + JSON.stringify(collectionobj) + '}');
            getDetails.then(function (response) {

                $('#txtOtp').val('');
                $('#btnLogin2').html('Submit')
                $('#btnLogin2').prop('disabled', false);
                $("#lblmsg").text("Otp Send on your number");
                $("#msgbox").fadeIn().delay(300).fadeOut();
                $scope.IshideOtp = true;
                $scope.hidemobile = false;
                $scope.IshideSubmit = false;
            }); 
    };
    $scope.FindWindow = function () {
        debugger;
        var inputs = $(".input-effect input");
        $.each(inputs, function (i, input) {
            if ($(this).hasClass("has-content") && $(this).val().length <= 0) {
                $(this).removeClass("has-content");
            } else {
                $(this).addClass("has-content");
            }
        })
    };

    $scope.hascontent = function (id) {
        if ($(id).hasClass("has-content") && $(id).val().length <= 0) {
            $(id).removeClass("has-content");
        } else {
            $(id).addClass("has-content");
        }
    }

    
});

 