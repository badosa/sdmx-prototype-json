// Generated by CoffeeScript 1.4.0
(function() {
  var validationApp;

  validationApp = angular.module('ValidationApp', []);

  validationApp.controller('ValidationCtrl', function($scope, $http) {
    var info, log, onData, onError, onSchema, requestSchema, schema, severe;
    $scope.schemaType = 'draft-sdmx-json';
    $scope.messages = [];
    schema = {};
    $scope.validate = function() {
      $scope.messages = [];
      return requestSchema();
    };
    requestSchema = function() {
      var config, schemaUrl;
      switch ($scope.schemaType) {
        case 'draft-sdmx-json':
          schemaUrl = 'sdmx-json-schema.json';
          break;
        case 'json-slice':
          schemaUrl = 'json-slice-schema.json';
          break;
        case 'json-code-index':
          schemaUrl = 'json-code-index-schema.json';
      }
      info("Requesting schema from " + schemaUrl);
      config = {
        method: 'GET',
        url: schemaUrl,
        cache: false,
        transformResponse: function(data) {
          return data;
        }
      };
      return $http(config).success(onSchema).error(onError);
    };
    onSchema = function(data, status, headers, config) {
      info('Received schema');
      info('Starting to parse schema');
      try {
        schema = JSON.parse(data);
      } catch (error) {
        severe(error);
        return;
      }
      info('Finished parsing schema "' + schema.description + '"');
      info("Requesting data from " + $scope.wsName);
      config = {
        method: 'GET',
        url: $scope.wsName,
        cache: false,
        transformResponse: function(data) {
          return data;
        }
      };
      return $http(config).success(onData).error(onError);
    };
    onData = function(data, status, headers, config) {
      var json, valid;
      info('Received data from web service');
      info('Starting to parse data');
      try {
        json = JSON.parse(data);
      } catch (error) {
        severe(error);
        return;
      }
      info('Finished parsing data');
      info('Starting to validate data');
      valid = tv4.validate(json, schema);
      if (!valid) {
        severe(JSON.stringify(tv4.error, null, 4));
      }
      info('Finished validating data');
      return info('Done');
    };
    onError = function(data, status, headers, config) {
      var json;
      try {
        json = JSON.parse(data);
        return severe("" + status + " " + json.errors);
      } catch (err) {
        return severe(status);
      }
    };
    info = function(msg) {
      return log('muted', msg);
    };
    severe = function(msg) {
      return log('text-error', "Error: " + msg);
    };
    return log = function(style, msg) {
      return $scope.messages.push({
        "class": style,
        msg: (new Date()).toISOString().slice(11, 23) + ' ' + msg
      });
    };
  });

}).call(this);
