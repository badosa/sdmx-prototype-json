// Generated by CoffeeScript 1.3.3
(function() {

  demoModule.controller('MainCtrl', function($scope, $http) {
    var calculateStartAndEndPeriods, createTimeSeries, getObservationAttributes, getTimeSeriesAttributes, getTimeSeriesObservations, onData, onDimensions, onError, onErrorData;
    $scope.version = '0.1.1';
    $scope.state = {
      httpError: false,
      httpErrorData: false,
      dataRequestRunning: false,
      dimensionRequestRunning: false
    };
    $scope.wsName = 'http://live-test-ws.jit.su';
    $scope.dfName = 'ECB_ICP1';
    $scope.key = '';
    $scope.customParams = '';
    $scope.getDimensions = function() {
      $scope.state.httpError = false;
      $scope.state.dimensionRequestRunning = true;
      return $http.get($scope.dimUrl).success(onDimensions).error(onError);
    };
    $scope.getData = function() {
      $scope.startRequest = new Date();
      $scope.state.httpErrorData = false;
      $scope.state.dataRequestRunning = true;
      return $http.get($scope.dataUrl).success(onData).error(onErrorData);
    };
    onDimensions = function(data, status, headers, config) {
      var code, codeId, dim, dimId, dimensions, _i, _j, _len, _len1, _ref, _ref1;
      $scope.state.dimensionRequestRunning = false;
      $scope.state.httpError = false;
      $scope.response = {
        status: status,
        headers: headers
      };
      dimensions = $scope.dimensions = data.dimensions;
      dimensions.seriesKeyDims = [];
      _ref = dimensions.id;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        dimId = _ref[_i];
        dim = dimensions[dimId];
        if (dim.type === 'time') {
          dimensions.timeDimension = dim;
        } else {
          dimensions.seriesKeyDims.push(dimId);
        }
        _ref1 = dim.codes.id;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          codeId = _ref1[_j];
          code = dim.codes[codeId];
          code.checked = false;
          if (dim.type === 'time') {
            code.start = new Date(code.start);
            code.end = new Date(code.end);
          }
        }
        dim.codes[dim.codes.id[0]].checked = true;
        dim.show = false;
      }
      return $scope.changeCheckedCodes();
    };
    onData = function(data, status, headers, config) {
      var attr, attrId, code, codeId, codeIndex, codeLengths, dim, dimId, i, j, key, length, multipliers, prev, seriesCount, seriesKeyDims, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _len6, _m, _n, _o, _p, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _results;
      $scope.requestRuntime = new Date() - $scope.startRequest;
      $scope.state.httpErrorData = false;
      $scope.state.dataRequestRunning = false;
      $scope.response = {
        status: status,
        headers: headers
      };
      $scope.data = data;
      data.commonDimensions = [];
      seriesKeyDims = data.dimensions.seriesKeyDims = [];
      _ref = data.dimensions.id;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        dimId = _ref[_i];
        dim = data.dimensions[dimId];
        if (dim.type === 'time') {
          data.dimensions.timeDimension = dim;
          _ref1 = dim.codes.id;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            codeId = _ref1[_j];
            code = dim.codes[codeId];
            code.start = new Date(code.start);
            code.end = new Date(code.end);
          }
          continue;
        }
        seriesKeyDims.push(dimId);
        if (dim.codes.id.length === 1) {
          data.commonDimensions.push({
            name: dim.name,
            value: dim.codes[dim.codes.id[0]].name
          });
        }
      }
      data.dimensions.multipliers = [];
      prev = 1;
      _ref2 = data.dimensions.id.slice().reverse();
      for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
        dim = _ref2[_k];
        data.dimensions.multipliers.push(prev);
        prev *= data.dimensions[dim].codes.id.length;
      }
      data.dimensions.multipliers.reverse();
      _ref3 = data.attributes.id;
      for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
        attrId = _ref3[_l];
        attr = data.attributes[attrId];
        attr.multipliers = [];
        prev = 1;
        _ref4 = attr.dimension.slice().reverse();
        for (_m = 0, _len4 = _ref4.length; _m < _len4; _m++) {
          dim = _ref4[_m];
          attr.multipliers.push(prev);
          prev *= data.dimensions[dim].codes.id.length;
        }
        attr.multipliers.reverse();
      }
      seriesCount = 1;
      multipliers = [];
      codeLengths = [];
      for (_n = 0, _len5 = seriesKeyDims.length; _n < _len5; _n++) {
        dim = seriesKeyDims[_n];
        multipliers.push(seriesCount);
        codeLengths.push(data.dimensions[dim].codes.id.length);
        seriesCount *= data.dimensions[dim].codes.id.length;
      }
      data.timeseries = [];
      _results = [];
      for (i = _o = 0, _ref5 = seriesCount - 1; 0 <= _ref5 ? _o <= _ref5 : _o >= _ref5; i = 0 <= _ref5 ? ++_o : --_o) {
        key = [];
        for (j = _p = 0, _len6 = codeLengths.length; _p < _len6; j = ++_p) {
          length = codeLengths[j];
          codeIndex = Math.floor(i / multipliers[j]) % length;
          key.push(codeIndex);
        }
        _results.push(data.timeseries.push(createTimeSeries(key)));
      }
      return _results;
    };
    createTimeSeries = function(key) {
      var code, dim, dimId, dimensions, i, series, _i, _len, _ref;
      series = {
        key: key,
        show: false,
        keycodes: [],
        keynames: [],
        attributes: [],
        observations: []
      };
      dimensions = $scope.data.dimensions;
      _ref = dimensions.seriesKeyDims;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        dimId = _ref[i];
        dim = dimensions[dimId];
        code = dim.codes.id[series.key[i]];
        series.keycodes.push(code);
        if (dim.codes.id.length === 1) {
          continue;
        }
        series.keynames.push({
          name: dim.name,
          value: dim.codes[code].name
        });
      }
      series.attributes = getTimeSeriesAttributes(series.key);
      series.observations = getTimeSeriesObservations(series.key);
      return series;
    };
    getTimeSeriesObservations = function(key) {
      var dimId, dimIndex, dimensions, i, index, obs, obsIndex, obsVal, period, timeMultiplier, timePeriods, _i, _j, _len, _len1, _ref, _ref1;
      obs = [];
      obsIndex = 0;
      dimensions = $scope.data.dimensions;
      _ref = dimensions.seriesKeyDims;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        dimId = _ref[i];
        dimIndex = dimensions[dimId].index;
        obsIndex += key[i] * dimensions.multipliers[dimIndex];
      }
      timePeriods = dimensions.timeDimension.codes;
      timeMultiplier = dimensions.multipliers[dimensions.timeDimension.index];
      _ref1 = timePeriods.id;
      for (i = _j = 0, _len1 = _ref1.length; _j < _len1; i = ++_j) {
        period = _ref1[i];
        index = obsIndex + (i * timeMultiplier);
        obsVal = $scope.data.measure[index];
        if (obsVal == null) {
          continue;
        }
        obs.push({
          date: timePeriods[period].end,
          value: obsVal,
          attributes: getObservationAttributes(index)
        });
      }
      return obs;
    };
    getObservationAttributes = function(index) {
      var attr, attrId, attrValue, attributes, attrs, dimensions, _i, _len, _ref;
      attrs = [];
      attributes = $scope.data.attributes;
      dimensions = $scope.data.dimensions;
      _ref = attributes.id;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        attrId = _ref[_i];
        attr = attributes[attrId];
        if (attr.dimension.length !== dimensions.length) {
          continue;
        }
        attrValue = attr.value[index];
        if (attrValue == null) {
          attrValue = attr["default"];
        }
        if (attrValue == null) {
          continue;
        }
        if (attr.codes != null) {
          attrValue = attr.codes[attrValue].name;
        }
        attrs.push({
          name: attr.name,
          value: attrValue
        });
      }
      if (attrs.length === 0) {
        return void 0;
      }
      return attrs;
    };
    getTimeSeriesAttributes = function(key) {
      var attr, attrId, attrValue, attributes, attrs, dim, dimensions, index, j, _i, _j, _len, _len1, _ref, _ref1;
      attrs = [];
      attributes = $scope.data.attributes;
      dimensions = $scope.data.dimensions;
      _ref = attributes.id;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        attrId = _ref[_i];
        attr = attributes[attrId];
        if (attr.dimension.length === dimensions.id.length) {
          continue;
        }
        if (attr.dimension.length === 0) {
          continue;
        }
        index = 0;
        _ref1 = attr.dimension;
        for (j = _j = 0, _len1 = _ref1.length; _j < _len1; j = ++_j) {
          dim = _ref1[j];
          index += key[dimensions[dim].index] * attr.multipliers[j];
        }
        attrValue = attr.value[index];
        if (attrValue == null) {
          attrValue = attr["default"];
        }
        if (attr.codes != null) {
          attrValue = attr.codes[attrValue].name;
        }
        attrs.push({
          name: attr.name,
          value: attrValue
        });
      }
      return attrs;
    };
    onError = function(data, status, headers, config) {
      $scope.state.dimensionRequestRunning = false;
      $scope.state.httpError = true;
      return $scope.response = {
        status: status,
        headers: headers,
        errors: data.errors
      };
    };
    onErrorData = function(data, status, headers, config) {
      $scope.state.dataRequestRunning = false;
      $scope.state.httpErrorData = true;
      return $scope.response = {
        status: status,
        headers: headers,
        errors: data.errors
      };
    };
    $scope.showButtonText = function(show) {
      if (show) {
        return 'Hide';
      } else {
        return 'Show';
      }
    };
    $scope.changeDimUrl = function() {
      var params;
      $scope.dimUrl = "" + $scope.wsName + "/data/" + $scope.dfName;
      if ($scope.key.length) {
        $scope.dimUrl += "/" + $scope.key;
      }
      params = [];
      params.push("detail=serieskeysonly");
      if ($scope.customParams.length) {
        params.push($scope.customParams);
      }
      if (params.length) {
        return $scope.dimUrl += "?" + params.join('&');
      }
    };
    $scope.changeDimUrl();
    $scope.changeCheckedCodes = function() {
      var code, codeId, dim, dimId, dimensions, _i, _j, _len, _len1, _ref, _ref1;
      dimensions = $scope.dimensions;
      _ref = dimensions.id;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        dimId = _ref[_i];
        dim = dimensions[dimId];
        dim.codes.checked = [];
        _ref1 = dim.codes.id;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          codeId = _ref1[_j];
          code = dim.codes[codeId];
          if (code.checked) {
            dim.codes.checked.push(code.id);
          }
        }
      }
      return $scope.changeDataUrl();
    };
    $scope.changeDataUrl = function() {
      var codes, dim, dimId, dimensions, i, key, params, _i, _j, _len, _len1, _ref;
      $scope.dataUrl = "" + $scope.wsName + "/data/" + $scope.dfName;
      key = [];
      dimensions = $scope.dimensions;
      _ref = dimensions.id;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        dimId = _ref[i];
        dim = dimensions[dimId];
        if (dim.type === 'time') {
          continue;
        }
        key.push(dim.codes.checked);
      }
      for (i = _j = 0, _len1 = key.length; _j < _len1; i = ++_j) {
        codes = key[i];
        key[i] = codes.join('+');
      }
      $scope.dataUrl += '/' + key.join('.');
      params = [];
      params.push("dimensionAtObservation=AllDimensions");
      if ($scope.customParams.length) {
        params.push($scope.customParams);
      }
      if (params.length) {
        return $scope.dataUrl += '?' + params.join('&');
      }
    };
    calculateStartAndEndPeriods = function(timeDimension) {
      var code, codeId, endPeriod, params, startPeriod, _i, _len, _ref;
      startPeriod = null;
      endPeriod = null;
      params = '';
      _ref = timeDimension.codes.id;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        codeId = _ref[_i];
        code = timeDimension.codes[codeId];
        if (!code.checked) {
          continue;
        }
        if (startPeriod != null) {
          if (code.start < startPeriod.start) {
            startPeriod = code;
          }
        } else {
          startPeriod = code;
        }
        if (endPeriod != null) {
          if (endPeriod.end < code.end) {
            endPeriod = code;
          }
        } else {
          endPeriod = code;
        }
      }
      if (startPeriod != null) {
        params = 'startPeriod=' + startPeriod.id;
      }
      if (endPeriod != null) {
        params += '&endPeriod=' + endPeriod.id;
      }
      return params;
    };
  });

}).call(this);
