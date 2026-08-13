app.service("myService", function ($http) {

    this.methode = function (methodType, virtualUrl, dataList) {

        var response = $http({
            async: true,   // this will solve the problem
            method: methodType,
            url: virtualUrl,
            data: dataList,
            contentType: 'application/json; charset=utf-8',
            datatype: 'json'
        });

        return response;
    };

    this.nonasyncmethode = function (methodType, virtualUrl, dataList) {

        var response = $http({
            method: methodType,
            url: virtualUrl,
            data: dataList,
            async: false,
            contentType: 'application/json; charset=utf-8',
            datatype: 'json'
        });

        return response;
    };



    this.getip = function () {
        //debugger;
        //$http.get("https://ipinfo.io/json").then(function (response) {
        //    return response.data.ip;
        //});
        return "";
    }

   

    
});


