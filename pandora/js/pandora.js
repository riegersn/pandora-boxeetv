Qt.include('utility.js');

var DataType = {
  JSON: 2,
  XML: 1,
  PLAIN: 0
}

var PandoraStatus = {
  UNKNOWN: 0,
  OFFLINE: 1,
  LOGGEDIN: 2,
  PLAYING: 3,
  LOGGEDOUT: 4
}


/*
 * Set activity timestamp. should be set on each user interaction
 */
function updateActivityTimestamp() {
  var stamp = new Date();
  var diff = (Global.lastActivityTimestamp) ? (stamp - Global.lastActivityTimestamp) : 0;
  Global.lastActivityTimestamp = stamp;

  printf('called from (%s)', arguments.callee.caller.name);
  printWindowProperties();
  printf('Activity timestamp (%s) (diff-%d)', Qt.formatDateTime(Global.lastActivityTimestamp, 'MM.dd.yyyy hh:mm:ss'), diff);
}


/*
 * Checks the lastActivityTimestamp and compares it to the current time
 * if the diff is >= the activityTimeoutLimit we must stop playback and
 * ask the user if they are still listening.
 */
function checkActivityTimeout() {
  print('Checking activity timeout!');

  var current = new Date();
  var diff = current - Global.lastActivityTimestamp;

  // user has timed out
  if (diff >= Global.activityTimeoutLimit) {
    print('Playback can not continue, limit reached!');
    return false;
  }

  print('Playback can continue.');

  // playback can continue
  return true;
}


/**
 * Checks if boxee device currently has an active network connection
 * @return {Boolean} True if Boxee TV has no connection
 */
function isOffline() {
  return (boxeeAPI.hasInternetConnection !== undefined && !boxeeAPI.hasInternetConnection());
}


/*
 * Gets the Boxee TV device ID
 * @returns  device id
 */
function getDeviceId() {
  return boxeeAPI.deviceId().toLowerCase();
}


/*
 * Checks if object is typeof function
 * @param    f   object to test for typeof function
 * @returns  True if object is function
 */
function isFunction(f) {
  return (typeof f === 'function');
}


/**
 * Wraps supplied argument in function, used when we need to execute function from callback and pass arguments
 * @param  {Function} Callback
 * @return {Object} Anything here really
 * @example
 * function test(string) { console.log(string) }
 * callback(sendWithArgs(test, "hello"));
 * // test() will be executed within callback
 */
function sendWithArgs() {
  var args = Array.prototype.slice.apply(arguments);
  var func = args[0];
  return (function() {
    func.apply(this, args.slice(1));
  });
}


/**
 * Prints anything to the log, only specify a message and the calling functions name will be used
 * @param    item1   Message or function name. See function description
 * @param    item2   Message. Optional if message specified as item1
 */
function print(item1, item2) {
  if (debugMode) {
    if (item2 === undefined) {
      item1 = (typeof item1 !== 'string') ? JSON.stringify(item1) : item1;
      boxeeAPI.logInfo('[pandora] ' + item1);
    } else {
      item2 = (typeof item2 !== 'string') ? JSON.stringify(item2) : item2;
      boxeeAPI.logInfo('[pandora] (' + item1 + ') ' + item2);
    }
  }
}


/**
 * Same as print(). Prints anything to the log but uses sprintf
 * @param    message Message to print
 */
function printf(message) {
  if (debugMode) {
    var args = Array.prototype.slice.call(arguments);
    if (args.length === 1) {
      boxeeAPI.logInfo('pandora [' + arguments.callee.caller.name + '] ' + message);
    } else if (args.length > 1) {
      boxeeAPI.logInfo('pandora [' + arguments.callee.caller.name + '] ' + vsprintf(message, args.slice(1)));
    }
  }
}


/**
 * Processes an error object and prints to log
 * @param    e   error object
 */
function printError(e) {
  boxeeAPI.logError(sprintf('pandora [%s] Error: %s [%s:%d]', arguments.callee.caller.name, e.message, e.fileName, e.lineNumber));
}


/**
 * Prints track object to the log
 * @param    track   Pandora track object
 */
function printTrack(track) {
  if (debugMode) {
    boxeeAPI.logInfo('======== Pandora Track Dump START ========');

    if (track.isAd) {
      boxeeAPI.logInfo(sprintf('isAd  ->  %s', track.isAd));
      boxeeAPI.logInfo(sprintf('adToken  ->  %s', track.adToken));
    }

    boxeeAPI.logInfo(sprintf('label  ->  %s', track.label));

    if (track.isAd) {
      boxeeAPI.logInfo(sprintf('company  ->  %s', track.company));
    }

    if (!track.isAd) {
      boxeeAPI.logInfo(sprintf('album  ->  %s', track.album));
      boxeeAPI.logInfo(sprintf('artist  ->  %s', track.artist));
      boxeeAPI.logInfo(sprintf('songRating  ->  %s', track.songRating));
      boxeeAPI.logInfo(sprintf('allowFeedback  ->  %s', track.allowFeedback));
    }

    boxeeAPI.logInfo(sprintf('thumbnail  ->  %s', track.thumbnail));

    if (!track.isAd) {
      boxeeAPI.logInfo(sprintf('trackToken  ->  %s', track.trackToken));
    }

    boxeeAPI.logInfo('======== Pandora Track Dump END ========');
  }
}


function PandoraResult(_code, _response) {
  this.code = _code;
  this.isOk = (_code === -1) ? true : false;
  this.description = (_code !== -1) ? getErrorReponse(_code) : 'ok';
  this.response = _response;
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
 * Shows the wait dialog
 * @param  {Function} callback
 */
function uiShowWait(callback) {
  if (!loading) {
    loading = true;
    boxeeAPI.showWaitDialog(isFunction(callback), callback);
  }
}


/**
 * Hides the wait dialog
 */
function uiHideWait() {
  boxeeAPI.hideWaitDialog();
  loading = false;
}


/**
 * Show Keyboard Dialog
 * @param  {String}   message   Dialog message text
 * @param  {String}   initval   Inital keyboard text
 * @param  {Function} callback
 * @param  {Function} callback2
 */
function uiKeyboardDialog(message, initval, callback, callback2) {
  printf('showing keyboard dialog from (%s)', arguments.callee.caller.name);
  var splash = boxeeAPI.runningAppPath() + '/media/pandora_splash_bokeh_dim.jpg';
  boxeeAPI.showKeyboardDialog('Pandora', callback, false, initval, message, true, callback2, splash)
}


/**
 * Show Ok Dialog
 * @param  {String}   message   Dialog message text
 * @param  {Function} callback
 * @param  {Function} callback2
 */
function uiOkDialog(message, callback, callback2) {
  if (!isFunction(callback2)) {
    callback2 = callback;
  }
  printf('showing ok dialog from (%s)', arguments.callee.caller.name);
  boxeeAPI.showOkDialog('Pandora', message, callback, callback2, 'OK', true, boxeeAPI.runningAppPath() + '/media/pandora_splash_bokeh_dim.jpg');
}


/**
 * [uiConfirmDialog description]
 * @param  {String}   title     Dialog title
 * @param  {String}   message   Dialog message text
 * @param  {Function} callback
 * @param  {Function} callback2
 * @param  {String}   cancel    Cancel button text
 * @param  {String}   ok        Confirm button text
 */
function uiConfirmDialog(title, message, callback, callback2, cancel, ok) {
  printf('showing confirm dialog from (%s)', arguments.callee.caller.name);

  var title   = title || 'Pandora',
      ok      = ok || 'OK',
      cancel  = cancel || 'Cancel',
      bg      = boxeeAPI.runningAppPath() + '/media/pandora_splash_bokeh_dim.jpg';
  boxeeAPI.showConfirmDialog(title, message, callback, callback2, ok, cancel, true, bg)
}


/**
 * Handles failures, stops player, resets ui, notifies user.
 * @param  {Number} code Error code
 */
function uiFailedPlayback(code) {
  print('failed playback called.');
  playerStop();
  Global.retryCount = 3;
  buttonTrackName.buttonLabel = '';
  buttonArtistName.buttonLabel = '';
  albumArtImage.source = '';
  Global.currentTrack = null;
  forceFocus(buttonPlayPause);
  if (code !== undefined) {
    uiOkDialog(getErrorReponse(code));
  }
}


/*
 * Sometimes we just loose focus, don't like this hack
 * but its all I've got at the moment.
 */
function uiSaveFocus() {
  var controls, i;

  if (root.allPanelsClosed()) {
    controls = [
      buttonPlayPause,
      buttonSkip,
      buttonInfo,
      buttonThumbDown,
      buttonThumbUp,
      buttonArtistName,
      buttonTrackName,
      buttonCreateStation,
      buttonLogout
    ];

    for (i = 0; i < controls.length; i++) {
      if (controls[i].activeFocus) {
        return;
      }
    }

    forceFocus(buttonPlayPause);

  } else if (quickStationBlade.isOpen) {
    if (quickStationBlade.getCloseButton().activeFocus || quickStationBladeList.activeFocus)
      return;
    forceFocus(quickStationBladeList);

  } else if (mgmtBlade.isOpen) {
    if (mgmtBlade.getCloseButton().activeFocus || mgmtBladeList.activeFocus)
      return;
    forceFocus(mgmtBladeList);

  } else if (searchBlade.isOpen) {
    if (keyboard.activeFocus || searchList.activeFocus)
      return;
    forceFocus(keyboard);

  } else if (stationBlade.isOpen) {
    if (stationBlade.getCloseButton().activeFocus || buttonCreateStation.activeFocus || stationBladeList.activeFocus)
      return;
    forceFocus(stationBladeList);
  }
}


/**
 * Shows requires activation screen
 * @param  {Boolean} appStart [description]
 */
function uiShowActivatePandora(appStart) {
  print('this device is not associated with any pandora account.');
  resetDevice();

  if (appStart) {
    boxeeAPI.appStarted(true);
  }
  activeArea.visible = false;
  activatePandora.visible = true;
  forceFocus(activateButton);
}


/*
 * Sets the main area visible when users are logged in, populates
 * stations, starts playback and sets the media handlers
 */
function uiShowPandora(appStart) {
  var mediaPlayer = boxeeAPI.mediaPlayer();
  mediaPlayer.onOpened = onOpenChanged;
  mediaPlayer.onPaused = onPauseChanged;
  mediaPlayer.onError = onErrorChanged;
  mediaPlayer.onMediaStatus = onMediaStatusChanged;

  loadPlayedTracks();
  loadSkippedTracks();

  if (appStart)
    boxeeAPI.appStarted(true);

  if (Global.status === PandoraStatus.OFFLINE)
    Global.status = PandoraStatus.LOGGEDIN;

  pandoraUserName.text = Global.username;
  activeArea.visible = true;
  activatePandora.visible = false;

  if (!uiPopulateStations()) {
    getStationList(uiNoStationsAtLaunch);
  } else {
    startPlayback();
  }
}


/**
 * Starts playback or shows the search blade to create a station
 * @param  {Boolean} result False will show search blade, true will start playback
 */
function uiNoStationsAtLaunch(result) {
  if (result) {
    startPlayback();
  } else {
    //no stations! maybe a new user? open the create station panel
    searchBlade.open(keyboard);
  }
}


/**
 * Clears the played tracks
 */
function uiClearPlayedTracks() {
  playedTrackModel.clear();
}


/**
 * Resets the UI
 */
function uiResetGUI() {
  adlabel.text = '';
  stationLabel.text = '';
  albumArtImage.source = '';
  buttonTrackName.buttonLabel = '';
  buttonArtistName.buttonLabel = '';
  isAd = isPlaying = mediaOpen = false;
  allowThumbUp = allowThumbDown = false;
  playedTrackModel.clear();
}


/**
 * Loads played tracks into the played track listview
 */
function uiLoadPlayedTracks() {
  if (playedTrackModel.count !== 0) {
    return
  }

  var tracks = getPlayedTracks();
  if (tracks) {
    for (var i = 0; i < tracks.length; i++) {
      playedTrackModel.append(tracks[i]);
    }
  }
}


/*
 * Updates the ui with all required information based on the
 * currently playing track. Also updates the previously played list
 */
function uiUpdateCurrentTrack(focusItem) {
  stationLabel.text = (Global.currentStation) ? Global.currentStation.stationName : '';
  if (Global.currentTrack) {
    if (!Global.currentTrack.isAd) {
      adlabel.text = '';
      allowThumbUp = (Global.currentTrack.songRating !== 1);
      allowThumbDown = (Global.currentTrack.songRating !== -1);
      albumArtImage.source = Global.currentTrack.thumbnail;
      buttonTrackName.buttonLabel = Global.currentTrack.label;
      buttonArtistName.buttonLabel = sprintf("<font color='grey'>By</font> %s<br/><font color='grey'>On</font> %s", Global.currentTrack.artist, Global.currentTrack.album);
    } else {
      adlabel.text = Global.currentTrack.label;
      if (Global.currentTrack.company) {
        adlabel.text = Global.currentTrack.company + "\n" + adlabel.text;
      }
      albumArtImage.source = Global.currentTrack.thumbnail;
      buttonTrackName.buttonLabel = buttonArtistName.buttonLabel = "";
    }
  }

  var saveFocus = true;

  if (root.allPanelsClosed()) {
    if (focusItem !== undefined) {
      forceFocus(focusItem);
      saveFocus = false;
    }
  }

  if (saveFocus) {
    uiSaveFocus();
  }
}


/**
 * Updates the station list in UI
 */
function uiUpdateStationList() {
  try {
    var selected = 0;
    var currentToken = getCurrentStationToken();
    for (var i = 0; i < stationBladeModel.count; i++) {
      Global.stationList[i].isPlaying = (currentToken === Global.stationList[i].stationToken);
      stationBladeModel.setProperty(i, 'isPlaying', (currentToken === stationBladeModel.get(i).stationToken))
      if (Global.stationList[i].isPlaying) {
        selected = i;
      }
    }
    return selected;
  } catch (e) {
    printf('ERROR. Unable to determin currently played station (%s)', e.message);
    return 0;
  }
}


/*
 * Populates the ui with users stations if available
 */
function uiPopulateStations() {
  if (Global.stationList.length) {
    stationBladeModel.clear()
    for (var i = 0; i < Global.stationList.length; i++) {
      Global.stationList[i].isPlaying = (getCurrentStationToken() === Global.stationList[i].stationToken);
      stationBladeModel.append(Global.stationList[i]);
      printf('Adding station (name=%s, token=%s)', Global.stationList[i].stationName, Global.stationList[i].stationToken)
    }
    return true;
  } else {
    stationBladeModel.clear()
    print('No user stations available!');
    return false;
  }
}


/**
 * Store setting to boxee client
 * @param  {String} key       Settings key
 * @param  {String} value     Setting value
 * @param  {Boolean} dontSave Save unsaved settings
 */
function storeSetting(key, value, dontSave) {
  boxeeAPI.setAppSetting(key, value);
  if (!dontSave) {
    saveSettings();
  }
}


/**
 * Load setting from boxee client
 * @param  {string} key setting key
 * @return {String}     matching setting
 */
function loadSetting(key) {
  return boxeeAPI.appSetting(key);
}


/**
 * Save unsaved settings to client
 */
function saveSettings() {
  return boxeeAPI.saveAppSetting();
}


/**
 * Reset app settings
 */
function resetSettings() {
  boxeeAPI.resetAppSetting();
}


/**
 * Store skipped tracks to app storage
 * @return {[type]} [description]
 */
function storeSkippedTracks() {
  storeSetting('skippedTracks', Global.skippedTracks);
  saveSettings();
}


/**
 * Store played tracks to app storage
 */
function storePlayedTracks() {
  storeSetting('playedTracks', Global.playedTracks);
  saveSettings();
}


/**
 * Load skipped tracks from app storage
 */
function loadSkippedTracks() {
  var skippedTracks = loadSetting('skippedTracks');
  if (skippedTracks !== undefined && skippedTracks) {
    Global.skippedTracks = skippedTracks;
  }
}


/**
 * Load played tracks from app storage
 */
function loadPlayedTracks() {
  var playedTracks = loadSetting('playedTracks');
  if (playedTracks !== undefined && playedTracks)
    Global.playedTracks = playedTracks;
}


/**
 * Resets user session
 */
function resetSession() {
  uiResetGUI();

  Global.currentTrack = null;
  Global.currentStation = null;
  Global.pendingTracks = [];
  Global.retryCount = 3;
  Global.lastAutoCompleteRequest = null;
  Global.waitVisible = false;
  Global.lastTrackFailed = false;
  Global.dontAddNextTrack = false;
  Global.status = PandoraStatus.LOGGEDOUT;

  var mediaPlayer = boxeeAPI.mediaPlayer();
  mediaPlayer.onOpened = undefined;
  mediaPlayer.onMediaStatus = undefined;
  mediaPlayer.onError = undefined;
}


/**
 * Resets app, including user and device links
 */
function resetDevice() {
  uiResetGUI();

  Global.deviceId = getDeviceId();
  Global.userAuthToken = null;
  Global.isAssociated = false;
  Global.currentTrack = null;
  Global.currentStation = null;
  Global.stationList = [];
  Global.playedTracks = {};
  Global.skippedTracks = {};
  Global.pendingTracks = [];
  Global.retryCount = 3;
  Global.skipTrackLimit = 6;
  Global.failedTrackCount = 0;
  Global.failedTrackLimit = 4;
  Global.skipTrackTimeout = 3600000 // 1 hour
  Global.activityTimeoutLimit = 28800000; // 8 hours
  Global.lastActivityTimestamp = new Date();
  Global.lastAutoCompleteRequest = null;
  Global.waitVisible = false;
  Global.lastTrackFailed = false;
  Global.dontAddNextTrack = false;
  Global.status = PandoraStatus.OFFLINE;

  var mediaPlayer = boxeeAPI.mediaPlayer();
  mediaPlayer.onOpened = undefined;
  mediaPlayer.onMediaStatus = undefined;
  mediaPlayer.onError = undefined;

  resetSettings();
  saveSettings();

  print('global settings, device association, local storage');
}


/**
 * Stops media playback
 * @return {Boolean} returns false on error
 */
function playerStop() {
  try {
    boxeeAPI.mediaPlayer().stop();
    Global.status = PandoraStatus.LOGGEDIN;
    return true;
  } catch (e) {
    printf('Error. unable to stop playback, maybe nothing is playing? (%s)', e.message);
    return false;
  }
}


/**
 * Pauses media playback
 * @return {Boolean} returns false on error
 */
function playerPause() {
  try {
    boxeeAPI.mediaPlayer().togglePause()
    return true;
  } catch (e) {
    printf('Error. unable to pause/resume playback, maybe nothing is playing? (%s)', e.message);
    return false;
  }
}


/**
 * Handles media open state change
 */
function onOpenChanged() {
  mediaOpen = boxeeAPI.mediaPlayer().isOpen();

  if (mediaOpen) {
    isPlaying = true;

    addPlayedTrack(Global.currentTrack);

    if (!Global.currentTrack.isAd) {
      playCount++;
    } else {
      adCount++;
    }

    Global.failedTrackCount = 0;
    Global.lastTrackFailed = false;
    Global.status = PandoraStatus.PLAYING;
    uiUpdateCurrentTrack();
  } else {
    Global.status = PandoraStatus.LOGGEDIN;
  }
}


/**
 * Sets the media state on state change
 */
function onMediaStateChanged() {
  mediaState = boxeeAPI.mediaPlayer().mediaState();
}


/**
 * Sets the pause state on state change
 */
function onPauseChanged() {
  isPlaying = (boxeeAPI.mediaPlayer().mediaState() !== 2);
}


/**
 * Handles error change state
 */
function onErrorChanged() {
  failedCount++;
  Global.failedTrackCount++;
  Global.lastTrackFailed = true;
  Global.dontAddNextTrack = true;

  print('Error. Unable to play requested track!');

  if (Global.failedTrackCount === Global.failedTrackLimit) {
    Global.failedTrackCount = 0;
    uiOkDialog('Too many failed tracks! Stopping playback.', uiFailedPlayback);
  } else {
    printf('failed play count at %d', Global.failedTrackCount);
    playerStop();
    playNextTrack();
  }
}


/**
 * Called from uiOkDialog via onMediaStatusChanged
 */
function onAreYouStillThere() {
  updateActivityTimestamp();
  forceFocus(buttonPlayPause);
  playNextTrack();
}


/**
 * Handles media status change
 */
function onMediaStatusChanged() {
  print('mediaStatusEndOfMedia: %d', boxeeAPI.mediaStatusEndOfMedia);
  print('onMediaStatusChanged: %d', boxeeAPI.mediaPlayer().mediaStatus());
  if (boxeeAPI.mediaPlayer().mediaStatus() === boxeeAPI.mediaStatusEndOfMedia) {
    var canPlaybackContinue = checkActivityTimeout();
    if (canPlaybackContinue && (!mediaOpen || !isPlaying)) {
        playNextTrack();
    } else {
      uiOkDialog('Are you still there?', onAreYouStillThere);
    }
  }
}


/**
 * Play a track
 * @param  {MediaItem} track Track to play
 * @return {Boolean}         Returns true on successful playback
 */
function play(track) {
  try {
    // only call playerStop if media is open
    playerStop();

    if (track.isAd && !track.path) {
      print('No ad track was returned by Pandora, playing next track.');
      playNextTrack();
      return false;
    }

    var item = {
      url: track.path,
      title: track.label,
      iconUrl: track.thumbnail,
      autoMediaWindow: false,
      suppressErrors: true,
      syncMode: true
    }

    isAd = track.isAd;
    Global.currentTrack = track;

    print('Sending track to player: %s', JSON.stringify(item));

    if (!isAd) printf('Playing %s by %s from %s', track.label, track.artist, track.album)
    else print('Playing AD');

    printf("%d track(s) left in queue.", Global.pendingTracks.length);
    if (Global.pendingTracks.length && Global.pendingTracks.last().isTrack) {
      printf("Next track is %s by %s", Global.pendingTracks.last().item.songName, Global.pendingTracks.last().item.artistName);
    } else if (Global.pendingTracks.length && Global.pendingTracks.last().isAd) {
      print("Next track is an AD");
    }

    boxeeAPI.mediaPlayer().open(item);
    return true;
  } catch (e) {
    printError(e);
    failedCount++;
    Global.failedTrackCount++;
    Global.lastTrackFailed = true;
    Global.dontAddNextTrack = true;

    if (Global.failedTrackCount === Global.failedTrackLimit) {
      Global.failedTrackCount = 0;
      uiOkDialog('Too many failed tracks! Stopping playback.', uiFailedPlayback);
    } else {
      printf('failed play count at %d', Global.failedTrackCount);
      playerStop();
      playNextTrack();
    }

    return false;
  }
}




//  START API & URL RETRIEVAL HELPERS
//  ---------------------------------


/**
 * Validates a server response
 * @param  {Object}  response Response Object
 * @return {Boolean}          True on valid response
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
 * Handles get/post response data, returns proper format
 * @param  {DataType} type
 * @param  {String}   responseText
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
 * Performs a simple get request, onComplete2 is passed through onComplete
 * @param  {String}   url
 * @param  {DataType} type
 * @param  {Function} onComplete
 * @param  {Function} onComplete2
 * @return {Boolean}
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
 * @param  {String}   url
 * @param  {Object}   data
 * @param  {DataType} type
 * @param  {Function} onComplete
 * @param  {Function} onComplete2
 * @return {Boolean}
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
 * Manages pandora requests, uses the handler to keep track of the calling
 * function, its arguments and its spcific callback. allows for this function
 * to handle failed requests like invalid auth token
 * @param  {Number} code      Response code
 * @param  {Object} response  Pandora response object
 * @param  {Object} handler   Request handler object
 *
 * Handler Object
 *    parent: parent (calling) method,
 *    args: argument passed to parent method,
 *    target: target handler function,
 *    callback: callback function to be passed to the target
 */
function handle_pandoraResponse(code, response, handler) {
  if (isResponseOk(response)) {
    print('response is OK');
    Global.retryCount = 3;
    handler.target((new PandoraResult(-1, response)), handler.callback, handler.args);

  } else if (response.code === 1001 && !handler.blocker) {
    Global.retryCount--;
    printWindowProperties();
    if (Global.retryCount > 0) {
      printf('Error. Invalid auth token, refreshing... (retries left: %d)', Global.retryCount);
      userLogin(sendWithArgs(handler.parent, handler.args, handler.callback), true);
    } else {
      Global.retryCount = 3;
      uiOkDialog('Too many attempts to refresh your account. Can no longer communicate with Pandora. Please log in again or contact Pandora support for additional help.', uiFailedPlayback);
    }

  } else if (response.code === 9000 && !handler.blocker) {
    Global.retryCount--;
    printWindowProperties();

    if (Global.retryCount > 0) {
      printf('Error. Network is down, retrying... (retries left: %d)', Global.retryCount);
      handler.parent(handler.args, handler.callback);
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
      handler.parent(handler.args, handler.callback);
    } else {
      Global.retryCount = 3;
      uiHideWait();
      uiOkDialog(getErrorReponse(0), uiFailedPlayback);
    }

  } else {
    handler.target((new PandoraResult(response.code, response)), handler.callback, handler.args);
  }
}


/*  helper function for making pandora api calls. this specific
        function does NOT use handle_pandoraResponse. the callback
        function must manager failures and errors on its own. */

/**
 * Makes API requests to the pandora server. This specific function does NOT
 * use handle_pandoraResponse. the callback function must manager failures and
 * errors on its own.
 * @param  {String}   _method
 * @param  {Object}   _data
 * @param  {Function} callback
 * @param  {Function} callback2
 */
function callServer(_method, _data, callback, callback2) {
  var method = "/apps/pandora2/?method=" + _method;
  if (Global.userAuthToken !== undefined && Global.userAuthToken !== null) {
    method = method + "&auth_token=" + encodeURIComponent(Global.userAuthToken);
  }

  printf('method: %s, request: %s', _method, JSON.stringify(_data));

  // show loading dialog for track info and search
  if (!['track.explainTrack', 'music.search'].contains(_method)) {
    uiShowWait();
  }

  getPost(Global.host + method, _data, DataType.JSON, callback, callback2);
}


/**
 * Makes API requests to the pandora server. Sends request responsed to
 * handle_pandoraResponse() to be managed. this method is preferred.
 * @param  {[type]} _method [description]
 * @param  {[type]} _data   [description]
 * @param  {[type]} handler [description]
 * @return {[type]}         [description]
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
 * Requests auth token from pandora api
 * @param  {Function} callback
 *
 * @description
 * device.generateDeviceActivationCode - used for creating an account on the
 * web site (e.g. http://www.pandora.com/<partner>) and will link to the
 * deviceId to the new account. After the user has created the Pandora account,
 * the device can login using the deviceId
 */
function getAuthToken(callback) {
  print('requesting device link token...');

  var data = {
    "deviceId": Global.deviceId
  };

  var handler = {
    parent: getAuthToken,
    target: handle_getAuthToken,
    callback: callback
  };

  callServer2("device.generateDeviceActivationCode", data, handler);
}


/*  device.generateDeviceActivationCode
        handles the returned result from generateDeviceActivationCode request */
function handle_getAuthToken(request, callback) {
  if (request.isOk) {
    callback(request);
  } else {
    print('Error. was unable to get a valid device authorization token.');
    Global.status = PandoraStatus.OFFLINE;
    callback(request);
  }
}

/*  auth.userLogin
        authenticates the user/device for further access to the pandora system,
        after the calling application has itself been authenticated */
function userLogin(callback, blocker) {
  printf('logging in via deviceId (%s)', Global.deviceId);
  callServer2("auth.userLogin", {
    'deviceId': Global.deviceId
  }, {
    parent: userLogin,
    target: handle_userLogin,
    blocker: blocker,
    callback: callback
  });

}

/*  auth.userLogin
        handles the returned result from userLogin request */
function handle_userLogin(request, callback) {
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

    if (request.response.stations !== undefined) Global.stationList = request.response.stations;
    else if (Global.stationList.length === 0) print('no stations returned with login and no stations previously loaded');
    if (Global.status !== PandoraStatus.PLAYING) Global.status = PandoraStatus.LOGGEDIN;
    print('login was successful. this device is associated to your pandora account.');
    if (isFunction(callback)) callback(request);
  } else {
    printf("ERROR %d, %s", request.code, request.description);
    if (isFunction(callback)) callback(request)
  }
}

/*  user.associateDevice
        creates a link between the user and a deviceId */
function associateDevice(callback) {
  printf('attempting to link device via deviceId (%s)', Global.deviceId);
  if (Global.userAuthToken && Global.deviceId) {
    var data =
      callServer("user.associateDevice", {
          "deviceId": Global.deviceId,
          "userAuthToken": Global.userAuthToken
        },
        handle_associateDevice,
        callback
      );
  } else {
    print('userAuthToken/deviceId missing or invalid.')
    if (isFunction(callback)) callback(false);
  }
}

/*  user.associateDevice
        handles the returned result from associateDevice request */
function handle_associateDevice(code, response, callback) {
  if (isResponseOk(response)) {
    print('device link successful.')
    Global.isAssociated = true;
    storeSetting('isAssociated', true);
    callback(new PandoraResult(-1, response))
  } else {
    var ecode = (response.code !== undefined) ? response.code.toString() : 'unknown';
    printf("Error. server returned error (%s)", ecode);
    Global.isAssociated = false;
    Global.status = PandoraStatus.OFFLINE;
    storeSetting('isAssociated', false);
    callback(new PandoraResult(response.code, response))
  }
}

/*  device.disassociateDevice
        removes the deviceId<->user association, resets the device */
function disassociateDevice(callback) {
  print('disassociating device');
  callServer2("device.disassociateDevice", {
    deviceId: Global.deviceId
  }, {
    target: handle_disassociateDevice,
    parent: disassociateDevice,
    callback: callback
  });
}

/*  device.disassociateDevice
        handles the returned result from disassociateDevice */
function handle_disassociateDevice(request, callback) {
  if (request.isOk) {
    resetDevice();
    callback(true);
  } else if (request.code === 1000) {
    uiOkDialog(request.description, sendWithArgs(callback, false))
    printf("ERROR %d, %s", request.code, request.description);
  } else {
    printf("ERROR %d, %s", request.code, request.description);
    callback(false);
  }
}

/*  user.getStationList
        retrieves the list of stations that this user has created and
        the list of shared stations to which the user has listened */
function getStationList(callback) {
  print('refreshing user station list');
  callServer2("user.getStationList", {
    "userAuthToken": Global.userAuthToken
  }, {
    parent: getStationList,
    args: callback,
    target: handle_getStationList,
    callback: callback
  });
}

/*  user.getStationList
        handles result returned from getStationList */
function handle_getStationList(request, callback) {
  if (request.isOk) {
    if (request.response.stations !== undefined) {
      Global.stationList = request.response.stations;
      var stationStatus = uiPopulateStations();
      if (isFunction(callback)) callback(stationStatus);
      return stationStatus;
    } else return false;
  } else {
    printf("ERROR %d, %s", request.code, request.description);
    uiOkDialog(request.description, (function() {
      forceFocus(buttonInfo)
    }));
    if (isFunction(callback)) callback(false);
    return false;
  }
}

/*  station.getPlaylist
        retrieves up to a 4-song set of music, chosen from the Pandora library based on
        the user’s music preferences, and could return zero or more audio ad tokens */
function getPlaylist(callback) {
  if (Global.status === PandoraStatus.OFFLINE) {
    print("pandora is offline, return (flow)");
    return false
  }

  if (Global.currentStation === null) {
    print("station is None, return (flow)");
    return false
  }

  print('Queue is empty, requesting new playlist.');

  callServer2("station.getPlaylist", {
    "stationToken": getCurrentStationToken(),
    "userAuthToken": Global.userAuthToken
  }, {
    parent: getPlaylist,
    args: callback,
    target: handle_getPlaylist,
    callback: callback
  });
}

/*  station.getPlaylist
        handles result returned from getPlaylist */
function handle_getPlaylist(request, callback) {
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

    if (isFunction(callback)) callback(true);
  } else if (request.code === 1006) {
    /*  current station no longer exists, we should refresh station list
        alert user and set new random station */
    uiOkDialog(request.description, refreshAndPlayRandom);
    return false;
  } else {
    printf("Error %d, %s", request.code, request.description);
    if (isFunction(callback)) callback(false);
  }
}

/*  track.explainTrack
        This method retrieves information about which of the attributes are most
        relevant for the current track when chosen for this particular station. */
function explainTrack() {
  if (Global.currentTrack) {
    Global.processingExplainTrack = true;
    Global.cancelExplainTrackOperation = false;
    uiShowWait(cancel_explainTrack);
    callServer2("track.explainTrack", {
      trackToken: Global.currentTrack.trackToken
    }, {
      parent: explainTrack,
      target: handle_explainTrack,
      args: undefined,
      callback: undefined
    });
  }
}

/*  track.explainTrack
        handles the case where user may hit back to cancel the explain track request */
function cancel_explainTrack() {
  Global.cancelExplainTrackOperation = true;
  forceFocus(buttonInfo);
}

/*  track.explainTrack
        handles the explain track request result */
function handle_explainTrack(request) {
  if (Global.cancelExplainTrackOperation) {
    //if user canceled, there is no need to continue
    Global.processingExplainTrack = false;
    print('CANCELED: user canceled the operation');
    return false;
  } else if (request.isOk) {
    var reasons = [];
    var explanations = request.response.explanations;
    explanations.pop();
    for (var i = 0; i < explanations.length; i++)
      reasons.push(explanations[i].focusTraitName);
    var lastReason = reasons.pop();
    var reason = "<p>Why this track?<p/>Based on what you've told us so far, we're playing <font color='#FF9900'>%s</font> <font color='grey'>by</font> <font color='#FF9900'>%s</font> because it features ";
    reason += reasons.join(", ");
    reason += " and " + lastReason + ".";
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

/*  music.search
        This method returns an array of items that match the users search term */
function searchPandora(query, callback) {
  if (query.trim()) {
    uiShowWait(cancel_searchPandora)
    var data = {
      userAuthToken: Global.userAuthToken,
      includeNearMatches: true,
      searchText: query
    }
    callServer2("music.search", data, {
      parent: searchPandora,
      args: query,
      target: handle_searchPandora,
      callback: callback
    });
  }
}

/*  music.search
        handles the case where user may hit back to cancel the search request */
function cancel_searchPandora() {
  Global.cancelSearch = true;
  forceFocus(keyboard);
}

/*  music.search
        handles the music search request result */
function handle_searchPandora(request, callback) {
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
    callback(result);
  } else if (request.code === 1000) {
    uiHideWait();
    forceFocus(keyboard)
    uiOkDialog(request.description, sendWithArgs(callback, []));
    printf("ERROR %d, %s", request.code, request.description);
  } else {
    uiHideWait();
    callback([]);
    forceFocus(keyboard)
    printf("ERROR %d, %s", request.code, request.description);
  }
}

/*  pandora auto complete */
function autoComplete(query, callback) {
  if (query.trim() === "") return false

  /*  Pandora certification 12.8 - Requests are made only after user
      is has been idle for 100 milliseconds */
  var diff = (new Date()) - Global.lastAutoCompleteRequest;
  if (diff < 100) return false;

  Global.lastAutoCompleteRequest = new Date();
  var data = {
    auth_token: Global.userAuthToken,
    query: query
  }
  var autosearch = Global.autoComplete + "?" + data.serialize();
  getData(autosearch, 0, handle_autoComplete, callback);
}

/*  handles the auto complete result */
function handle_autoComplete(code, response, callback) {
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
    callback(result);
  } catch (e) {
    printError(e);
    callback();
  }
}

/*  station.createStation (from track token / music type)
        This method creates a new station based on a track’s artist or song (a trackToken). */
function createStationFromTrackToken(_args, callback) {
  printf("create new station from track token (%s, %s)", _args.token, _args.type);

  if (Global.status === PandoraStatus.OFFLINE) {
    print('Error. not logged in, unable to create station');
    return false;
  }

  var data = {
    'trackToken': _args.token,
    'musicType': _args.type
  };

  callServer2("station.createStation", data, {
    parent: createStationFromTrackToken,
    target: handle_createStation,
    args: _args,
    callback: callback
  });
}

/*  station.createStation (from music token)
        This method creates a new station based on the results of a search (a musicToken) */
function createStationFromToken(token, callback) {
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

  callServer2("station.createStation", {
    'musicToken': token
  }, {
    parent: createStationFromToken,
    target: handle_createStation,
    args: token,
    callback: callback
  });
}

/*  station.createStation
        handles the create station results */
function handle_createStation(request, callback) {
  if (request.isOk) {
    //check if the station already playing
    if (getCurrentStationToken() === request.response.stationToken) {
      print('Error. cannot create station, same station already playing.');
      callback('alreadyPlaying');
      return false;
    }

    //check if the station with the same token already exists
    if (getStationByToken(request.response.stationToken)) {
      print('Error. cannot create station, station already exists.');
      callback(request.response.stationToken);
      return true;
    }

    Global.stationList.unshift(request.response);
    getStationList();
    callback(request.response.stationToken);
    return true;
  } else if (request.code === 1000 || request.code === 1005) {
    uiOkDialog(request.description, sendWithArgs(callback, false));
    printf("ERROR %d, %s", request.code, request.description);
  } else {
    uiOkDialog(request.description, sendWithArgs(callback, false));
    printf("ERROR %d, %s", request.code, request.description);
  }
}

/*  station.renameStation
        changes the displayable name for this station. renaming a station will not affect playback. */
function renameStation(_args, callback) {
  var data = {
    stationToken: _args.token,
    stationName: _args.name,
    userAuthToken: Global.userAuthToken
  }
  callServer2('station.renameStation', data, {
    target: handle_renameStation,
    args: _args,
    callback: callback,
    parent: renameStation
  });
}

/*  station.renameStation
        handles the returned result from renameStation request */
function handle_renameStation(request, callback) {
  if (request.isOk) {
    printf('successfully renamed station (%s)', request.response.stationName);
    if (getCurrentStationToken() === request.response.stationToken) {
      print('renaming currently playing station. update ui');
      stationLabel.text = request.response.stationName;
      Global.currentStation.stationName = request.response.stationName;
    }
    setStationProperty(request.response.stationToken, 'stationName', request.response.stationName);
    callback(request.response);
  } else if (request.code === 1000) {
    uiOkDialog(request.description, sendWithArgs(callback, false));
    printf("ERROR %d, %s", request.code, request.description);
  } else {
    printf("Error. server returned error (%d, %s)", request.code, request.description);
    callback(false);
  }
}

/*  station.deleteStation
        removes a station from the user's station list. */
function deleteStation(token, callback) {
  if (!getStationByToken(token)) {
    uiOkDialog('There was a problem deleting this station.');
    printf('unable to delete station, token is invalid (%s)', token)
    if (isFunction(callback)) callback(false);
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

  callServer2('station.deleteStation', data, {
    target: handle_deleteStation,
    args: token,
    callback: callback,
    parent: deleteStation
  });
}

/*  station.deleteStation
        handles the returned result from deleteStation request */
function handle_deleteStation(request, callback) {
  if (request.isOk || request.code === 1006) {
    print('successfully deleted station or station was already deleted from another location');
    getStationList(callback);
  } else if (request.code === 1000) {
    uiOkDialog(request.description, callback);
    printf("ERROR %d, %s", request.code, request.description);
  } else {
    printf("Error. server returned error (%d, %s)", request.code, request.description);
    uiOkDialog(request.description, callback);
  }
}

/*  station.addFeedback
        reports user's musical preferences for use in refining the current station. */
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
  callServer2('station.addFeedback', data, {
    parent: addFeedback,
    args: songRating,
    target: handle_addFeedback,
    callback: undefined
  });

}

/*  station.addFeedback
        handles the result from add feedback. we're getting the songRating back from the callServer2 handler */
function handle_addFeedback(request, callback, songRating) {
  if (typeof songRating === "string")
    songRating = parseInt(songRating);

  var failedFocus = (songRating === 1) ? buttonThumbUp : buttonThumbDown;

  if (request.isOk) {
    modifySongRating(songRating);

    if (songRating === -1) {
      uiUpdateCurrentTrack(buttonPlayPause);
      clearPendingTracks();
      skipSong();
    } else uiUpdateCurrentTrack(buttonThumbDown);

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

/*  bookmark.addArtistBookmark / addSongBookmark
        this method creates a bookmark for a particular artist or track */
function addBookmark(_args, callback) {
  var api = (_args.type === 'artist') ? 'addArtistBookmark' : 'addSongBookmark';
  var data = {
    trackToken: _args.token,
    userAuthToken: Global.userAuthToken
  }
  callServer2('bookmark.' + api, data, {
    target: handle_addBookmark,
    args: _args,
    callback: callback,
    parent: addBookmark
  });
}

/*  bookmark.addArtistBookmark / addSongBookmark
        handles the returned result from addBookmark request */
function handle_addBookmark(request, callback) {
  if (request.isOk) {
    print('bookmark created successfully');
    uiOkDialog('Successfully bookmarked! Check out your bookmarks at www.pandora.com/profile/bookmarks/', callback);
  } else if (request.code === 1000) {
    uiOkDialog(request.description, callback)
    printf("ERROR %d, %s", request.code, request.description);
  } else {
    uiOkDialog('Error creating bookmark.', callback);
    printf("ERROR %d, %s", request.code, request.description);
  }
}

/*  ad.getAdMetadata
        This method ia called at the time the audio ad is going to be played. If there is an
        audio ad to be played, the audioUrl result will be returned. */
function getAdMetadata(token, callback) {
  printf('token=%s', token);

  var data = {
    adToken: token,
    userAuthToken: Global.userAuthToken
  }

  callServer2("ad.getAdMetadata", data, {
    parent: getAdMetadata,
    args: token,
    target: handle_getAdMetadata,
    callback: callback
  });
}

/*  ad.getAdMetadata
        handles the returned result from getAdMetadata request */
function handle_getAdMetadata(request, callback) {
  if (request.isOk) {
    request.response.isAd = true;
    callback(createTrack(request.response));
  } else {
    printf("Error. server returned error (%d, %s)", request.code, request.description);
    callback(request.response);
  }
}

function MediaItem(path, label, thumbnail) {
  this.label = label
  this.thumbnail = 'media/pandora_default_thumb.png'
  this.contentType = 'audio/mpeg'
  this.icon = 'media/pandora_default_thumb.png'
  this.isAd = false
  this.artist = ''
  this.album = ''
  this.path = path
  this.trackToken = ''
  this.allowFeedback = 1;
  this.songRating = 0;
  if (thumbnail) this.thumbnail = thumbnail;
}

function createTrack(item) {
  var track = new MediaItem();

  if (item.isTrack !== undefined) {
    item = item.item;
    track.isAd = false;
    track.path = item.audioUrl;
    track.label = item.songName;
    track.thumbnail = (item.albumArtUrl || 'media/pandora_default_thumb.png');
    track.artist = item.artistName;
    track.album = item.albumName;
    track.path = item.audioUrl;
    track.trackToken = item.trackToken;
    track.allowFeedback = item.allowFeedback;
    track.songRating = item.songRating;
  } else if (item.isAd !== undefined && item.isAd) {
    track.isAd = true;
    track.adToken = (item.adToken || '');
    track.thumbnail = (item.imageUrl || '');
    track.label = (item.title || '');
    track.path = (item.audioUrl || '');
    track.company = (item.companyName || '');
    track.songRating = 0;
  } else {
    print("Unrecognized track type!");
    return null;
  }

  return track;
}

/* refresh by loading new station list, then trying to get a new playlist */
function refreshAndPlayRandom() {
  getStationList(handle_refreshAndPlayRandom)
}

/*  if stations where refreshed, set random station and start playback
        else set ui for failed playback */
function handle_refreshAndPlayRandom(response) {
  if (response) {
    setRandomStation();
    playNextTrack();
  } else uiFailedPlayback();
}

/*  returns the next track in the list of pending tracks */
function getNextTrack() {
  if (Global.pendingTracks.length === 0) {
    print("Pending track queue is empty. This shouldn't happen.");
    return false
  }

  var track = Global.pendingTracks.pop()

  if (track.isAd !== undefined || track.isTrack !== undefined) {
    track.isShared = Global.currentStation.isShared
    return track;
  } else {
    print("Error. Unrecognized track type");
    return null;
  }
}

/*  adds the given track to the skipped track list */
function addSkippedTrack(trackToken) {
  try {
    printf('todken=%s', trackToken);

    var skiplist = getSkipList();

    if (skiplist) {
      for (var i = 0; i < skiplist.length; i++) {
        if (skiplist[i].trackToken === trackToken) {
          print('track token already exists in previously played track list');
          return false;
        }
      }

      var d = new Date() - 1;
      var data = {
        timestamp: d,
        token: trackToken
      }
      skiplist.push(data);
      storeSkippedTracks();
      return true;
    }

    return false;
  } catch (e) {
    printError(e);
    return false;
  }
}

/*  returns true if stations currently exists for the user */
function hasStations() {
  if (Global.stationList.length < 1)
    return false
  else if (Global.stationList.length > 1)
    return true
  else if (Global.stationList.length === 1) {
    station = Global.stationList[0]
    if (station["isQuickMix"] === true) return false
    else return true
  } else
    return false;
}

function setStation(stationIndex) {
  if (stationIndex < 0 || stationIndex > Global.stationList.length - 1) {
    printf("Error. index out of bounds %d, number of stations %d", stationIndex, len(Global.stationList));
    return false
  }

  Global.currentStation = Global.stationList[stationIndex];

  //clear pending tracks
  Global.pendingTracks = [];

  if (getCurrentStationToken() !== loadSetting('lastStationToken')) {
    print('updating stored last station token')
    storeSetting('lastStationToken', getCurrentStationToken());
  }

  return true;
}

function setStationFromToken(stationToken) {
  try {
    printf('set station with token (%s)', stationToken);

    for (var i in Global.stationList) {
      if (Global.stationList[i].stationToken === stationToken)
        return setStation(i);
    }

    printf('no station with token (%s) exists', stationToken);
    return false;
  } catch (e) {
    printError(e);
    return false;
  }
}

function setRandomStation() {
  var index = Math.floor(Math.random() * Global.stationList.length);
  return setStationFromToken(Global.stationList[index].stationToken);
}

function isCurrentStation(stationToken) {
  return (Global.currentStation.stationToken === stationToken);
}

function clearPendingTracks() {
  Global.pendingTracks = [];
}

function isSkipAllowed() {
  if (qaMode)
    return true;

  if (Global.currentTrack) {
    if (Global.currentTrack.isAd) {
      print('skip not allowed, ad is playing');
      return false
    }

    var currentTime = new Date();
    var token = getCurrentStationToken();
    var savedSkipList = false;
    var skipList = getSkipList();

    for (var i = skipList.length - 1; i >= 0; i--) {
      var skipTime = new Date(parseInt(skipList[i].timestamp));
      var diffTime = currentTime - skipTime;
      if (diffTime >= Global.skipTrackTimeout) {
        skipList.remove(i);
        savedSkipList = true;
      }
    }

    if (savedSkipList) storeSkippedTracks();
    skipCount = skipList.length;
    if (skipList.length < Global.skipTrackLimit) return true;
    print('skip not allowed, current limit reached');
    return false;
  }

  print('cannot skip, pandora is not currently playing or there is no current track.');
  return false;
}

function skipSong() {
  if (!isSkipAllowed()) {
    uiOkDialog('Unfortunately, our music licenses force us to limit the amount of tracks you can skip in an hour.');
    return false;
  }

  if (addSkippedTrack(Global.currentTrack.trackToken)) {
    printf('User requested to skip %s by %s (%d track(s) left in current queue)', Global.currentTrack.label, Global.currentTrack.artist, Global.pendingTracks.length);
    playNextTrack();
    return true;
  }

  return false;
}

function setSongRatingCurrentTrack(rating) {
  if (Global.currentTrack) {
    Global.currentTrack.songRating = rating
    return true;
  }
  return false;
}

function playNextTrack() {
  if (Global.status === PandoraStatus.LOGGEDOUT) {
    print('Error. not logged in');
    return false;
  }

  if (Global.pendingTracks.length === 0) {
    getPlaylist(playNextTrack);
    return false;
  }

  var track = getNextTrack();

  if (!track) {
    print('Failed to get next item in playlist.');
    playNextTrack();
    return false;
  }

  track = createTrack(track);

  if (!track) {
    print('Failed to create track item from playlist.');
    playNextTrack();
    return false;
  }

  print("%d track(s) left in queue.", Global.pendingTracks.length);

  /* per pandora certification, ads should also be added into the previously played track list. */
  if (!Global.dontAddNextTrack && !Global.lastTrackFailed && Global.currentTrack) { // && !Global.currentTrack.isAd)
    if (Global.currentTrack.adToken === undefined || !Global.currentTrack.adToken) {
      var oldTrack = trimTrack(Global.currentTrack);
      playedTrackModel.insert(0, oldTrack);
    }
  }

  Global.currentTrack = track;
  Global.dontAddNextTrack = false;

  if (track.isAd) getAdMetadata(track.adToken, play);
  else play(track);

  return true;
}

function trimTrack(track) {
  var newTrack = {
    label: track.label,
    artist: (track.isAd) ? track.company : track.artist,
    songRating: parseInt(track.songRating),
    thumbnail: track.thumbnail,
    isAd: track.isAd,
  };

  // create a simple hash id code for comparison
  var trackValue = newTrack.label + newTrack.artist + newTrack.thumbnail;
  newTrack.id = trackValue.hashCode();

  return newTrack;
}

function addPlayedTrack(track) {
  var tracks = getPlayedTracks();

  if (!tracks) {
    Global.playedTracks[getCurrentStationToken()] = [];
    tracks = getPlayedTracks();
  }

  var newTrack = trimTrack(track);

  for (var i = 0; i < tracks.length; i++) {
    if (tracks[i].id !== undefined && tracks[i].id === newTrack.id)
      return false;
  }

  print("adding new track: %s", JSON.stringify(newTrack));
  if (!track.isAd) printf('Adding %s by %s to playedTracks list', track.label, track.artist)
  else print('Adding AD to playedTracks list');

  tracks.unshift(newTrack);
  if (tracks.length > 4) tracks.pop()
  storePlayedTracks();
}

function loadStationForPlayback() {
  print('loading new station token...');

  if (!hasStations()) {
    print('Error. there are currently no stations loaded.')
    return false;
  }

  if (Global.currentStation) {
    print('station has already been previously loaded.')
    return true;
  }

  var token = loadSetting('lastStationToken');
  if (token) {
    var setTokenOk = setStationFromToken(token);
    if (setTokenOk) {
      print('last station used as been loaded successfully.')
      return true;
    }
  }

  setTokenOk = setRandomStation();
  if (setTokenOk)
    return true

  print('Error. unable to load a station')
  return false;
}

function startPlayback(result) {
  print('starting playback')

  buttonPlayPause.focus = true;
  forceFocus(buttonPlayPause);

  if (Global.status === PandoraStatus.PLAYING) {
    print('pandora already playing');
    return true;
  } else if (Global.status === PandoraStatus.LOGGEDOUT || Global.status === PandoraStatus.OFFLINE) {
    print('pandora offline or not loggedin');
    return false;
  } else if (Global.status === PandoraStatus.UNKNOWN) {
    print('Error. pandora status is unknown');
    return false
  }

  if (!Global.currentStation) {
    if (!loadStationForPlayback()) return false;
  }

  uiLoadPlayedTracks();

  if (Global.pendingTracks.length === 0) {
    getPlaylist(startPlayback);
    return false;
  }

  if (!playNextTrack()) uiFailedPlayback();
}

/*  returns the skiplist for the current station */
function getSkipList() {
  try {
    var token = getCurrentStationToken();

    if (Global.skippedTracks[token] === undefined) Global.skippedTracks[token] = [];

    print('token=%s, item=%d', token, Global.skippedTracks[token].length);
    return Global.skippedTracks[token];
  } catch (e) {
    printError(e);
    return false;
  }
}

/*  returns the previously played track list for the current station */
function getPlayedTracks() {
  try {
    var token = getCurrentStationToken();

    if (token) {
      if (Global.playedTracks[token] === undefined)
        Global.playedTracks[token] = [];
      print('token=%s, items=%d', token, Global.playedTracks[token].length);
      return Global.playedTracks[token];
    } else {
      print('Error. Unable to get played track list. Current station token does not exist.');
      return false;
    }
  } catch (e) {
    printError(e);
    return false;
  }
}

/*  modifies the song rating on the currently playling track
        from the play track list and the main currentTrack var */
function modifySongRating(songRating) {
  try {
    var tracks = getPlayedTracks();
    var currentTrack = tracks[0];

    currentTrack.songRating = songRating;
    Global.currentTrack.songRating = songRating;

    // we store the played tracks list everytime the list is modified
    storePlayedTracks();
  } catch (e) {
    printError(e);
    return false;
  }
}

function getCurrentStationToken() {
  if (Global.currentStation) return Global.currentStation.stationToken;
  else return null;
}

function getStationByToken(token) {
  printf('token=%s', token);
  if (Global.stationList.length > 0) {
    for (var i = 0; i < Global.stationList.length; i++) {
      if (Global.stationList[i].stationToken === token) return Global.stationList[i];
    }
  }
  return false;
}

function setStationProperty(stationToken, propertyName, propertyValue) {
  if (Global.stationList.length > 0) {
    for (var i = 0; i < Global.stationList.length; i++) {
      if (Global.stationList[i].stationToken === stationToken) {
        Global.stationList[i][propertyName] = propertyValue;
        return true;
      }
    }
  }
  return false;
}

function changeCurrentStation(token) {
  if (token === getCurrentStationToken()) {
    printf('cannot change station. already playing station with matching token (%s)', token);
    return -1;
  }

  if (!getStationByToken(token)) {
    printf('cannot change stations. given station token is invalid (%s)', token);
    return false;
  }

  if (setStationFromToken(token)) {
    printf("Current station has been changed to %s", Global.currentStation.stationName);
    uiClearPlayedTracks();
    uiLoadPlayedTracks();
    Global.dontAddNextTrack = true;
    Global.pendingTracks[token] = [];
    stationLabel.text = Global.currentStation.stationName;
    getPlaylist(playNextTrack);
    return true;
  } else {
    printf('Error. cannot change stations. was unable to set station by token (%s)', token);
    return false;
  }
}

function exitConfirmed() {
  playerStop();
  resetSession();
  windowManager.pop();
  boxeeAPI.appStopped();
}

function exit() {
  uiConfirmDialog('Pandora', 'Would you like to exit this application?', exitConfirmed, undefined, 'No thanks', 'Yes');
}

function failedToLaunch() {
  windowManager.pop();
  boxeeAPI.appStarted(false)
}
