angular.module('myApp.services', []).
    factory('MyService', function($http) {
        var MyService = {};
        $http.get('resources/data.json').success(function(response) {
            MyService.data = response;
        });
        return MyService;
    }
);
