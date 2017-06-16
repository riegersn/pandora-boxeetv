Qt.include('utility.js');
Qt.include('padoraAPI.js');
Qt.include('pandoraUI.js');

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


/**
 * Pandora MediaItem
 * @param {string} path media path
 * @param {string} label media title
 * @param {string} thumbnail media thumbnail
 * @constructor
 */
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
  if (thumbnail) {
    this.thumbnail = thumbnail;
  }
}


/**
 * Creates a new MediaItem and expands it with track data
 * @param {object} item track info object
 * @return {MediaItem}
 * @constructor
 */
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
 * @returns {boolean} false if user has timed out
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
 * @return {boolean} True if Boxee TV has no connection
 */
function isOffline() {
  return (boxeeAPI.hasInternetConnection !== undefined && !boxeeAPI.hasInternetConnection());
}


/*
 * Gets the Boxee TV device ID
 * @returns {string} device id
 */
function getDeviceId() {
  return boxeeAPI.deviceId().toLowerCase();
}


/**
 * Prints anything to the log, only specify a message and the calling functions name will be used
 * @param {string|object} item1 Message or function name. Objects get stringified
 * @param {string|object} item2 Message. Optional. Objects get stringified
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
 * @param {string} message Message to print
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
 * @param {object} e error object
 */
function printError(e) {
  boxeeAPI.logError(sprintf('pandora [%s] Error: %s [%s:%d]', arguments.callee.caller.name, e.message, e.fileName, e.lineNumber));
}


/**
 * Prints track object to the log
 * @param {MediaItem} track Pandora track object
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


/**
 * Store setting to boxee client
 * @param {string} key Settings key
 * @param {string} value Setting value
 * @param {boolean} dontSave Save unsaved settings
 */
function storeSetting(key, value, dontSave) {
  boxeeAPI.setAppSetting(key, value);
  if (!dontSave) {
    saveSettings();
  }
}


/**
 * Load setting from boxee client
 * @param {string} key setting key
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
 * @return {boolean} returns false on error
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
 * @return {boolean} returns false on error
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
 * @param {MediaItem} track Track to play
 * @return {boolean} Returns true on successful playback
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


/**
 * Refresh by loading new station list, then trying to get a new playlist
 */
function refreshAndPlayRandom() {
  getStationList(handle_refreshAndPlayRandom)
}


/**
 * Handles refreshAndPlayRandom resutl. If stations where refreshed, sets
 * random station and starts playback, else, sets ui for failed playback
 * @param {object response result response object
 */
function handle_refreshAndPlayRandom(response) {
  if (response) {
    setRandomStation();
    playNextTrack();
  } else uiFailedPlayback();
}


/**
 * Returns the next track in the list of pending tracks
 * @return {object|boolean} Returns track object if successfull, false on failure
 */
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


/**
 * Adds the given track to the skipped track list
 * @param {string} trackToken Pandora track token
 * @returns {boolean} true if successfull
 */
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


/**
 * Checks if we have stations
 * @return {boolean} returns true if we have loaded station list
 */
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


/**
 * Set station from index
 * @param {number} stationIndex station id index
 * @returns {boolean} returns true if successfull
 */
function setStation(stationIndex) {
  if (stationIndex < 0 || stationIndex > Global.stationList.length - 1) {
    printf("Error. index out of bounds %d, number of stations %d", stationIndex, len(Global.stationList));
    return false
  }

  Global.currentStation = Global.stationList[stationIndex];
  Global.pendingTracks = []; //clear pending tracks

  if (getCurrentStationToken() !== loadSetting('lastStationToken')) {
    print('updating stored last station token')
    storeSetting('lastStationToken', getCurrentStationToken());
  }

  return true;
}


/**
 * Set station from station token
 * @param {string} stationToken Pandora station token
 * @returns {boolean} returns setStation() result
 */
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


/**
 * Sets a random station
 */
function setRandomStation() {
  var index = Math.floor(Math.random() * Global.stationList.length);
  return setStationFromToken(Global.stationList[index].stationToken);
}


/**
 * Check station token against current station
 * @param {string} stationToken pandora station token
 * @return {boolean} returns true if stationToken matches current station.
 */
function isCurrentStation(stationToken) {
  return (Global.currentStation.stationToken === stationToken);
}


/**
 * Clears pending track list
 */
function clearPendingTracks() {
  Global.pendingTracks = [];
}


/**
 * Checks if its ok to skip
 * @return {Boolean}
 */
function isSkipAllowed() {
  if (qaMode) {
    return true;
  }

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

    if (savedSkipList) {
      storeSkippedTracks();
    }

    skipCount = skipList.length;

    if (skipList.length < Global.skipTrackLimit) {
      return true;
    }

    print('skip not allowed, current limit reached');
    return false;
  }

  print('cannot skip, pandora is not currently playing or there is no current track.');
  return false;
}


/**
 * Skips the currently playing track
 * @return {boolean} returns false on error
 */
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


/**
 * Sets current track rating
 * @param {number} rating thumbs up/down 1/0
 * @returns {boolean} returns false if no currentTrack
 */
function setSongRatingCurrentTrack(rating) {
  if (Global.currentTrack) {
    Global.currentTrack.songRating = rating
    return true;
  }
  return false;
}


/**
 * Starts playback on next track in tracklist
 * @return {boolean} returns true on successful playback
 */
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


/**
 * Trims the fat from the track object
 * @param {MediaItem} track * @return {MediaItem}
 */
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


/**
 * Adds track to list of played tracks
 * @param {MediaItem} track */
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
  if (!track.isAd) {
    printf('Adding %s by %s to playedTracks list', track.label, track.artist)
  } else {
    print('Adding AD to playedTracks list');
  }

  tracks.unshift(newTrack);
  if (tracks.length > 4) {
    tracks.pop()
  }
  storePlayedTracks();
}


/**
 * Loads last played station for playback
 * @return {boolean} returns false on error
 */
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


/**
 * Starts station playback
 * @return {boolean} returns true on successful playback
 */
function startPlayback() {
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


/**
 * Returns the skiplist for the current station
 * @return {array} array of skipped tracks
 */
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


/**
 * Returns the previously played track list for the current station
 * @return {array} array of MediaItem objects
 */
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


/**
 * modifies the song rating on the currently playling track from the play
 * track list and the main currentTrack var
 * @param {number} songRating thumbs up/down 1/0
 * @return {boolean} returns false on error
 */
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


/**
 * Gets station token from currently playing station
 * @return {string} station token
 */
function getCurrentStationToken() {
  if (Global.currentStation) {
    return Global.currentStation.stationToken;
  } else {
    return null;
  }
}


/**
 * Retrievs station by station token
 * @param {string} token station token
 * @return {object|boolean} station item object, else, false
 */
function getStationByToken(token) {
  printf('token=%s', token);
  if (Global.stationList.length > 0) {
    for (var i = 0; i < Global.stationList.length; i++) {
      if (Global.stationList[i].stationToken === token) return Global.stationList[i];
    }
  }
  return false;
}


/**
 * Sets a station propery by its station token
 * @param {string} stationToken station token
 * @param {string} propertyName property name
 * @param {string} propertyValue property value
 * @returns {boolean} returns true if successful
 */
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


/**
 * Changes the current station
 * @param {string} token station token
 * @return {boolean|number} returns -1 if station already playing, returns true on successful change
 */
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


/**
 * Exists the pandora application
 */
function exitConfirmed() {
  playerStop();
  resetSession();
  windowManager.pop();
  boxeeAPI.appStopped();
}


/**
 * Confirms exit application with confirm dialog
 * @method exit
 * @return {[type]}
 */
function exit() {
  uiConfirmDialog('Pandora', 'Would you like to exit this application?', exitConfirmed, undefined, 'No thanks', 'Yes');
}


/**
 * Handles failure to launch ;p
 */
function failedToLaunch() {
  windowManager.pop();
  boxeeAPI.appStarted(false)
}
