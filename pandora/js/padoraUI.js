/**
 * Pandora UI functions
 * @module pandoraUI
 */


 /**
  * Shows the wait dialog
  * @param {function} cb callback function
  */
 function uiShowWait(cb) {
   if (!loading) {
     loading = true;
     boxeeAPI.showWaitDialog(isFunction(cb), cb);
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
  * @param {string} message Dialog message text
  * @param {string} initval Inital keyboard text
  * @param {function} cb * @param  {function} cb2
  */
 function uiKeyboardDialog(message, initval, cb, cb2) {
   printf('showing keyboard dialog from (%s)', arguments.callee.caller.name);
   var splash = boxeeAPI.runningAppPath() + '/media/pandora_splash_bokeh_dim.jpg';
   boxeeAPI.showKeyboardDialog('Pandora', cb, false, initval, message, true, cb2, splash)
 }


 /**
  * Show Ok Dialog
  * @param {string} message Dialog message text
  * @param {function} cb * @param  {function} cb2
  */
 function uiOkDialog(message, cb, cb2) {
   if (!isFunction(cb2)) {
     cb2 = cb;
   }
   printf('showing ok dialog from (%s)', arguments.callee.caller.name);
   boxeeAPI.showOkDialog('Pandora', message, cb, cb2, 'OK', true, boxeeAPI.runningAppPath() + '/media/pandora_splash_bokeh_dim.jpg');
 }


 /**
  * Show confirm dialog
  * @param {string} title Dialog title
  * @param {string} message Dialog message text
  * @param {function} cb Callback function
  * @param {function} cb2 Callback function, passed as param for cb
  * @param {string} cancel Cancel button text
  * @param {string} ok Confirm button text
  */
 function uiConfirmDialog(title, message, cb, cb2, cancel, ok) {
   printf('showing confirm dialog from (%s)', arguments.callee.caller.name);

   var title = title || 'Pandora',
     ok = ok || 'OK',
     cancel = cancel || 'Cancel',
     bg = boxeeAPI.runningAppPath() + '/media/pandora_splash_bokeh_dim.jpg';
   boxeeAPI.showConfirmDialog(title, message, cb, cb2, ok, cancel, true, bg)
 }


 /**
  * Handles failures, stops player, resets ui, notifies user.
  * @param {number} code Error code
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
  * @param {boolean} appStart */
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
  * @param {boolean} result False will show search blade, true will start playback
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
