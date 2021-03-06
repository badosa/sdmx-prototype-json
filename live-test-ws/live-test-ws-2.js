// Generated by CoffeeScript 1.3.3
(function() {
  var DATA_FILE, PORT_NUMBER, SERVER_NAME, SERVER_VERSION, addCodesToQuery, calculateIndexMultipliers, compressResponse, dataset, filterTimePeriods, findDataFlow, fs, handleRequest, http, loadDataset, log, parse, parseDataQuery, parseDate, parseFlowRef, parseKey, parseProviderRef, parseQueryParams, query, timePeriodToDate, url, validateRequest, zlib;

  http = require('http');

  url = require('url');

  fs = require('fs');

  zlib = require('zlib');

  SERVER_NAME = 'LIVE-TEST-WS-2';

  SERVER_VERSION = '0.3.0';

  PORT_NUMBER = process.env.PORT || 8081;

  DATA_FILE = 'hicp-coicop-inx-flat.json';

  dataset = null;

  log = function(msg) {
    return console.log("" + (new Date().toTimeString().slice(0, 8)) + " " + msg);
  };

  calculateIndexMultipliers = function(dimensions) {
    var dim, i, multipliers, prev, reversedDimensions, _i, _len;
    multipliers = new Array(dimensions.length);
    reversedDimensions = dimensions.slice().reverse();
    prev = 1;
    for (i = _i = 0, _len = reversedDimensions.length; _i < _len; i = ++_i) {
      dim = reversedDimensions[i];
      multipliers[i] = prev;
      prev = dim.length * prev;
    }
    return multipliers.reverse();
  };

  loadDataset = function(filename) {
    var data, jsonString;
    jsonString = fs.readFileSync(filename);
    data = JSON.parse(jsonString);
    return data;
  };

  exports.timePeriodToDate = timePeriodToDate = function(frequency, year, period, end) {
    var date;
    if (year % 1 !== 0) {
      return null;
    }
    if (period % 1 !== 0) {
      return null;
    }
    if (period < 1) {
      return null;
    }
    date = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    if (!end) {
      period = period - 1;
    }
    switch (frequency) {
      case 'A':
        if (1 < period) {
          return null;
        }
        date.setUTCMonth(date.getUTCMonth() + (12 * period));
        break;
      case 'S':
        if (2 < period) {
          return null;
        }
        date.setUTCMonth(date.getUTCMonth() + (6 * period));
        break;
      case 'T':
        if (3 < period) {
          return null;
        }
        date.setUTCMonth(date.getUTCMonth() + (4 * period));
        break;
      case 'Q':
        if (4 < period) {
          return null;
        }
        date.setUTCMonth(date.getUTCMonth() + (3 * period));
        break;
      case 'M':
        if (12 < period) {
          return null;
        }
        date.setUTCMonth(date.getUTCMonth() + period);
        break;
      case 'W':
        if (53 < period) {
          return null;
        }
        if (date.getUTCDay() !== 4) {
          date.setUTCMonth(0, 1 + (((4 - date.getUTCDay()) + 7) % 7));
        }
        date.setUTCDate(date.getUTCDate() - 3);
        date.setUTCDate(date.getUTCDate() + (7 * period));
        break;
      case 'D':
        if (366 < period) {
          return null;
        }
        date.setUTCDate(date.getUTCDate() + period);
        break;
      default:
        return null;
    }
    return date;
  };

  exports.parseDate = parseDate = function(value, end) {
    var date, millisecs;
    date = null;
    if (/^\d\d\d\d-[A|S|T|Q]\d$/.test(value)) {
      date = timePeriodToDate(value[5], +value.slice(0, 4), +value[6], end);
    } else if (/^\d\d\d\d-[M|W]\d\d$/.test(value)) {
      date = timePeriodToDate(value[5], +value.slice(0, 4), +value.slice(6, 8), end);
    } else if (/^\d\d\d\d-D\d\d\d$/.test(value)) {
      date = timePeriodToDate(value[5], +value.slice(0, 4), +value.slice(6, 9), end);
    } else {
      millisecs = Date.parse(value);
      if (isNaN(millisecs)) {
        return null;
      }
      date = new Date(millisecs);
      if (end) {
        switch (value.length) {
          case 4:
            date.setUTCFullYear(date.getUTCFullYear() + 1);
            break;
          case 7:
            date.setUTCMonth(date.getUTCMonth() + 1);
            break;
          case 10:
            date.setUTCDate(date.getUTCDate() + 1);
        }
      }
    }
    if ((date != null) && end) {
      date.setUTCSeconds(date.getUTCSeconds() - 1);
    }
    return date;
  };

  exports.parseFlowRef = parseFlowRef = function(flowRefStr, request, response) {
    var flowRef, regex;
    if (!(flowRefStr != null)) {
      response.result.errors.push('Mandatory parameter flowRef is missing');
      response.statusCode = 400;
      return;
    }
    regex = /^(([A-z0-9_@$\-]+)|(([A-z][A-z0-9_\-]*(\.[A-z][A-z0-9_\-]*)*)(\,[A-z0-9_@$\-]+)(\,(latest|([0-9]+(\.[0-9]+)*)))?))$/;
    if (!regex.test(flowRefStr)) {
      response.result.errors.push("Invalid parameter flowRef " + flowRefStr);
      response.statusCode = 400;
      return;
    }
    flowRef = flowRefStr.split(',');
    if (flowRef.length === 1) {
      flowRef[1] = flowRef[0];
      flowRef[0] = 'all';
    }
    if (!(flowRef[2] != null) || flowRef[2] === '') {
      flowRef[2] = 'latest';
    }
    return request.query.flowRef = {
      agencyID: flowRef[0],
      id: flowRef[1],
      version: flowRef[2]
    };
  };

  exports.parseKey = parseKey = function(keyStr, request, response) {
    var code, codes, dim, dims, i, key, regex, _i, _j, _len, _len1;
    if (keyStr == null) {
      keyStr = 'all';
    }
    if (keyStr === 'all') {
      request.query.key = 'all';
      return;
    }
    regex = /^(([A-Za-z0-9_@$\-]+([+][A-Za-z0-9_@$\-]+)*)?([.]([A-Za-z0-9_@$\-]+([+][A-Za-z0-9_@$\-]+)*)?)*)$/;
    if (!regex.test(keyStr)) {
      response.result.errors.push("Invalid parameter flowRef " + keyStr);
      response.statusCode = 400;
      return;
    }
    key = [];
    dims = keyStr.split('.');
    for (i = _i = 0, _len = dims.length; _i < _len; i = ++_i) {
      dim = dims[i];
      codes = dim.split('+');
      key[i] = [];
      for (_j = 0, _len1 = codes.length; _j < _len1; _j++) {
        code = codes[_j];
        if (code !== '') {
          key[i].push(code);
        }
      }
      if (-1 < dim.indexOf('+') && key[i].length === 0) {
        response.result.errors.push("Invalid parameter key " + keyStr);
        response.statusCode = 400;
        return;
      }
    }
    return request.query.key = key;
  };

  exports.parseProviderRef = parseProviderRef = function(providerRefStr, request, response) {
    var providerRef, regex;
    if (providerRefStr == null) {
      providerRefStr = 'all';
    }
    regex = /^(([A-z][A-z0-9_\-]*(\.[A-z][A-z0-9_\-]*)*\,)?([A-z0-9_@$\-]+))$/;
    if (!regex.test(providerRefStr)) {
      response.result.errors.push("Invalid parameter providerRef " + providerRefStr);
      response.statusCode = 400;
      return;
    }
    providerRef = providerRefStr.split(',');
    switch (providerRef.length) {
      case 1:
        if (providerRef[0] !== 'all') {
          providerRef[1] = providerRef[0];
          providerRef[0] = 'all';
        }
    }
    if (!(providerRef[0] != null) || providerRef[0] === '') {
      providerRef[0] = 'all';
    }
    if (!(providerRef[1] != null) || providerRef[1] === '') {
      providerRef[1] = 'all';
    }
    if (providerRef.length !== 2) {
      response.result.errors.push("Invalid parameter providerRef " + providerRefStr);
      response.statusCode = 400;
      return;
    }
    return request.query.providerRef = {
      agencyID: providerRef[0],
      id: providerRef[1]
    };
  };

  exports.parseQueryParams = parseQueryParams = function(request, response) {
    var date, n, param, parameters, value;
    parameters = url.parse(request.url, true, false).query;
    for (param in parameters) {
      value = parameters[param];
      switch (param) {
        case 'startPeriod':
        case 'endPeriod':
          date = parseDate(value, param === 'endPeriod');
          if (date != null) {
            request.query[param] = date;
            continue;
          }
          break;
        case 'firstNObservations':
        case 'lastNObservations':
          n = ~Number(value);
          if (String(n) === value && n >= 0) {
            request.query[param] = n;
            continue;
          }
          break;
        case 'updatedAfter':
          response.statusCode = 501;
          return;
        case 'dimensionAtObservation':
          request.query[param] = value;
          continue;
        case 'detail':
          switch (value) {
            case 'full':
            case 'dataonly':
            case 'nodata':
            case 'serieskeysonly':
              request.query[param] = value;
              continue;
          }
      }
      response.result.errors.push("Invalid query parameter " + param + " value " + value);
      response.statusCode = 400;
      return;
    }
  };

  parseDataQuery = function(path, request, response) {
    parseFlowRef(path[2], request, response);
    if (response.statusCode !== 200) {
      return;
    }
    parseKey(path[3], request, response);
    if (response.statusCode !== 200) {
      return;
    }
    parseProviderRef(path[4], request, response);
    if (response.statusCode !== 200) {
      return;
    }
    parseQueryParams(request, response);
    if (response.statusCode !== 200) {

    }
  };

  parse = function(request, response) {
    var path;
    request.query = {};
    path = url.parse(request.url, false, false).pathname.split('/');
    if (path[1] === 'auth') {
      path.shift();
    }
    request.query.resource = path[1];
    switch (request.query.resource) {
      case 'data':
        return parseDataQuery(path, request, response);
      default:
        response.statusCode = 501;
    }
  };

  findDataFlow = function(request, response) {
    var found;
    found = true;
    found &= (function() {
      switch (request.query.flowRef.agencyID) {
        case 'all':
        case 'ECB':
          return true;
        default:
          return false;
      }
    })();
    found &= (function() {
      switch (request.query.flowRef.id) {
        case 'ECB_ICP1':
          return true;
        default:
          return false;
      }
    })();
    found &= (function() {
      switch (request.query.flowRef.version) {
        case 'latest':
          return true;
        default:
          return false;
      }
    })();
    found &= (function() {
      switch (request.query.providerRef.agencyID) {
        case 'ECB':
        case 'all':
          return true;
        default:
          return false;
      }
    })();
    found &= (function() {
      switch (request.query.providerRef.id) {
        case 'ECB':
        case 'all':
          return true;
        default:
          return false;
      }
    })();
    if (!found) {
      response.statusCode = 404;
      response.result.errors.push("Data flow not found");
      return;
    }
    return dataset;
  };

  filterTimePeriods = function(request, response, msg) {
    var dim, endDate, i, j, period, periods, startDate, _i, _j, _len, _len1, _ref, _ref1;
    periods = [];
    _ref = msg.dimensions.id;
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      dim = _ref[i];
      if (msg.dimensions[dim].type !== 'time') {
        continue;
      }
      _ref1 = msg.dimensions[dim].codes.id;
      for (j = _j = 0, _len1 = _ref1.length; _j < _len1; j = ++_j) {
        period = _ref1[j];
        if (request.query.startPeriod != null) {
          startDate = parseDate(period, false);
          if (!(request.query.startPeriod <= startDate)) {
            continue;
          }
        }
        if (request.query.endPeriod != null) {
          endDate = parseDate(period, true);
          if (!(endDate <= request.query.endPeriod)) {
            continue;
          }
        }
        periods.push(j);
      }
      break;
    }
    return periods;
  };

  addCodesToQuery = function(request, response, msg) {
    var code, dim, i, index, j, keyCodes, query, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _m, _n, _ref, _ref1, _ref2, _ref3, _ref4;
    query = [];
    _ref = msg.dimensions.id;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      dim = _ref[_i];
      query.push([]);
    }
    if (request.query.key === 'all') {
      _ref1 = msg.dimensions.id;
      for (i = _j = 0, _len1 = _ref1.length; _j < _len1; i = ++_j) {
        dim = _ref1[i];
        if (msg.dimensions[dim].type === 'time') {
          continue;
        }
        _ref2 = msg.dimensions[dim].codes.id;
        for (j = _k = 0, _len2 = _ref2.length; _k < _len2; j = ++_k) {
          code = _ref2[j];
          query[i].push(j);
        }
      }
      return query;
    }
    if (request.query.key.length !== msg.dimensions.id.length - 1) {
      response.result.errors.push("Invalid number of dimensions in parameter key");
      response.statusCode = 400;
      return;
    }
    _ref3 = request.query.key;
    for (i = _l = 0, _len3 = _ref3.length; _l < _len3; i = ++_l) {
      keyCodes = _ref3[i];
      dim = msg.dimensions.id[i];
      if (keyCodes.length === 0) {
        _ref4 = msg.dimensions[dim].codes.id;
        for (j = _m = 0, _len4 = _ref4.length; _m < _len4; j = ++_m) {
          code = _ref4[j];
          query[i].push(j);
        }
        continue;
      }
      for (_n = 0, _len5 = keyCodes.length; _n < _len5; _n++) {
        code = keyCodes[_n];
        if (msg.dimensions[dim].codes[code] == null) {
          continue;
        }
        index = msg.dimensions[dim].codes[code].index;
        if (0 <= index) {
          query[i].push(index);
        }
      }
    }
    return query;
  };

  query = function(msg, request, response) {
    var attrId, attributesInResults, code, codeCounts, codesInQuery, codesWithData, dim, filterTime, filtered, i, isInQuery, isInQueryTime, newObs, newPos, noAttributes, noObservations, obj, obj2, obs, obsCount, obsDimPos, observations, pos, resultObj, results, results2, rslt, timeCodes, _base, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _len6, _len7, _len8, _len9, _m, _n, _o, _p, _q, _r, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _results;
    rslt = response.result;
    if ((_ref = (_base = request.query).dimensionAtObservation) == null) {
      _base.dimensionAtObservation = msg.dimensions.dimensionAtObservation;
    }
    if (request.query.dimensionAtObservation !== 'AllDimensions') {
      if (msg.dimensions.id.indexOf(request.query.dimensionAtObservation) === -1) {
        response.statusCode = 400;
        response.result.errors.push("Invalid value for parameter dimensionAtObservation " + request.query.dimensionAtObservation);
        return;
      }
    }
    filterTime = (request.query.startPeriod != null) || (request.query.endPeriod != null);
    if (filterTime) {
      timeCodes = filterTimePeriods(request, response, msg);
    }
    codesInQuery = addCodesToQuery(request, response, msg);
    if (response.statusCode !== 200) {
      return;
    }
    noObservations = false;
    noAttributes = false;
    switch (request.query.detail) {
      case 'serieskeysonly':
        noObservations = false;
        noAttributes = true;
        break;
      case 'dataonly':
        noAttributes = true;
        break;
      case 'nodata':
        noObservations = true;
    }
    isInQuery = function(obj) {
      var code, i, _i, _len, _ref1;
      if (obj.dimensions == null) {
        return true;
      }
      _ref1 = obj.dimensions;
      for (i = _i = 0, _len = _ref1.length; _i < _len; i = ++_i) {
        code = _ref1[i];
        if (code === null) {
          continue;
        }
        if (codesInQuery[i].length === 0) {
          continue;
        }
        if (-1 < codesInQuery[i].indexOf(code)) {
          continue;
        }
        return false;
      }
      return true;
    };
    isInQueryTime = function(obs) {
      if (-1 < timeCodes.indexOf(obs[0])) {
        return true;
      }
      return false;
    };
    filtered = msg.data.filter(isInQuery);
    codesWithData = [];
    codeCounts = [];
    _ref1 = msg.dimensions.id;
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      dim = _ref1[_i];
      codesWithData.push({});
      codeCounts.push(0);
    }
    console.log(request.query.dimensionAtObservation);
    obsDimPos = msg.dimensions[msg.dimensions.dimensionAtObservation].index;
    obsCount = 0;
    results = [];
    for (_j = 0, _len1 = filtered.length; _j < _len1; _j++) {
      obj = filtered[_j];
      resultObj = {
        dimensions: [],
        attributes: noAttributes ? void 0 : obj.attributes
      };
      if (obj.dimensions != null) {
        _ref2 = obj.dimensions;
        for (i = _k = 0, _len2 = _ref2.length; _k < _len2; i = ++_k) {
          code = _ref2[i];
          if (code != null) {
            if (!(codesWithData[i][code] != null)) {
              codesWithData[i][code] = codeCounts[i];
              codeCounts[i] += 1;
            }
            resultObj.dimensions.push(codesWithData[i][code]);
          } else {
            resultObj.dimensions.push(code);
          }
        }
      }
      if (noObservations || !(obj.observations != null)) {
        results.push(resultObj);
        continue;
      }
      if (filterTime) {
        observations = obj.observations.filter(isInQueryTime);
      } else {
        observations = obj.observations;
      }
      resultObj.observations = [];
      for (_l = 0, _len3 = observations.length; _l < _len3; _l++) {
        obs = observations[_l];
        newObs = obs.slice();
        if (!(codesWithData[obsDimPos][obs[0]] != null)) {
          codesWithData[obsDimPos][obs[0]] = codeCounts[obsDimPos];
          codeCounts[obsDimPos] += 1;
        }
        newObs[0] = codesWithData[obsDimPos][obs[0]];
        resultObj.observations.push(newObs);
        obsCount += 1;
      }
      if (!(0 < resultObj.observations.length)) {
        continue;
      }
      results.push(resultObj);
    }
    rslt.dimensions = {
      id: msg.dimensions.id,
      dimensionAtObservation: request.query.dimensionAtObservation
    };
    _ref3 = msg.dimensions.id;
    for (i = _m = 0, _len4 = _ref3.length; _m < _len4; i = ++_m) {
      dim = _ref3[i];
      rslt.dimensions[dim] = {
        id: msg.dimensions[dim].id,
        codes: [],
        name: msg.dimensions[dim].name,
        type: msg.dimensions[dim].type,
        role: msg.dimensions[dim].role,
        index: i
      };
      _ref4 = codesWithData[i];
      for (pos in _ref4) {
        newPos = _ref4[pos];
        code = msg.dimensions[dim].codes.id[pos];
        rslt.dimensions[dim].codes[newPos] = {
          index: newPos,
          id: msg.dimensions[dim].codes[code].id,
          name: msg.dimensions[dim].codes[code].name,
          order: pos
        };
        if (msg.dimensions[dim].codes[code].start != null) {
          rslt.dimensions[dim].codes[newPos].start = msg.dimensions[dim].codes[code].start;
        }
        if (msg.dimensions[dim].codes[code].end != null) {
          rslt.dimensions[dim].codes[newPos].end = msg.dimensions[dim].codes[code].end;
        }
      }
    }
    if (request.query.detail === 'serieskeysonly') {
      return;
    }
    if (obsCount === 0) {
      response.statusCode = 404;
      response.result.errors.push('Observations not found');
      return;
    }
    if (rslt.dimensions.dimensionAtObservation !== msg.dimensions.dimensionAtObservation) {
      console.log(rslt.dimensions.dimensionAtObservation);
      if (rslt.dimensions.dimensionAtObservation === 'AllDimensions') {
        results2 = [];
        for (_n = 0, _len5 = results.length; _n < _len5; _n++) {
          obj = results[_n];
          if (!(obj.observations != null)) {
            results2.push(obj);
            continue;
          }
          obj2 = {
            attributes: obj.attributes,
            observations: []
          };
          _ref5 = obj.observations;
          for (_o = 0, _len6 = _ref5.length; _o < _len6; _o++) {
            obs = _ref5[_o];
            obj2.observations.push(obj.dimensions.concat(obs));
          }
          results2.push(obj2);
        }
        results = results2;
      }
    }
    /*
            # We need to pivot the measure array into subarrays
    
            if rslt.dimensions.dimensionAtObservation is 'AllDimensions'
                pivotedResults = []
                for obj in results
                    dims = obj.dimensions
                    obj2 = {}
    
    
            pivot = []
            pivotDimPos = rslt.dimensions.id.indexOf rslt.dimensions.dimensionAtObservation
            resultCodeLengths = []
            pivotMultipliers = []
            pivotCount = 1
            for dim, n in rslt.dimensions.id
                resultCodeLengths.push rslt.dimensions[dim].codes.id.length
                continue if n is pivotDimPos
                pivotMultipliers[n] = pivotCount
                pivotCount *= rslt.dimensions[dim].codes.id.length
    
            # magic loop
            for i in [0..resultCount-1]
                obsIndex = 0
                pivotIndex = 0
                pivotSubIndex = 0
                for length, n in resultCodeLengths
                    codeIndex = Math.floor( i / resultMultipliers[n] ) % length
                    obsIndex += codeIndex * resultMultipliers[n]
    
                    if n is pivotDimPos
                        pivotSubIndex = codeIndex
                    else
                        pivotIndex += codeIndex * pivotMultipliers[n]
                
                if msg.measure[obsIndex]?
                    pivot[pivotIndex] ?= []
                    pivot[pivotIndex][pivotSubIndex] = rslt.measure[obsIndex]
    
            rslt.measure = pivot
    */

    rslt.data = results;
    if (noAttributes) {
      return;
    }
    attributesInResults = {};
    for (_p = 0, _len7 = results.length; _p < _len7; _p++) {
      obj = results[_p];
      if (obj.attributes == null) {
        continue;
      }
      for (attrId in obj.attributes) {
        attributesInResults[attrId] = null;
      }
    }
    _ref6 = msg.attributes.obsAttributes;
    for (_q = 0, _len8 = _ref6.length; _q < _len8; _q++) {
      attrId = _ref6[_q];
      attributesInResults[attrId] = null;
    }
    rslt.attributes = {
      id: [],
      obsAttributes: msg.attributes.obsAttributes
    };
    _ref7 = Object.keys(attributesInResults);
    _results = [];
    for (_r = 0, _len9 = _ref7.length; _r < _len9; _r++) {
      attrId = _ref7[_r];
      rslt.attributes.id.push(attrId);
      _results.push(rslt.attributes[attrId] = {
        id: msg.attributes[attrId].id,
        name: msg.attributes[attrId].name,
        mandatory: msg.attributes[attrId].mandatory,
        role: msg.attributes[attrId].role,
        dimension: msg.attributes[attrId].dimension,
        "default": msg.attributes[attrId]["default"],
        codes: msg.attributes[attrId].codes
      });
    }
    return _results;
  };

  validateRequest = function(request, response) {
    var auth, encoding, header, matches, mediaTypes, methods, parts, password, path, token, type, username, _i, _len;
    methods = ['GET', 'HEAD', 'OPTIONS'];
    mediaTypes = ['application/json', 'application/*', '*/*'];
    response.setHeader('Allow', methods.join(', '));
    response.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    if (request.headers['origin'] != null) {
      response.setHeader('Access-Control-Allow-Origin', request.headers['origin']);
    } else {
      response.setHeader('Access-Control-Allow-Origin', '*');
    }
    if (methods.indexOf(request.method) === -1) {
      response.statusCode = 405;
      response.result.errors.push('Supported methods: ' + methods.join(', '));
      return;
    }
    if (request.headers['accept'] != null) {
      matches = 0;
      for (_i = 0, _len = mediaTypes.length; _i < _len; _i++) {
        type = mediaTypes[_i];
        matches += request.headers['accept'].indexOf(type) + 1;
      }
      if (matches === 0) {
        response.statusCode = 406;
        response.result.errors.push('Supported media types: ' + mediaTypes.join(','));
        return;
      }
    }
    encoding = request.headers['accept-encoding'];
    if (encoding != null) {
      if (encoding.match(/\bdeflate\b/)) {
        response.setHeader('Content-Encoding', 'deflate');
      } else if (encoding.match(/\bgzip\b/)) {
        response.setHeader('Content-Encoding', 'gzip');
      }
    }
    if (request.headers['access-control-request-headers'] != null) {
      response.setHeader('Access-Control-Allow-Headers', request.headers['access-control-request-headers']);
    }
    if (request.method === 'GET') {
      path = url.parse(request.url, false, false).pathname.split('/');
      if (path[1] === 'auth') {
        header = request.headers['authorization'] || '';
        token = header.split(/\s+/).pop() || '';
        auth = new Buffer(token, 'base64').toString();
        parts = auth.split(/:/);
        username = parts[0];
        password = parts[1];
        if (username !== 'test' || password !== 'test') {
          response.setHeader('WWW-Authenticate', 'BASIC realm="data/ECB,ECB_ICP1"');
          response.statusCode = 401;
          response.result.errors.push('authorization required');
        }
      }
    }
  };

  compressResponse = function(request, response) {
    var body, sendResponse;
    sendResponse = function(err, body) {
      var encoding;
      if (err != null) {
        response.statusCode = 500;
        response.end();
        return;
      }
      response.setHeader('X-Runtime', new Date() - response.start);
      if (body != null) {
        if (Buffer.isBuffer(body)) {
          response.setHeader('Content-Length', body.length);
        } else {
          response.setHeader('Content-Length', Buffer.byteLength(body));
        }
        if (request.method === 'GET') {
          response.end(body);
        } else {
          response.end();
        }
      } else {
        response.setHeader('Content-Length', 0);
        response.end();
      }
      encoding = response.getHeader('Content-Encoding');
      if (encoding == null) {
        encoding = '';
      }
      log("" + request.method + " " + request.url + " " + response.statusCode + " " + encoding);
    };
    switch (request.method) {
      case 'OPTIONS':
        return sendResponse();
      case 'GET':
      case 'HEAD':
        body = JSON.stringify(response.result, null, 2);
        switch (response.getHeader('Content-Encoding')) {
          case 'deflate':
            return zlib.deflate(body, sendResponse);
          case 'gzip':
            return zlib.gzip(body, sendResponse);
          default:
            return sendResponse(void 0, body);
        }
    }
  };

  handleRequest = function(request, response) {
    var dataflow;
    response.start = new Date();
    response.setHeader('X-Powered-By', "Node.js/" + process.version);
    response.setHeader('Server', "" + SERVER_NAME + "/" + SERVER_VERSION);
    response.setHeader('Cache-Control', 'no-cache, no-store');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Content-Language', 'en');
    response.statusCode = 200;
    response.result = {
      'sdmx-proto-json': dataset['sdmx-proto-json'],
      id: "IREF" + (process.hrtime()[0]) + (process.hrtime()[1]),
      test: true,
      prepared: (new Date()).toISOString(),
      errors: []
    };
    validateRequest(request, response);
    if (response.statusCode === 200) {
      parse(request, response);
    }
    if (response.statusCode === 200) {
      dataflow = findDataFlow(request, response);
    }
    if (request.method === 'OPTIONS') {
      response.setHeader('Content-Length', 0);
    } else {
      if (response.statusCode === 200) {
        query(dataflow, request, response);
      }
      if (response.statusCode === 200) {
        response.result.name = dataset.name;
        response.result.errors = null;
      }
    }
    return compressResponse(request, response);
  };

  log('starting');

  dataset = loadDataset(DATA_FILE);

  http.createServer(handleRequest).listen(PORT_NUMBER);

  log("listening on port " + PORT_NUMBER);

}).call(this);
