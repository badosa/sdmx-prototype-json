// Generated by CoffeeScript 1.3.3
(function() {

  demoModule.controller('MainCtrl', function($scope, $http) {
    var JSONArrayCube, JSONIndexCube, JSONSeries2Cube, JSONSeries3Cube, JSONSeries4Cube, JSONSeriesCube, bytesToSize, getTestUrl, testCube, testTimeSeries;
    $scope.version = '0.1.5';
    $scope.state = {
      httpError: false,
      httpErrorData: false,
      dataRequestRunning: false,
      dimensionRequestRunning: false
    };
    $scope.wsName = 'http://46.51.142.127:8080/FusionMatrix3/ws';
    $scope.dfName = 'SDMX,T1,1.0';
    $scope.key = 'D.0.0.0.0.1';
    $scope.customParams = '';
    $scope.customParams = 'outputdates=true';
    $scope.dimensions = [];
    $scope.results = [];
    $scope.formats = ['jsonseries', 'jsonseries2', 'jsonseries3', 'jsonseries4', 'jsonindex', 'jsonarray'];
    $scope.getDimensions = function() {
      var config, onResults;
      onResults = function(data, status, headers, config) {
        var codes, dim, dimId, key, value, _i, _len, _ref, _ref1, _results;
        $scope.state.testRunning = false;
        $scope.state.httpError = false;
        $scope.dimensions = [];
        _ref = data.dimensions.id;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          dimId = _ref[_i];
          dim = data.dimensions[dimId];
          codes = [];
          _ref1 = dim.codes;
          for (key in _ref1) {
            value = _ref1[key];
            codes.push(key);
          }
          _results.push($scope.dimensions.push({
            id: dimId,
            codes: codes.join(', ')
          }));
        }
        return _results;
      };
      config = {
        method: 'GET',
        url: "" + $scope.wsName + "/data/" + $scope.dfName + "/ALL?format=jsonseries&detail=seriesKeysOnly",
        cache: false
      };
      $scope.state.httpError = false;
      $scope.state.testRunning = true;
      return $http(config).success(onResults).error(onError);
    };
    $scope.runTest = function(format) {
      var config, onError, onResults, result, start, startMem, transformResponse, _ref;
      start = (new Date).getTime();
      if ((typeof window !== "undefined" && window !== null ? (_ref = window.performance) != null ? _ref.memory : void 0 : void 0) != null) {
        startMem = window.performance.memory.usedJSHeapSize;
      }
      result = {
        format: format
      };
      $scope.results.push(result);
      transformResponse = function(data) {
        return data;
      };
      onResults = function(data, status, headers, config) {
        var calibration, cube, json, stringKey, _ref1;
        $scope.state.testRunning = false;
        $scope.state.httpError = false;
        $scope.response = {
          status: status
        };
        result.requestTime = ((new Date).getTime() - start) + ' ms';
        result.size = bytesToSize(unescape(encodeURIComponent(data.length)), 2);
        start = (new Date).getTime();
        json = JSON.parse(data);
        if ((typeof window !== "undefined" && window !== null ? (_ref1 = window.performance) != null ? _ref1.memory : void 0 : void 0) != null) {
          result.memory = window.performance.memory.usedJSHeapSize - startMem;
        }
        start = (new Date).getTime();
        cube = (function() {
          switch (result.format) {
            case 'jsonarray':
              return new JSONArrayCube(json);
            case 'jsonindex':
              return new JSONIndexCube(json);
            case 'jsonseries':
              return new JSONSeriesCube(json);
            case 'jsonseries2':
              return new JSONSeries2Cube(json);
            case 'jsonseries3':
              return new JSONSeries3Cube(json);
            case 'jsonseries4':
              return new JSONSeries4Cube(json);
          }
        })();
        result.initTime = ((new Date).getTime() - start) + ' ms';
        stringKey = (function() {
          switch (result.format) {
            case 'jsonarray':
            case 'jsonindex':
            case 'jsonseries4':
              return false;
            default:
              return true;
          }
        })();
        result.parseTime = ((new Date).getTime() - start) + ' ms';
        start = (new Date).getTime();
        testCube(cube, result, true, stringKey);
        calibration = (new Date).getTime() - start;
        start = (new Date).getTime();
        result.dataChecksum = cube.checkSum();
        result.cubeChecksum = testCube(cube, result, false, stringKey);
        result.cubeAccessTime = ((new Date).getTime() - start - calibration) + ' ms';
        start = (new Date).getTime();
        testTimeSeries(cube, result, true, stringKey);
        calibration = (new Date).getTime() - start;
        start = (new Date).getTime();
        result.tsChecksum = testTimeSeries(cube, result, false, stringKey);
        return result.tsAccessTime = ((new Date).getTime() - start - calibration) + ' ms';
      };
      onError = function(data, status, headers, config) {
        $scope.state.testRunning = false;
        $scope.state.httpError = true;
        return $scope.response = {
          status: status,
          errors: data.errors
        };
      };
      config = {
        method: 'GET',
        url: getTestUrl(format),
        transformResponse: transformResponse,
        cache: false
      };
      $scope.state.httpError = false;
      $scope.state.testRunning = true;
      return $http(config).success(onResults).error(onError);
    };
    JSONArrayCube = (function() {

      function JSONArrayCube(msg) {
        var dimId, dims, prev, _i, _len, _ref;
        this.msg = msg;
        this.multipliers = [];
        prev = 1;
        _ref = this.dimensions().reverse();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          dimId = _ref[_i];
          this.multipliers.push(prev);
          prev *= this.codes(dimId).length;
        }
        this.multipliers.reverse();
        dims = this.dimensions();
        this.timeDimensionCodes = this.codes(dims[dims.length - 1]);
      }

      JSONArrayCube.prototype.dimensions = function() {
        var dims;
        dims = this.msg.dimensions.id.slice();
        dims.push('TIME_PERIOD');
        return dims;
      };

      JSONArrayCube.prototype.codes = function(dimension) {
        return this.msg.dimensions[dimension].codes.id.slice();
      };

      JSONArrayCube.prototype.observation = function(key) {
        var codeIndex, index, j, _i, _len;
        index = 0;
        for (j = _i = 0, _len = key.length; _i < _len; j = ++_i) {
          codeIndex = key[j];
          index += codeIndex * this.multipliers[j];
        }
        return this.msg.measure[0][index];
      };

      JSONArrayCube.prototype.timeSeries = function(key) {
        var i, last, obs, series, timePeriod, _i, _len, _ref;
        series = {
          observations: []
        };
        last = key.length;
        _ref = this.timeDimensionCodes;
        for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
          timePeriod = _ref[i];
          key[last] = i;
          obs = this.observation(key);
          if (obs == null) {
            continue;
          }
          series.observations.push({
            value: obs
          });
        }
        return series;
      };

      JSONArrayCube.prototype.checkSum = function() {
        var obs, sum, _i, _len, _ref;
        sum = 0;
        _ref = this.msg.measure[0];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          obs = _ref[_i];
          sum += +obs;
        }
        return sum;
      };

      return JSONArrayCube;

    })();
    JSONIndexCube = (function() {

      function JSONIndexCube(msg) {
        var dimId, dims, prev, _i, _len, _ref;
        this.msg = msg;
        this.multipliers = [];
        prev = 1;
        _ref = this.dimensions().reverse();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          dimId = _ref[_i];
          this.multipliers.push(prev);
          prev *= this.codes(dimId).length;
        }
        this.multipliers.reverse();
        dims = this.dimensions();
        this.timeDimensionCodes = this.codes(dims[dims.length - 1]);
      }

      JSONIndexCube.prototype.dimensions = function() {
        return this.msg.dimensions.id.slice();
      };

      JSONIndexCube.prototype.codes = function(dimension) {
        return this.msg.dimensions[dimension].codes.slice();
      };

      JSONIndexCube.prototype.observation = function(key) {
        var codeIndex, index, j, _i, _len, _ref;
        index = 0;
        for (j = _i = 0, _len = key.length; _i < _len; j = ++_i) {
          codeIndex = key[j];
          index += codeIndex * this.multipliers[j];
        }
        return (_ref = this.msg.measure[index]) != null ? _ref[0] : void 0;
      };

      JSONIndexCube.prototype.timeSeries = function(key) {
        var i, last, obs, series, timePeriod, _i, _len, _ref;
        series = {
          observations: []
        };
        last = key.length;
        _ref = this.timeDimensionCodes;
        for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
          timePeriod = _ref[i];
          key[last] = i;
          obs = this.observation(key);
          if (obs == null) {
            continue;
          }
          series.observations.push({
            value: obs
          });
        }
        return series;
      };

      JSONIndexCube.prototype.checkSum = function() {
        var key, sum, val, _ref;
        sum = 0;
        _ref = this.msg.measure;
        for (key in _ref) {
          val = _ref[key];
          sum += +val[0];
        }
        return sum;
      };

      return JSONIndexCube;

    })();
    JSONSeriesCube = (function() {

      function JSONSeriesCube(msg) {
        var dimId, _i, _len, _ref;
        this.msg = msg;
        this.dimCodes = [];
        _ref = this.dimensions();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          dimId = _ref[_i];
          this.dimCodes.push(this.codes(dimId));
        }
      }

      JSONSeriesCube.prototype.dimensions = function() {
        return this.msg.dimensions.id.slice();
      };

      JSONSeriesCube.prototype.codes = function(dimension) {
        return Object.keys(this.msg.dimensions[dimension].codes);
      };

      JSONSeriesCube.prototype.observation = function(key) {
        var keyString, obs, timePeriod, _ref, _ref1;
        timePeriod = key[key.length - 1];
        keyString = key.slice(0, -1).join(':');
        obs = (_ref = this.msg.measure[keyString]) != null ? (_ref1 = _ref.observations[timePeriod]) != null ? _ref1[0] : void 0 : void 0;
        if (obs != null) {
          return obs;
        } else {
          return void 0;
        }
      };

      JSONSeriesCube.prototype.timeSeries = function(key) {
        var keyString, newSeries, obs, series, timePeriod, _i, _len, _ref;
        keyString = key.join(':');
        newSeries = {
          observations: []
        };
        series = this.msg.measure[keyString];
        if (series == null) {
          return newSeries;
        }
        _ref = Object.keys(series.observations);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          timePeriod = _ref[_i];
          obs = series.observations[timePeriod];
          if (obs == null) {
            continue;
          }
          newSeries.observations.push({
            value: obs[0]
          });
        }
        return newSeries;
      };

      JSONSeriesCube.prototype.checkSum = function() {
        var key, key2, sum, val, val2, _ref, _ref1;
        sum = 0;
        _ref = this.msg.measure;
        for (key in _ref) {
          val = _ref[key];
          if (val.observations == null) {
            continue;
          }
          _ref1 = val.observations;
          for (key2 in _ref1) {
            val2 = _ref1[key2];
            sum += +val2[0];
          }
        }
        return sum;
      };

      return JSONSeriesCube;

    })();
    JSONSeries2Cube = (function() {

      function JSONSeries2Cube(msg) {
        var dimId, _i, _len, _ref;
        this.msg = msg;
        this.dimCodes = [];
        _ref = this.dimensions();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          dimId = _ref[_i];
          this.dimCodes.push(this.codes(dimId));
        }
      }

      JSONSeries2Cube.prototype.dimensions = function() {
        return Object.keys(this.msg.dimensions);
      };

      JSONSeries2Cube.prototype.codes = function(dimension) {
        return Object.keys(this.msg.dimensions[dimension].codes);
      };

      JSONSeries2Cube.prototype.observation = function(key) {
        var keyString, obs, obsIndex, timePeriod, _ref, _ref1;
        timePeriod = key[key.length - 1];
        keyString = key.slice(0, -1).join(':');
        obsIndex = (_ref = this.msg.measure[keyString]) != null ? (_ref1 = _ref.observations) != null ? _ref1.TIME_PERIOD.indexOf(timePeriod) : void 0 : void 0;
        if (!((obsIndex != null) && -1 < obsIndex)) {
          return void 0;
        }
        obs = this.msg.measure[keyString].observations.values[obsIndex];
        if (obs != null) {
          return obs;
        } else {
          return void 0;
        }
      };

      JSONSeries2Cube.prototype.timeSeries = function(key) {
        var keyString, newSeries, obs, series, _i, _len, _ref;
        keyString = key.join(':');
        newSeries = {
          observations: []
        };
        series = this.msg.measure[keyString];
        if (series == null) {
          return newSeries;
        }
        _ref = series.observations.values;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          obs = _ref[_i];
          if (obs == null) {
            continue;
          }
          newSeries.observations.push({
            value: obs
          });
        }
        return newSeries;
      };

      JSONSeries2Cube.prototype.checkSum = function() {
        var obj, obs, sum, val, _i, _len, _ref, _ref1;
        sum = 0;
        _ref = this.msg.measure;
        for (obj in _ref) {
          val = _ref[obj];
          if (val.observations == null) {
            continue;
          }
          _ref1 = val.observations.values;
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            obs = _ref1[_i];
            sum += +obs;
          }
        }
        return sum;
      };

      return JSONSeries2Cube;

    })();
    JSONSeries3Cube = (function() {

      function JSONSeries3Cube(msg) {
        var dimId, _i, _len, _ref;
        this.msg = msg;
        this.dimCodes = [];
        _ref = this.dimensions();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          dimId = _ref[_i];
          this.dimCodes.push(this.codes(dimId));
        }
      }

      JSONSeries3Cube.prototype.dimensions = function() {
        return Object.keys(this.msg.dimensions);
      };

      JSONSeries3Cube.prototype.codes = function(dimension) {
        return Object.keys(this.msg.dimensions[dimension].codes);
      };

      JSONSeries3Cube.prototype.observation = function(key) {
        var keyString, obs, timePeriod, _ref;
        timePeriod = key[key.length - 1];
        keyString = key.slice(0, -1).join(':');
        obs = (_ref = this.msg.measure[keyString]) != null ? _ref.observations[timePeriod] : void 0;
        if (obs != null) {
          return obs.value;
        } else {
          return void 0;
        }
      };

      JSONSeries3Cube.prototype.timeSeries = function(key) {
        var keyString, newSeries, obs, series, timePeriod, _i, _len, _ref;
        keyString = key.join(':');
        newSeries = {
          observations: []
        };
        series = this.msg.measure[keyString];
        if (series == null) {
          return newSeries;
        }
        _ref = Object.keys(series.observations).sort();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          timePeriod = _ref[_i];
          obs = series.observations[timePeriod];
          if (obs == null) {
            continue;
          }
          newSeries.observations.push({
            value: obs.value
          });
        }
        return newSeries;
      };

      JSONSeries3Cube.prototype.checkSum = function() {
        var key, key2, sum, val, val2, _ref, _ref1;
        sum = 0;
        _ref = this.msg.measure;
        for (key in _ref) {
          val = _ref[key];
          if (val.observations == null) {
            continue;
          }
          _ref1 = val.observations;
          for (key2 in _ref1) {
            val2 = _ref1[key2];
            sum += +val2.value;
          }
        }
        return sum;
      };

      return JSONSeries3Cube;

    })();
    JSONSeries4Cube = (function() {

      function JSONSeries4Cube(msg) {
        var code, codePos, codes, dimId, i, lastMultiplier, obj, obs, prev, seriesPos, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _m, _n, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
        this.msg = msg;
        this.dimCodes = {};
        _ref = this.dimensions();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          dimId = _ref[_i];
          codes = [];
          _ref1 = this.msg.dimensions[dimId].codes;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            code = _ref1[_j];
            codes.push(code);
          }
          this.dimCodes[dimId] = codes;
        }
        this.multipliers = [];
        prev = 1;
        _ref2 = this.dimensions().reverse();
        for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
          dimId = _ref2[_k];
          this.multipliers.push(prev);
          prev *= this.codes(dimId).length;
        }
        this.multipliers.reverse();
        this.obsIndex = [];
        this.seriesIndex = [];
        _ref3 = this.msg.data;
        for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
          obj = _ref3[_l];
          if (obj.dimensions == null) {
            continue;
          }
          seriesPos = 0;
          _ref4 = obj.dimensions.slice(0, -1);
          for (i = _m = 0, _len4 = _ref4.length; _m < _len4; i = ++_m) {
            codePos = _ref4[i];
            seriesPos += codePos * this.multipliers[i];
          }
          this.seriesIndex[seriesPos] = obj;
          if (!obj.observations) {
            continue;
          }
          lastMultiplier = this.multipliers[this.multipliers.length - 1];
          _ref5 = obj.observations;
          for (_n = 0, _len5 = _ref5.length; _n < _len5; _n++) {
            obs = _ref5[_n];
            this.obsIndex[seriesPos + (obs[0] * lastMultiplier)] = obs;
          }
        }
      }

      JSONSeries4Cube.prototype.dimensions = function() {
        return this.msg.dimensions.id.slice();
      };

      JSONSeries4Cube.prototype.codes = function(dimension) {
        return this.dimCodes[dimension];
      };

      JSONSeries4Cube.prototype.observation = function(key) {
        var codePos, i, pos, _i, _len, _ref;
        pos = 0;
        for (i = _i = 0, _len = key.length; _i < _len; i = ++_i) {
          codePos = key[i];
          pos += this.multipliers[i] * codePos;
        }
        return (_ref = this.obsIndex[pos]) != null ? _ref[1] : void 0;
      };

      JSONSeries4Cube.prototype.timeSeries = function(key) {
        var codePos, i, newSeries, obs, pos, series, _i, _j, _len, _len1, _ref;
        pos = 0;
        for (i = _i = 0, _len = key.length; _i < _len; i = ++_i) {
          codePos = key[i];
          pos += this.multipliers[i] * codePos;
        }
        newSeries = {
          observations: []
        };
        series = this.seriesIndex[pos];
        if (series == null) {
          return newSeries;
        }
        _ref = series.observations;
        for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
          obs = _ref[_j];
          newSeries.observations.push({
            value: obs[1]
          });
        }
        return newSeries;
      };

      JSONSeries4Cube.prototype.checkSum = function() {
        var obj, obs, sum, _i, _j, _len, _len1, _ref, _ref1;
        sum = 0;
        _ref = this.msg.data;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          obj = _ref[_i];
          if (obj.observations == null) {
            continue;
          }
          _ref1 = obj.observations;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            obs = _ref1[_j];
            sum += obs[1];
          }
        }
        return sum;
      };

      return JSONSeries4Cube;

    })();
    testCube = function(cube, result, calibrate, stringKey) {
      var checkSum, codeIndex, codeLengths, codePos, codes, dimCodes, dimId, dimensions, i, j, key, length, missing, multipliers, obs, obsCount, prev, _i, _j, _k, _l, _len, _len1, _len2, _ref, _ref1;
      dimensions = cube.dimensions();
      codes = [];
      obsCount = 1;
      multipliers = [];
      codeLengths = [];
      prev = 1;
      _ref = dimensions.slice().reverse();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        dimId = _ref[_i];
        multipliers.push(prev);
        dimCodes = cube.codes(dimId);
        codes.push(dimCodes);
        obsCount *= dimCodes.length;
        codeLengths.push(dimCodes.length);
        prev *= dimCodes.length;
      }
      multipliers.reverse();
      codeLengths.reverse();
      codes.reverse();
      result.obsCount = obsCount;
      checkSum = 0;
      missing = 0;
      for (i = _j = 0, _ref1 = obsCount - 1; 0 <= _ref1 ? _j <= _ref1 : _j >= _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
        key = [];
        for (j = _k = 0, _len1 = codeLengths.length; _k < _len1; j = ++_k) {
          length = codeLengths[j];
          codeIndex = Math.floor(i / multipliers[j]) % length;
          key.push(codeIndex);
        }
        if (stringKey) {
          for (j = _l = 0, _len2 = key.length; _l < _len2; j = ++_l) {
            codePos = key[j];
            key[j] = codes[j][codePos];
          }
        }
        if (!calibrate) {
          obs = cube.observation(key);
        }
        if (!(obs != null)) {
          missing += 1;
          continue;
        }
        checkSum += obs;
      }
      result.density = (1 - (missing / obsCount)).toFixed(2);
      return checkSum;
    };
    testTimeSeries = function(cube, result, calibrate, stringKey) {
      var checkSum, codeIndex, codeLengths, codePos, codes, dimCodes, dimId, dimensions, i, j, key, length, multipliers, obs, prev, series, seriesCount, startMem, timeSeries, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _m, _n, _ref, _ref1, _ref2, _ref3, _ref4;
      if ((typeof window !== "undefined" && window !== null ? (_ref = window.performance) != null ? _ref.memory : void 0 : void 0) != null) {
        startMem = window.performance.memory;
      }
      timeSeries = [];
      dimensions = cube.dimensions();
      dimensions.pop();
      seriesCount = 1;
      multipliers = [];
      codeLengths = [];
      codes = [];
      prev = 1;
      _ref1 = dimensions.reverse();
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        dimId = _ref1[_i];
        multipliers.push(prev);
        dimCodes = cube.codes(dimId);
        codes.push(dimCodes);
        seriesCount *= dimCodes.length;
        codeLengths.push(dimCodes.length);
        prev *= dimCodes.length;
      }
      multipliers.reverse();
      codeLengths.reverse();
      codes.reverse();
      result.tsCount = seriesCount;
      checkSum = 0;
      for (i = _j = 0, _ref2 = seriesCount - 1; 0 <= _ref2 ? _j <= _ref2 : _j >= _ref2; i = 0 <= _ref2 ? ++_j : --_j) {
        key = [];
        for (j = _k = 0, _len1 = codeLengths.length; _k < _len1; j = ++_k) {
          length = codeLengths[j];
          codeIndex = Math.floor(i / multipliers[j]) % length;
          key.push(codeIndex);
        }
        if (stringKey) {
          for (j = _l = 0, _len2 = key.length; _l < _len2; j = ++_l) {
            codePos = key[j];
            key[j] = codes[j][codePos];
          }
        }
        if (!calibrate) {
          series = cube.timeSeries(key);
        }
        if (series == null) {
          continue;
        }
        timeSeries.push(series);
      }
      for (_m = 0, _len3 = timeSeries.length; _m < _len3; _m++) {
        series = timeSeries[_m];
        _ref3 = series.observations;
        for (_n = 0, _len4 = _ref3.length; _n < _len4; _n++) {
          obs = _ref3[_n];
          if (obs.value == null) {
            continue;
          }
          checkSum += obs.value;
        }
      }
      if ((typeof window !== "undefined" && window !== null ? (_ref4 = window.performance) != null ? _ref4.memory : void 0 : void 0) != null) {
        result.tsMemory = window.performance.memory - startMem;
      }
      return checkSum;
    };
    bytesToSize = function(bytes, precision) {
      var gigabyte, kilobyte, megabyte, terabyte;
      kilobyte = 1024;
      megabyte = kilobyte * 1024;
      gigabyte = megabyte * 1024;
      terabyte = gigabyte * 1024;
      if (bytes >= 0 && bytes < kilobyte) {
        return bytes + ' B';
      } else if (bytes >= kilobyte && bytes < megabyte) {
        return (bytes / kilobyte).toFixed(precision) + ' KB';
      } else if (bytes >= megabyte && bytes < gigabyte) {
        return (bytes / megabyte).toFixed(precision) + ' MB';
      } else if (bytes >= gigabyte && bytes < terabyte) {
        return (bytes / gigabyte).toFixed(precision) + ' GB';
      } else if (bytes >= terabyte) {
        return (bytes / terabyte).toFixed(precision) + ' TB';
      } else {
        return bytes + ' B';
      }
    };
    getTestUrl = function(format) {
      var params, testUrl;
      testUrl = "" + $scope.wsName + "/data/" + $scope.dfName;
      if ($scope.key.length) {
        testUrl += "/" + $scope.key;
      }
      params = [];
      if ($scope.customParams.length) {
        params.push($scope.customParams);
      }
      params.push('format=' + format);
      if (params.length) {
        testUrl += "?" + params.join('&');
      }
      $scope.url = testUrl;
      return testUrl;
    };
  });

}).call(this);
