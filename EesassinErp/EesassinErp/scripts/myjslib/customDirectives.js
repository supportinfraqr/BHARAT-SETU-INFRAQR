angular.module('myApp').directive('numericOnly', function () {
    return {
        require: 'ngModel',
        link: function (scope, element, attrs, ngModelCtrl) {
            ngModelCtrl.$parsers.push(function (inputValue) {
                if (inputValue) {
                    var transformedInput = inputValue.replace(/[^0-9]/g, '');
                    if (transformedInput !== inputValue) {
                        ngModelCtrl.$setViewValue(transformedInput);
                        ngModelCtrl.$render();
                    }
                    return transformedInput;
                }
            });
        }
    };
});

angular.module('myApp').directive('dynamicLength', function () {
    return {
        require: 'ngModel',
        link: function (scope, element, attrs, ngModelCtrl) {
            var maxLength = parseInt(attrs.maxlength);
            var minLength = parseInt(attrs.minlength);

            ngModelCtrl.$parsers.push(function (inputValue) {
                if (!inputValue) {
                    return '';
                }

                var transformedInput = inputValue;

                if (maxLength && transformedInput.length > maxLength) {
                    transformedInput = transformedInput.slice(0, maxLength);
                    ngModelCtrl.$setViewValue(transformedInput);
                    ngModelCtrl.$render();
                }

                if (minLength && transformedInput.length < minLength) {
                    ngModelCtrl.$setValidity('dynamicLength', false);
                } else {
                    ngModelCtrl.$setValidity('dynamicLength', true);
                }

                return transformedInput;
            });
        }
    };
});
 




