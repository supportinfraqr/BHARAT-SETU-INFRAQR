app.GeneralSMSController = function ($scope, $element, myService) {
    
    $scope.chk = [];
    $("#change").change(function () { 
        var status = this.checked; 
        $("#select_all")[0].checked = status;
    })
    var seprator = "";
    var stringbuilder = "";


    $('textarea').keypress(function () {

        if (this.value.length > 160) {
            return false;
        }
        $("#remainingC").html("Remaining characters : " + (160 - this.value.length));
    });

    $scope.change = function (index)
    {
        if ($scope.chk[index] == true)
        {
            $scope.chk[index] = false;
        }
        else {
            $scope.chk[index] = true;
        }
        debugger;
        seprator = ""
        stringbuilder = "";
        var count = 0;
        var chkflag = 0;
        $.each($scope.chk, function (index, val) {
            if (val === true)
            {
                stringbuilder = stringbuilder + seprator;
                stringbuilder = stringbuilder + $scope.AllMember[index].ContactNo;
                seprator = ","
                count += 1;
               
            }
            else
            {
                chkflag = 1;
            }
        });
        if (chkflag == 1)
        { $scope.ChkAll = false } else { $scope.ChkAll = true }
        $('#hdngetstu').html(stringbuilder);
        $scope.AllMemberCount = 'Total Selection :' + count
        $scope.$applyAsync();
    }

    $scope.ChkAllForMember = function () {
        debugger;
        if ($scope.ChkAll == true) {
            $('#hdngetstu').html('');
            $scope.BindMemberList();
        }
        else {
            $.each($scope.chk, function (index, val) {
                $scope.chk[index] = false
            });
            $('#hdngetstu').html('');
            $scope.AllMemberCount = 'Total Selection : 0' 
            $scope.$applyAsync();
        }
    }
    $scope.BindMemberList = function ()
    {  
        var collectionobj = {}; 
        collectionobj.BranchCode = BranchCode;
        if ( $scope.MemberMode == 'S')
        {

            collectionobj.Action = "3";
        }
        else {

            collectionobj.Action = "2";
        } 
  
        var getData = myService.methode('POST', "/SMS/SearchSMS", '{ obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response)
        {
            if (response.data.Result.length > 0)
            {

                $scope.chk = [];
                $scope.ChkAll = true;
                $scope.AllMember = response.data.Result;
                var id = response.data.Result;
                seprator = "";
                stringbuilder = "";
                $('#hdngetstu').html('');
                var count = 0;
                $.each(id, function (i, val) {
                    if (val.ContactNo != '') {
                        count = count + 1;
                        stringbuilder = stringbuilder + seprator + val.ContactNo;
                        seprator = ",";
                        $scope.AllMemberCount = 'Total Selection :' + count;
                        $scope.chk[i] = true;
                        $('#hdngetstu').html(stringbuilder);
                    }
                });
                if ($('#hdngetstu').html() == '') {
                    $scope.AllMemberCount = '';
                    $scope.ChkAll = false;
                }
                
                $scope.$applyAsync();
                $scope.hideLoader();

            }
            else {
               
                $("input:checkbox").prop('checked', false);
                $('#hdngetstu').html('');
            }
        });
   
    }
    $('textarea').keypress(function () {

        if (this.value.length > 160) {
            return false;
        }
        $("#remainingC").html("Remaining characters : " + (160 - this.value.length));
    });

    $scope.SendMessage = function ()
    { 
        $scope.showLoader();
        if ($('#hdngetstu').html() != '') {
            if ($('#txtMessage').val() != '') {
                var MemberCodeList = [];
                var stringSplit = $('#hdngetstu').text().split(',');
                if (stringSplit == " ") {
                    stringSplit = "0";
                }
                for (var i = 0; i < stringSplit.length; i++) {
                    debugger;
                    $scope.itemdata = {};
                    $scope.itemdata["Msg"] = $scope.Message;
                    $scope.itemdata["ContactNo"] = stringSplit[i];
                    if (stringSplit[i] != '') {
                        MemberCodeList.push($scope.itemdata);
                    }
                }
                var collectionobj = {};
                collectionobj.MessageList = MemberCodeList;
              
                collectionobj.BranchId = $scope.BranchId;
                var getData = myService.methode('POST', "../SMS/SendGeneralSMS", '{ obj:' + JSON.stringify(collectionobj) + '}');
                getData.then(function (response) {

                    showMsgBox('999', 'Message', 'Message Send Successfully', 'success', 'btn-success')
                    $scope.hideLoader();
                });
            }
            else {
                showMsgBox('Oops!.. Message Field Should not empty.');
            }
        }
        else {
            showMsgBox('No record is selected, kindly select atleast one record.');
        }

    }
   
    $scope.SendRecord = function ()
    {
        submitConfirmbox("do u want to send message?", function () { $scope.SendMessage(); });
    }

    $scope.ClearControl = function (flag) {
        debugger;
        if (flag == 1) {
            $scope.ResetControl(flag);
        }
        else {
            clearConfirmbox("do u want to clear field?", function () { $scope.ResetControl(0); });
        }
    };

    $scope.ResetControl = function (flag)
    {
        debugger;
        $scope.Save = "Send Message";
        $('#txtMessage').val('');
        MemberCodeList = ""; 
        $("#remainingC").html(''); 
      
        $scope.$applyAsync();
        if (flag == 0) {
            showMsgBox('Clr');
        };

    }
  
    

  
 
 
}