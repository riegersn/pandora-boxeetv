/**
 * Pandora API support
 * @module padoraAPI
 */


/**
 * PandoraResult is the response object resulting from API request
 * @param {number} _code result code retured from api request
 * @param {string} _response response text returned from api request
 * @constructor
 */
function PandoraResult(_code, _response) {
  this.code = _code;
  this.isOk = (_code === -1) ? true : false;
  this.description = (_code !== -1) ? getErrorReponse(_code) : 'ok';
  this.response = _response;
}


/**
 * Validates a server response
 * @param {object} response Response Object
 * @return {boolean}          True on valid response
 */
function isResponseOk(response) {
  if (response === undefined || !response) {
    print("Error. RESPONSE IS NONE (flow)");
    return false
  }

  if (response.stat === undefined || !response.stat) {
    print("Error. NO STATUS IN RESPONSE (flow)");
    return false
  }

  var status = response.stat;

  if (status === "fail") {
    if (response.code) {
      printf("Error. Request failed (code %d)", response.code);
    }
    return false;
  } else return true
}


/**
 * Manages pandora requests, uses the handler to keep track of the calling
 * function, its arguments and its spcific cb. allows for this function
 * to handle failed requests like invalid auth token
 * Handler Object
 *    parent: parent (calling) method,
 *    args: argument passed to parent method,
 *    target: target handler function,
 *    cb: cb function to be passed to the target
 * @param {number} code Response code
 * @param {object} response Pandora response object
 * @param {object} handler Request handler object
 */
function handle_pandoraResponse(code, response, handler) {
  if (isResponseOk(response)) {
    print('response is OK');
    Global.retryCount = 3;
    handler.target((new PandoraResult(-1, response)), handler.cb, handler.args);

  } else if (response.code === 1001 && !handler.blocker) {
    Global.retryCount--;
    printWindowProperties();
    if (Global.retryCount > 0) {
      printf('Error. Invalid auth token, refreshing... (retries left: %d)', Global.retryCount);
      userLogin(sendWithArgs(handler.parent, handler.args, handler.cb), true);
    } else {
      Global.retryCount = 3;
      uiOkDialog('Too many attempts to refresh your account. Can no longer communicate with Pandora. Please log in again or contact Pandora support for additional help.', uiFailedPlayback);
    }

  } else if (response.code === 9000 && !handler.blocker) {
    Global.retryCount--;
    printWindowProperties();

    if (Global.retryCount > 0) {
      printf('Error. Network is down, retrying... (retries left: %d)', Global.retryCount);
      handler.parent(handler.args, handler.cb);
    } else {
      Global.retryCount = 3;
      uiHideWait();
      uiOkDialog(getErrorReponse(9000), uiFailedPlayback);
    }

  } else if (response.code === 0 && !handler.blocker) {
    Global.retryCount--;
    printWindowProperties();

    if (Global.retryCount > 0) {
      printf('Error. Internal Server Error, retrying... (retries left: %d)', Global.retryCount);
      handler.parent(handler.args, handler.cb);
    } else {
      Global.retryCount = 3;
      uiHideWait();
      uiOkDialog(getErrorReponse(0), uiFailedPlayback);
    }

  } else {
    handler.target((new PandoraResult(response.code, response)), handler.cb, handler.args);
  }
}


/**
 * Performs a simple get request, onComplete2 is passed through onComplete
 * @param {string} url url to get
 * @param {DataType} type data type; see DataType
 * @param {function} onComplete callback on completion
 * @param {function} onComplete2 if specified, sent as parameter in first callback
 */
function getData(url, type, onComplete, onComplete2) {
  printf("url=%s", url);

  if (isOffline()) {
    var response = {
      stat: 'fail',
      message: 'Network is down',
      code: 9000
    };
    onComplete(0, response, onComplete2)
    return false;
  }

  var request = new XMLHttpRequest();
  request.onreadystatechange = function() {
    if (request.readyState === 4) {
      uiHideWait();
      var response = handleResponse(type, request.responseText);
      onComplete(request.status, response, onComplete2)
    }
  }
  request.open("GET", url, true);
  request.send();
}


/**
 * Performs a simple post request, onComplete2 is passed through onComplete
 * @param {string} url url to post
 * @param {object} data data to send
 * @param {DataType} type data type; see DataType
 * @param {function} onComplete callback on completion
 * @param {function} onComplete2 if specified, sent as parameter in first callback
 */
function getPost(url, data, type, onComplete, onComplete2) {
  printf("url=%s", url);

  if (isOffline()) {
    var response = {
      stat: 'fail',
      message: 'Network is down',
      code: 9000
    };
    onComplete(0, response, onComplete2)
    return false;
  }

  var request = new XMLHttpRequest();
  request.onreadystatechange = function() {
    if (request.readyState === 4) {
      uiHideWait();
      var response = handleResponse(type, request.responseText);
      onComplete(request.status, response, onComplete2)
    }
  }
  request.open("POST", url, true);
  request.setRequestHeader("Content-Type", "text/plain");
  request.send(JSON.stringify(data));
}


/**
 * Wraps supplied argument in function, used when we need to execute function from cb and pass arguments
 * @param {function} Callback
 * @return {object} Anything here really
 * @example
 * function test(string) { console.log(string) }
 * cb(sendWithArgs(test, "hello"));
 * // test() will be executed within cb
 */
function sendWithArgs() {
  var args = Array.prototype.slice.apply(arguments);
  var func = args[0];
  return (function() {
    func.apply(this, args.slice(1));
  });
}


/**
 * Makes API requests to the pandora server. This specific function does NOT
 * use handle_pandoraResponse. the cb function must manager failures and
 * errors on its own.
 * @param {string} _method Pandora API method
 * @param {object} _data Data to send in request
 * @param {function} cb Callback
 * @param {function} cb2 If specified, sent as parameter in first callback
 */
function callServer(_method, _data, cb, cb2) {
  var method = "/apps/pandora2/?method=" + _method;
  if (Global.userAuthToken !== undefined && Global.userAuthToken !== null) {
    method = method + "&auth_token=" + encodeURIComponent(Global.userAuthToken);
  }

  printf('method: %s, request: %s', _method, JSON.stringify(_data));

  // show loading dialog for track info and search
  if (!['track.explainTrack', 'music.search'].contains(_method)) {
    uiShowWait();
  }

  getPost(Global.host + method, _data, DataType.JSON, cb, cb2);
}


/**
 * Makes API requests to the pandora server. Sends request responsed to
 * handle_pandoraResponse() to be managed. this method is preferred.
 * @param {string} _method Pandora API method
 * @param {object} _data Data to send in request
 * @param {handler} handler ©Result handler
 */
function callServer2(_method, _data, handler) {
  var method = "/apps/pandora2/?method=" + _method;
  if (Global.userAuthToken !== undefined && Global.userAuthToken !== null)
    method = method + "&auth_token=" + encodeURIComponent(Global.userAuthToken);

  printf('method: %s, request: %s', _method, JSON.stringify(_data));

  /*  decide if we should display loading dialog */
  if (!['track.explainTrack', 'music.search'].contains(_method))
    uiShowWait();

  getPost(Global.host + method, _data, DataType.JSON, handle_pandoraResponse, handler);
}


/**
 * Handles get/post response data, returns proper format
 * @param {DataType} type
 * @param {string} responseText
 */
function handleResponse(type, responseText) { /*  handles get/post response data, returns proper format */
  print('handleResponse', 'raw_response: ' + responseText);

  if (type === DataType.XML) {
    responseText = boxeeAPI.xmlToJson(responseText)
    responseText = eval('(' + responseText + ')');
  } else if (type === DataType.JSON) {
    responseText = eval('(' + responseText + ')');
  }

  return responseText;
}


/**
 * Pandora Error Responses
 * @param  {number} code Error code
 * @return {string}      Error description string
 */
function getErrorReponse(code) {
  switch (code) {
    case 12:
      return "Sorry, Pandora is not available in this country.";
    case 1000:
      return "Pandora is conducting system maintenance. You will be able to listen to existing stations while they work on their systems, but you won't be able to create new stations, submit feedback or edit your account in any way until the maintenance is complete. Thanks for your patience.";
    case 1001:
      return "Invalid auth token (auth token expired, need to re-authenticate)";
    case 1002:
      return "Invalid login (username/password invalid)";
    case 1003:
      return "Your account has been suspended or disabled. Contact Pandora support for further assistance.";
    case 1004:
      return "Your account is not authorized to perform that action.";
    case 1005:
      return "Max stations reached. You may only create up to 100 stations.";
    case 1006:
      return "Station does not exist; Invalid station or station has been deleted.";
    case 1007:
      return "Complimentary period already used for this user/device.";
    case 1008:
      return "An unexpected error occurred"; //"Calling a method when not allowed (e.g. calling station.renameStation when the station’s ‘allowRename’ property is set to false)";
    case 1009:
      return "Device not activated. There was a problem activating Pandora on this device. Please make sure you visit the URL to enter your activation code before hitting the DONE button.";
    case 1010:
      return "Partner not authorized to perform action";
    case 1011:
      return "Username is malformed. See Parameter Formats section for a valid username format";
    case 1012:
      return "Password is malformed. See Parameter Formats section for a valid password format";
    case 1013:
      return "Username provided has already been used.";
    case 1014:
      return "Device is already associated to another account.";
    case 1015:
      return "Values supplied exceed maximum length allowed.";
    case 1016:
      return "Email Address is invalid.";
    case 1017:
      return "Station name is too long.";
    case 1018:
      return "An unexpected error occurred"; //"The pin provided doesn’t match our records";
    case 1019:
      return "An unexpected error occurred"; //"trying to do a pin operation when the content filter is not enabled";
    case 1020:
      return "Explicit PIN contains invalid characters (allowed characters are a-zA-Z0-9)";
    case 1021:
      return "Explicit PIN has not been set yet.";
    case 1022:
      return "Explicit PIN has already been set.";
    case 1023:
      return "Device Model is invalid.";
    case 1024:
      return "Zip code is invalid.";
    case 1025:
      return "Birth year is invalid.";
    case 1026:
      return "Age-restricted! User too young to use service.";
    case 1027:
      return "Gender value is invalid.";
    case 1028:
      return "Country code is invalid.";
    case 1029:
      return "User account not found.";
    case 1030:
      return "An unexpected error occurred"; //"Ad token is invalid. Verify your code is using the ad token returned from station.getPlaylist";
    case 1031:
      return "Not enough stations to create a QuickMix.";
    case 1032:
      return "An unexpected error occurred"; //"Not enough seeds (artist and/or songs) for the station definition";
    case 1033:
      return "Device model provided has already been used.";
    case 1034:
      return "Device model is disabled."; /* custom error codes */
    case 9000:
      return "Unable to reach Pandora. Please check your connection or try again later.";
    default:
      return "An unexpected error occurred";
  }
}


/**
 * Requests auth token from pandora api. [device.generateDeviceActivationCode]
 * used for creating an account on the web site (e.g. http://www.pandora.com/<partner>)
 * and will link to the deviceId to the new account. After the user has created
 * the Pandora account, the device can login using the deviceId
 * @param {function} cb Callback function
 */
function getAuthToken(cb) {
  print('requesting device link token...');
  var data = {
    "deviceId": Global.deviceId
  };
  var handler = {
    parent: getAuthToken,
    target: handle_getAuthToken,
    cb: cb
  };
  callServer2("device.generateDeviceActivationCode", data, handler);
}


/**
 * Handles the returned result from device.generateDeviceActivationCode API request
 * @param {object} request Returned request object
 * @param {function} cb Callback function
 */
function handle_getAuthToken(request, cb) {
  if (request.isOk) {
    cb(request);
  } else {
    print('Error. was unable to get a valid device authorization token.');
    Global.status = PandoraStatus.OFFLINE;
    cb(request);
  }
}


/*  auth.userLogin
        authenticates the user/device for further access to the pandora system,
        after the calling application has itself been authenticated */
/**
 * Authenticates the user/device to the pandora service. [auth.userLogin]
 * @param {function} cb [description]
 * @param {boolean} blocker [description]
 */
function userLogin(cb, blocker) {
  printf('logging in via deviceId (%s)', Global.deviceId);
  var data = {
    "deviceId": Global.deviceId
  };
  var handler = {
    parent: userLogin,
    target: handle_userLogin,
    blocker: blocker,
    cb: cb
  };
  callServer2("auth.userLogin", data, handler);
}


/**
 * Handles the returned result from userLogin request
 * @param {PandoraResult} request Request object returned from pandora servers
 * @param {function} cb callback function
 */
function handle_userLogin(request, cb) {
  if (request.isOk) {
    Global.username = request.response.username;
    Global.userAuthToken = request.response.userAuthToken;
    Global.skipTrackLimit = request.response.stationSkipLimit;
    Global.stationSkipUnit = request.response.stationSkipUnit;
    Global.autoComplete = request.response.urls.autoComplete;
    Global.hasAudioAds = request.response.hasAudioAds;
    Global.minimumAdRefreshInterval = request.response.minimumAdRefreshInterval;
    Global.maxStationsAllowed = request.response.maxStationsAllowed;
    Global.canListen = request.response.canListen;

    if (request.response.stations !== undefined) {
      Global.stationList = request.response.stations;
    } else if (Global.stationList.length === 0) {
      print('no stations returned with login and no stations previously loaded');
    }

    if (Global.status !== PandoraStatus.PLAYING) {
      Global.status = PandoraStatus.LOGGEDIN;
    }

    print('login was successful. this device is associated to your pandora account.');
    if (isFunction(cb)) {
      cb(request);
    }
  } else {
    printf("ERROR %d, %s", request.code, request.description);
    if (isFunction(cb)) {
      cb(request)
    }
  }
}

/**
 * Creates a link between the user and a deviceId [user.associateDevice]
 * @param {function} cb Callback function
 */
function associateDevice(cb) {
  printf('attempting to link device via deviceId (%s)', Global.deviceId);
  if (Global.userAuthToken && Global.deviceId) {
    var data =
      callServer("user.associateDevice", {
          "deviceId": Global.deviceId,
          "userAuthToken": Global.userAuthToken
        },
        handle_associateDevice,
        cb
      );
  } else {
    print('userAuthToken/deviceId missing or invalid.')
    if (isFunction(cb)) cb(false);
  }
}


/**
 * Handles the returned result from associateDevice request [user.associateDevice]
 * @param {number} code pandora response code
 * @param {object} response response object
 * @param {function} cb callback
 */
function handle_associateDevice(code, response, cb) {
  if (isResponseOk(response)) {
    print('device link successful.')
    Global.isAssociated = true;
    storeSetting('isAssociated', true);
    cb(new PandoraResult(-1, response))
  } else {
    var ecode = (response.code !== undefined) ? response.code.toString() : 'unknown';
    printf("Error. server returned error (%s)", ecode);
    Global.isAssociated = false;
    Global.status = PandoraStatus.OFFLINE;
    storeSetting('isAssociated', false);
    cb(new PandoraResult(response.code, response))
  }
}


/**
 * Removes the deviceId<->user association, resets the device [device.disassociateDevice]
 * @param {function} cb callback
 */
function disassociateDevice(cb) {
  print('disassociating device');
  var data = {
    "deviceId": Global.deviceId
  };
  var handler = {
    target: handle_disassociateDevice,
    parent: disassociateDevice,
    cb: cb
  };
  callServer2("device.disassociateDevice", data, handler);
}


/**
 * Handles the returned result from disassociateDevice [device.disassociateDevice]
 * @param {object} request Request objectg
 * @param {function} cb callback
 */
function handle_disassociateDevice(request, cb) {
  if (request.isOk) {
    resetDevice();
    cb(true);
  } else if (request.code === 1000) {
    uiOkDialog(request.description, sendWithArgs(cb, false))
    printf("ERROR %d, %s", request.code, request.description);
  } else {
    printf("ERROR %d, %s", request.code, request.description);
    cb(false);
  }
}


/**
 * Retrieves the list of stations that this user has created and the list of
 * shared stations to which the user has listened [user.getStationList]
 * @param {function} cb callback function
 */
function getStationList(cb) {
  print('refreshing user station list');
  var data = {
    "userAuthToken": Global.userAuthToken
  };
  var handler = {
    parent: getStationList,
    args: cb,
    target: handle_getStationList,
    cb: cb
  };
  callServer2("user.getStationList", data, handler);
}


/**
 * Handles result returned from getStationList [user.getStationList]
 * @param {object} request request object
 * @param {Function} cb callback function
 * @return {boolean}
 */
function handle_getStationList(request, cb) {
  if (request.isOk) {
    if (request.response.stations !== undefined) {
      Global.stationList = request.response.stations;
      var stationStatus = uiPopulateStations();
      if (isFunction(cb)) {
        cb(stationStatus);
      }
      return stationStatus;
    } else {
      return false;
    }
  } else {
    printf("ERROR %d, %s", request.code, request.description);

    uiOkDialog(request.description, (function() {
      forceFocus(buttonInfo)
    }));

    if (isFunction(cb)) {
      cb(false);
    }

    return false;
  }
}


/**
 * retrieves up to a 4-song set of music, chosen from the Pandora library
 * based on the user’s music preferences, and could return zero or more audio
 * ad tokens [station.getPlaylist]
 * @param {function} cb callback function
 * @return {boolean}
 */
function getPlaylist(cb) {
  if (Global.status === PandoraStatus.OFFLINE) {
    print("pandora is offline, return (flow)");
    return false
  } else if (Global.currentStation === null) {
    print("station is None, return (flow)");
    return false
  }

  print('Queue is empty, requesting new playlist.');

  var data = {
    "stationToken": getCurrentStationToken(),
    "userAuthToken": Global.userAuthToken
  };

  var handler = {
    parent: getPlaylist,
    args: cb,
    target: handle_getPlaylist,
    cb: cb
  };

  callServer2("station.getPlaylist", data, handler);
}


/**
 * Handles result returned from getPlaylist [station.getPlaylist]
 * @param {object} request request object
 * @param {function} cb callback function
 * @returns {boolean} returns failure
 */
function handle_getPlaylist(request, cb) {
  if (request.isOk) {
    clearPendingTracks();
    Global.lostStationSetRandom = false;
    var items = request.response.items;
    for (var i in items) {
      if (i === undefined) continue;
      if (items[i].trackToken !== undefined) {
        printf("Adding %s by %s to play queue", items[i].songName, items[i].artistName);
        var track = {
          "isTrack": true,
          "item": items[i]
        }
        Global.pendingTracks.unshift(track)
      } else if (items[i].adToken !== undefined) {
        print("Adding AD to play queue");
        var ad = {
          "isAd": true,
          "adToken": items[i].adToken
        }
        Global.pendingTracks.unshift(ad)
      }
    }

    if (isFunction(cb)) cb(true);
  } else if (request.code === 1006) {
    // current station no longer exists, we should refresh station
    // list alert user and set new random station
    uiOkDialog(request.description, refreshAndPlayRandom);
    return false;
  } else {
    printf("Error %d, %s", request.code, request.description);
    if (isFunction(cb)) cb(false);
  }
}


/**
 * This method retrieves information about which of the attributes are most relevant
 * for the current track when chosen for this particular station. [track.explainTrack]
 */
function explainTrack() {
  if (Global.currentTrack) {
    Global.processingExplainTrack = true;
    Global.cancelExplainTrackOperation = false;
    uiShowWait(cancel_explainTrack);
    var data = {
      trackToken: Global.currentTrack.trackToken
    };
    var handler = {
      parent: explainTrack,
      target: handle_explainTrack
    };
    callServer2("track.explainTrack", data, handler);
  }
}


/**
 * Handles the case where user may hit back to cancel the explain
 * track request [track.explainTrack]
 */
function cancel_explainTrack() {
  Global.cancelExplainTrackOperation = true;
  forceFocus(buttonInfo);
}


/**
 * Handles the explain track request result [track.explainTrack]
 * @param {object} request returned request object
 * @returns {boolean} returns false on user cancel
 */
function handle_explainTrack(request) {
  if (Global.cancelExplainTrackOperation) {
    // if user canceled, there is no need to continue
    Global.processingExplainTrack = false;
    print('CANCELED: user canceled the operation');
    return false;
  } else if (request.isOk) {
    var reasons = [];
    var explanations = request.response.explanations;
    explanations.pop();
    for (var i = 0; i < explanations.length; i++) {
      reasons.push(explanations[i].focusTraitName);
    }
    var lastReason = reasons.pop();
    var reason = "<p>Why this track?<p/>Based on what you've told us so far, " +
      "we're playing <font color='#FF9900'>%s</font> <font color='grey'>by" +
      "</font> <font color='#FF9900'>%s</font> because it features " +
      reasons.join(", ") + " and " + lastReason + ".";
    uiHideWait();
    explainBlade.showWhyPanel(reason);
    Global.processingExplainTrack = false;
  } else {
    Global.processingExplainTrack = false;
    printf("ERROR %d, %s", request.code, request.description);
    uiOkDialog(request.description, (function() {
      forceFocus(buttonInfo)
    }));
  }
}


/**
 * Returns an array of items that match the users search term [music.search]
 * @param {string} query search query
 * @param {function} cb callback function
 */
function searchPandora(query, cb) {
  if (query.trim()) {
    uiShowWait(cancel_searchPandora)
    var data = {
      userAuthToken: Global.userAuthToken,
      includeNearMatches: true,
      searchText: query
    }
    var handler = {
      parent: searchPandora,
      args: query,
      target: handle_searchPandora,
      cb: cb
    };
    callServer2("music.search", data, handler);
  }
}

/**
 * Handles the case where user may hit back to cancel the search request [music.search]
 */
function cancel_searchPandora() {
  Global.cancelSearch = true;
  forceFocus(keyboard);
}


/**
 * Handles music search request result [music.search]
 * @param {object} request returned request object
 * @param {function} cb callback function
 * @return {boolean}
 */
function handle_searchPandora(request, cb) {
  if (Global.cancelSearch) {
    Global.cancelSearch = false;
    print('User canceled search request');
    return false;
  }
  if (request.isOk) {
    var result = [];
    var artists = request.response.artists;
    var songs = request.response.songs;

    for (var i = 0; i < artists.length; i++) {
      if (artists[i].artistName !== undefined) {
        result.push({
          token: artists[i].musicToken,
          searchtype: 'Artists',
          name: artists[i].artistName,
          isAutoComplete: false
        });
      }
    }

    for (var i = 0; i < songs.length; i++) {
      if (songs[i].songName !== undefined && songs[i].artistName !== undefined) {
        result.push({
          token: songs[i].musicToken,
          searchtype: 'Tracks',
          name: sprintf("%s by %s", songs[i].songName, songs[i].artistName),
          isAutoComplete: false,
        });
      }
    }

    uiHideWait();
    forceFocus(keyboard)
    cb(result);
  } else if (request.code === 1000) {
    uiHideWait();
    forceFocus(keyboard)
    uiOkDialog(request.description, sendWithArgs(cb, []));
    printf("ERROR %d, %s", request.code, request.description);
  } else {
    uiHideWait();
    cb([]);
    forceFocus(keyboard)
    printf("ERROR %d, %s", request.code, request.description);
  }
}


/**
 * pandora auto complete
 * @param {string} query search query
 * @param {function} cb callback function
 */
function autoComplete(query, cb) {
  if (query.trim() === "") return false

  /*  Pandora certification 12.8 - Requests are made only after user
      is has been idle for 100 milliseconds */
  var time = new Date();
  if ((time - Global.lastAutoCompleteRequest) < 100) return false;

  Global.lastAutoCompleteRequest = time;
  var data = {
    auth_token: Global.userAuthToken,
    query: query
  }
  var autosearch = Global.autoComplete + "?" + data.serialize();
  getData(autosearch, 0, handle_autoComplete, cb);
}


/**
 * handles the auto complete result
 * @param {number} code result code
 * @param {object} response returned response object
 * @param {function} cb callback function
 */
function handle_autoComplete(code, response, cb) {
  try {
    var result = [];
    var list = response.split("\n");
    if (list.length > 1) {
      list.splice(0, 1)
      for (var i = 0; i < list.length; i++) {
        var item = list[i].split("\t");
        var label = (item.length === 3) ? sprintf("%s by %s", item[2], item[1]) : item[1];
        if (label) result.push({
          token: item[0],
          name: label,
          isAutoComplete: true,
          searchtype: "Suggestions"
        });
      }
    }
    cb(result);
  } catch (e) {
    printError(e);
    cb();
  }
}


/**
 * Creates a new station based on a track’s artist or song (a trackToken)
 * [station.createStation] (from track token / music type)
 * @param {object} _args data to be sent to pandora
 * @param {function} cb callback function
 * @returns {boolean} false on if PandoraStatus is offline
 */
function createStationFromTrackToken(_args, cb) {
  printf("create new station from track token (%s, %s)", _args.token, _args.type);

  if (Global.status === PandoraStatus.OFFLINE) {
    print('Error. not logged in, unable to create station');
    return false;
  }

  var data = {
    'trackToken': _args.token,
    'musicType': _args.type
  };

  var handler = {
    parent: createStationFromTrackToken,
    target: handle_createStation,
    args: _args,
    cb: cb
  };

  callServer2("station.createStation", data, handler);
}


/**
 * Creates a new station based on the results of a search (a musicToken)
 * [station.createStation (from music token)]
 * @param {string} token pandora music token
 * @param {function} cb callback function
 * @return {boolean} returns false on error
 */
function createStationFromToken(token, cb) {
  print(token);

  if (Global.status === PandoraStatus.OFFLINE) {
    print('Error. not logged in, unable to create station');
    return false;
  }

  //check that currently playing station is not from the same token
  if (getCurrentStationToken() === token) {
    print('Error. cannot create station, same station already playing.');
    return false;
  }

  var data = {
    'musicToken': token
  };

  var handler = {
    parent: createStationFromToken,
    target: handle_createStation,
    args: token,
    cb: cb
  };

  callServer2("station.createStation", data, handler);
}


/**
 * Handles the create station results [station.createStation]
 * @param {object} request result request object
 * @param {function} cb callback function
 * @return {boolean} returns false if station already playing
 */
function handle_createStation(request, cb) {
  if (request.isOk) {
    //check if the station already playing
    if (getCurrentStationToken() === request.response.stationToken) {
      print('Error. cannot create station, same station already playing.');
      cb('alreadyPlaying');
      return false;
    }
    //check if the station with the same token already exists
    if (getStationByToken(request.response.stationToken)) {
      print('Error. cannot create station, station already exists.');
      cb(request.response.stationToken);
      //return true so we can switch to and start playing the existing station
      return true;
    }

    Global.stationList.unshift(request.response);
    getStationList();
    cb(request.response.stationToken);
    return true;
  } else if (request.code === 1000 || request.code === 1005) {
    uiOkDialog(request.description, sendWithArgs(cb, false));
    printf("ERROR %d, %s", request.code, request.description);
  } else {
    uiOkDialog(request.description, sendWithArgs(cb, false));
    printf("ERROR %d, %s", request.code, request.description);
  }
}


/**
 * Changes the displayable name for this station. renaming a station will
 * not affect playback. [station.renameStation]
 * @param {object} _args data to send
 * @param {function} cb callback function
 */
function renameStation(_args, cb) {
  var data = {
    stationToken: _args.token,
    stationName: _args.name,
    userAuthToken: Global.userAuthToken
  }
  var hanler = {
    target: handle_renameStation,
    args: _args,
    cb: cb,
    parent: renameStation
  };
  callServer2('station.renameStation', data, handler);
}


/**
 * Handles the returned result from renameStation request [station.renameStation]
 * @param {object} request result request object
 * @param {function} cb callback function
 */
function handle_renameStation(request, cb) {
  if (request.isOk) {
    printf('successfully renamed station (%s)', request.response.stationName);
    if (getCurrentStationToken() === request.response.stationToken) {
      print('renaming currently playing station. update ui');
      stationLabel.text = request.response.stationName;
      Global.currentStation.stationName = request.response.stationName;
    }
    setStationProperty(request.response.stationToken, 'stationName', request.response.stationName);
    cb(request.response);
  } else if (request.code === 1000) {
    uiOkDialog(request.description, sendWithArgs(cb, false));
    printf("ERROR %d, %s", request.code, request.description);
  } else {
    printf("Error. server returned error (%d, %s)", request.code, request.description);
    cb(false);
  }
}


/**
 * Removes a station from the user's station list. station.deleteStation
 * @param {sting} token station token
 * @param {function} cb callback function
 */
function deleteStation(token, cb) {
  if (!getStationByToken(token)) {
    uiOkDialog('There was a problem deleting this station.');
    printf('unable to delete station, token is invalid (%s)', token)
    if (isFunction(cb)) cb(false);
    return false;
  }

  if (getCurrentStationToken() === token) {
    print('deleting currently playing station. stopping playback');
    playerStop();
  }

  for (var i = 0; i < Global.stationList.length; i++) {
    if (Global.stationList[i].stationToken === token) {
      Global.stationList.remove(i);
      break;
    }
  }

  var data = {
    stationToken: token,
    userAuthToken: Global.userAuthToken
  }

  var handler = {
    target: handle_deleteStation,
    args: token,
    cb: cb,
    parent: deleteStation
  };

  callServer2('station.deleteStation', data, handler);
}


/**
 * Handles the returned result from deleteStation request [station.deleteStation]
 * @param {objedt} request result request object
 * @param {function} cb callback fucntion
 */
function handle_deleteStation(request, cb) {
  if (request.isOk || request.code === 1006) {
    print('successfully deleted station or station was already deleted from another location');
    getStationList(cb);
  } else if (request.code === 1000) {
    uiOkDialog(request.description, cb);
    printf("ERROR %d, %s", request.code, request.description);
  } else {
    printf("Error. server returned error (%d, %s)", request.code, request.description);
    uiOkDialog(request.description, cb);
  }
}


/**
 * Reports user's musical preferences for use in refining the current station. [station.addFeedback]
 * @param {number} songRating [songRating=0] number
 * @returns {boolean} returns false on error
 */
function addFeedback(songRating) {
  updateActivityTimestamp();

  if (Global.status !== PandoraStatus.PLAYING && !debugMode) {
    print('ERROR. Cannot add feedback when no track is playing!');
  }

  if (!Global.currentStation || !Global.currentTrack) {
    print('Error. not playing or no station selected')
    return false;
  }

  if (!Global.currentTrack.allowFeedback) {
    print('Error. track does not allow feedback');
    uiOkDialog('The current track does not support feedback!');
    return false;
  }

  var data = {
    isPositive: (songRating === 1) ? true : false,
    trackToken: Global.currentTrack.trackToken,
    userAuthToken: Global.userAuthToken
  }

  var handler = {
    parent: addFeedback,
    args: songRating,
    target: handle_addFeedback
  };

  callServer2('station.addFeedback', data, handler);
}


/**
 * Handles the result from add feedback. we're getting the songRating back
 * from the callServer2 handler [station.addFeedback]
 * @param {object} request result request object
 * @param {function} cb callback function
 */
function handle_addFeedback(request, cb, songRating) {
  if (typeof songRating === "string")
    songRating = parseInt(songRating);

  var failedFocus = (songRating === 1) ? buttonThumbUp : buttonThumbDown;

  if (request.isOk) {
    modifySongRating(songRating);

    if (songRating === -1) {
      uiUpdateCurrentTrack(buttonPlayPause);
      clearPendingTracks();
      skipSong();
    } else {
      uiUpdateCurrentTrack(buttonThumbDown);
    }

    print('feedback submitted successfully.');
  } else if (request.code === 1000) {
    forceFocus(failedFocus);
    uiOkDialog(request.description); //, (function(){ forceFocus(failedFocus); }));
    printf("ERROR %d, %s", request.code, request.description);
  } else {
    forceFocus(failedFocus);
    uiOkDialog('There was a problem submitting feedback for this track. Please try again later.'); //, (function(){ forceFocus(failedFocus); }));
    printf("ERROR %d, %s", request.code, request.description);
  }
}


/**
 * Creates a bookmark for a particular artist or track
 * [bookmark.addArtistBookmark / addSongBookmark]
 * @param {object} _args data to send
 * @param {function} cb callback function
 */
function addBookmark(_args, cb) {
  var api = (_args.type === 'artist') ? 'addArtistBookmark' : 'addSongBookmark';
  var data = {
    trackToken: _args.token,
    userAuthToken: Global.userAuthToken
  }
  var handler = {
    target: handle_addBookmark,
    args: _args,
    cb: cb,
    parent: addBookmark
  }
  callServer2('bookmark.' + api, data, handler);
}


/**
 * Hndles the returned result from addBookmark request
 * [bookmark.addArtistBookmark / addSongBookmark]
 * @param {object} request result request object
 * @param {Function} cb callback function
 */
function handle_addBookmark(request, cb) {
  if (request.isOk) {
    print('bookmark created successfully');
    uiOkDialog('Successfully bookmarked! Check out your bookmarks at www.pandora.com/profile/bookmarks/', cb);
  } else if (request.code === 1000) {
    uiOkDialog(request.description, cb)
    printf("ERROR %d, %s", request.code, request.description);
  } else {
    uiOkDialog('Error creating bookmark.', cb);
    printf("ERROR %d, %s", request.code, request.description);
  }
}


/**
 * This method ia called at the time the audio ad is going to be played. If
 * there is an audio ad to be played, the audioUrl result will be returned. [ad.getAdMetadata]
 * @param {string} token ad token
 * @param {function} cb callback function
 */
function getAdMetadata(token, cb) {
  printf('token=%s', token);
  var data = {
    adToken: token,
    userAuthToken: Global.userAuthToken
  }
  var handler = {
    parent: getAdMetadata,
    args: token,
    target: handle_getAdMetadata,
    cb: cb
  }
  callServer2("ad.getAdMetadata", data, handler);
}


/**
 * Handles the returned result from getAdMetadata request [ad.getAdMetadata]
 * @param {object} request result request object
 * @param {Function} cb callback function
 */
function handle_getAdMetadata(request, cb) {
  if (request.isOk) {
    request.response.isAd = true;
    cb(createTrack(request.response));
  } else {
    printf("Error. server returned error (%d, %s)", request.code, request.description);
    cb(request.response);
  }
}
