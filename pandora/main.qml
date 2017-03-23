/**
 * Pandora : main.qml
 * pandora/main.qml
 */

import QtQuick 1.1
import BoxeeRuntime 1.0
import boxee.components 1.0
import "components"
import "js/pandora.js" as Pandora
import "js/global.js" as Global

Window {
  id: root

  property int mediaState: -1
  property int playCount: 0
  property int adCount: 0;
  property int failedCount: 0
  property int skipCount: 0
  property bool loading: false
  property bool isAd: false
  property bool isPlaying: false
  property bool mediaOpen: false
  property bool allowThumbUp: false
  property bool allowThumbDown: false
  property bool qaMode: false;
  property bool debugMode: false;
  property string version: boxeeAPI.runningAppVersion()

  onAllowThumbDownChanged: printWindowProperties();
  onAllowThumbUpChanged: printWindowProperties();
  onIsAdChanged: printWindowProperties();
  onMediaStateChanged: printWindowProperties();
  onIsPlayingChanged: printWindowProperties();

  Keys.onTabPressed: {
    if (mediaOpen && (new Date() - Global.lastTabPressed) > 1000) {
      if (allPanelsClosed() && !Global.processingExplainTrack) {
        forceFocus(buttonInfo);
        Pandora.explainTrack();
      } else if (explainBlade.isOpen) explainBlade.close();
    } else Global.lastTabPressed = new Date();
  }

  Keys.onPressed: {
    switch (event.key) {
      case Qt.Key_H:
      case Qt.Key_Home:
      case Qt.Key_HomePage:
        Pandora.exit();
        break;
      case Qt.Key_P:
      case Qt.Key_Pause:
      case Qt.Key_Play:
        Pandora.updateActivityTimestamp();
        break;
      case Qt.Key_0:
        if (debugMode) Pandora.print('debugMode, currentStation', JSON.stringify(Global.currentStation));
        break;
      case Qt.Key_1:
        if (debugMode) Pandora.print('debugMode, currentTrack', JSON.stringify(Global.currentTrack));
        break;
      case Qt.Key_2:
        if (debugMode) Pandora.print('debugMode, playedTracks', JSON.stringify(Global.playedTracks));
        break;
      case Qt.Key_3:
        if (debugMode) Pandora.print('debugMode, skippedTracks', JSON.stringify(Global.skippedTracks));
        break;
      case Qt.Key_4:
        if (debugMode) Pandora.print('debugMode, stationList', JSON.stringify(Global.stationList));
        break;
      case Qt.Key_D:{
        debugMode = !debugMode;
        printWindowProperties();
        Pandora.storeSetting('debugMode', debugMode);
        break;
      }
      case Qt.Key_Q: {
        qaMode = !qaMode;
        Global.failedTrackLimit = (qaMode) ? 10 : 4;
        Global.activityTimeoutLimit = (qaMode) ? 1800000 : 28800000;
        Global.skipTrackTimeout = (qaMode) ? 600000 : 3600000;
        Pandora.uiUpdateCurrentTrack();
        printWindowProperties();
        Pandora.storeSetting('qaMode', qaMode);
        break;
      }
    }
  }

  Component.onCompleted: {

    /**
     * Handle result from userLogin()
     * @param   result   Result from userLogin()
     */
    function handle_userLogin(result) {
      Pandora.updateActivityTimestamp();

      if (!result.isOk) {
        Pandora.resetDevice();
        Pandora.uiShowActivatePandora(true);
        Pandora.uiOkDialog(result.description);
        return;
      }

      if (Global.host === Global.PRODUCTION)
        Pandora.uiShowPandora(true);
      else if (Global.host === Global.STAGING) //staging servers will not send over station list. do it manually
        Pandora.getStationList(Pandora.sendWithArgs(Pandora.uiShowPandora, true));
    }

    Global.lastTabPressed = new Date();
    Global.processingExplainTrack = false;
    Global.status = Pandora.PandoraStatus.OFFLINE;

    qaMode = (Pandora.loadSetting('qaMode') | false);
    debugMode = (Pandora.loadSetting('debugMode') | false);

    printWindowProperties();

    if (boxeeAPI.hasInternetConnection()) {
      Global.isAssociated = Pandora.loadSetting('isAssociated');
      Global.deviceId = Pandora.getDeviceId();

      if (debugMode) {
        Pandora.printf('isAssociated = %s', Global.isAssociated);
        Pandora.printf('loaded custom deviceId (%s)', Global.deviceId);
      }

      if (!Global.isAssociated)
        Pandora.uiShowActivatePandora(true);
      else
        Pandora.userLogin(handle_userLogin);
    } else {
      boxeeAPI.appStarted(fail);
      Pandora.uiOkDialog(Pandora.getErrorReponse(9000), Pandora.exitConfirmed);
    }
  }

  /**
   * Tests if all application blades are closed.
   * @return   True if all panel blades are currently closed.
   */
  function allPanelsClosed() {
    return !explainBlade.isOpen && !stationBlade.isOpen && !mgmtBlade.isOpen && !searchBlade.isOpen && !quickStationBlade.isOpen;
  }

  /**
   * Prints current Pandora operating status on the main window. Must be in debugMode.
   */
  function printWindowProperties() {
    if (debugMode) {
      Pandora.isSkipAllowed()
      debugLabel.text = Pandora.sprintf(
        'version\t  %s\nmodes\t  debugMode: %s, qaMode: %s\nplayer\t  isAd: %s, isPlaying: %s, mediaOpen: %s, allowThumbUp: %s, allowThumbDown: %s\naccount\t  username: %s, canListen: %s, hasAudioAds: %s\ndebug\t  failedTrackLimit: %d, activityTimeoutLimit: %d, skipTrackTimeout: %d\nstats\t  playedTracks: %d, playedAds: %d, failedTracks: %d, skipCount: %d, globalRetryCount: %d\nprint\t  0-currentStation  1-currentTrack  2-playedTracks  3-skippedTracks  4-stationList',
        boxeeAPI.runningAppVersion(), debugMode, qaMode, isAd, isPlaying, mediaOpen, allowThumbUp, allowThumbDown, Global.username, Global.canListen, Global.hasAudioAds, Global.failedTrackLimit, Global.activityTimeoutLimit, Global.skipTrackTimeout, playCount, adCount, failedCount, skipCount, Global.retryCount);
    }
  }

  Item {
    id: base

    Image {
      id: background
      width: root.width
      height: root.height
      source: "media/pandora_splash_bokeh.jpg"
    }

    Text {
      id: debugLabel
      color: "white"
      font.pixelSize: 21
      height: 70
      visible: debugMode
      anchors.topMargin: 20
      anchors.left: logo.left
      anchors.top: logo.bottom
    }

    Image {
      id: logo
      x: 60
      y: 120
      width: 364
      height: 64
      source: "media/pandora_logo.png"
    }
  }

  Item {
    id: playedTracks
    y: 300
    x: -100
    width: 1240
    height: 800
    visible: activeArea.visible

    ListView {
      id: playedTracksList
      width: parent.width
      height: parent.height
      contentWidth: 300
      contentHeight: 800
      orientation: ListView.Horizontal
      LayoutMirroring.enabled: true
      model: ListModel {
        id: playedTrackModel
      }

      delegate: Item {
        id: wrapper
        width: 300
        height: 800

        Label {
          width: 280
          height: 300
          clip: true
          color: "white"
          opacity: 0.8
          font.bold: true
          font.pixelSize: 34
          wrapMode: Text.WordWrap
          text: (artist) ? label + " by " + artist : label
          verticalAlignment: Text.AlignBottom
          anchors.bottomMargin: 20
          anchors.bottom: originalImage.top
          anchors.horizontalCenter: parent.horizontalCenter
        }

        Image {
          id: originalImage
          y: 300
          width: 280
          height: 280
          source: thumbnail
          anchors.horizontalCenter: parent.horizontalCenter
        }

        Rectangle {
          opacity: 0.5
          color: "black"
          anchors.fill: originalImage
        }

        Image {
          width: 52
          height: 60
          source: (parseInt(songRating) === 1) ? "media/pandora_thumb_up_v2.png" : "media/pandora_thumb_down_v2.png"
          anchors.topMargin: 6
          anchors.rightMargin: 6
          anchors.top: originalImage.top
          anchors.right: originalImage.right
          visible: parseInt(songRating) !== 0
        }

        Image {
          y: 590
          width: 280
          height: 280
          source: thumbnail
          anchors.horizontalCenter: parent.horizontalCenter
          transform: Rotation {
            origin.x: 140
            origin.y: 140
            axis.x: 1;
            axis.y: 0;
            axis.z: 0
            angle: 180
          }
        }

        Rectangle {
          width: 280
          height: 280
          opacity: 0.5
          color: "black"
          anchors.topMargin: 10
          anchors.top: originalImage.bottom
          anchors.right: originalImage.right
        }

        ListView.onAdd: state = "add"
        states: [
          State {
            name: "add"
            PropertyChanges {
              target: wrapper;opacity: 1;clip: true
            }
          }
        ]
        transitions: [
          Transition {
            to: "add"
            SequentialAnimation {
              NumberAnimation {
                properties: "opacity"
                from: 0; to: 1;
                duration: 250
              }
              PropertyAction {
                target: wrapper;property: "state";
                value: ""
              }
            }
          }
        ]
      }
    }

    Image {
      x: 100; y: 580
      height: 200; width: 1920
      source: "media/pandora_bottom_feather.png"
    }
  }

  Item {
    id: activeArea
    x: 1207
    height: root.height; width: 698
    visible: false

    Image {
      width: parent.width
      height: parent.height
      source: "media/pandora_active_area.png"
    }

    Label {
      id: pandoraUserName
      width: 600
      height: 32
      color: "white"
      opacity: 0.9
      font.bold: true
      font.pixelSize: 26
      text: ""
      verticalAlignment: Text.AlignVCenter
      anchors.top: parent.top
      anchors.left: parent.left
      anchors.topMargin: 30
      anchors.leftMargin: 50
    }

    PandoraLabelButton {
      id: buttonLogout
      width: 120
      height: 32
      opacity: 1
      pixelSize: 26
      buttonLabel: 'Signout'
      anchors.right: parent.right
      anchors.rightMargin: 50
      anchors.verticalCenterOffset: -4
      anchors.verticalCenter: pandoraUserName.verticalCenter

      Behavior on opacity {
        NumberAnimation {
          duration: 200
        }
      }

      Keys.onReturnPressed: {
        Pandora.uiConfirmDialog('Signout', 'Are you sure you want to sign out of your pandora account?', confirmSignout);
      }

      Keys.onDownPressed: {
        forceFocus(playbackControls);
      }

      function logoutcallback(result) {
        if (result) {
          Pandora.playerStop();
          Pandora.print('logout complete');
          activeArea.visible = false;
          activatePandora.visible = true;
          forceFocus(activateButton);
        }
      }

      function confirmSignout() {
        Pandora.disassociateDevice(logoutcallback);
      }
    }

    Label {
      id: stationLabel
      y: 85
      text: ""
      clip: true
      color: "white"
      font.bold: true
      font.pixelSize: 38
      width: parent.width - 80
      elide: Text.ElideRight
      horizontalAlignment: Text.AlignHCenter
      anchors.horizontalCenter: parent.horizontalCenter
    }

    Row {
      id: playbackControls
      y: 140
      spacing: 15
      height: buttonPlayPause.height
      width: (buttonPlayPause.width * 5) + (spacing * 4)
      anchors.horizontalCenter: parent.horizontalCenter
      property PandoraImageButton lastActive: buttonPlayPause
      KeyNavigation.up: buttonLogout
      KeyNavigation.down: buttonTrackName

      Keys.onDownPressed: {
        if (buttonTrackName.visible)
          forceFocus(buttonTrackName)
        else
          stationBlade.setCloseFocus();
      }

      onFocusChanged: {
        if (!lastActive.disabled)
          forceFocus(lastActive);
        else
          forceFocus(buttonPlayPause);
      }

      function navigate(direction) {
        var active = false;
        var controls = [buttonPlayPause, buttonSkip, buttonInfo, buttonThumbDown, buttonThumbUp];

        if (direction === 'left')
          controls.reverse();

        for (var i in controls) {
          if (controls.hasOwnProperty(i)) {
            if (controls[i].activeFocus) {
              active = controls[i];
              continue;
            }

            if (active && !controls[i].disabled) {
              active = controls[i];
              break;
            }
          }
        }

        if (!active) active = buttonPlayPause;
        forceFocus(active);
        lastActive = active
      }

      PandoraImageButton {
        id: buttonPlayPause
        width: 96
        height: 60
        focus: true
        isToggle: true
        imageBase: "pandora_play_button"
        imageBaseAlt: "pandora_pause_button"
        alternateOn: isPlaying && mediaOpen
        Keys.onRightPressed: playbackControls.navigate();

        onEnter: {
          if (!boxeeAPI.hasInternetConnection()) {
            Pandora.uiOkDialog(Pandora.getErrorReponse(9000), Pandora.uiFailedPlayback);
            return;
          }

          if (!Global.currentStation && Global.stationList.length === 0) {
            Pandora.print('no station exists!')
            Pandora.getStationList(handle_stationList);
          } else {
            if (!Global.currentTrack)
              Pandora.playNextTrack();
            else
              Pandora.playerPause();
          }
        }

        onAltEnter: {
          if (mediaOpen)
            Pandora.playerPause();
        }

        function handle_stationList(response) {
          if (!response) {
            searchBlade.open(keyboard);
            alternateOn = false;
          } else {
            Pandora.setRandomStation();
            Pandora.playNextTrack();
          }
        }
      }

      PandoraImageButton {
        id: buttonSkip
        width: 96
        height: 60
        imageBase: "pandora_next_button"
        disabled: !mediaOpen || isAd
        Keys.onRightPressed: playbackControls.navigate();
        Keys.onLeftPressed: playbackControls.navigate('left');
        Keys.onReturnPressed: {
          if (!disabled) {
            Pandora.updateActivityTimestamp();
            Pandora.skipSong();
          }
        }
      }

      PandoraImageButton {
        id: buttonInfo
        width: 96
        height: 60
        imageBase: "pandora_info_button"
        disabled: !mediaOpen || isAd
        onEnter: Pandora.explainTrack();
        Keys.onRightPressed: playbackControls.navigate();
        Keys.onLeftPressed: playbackControls.navigate('left');
      }

      PandoraImageButton {
        id: buttonThumbDown
        width: 96
        height: 60
        imageBase: "pandora_thumb_down_button"
        disabled: !mediaOpen || !allowThumbDown || isAd
        KeyNavigation.up: buttonLogout
        Keys.onReturnPressed: Pandora.addFeedback(-1);
        Keys.onRightPressed: playbackControls.navigate();
        Keys.onLeftPressed: playbackControls.navigate('left');
      }

      PandoraImageButton {
        id: buttonThumbUp
        width: 96
        height: 60
        imageBase: "pandora_thumb_up_button"
        disabled: !mediaOpen || !allowThumbUp || isAd
        KeyNavigation.up: buttonLogout
        Keys.onReturnPressed: Pandora.addFeedback(1);
        Keys.onLeftPressed: playbackControls.navigate('left');
      }
    }

    Item {
      id: detailContainer
      width: parent.width
      height: parent.height
      visible: true
      opacity: mediaOpen ? 1.0 : 0.0
      anchors.top: playbackControls.bottom

      Behavior on opacity {
        NumberAnimation {
          duration: 500
        }
      }

      PandoraToolTip {
        anchor: buttonTrackName
        text: "Bookmark or create a station from this track"
      }

      PandoraLabelButton {
        id: buttonTrackName
        clip: true
        height: 48
        width: parent.width - 100
        pixelSize: 36
        buttonLabel: ""
        labelMargin: 30
        labelCenter: false
        visible: !isAd && buttonLabel != ''
        anchors.topMargin: 60
        anchors.top: parent.top
        anchors.horizontalCenter: parent.horizontalCenter
        KeyNavigation.up: playbackControls
        KeyNavigation.down: buttonArtistName
        Keys.onReturnPressed: {
          quickStationBlade.yWhenOn = 304;
          quickStationBlade.markType = "song";
          quickStationBlade.open(quickStationBladeList);
          quickStationBlade.onCloseFocusItem = buttonTrackName;
        }
      }

      PandoraToolTip {
        anchor: buttonArtistName
        text: "Bookmark or create a station from this artist"
      }

      PandoraLabelButton {
        id: buttonArtistName
        clip: true
        height: 92
        width: parent.width - 100
        pixelSize: 36
        buttonLabel: ""
        labelMargin: 30
        labelCenter: false
        visible: !isAd && buttonLabel != ''
        anchors.topMargin: 25
        anchors.top: buttonTrackName.bottom
        anchors.horizontalCenter: parent.horizontalCenter
        KeyNavigation.up: buttonTrackName
        Keys.onDownPressed: stationBlade.setCloseFocus();
        Keys.onReturnPressed: {
          quickStationBlade.yWhenOn = 421;
          quickStationBlade.markType = "artist";
          quickStationBlade.open(quickStationBladeList);
          quickStationBlade.onCloseFocusItem = buttonArtistName;
        }
      }

      Label {
        id: adlabel
        text: ''
        clip: true
        color: "white"
        font.bold: true
        font.pixelSize: 38
        elide: Text.ElideRight
        wrapMode: Text.WordWrap
        anchors.fill: buttonArtistName
        horizontalAlignment: Text.AlignLeft
        verticalAlignment: Text.AlignBottom
        visible: isAd && text !== ''
      }

      Item {
        id: ratingThumbs
        anchors.fill: albumArtImage
        visible: !isAd && albumArtImage.status === Image.Ready

        Image {
          id: thumbsDown
          width: 164
          height: 188
          source: 'media/pandora_thumb_down.png'
          anchors.leftMargin: -130
          anchors.left: parent.left
          anchors.verticalCenterOffset: 20
          anchors.verticalCenter: parent.verticalCenter
          visible: allowThumbUp && !allowThumbDown
        }

        Image {
          id: thumbsUp
          width: 164
          height: 188
          source: 'media/pandora_thumb_up.png'
          anchors.rightMargin: -130
          anchors.right: parent.right
          anchors.verticalCenterOffset: -20
          anchors.verticalCenter: parent.verticalCenter
          visible: !allowThumbUp && allowThumbDown
        }

      }

      Image {
        id: albumArtImage
        width: 375
        height: 374
        source: ''
        anchors.topMargin: 65
        anchors.top: buttonArtistName.bottom
        anchors.horizontalCenter: buttonArtistName.horizontalCenter
      }

      PandoraProgressBar {
        id: progressBar
        width: albumArtImage.width
        anchors.topMargin: 20
        anchors.top: albumArtImage.bottom
        anchors.left: albumArtImage.left
      }

      Label {
        id: positionLabel
        font.pixelSize: 20
        anchors.topMargin: 15
        anchors.top: albumArtImage.bottom
        anchors.rightMargin: 15
        anchors.right: progressBar.left
        color: "white"
        visible: mediaOpen
      }

      Label {
        id: durationLabel
        font.pixelSize: 20
        anchors.topMargin: 15
        anchors.top: albumArtImage.bottom
        anchors.leftMargin: 15
        anchors.left: progressBar.right
        color: "white"
        visible: mediaOpen
      }
    }

    PandoraPane {
      id: stationBlade
      yWhenOff: 950
      closeButtonLabel: "Your Stations"
      onExit: forceFocus(buttonPlayPause);

      onIsOpenChanged: {
        buttonLogout.opacity = isOpen ? 0.50 : 1;
      }

      onAfterClose: {
        var selected = Pandora.uiUpdateStationList();
        stationBladeList.currentIndex = selected;
        stationBladeList.positionViewAtIndex(selected, ListView.Center);
        stationBlade.setCloseFocus();

      }

      onBeforeOpen: {
        var selected = Pandora.uiUpdateStationList();
        stationBladeList.currentIndex = selected;
        stationBladeList.positionViewAtIndex(selected, ListView.Center);
      }

      onNavigateDown: {
        if (stationBlade.isOpen)
          forceFocus(buttonCreateStation);
      }

      onNavigateUp: {
        if (!stationBlade.isOpen) {
          if (buttonArtistName.visible)
            forceFocus(buttonArtistName);
          else
            forceFocus(buttonPlayPause);
        }
      }

      Rectangle {
        id: buttonCreateStation
        x: 104
        y: 140
        height: 60
        width: 500
        color: (!buttonCreateStation.activeFocus) ? "transparent" : "#FF9900"
        Keys.onUpPressed: stationBlade.setCloseFocus();
        Keys.onReturnPressed: searchBlade.open(keyboard);

        onFocusChanged: {
          if (!stationBlade.isOpen && buttonCreateStation.activeFocus)
            stationBlade.setCloseFocus();
        }

        Keys.onDownPressed: {
          if (stationBladeModel.count > 0)
            forceFocus(stationBladeList);
        }

        Label {
          text: "Create a New Station..."
          font.pixelSize: 32
          width: parent.width - 30
          elide: Text.ElideRight
          verticalAlignment: Text.AlignVCenter
          horizontalAlignment: Text.AlignHCenter
          anchors.verticalCenterOffset: 5
          anchors.verticalCenter: parent.verticalCenter
          anchors.horizontalCenter: parent.horizontalCenter
          color: (parent.activeFocus) ? "black" : "white"
        }
      }

      ListView {
        id: stationBladeList
        width: parent.width - 80
        height: 693
        clip: true
        contentHeight: 63
        contentWidth: 550
        orientation: ListView.Vertical
        preferredHighlightBegin: 315
        preferredHighlightEnd: 378
        anchors.topMargin: 35
        highlightMoveDuration: 0
        highlightRangeMode: ListView.ApplyRange
        anchors.top: buttonCreateStation.bottom
        anchors.horizontalCenter: parent.horizontalCenter
        Keys.onRightPressed: mgmtBlade.open(mgmtBladeList);

        Keys.onReturnPressed: {
          var token = stationBladeModel.get(currentIndex).stationToken;
          var verdict = Pandora.changeCurrentStation(token);

          if (verdict === -1 || verdict !== false)
            stationBlade.close(buttonPlayPause);
          else
            Pandora.uiOkDialog('There was a problem playing the selected station.');
        }

        Keys.onUpPressed: {
          if (!currentIndex)
            forceFocus(buttonCreateStation);
          else
            stationBladeList.decrementCurrentIndex();
        }

        Keys.onDownPressed: {
          stationBladeList.incrementCurrentIndex();
        }

        delegate: PandoraGenericItem {
          linkList: stationBladeList
          text: stationName
          showRightArrow: true
          isItemPlaying: isPlaying
        }

        model: ListModel {
          id: stationBladeModel
        }
      }
    }

    PandoraPane {
      id: mgmtBlade
      yWhenOn: 250
      closeButtonLabel: stationBladeList.currentIndex >= 0 ? stationBladeModel.get(stationBladeList.currentIndex).stationName : ""
      onAfterClose: forceFocus(stationBladeList)
      onNavigateDown: {
        mgmtBladeList.currentIndex = 0;
        forceFocus(mgmtBladeList);
      }

      ListView {
        id: mgmtBladeList
        y: 150
        width: parent.width - 80
        height: 693
        clip: true
        contentHeight: 63
        contentWidth: 550
        orientation: ListView.Vertical
        anchors.horizontalCenter: parent.horizontalCenter

        function updateUI() {
          Pandora.playNextTrack()
          Pandora.uiUpdateCurrentTrack()
        }

        function afterDelete(confirm) {
          if (confirm) {
            if (Global.status === Pandora.PandoraStatus.LOGGEDIN) {
              Pandora.print('set new station, getting playlist.');
              Pandora.setRandomStation();
              Pandora.getPlaylist(updateUI);
            }

            if (Global.tempStationIndexForDelete === stationBladeModel.count)
              Global.tempStationIndexForDelete--;

            stationBladeList.currentIndex = Global.tempStationIndexForDelete;
            Global.tempStationIndexForDelete = 0;
            mgmtBlade.close(stationBladeList);
          } else {
            if (stationBladeModel.count === 0) {
              var after = (function() {
                searchBlade.open(keyboard);
              });
              mgmtBlade.close(after);
            } else forceFocus(mgmtBladeList);
          }
        }

        function confirmDelete() {
          Global.tempStationIndexForDelete = stationBladeList.currentIndex;
          var activeStation = stationBladeModel.get(stationBladeList.currentIndex);
          Pandora.deleteStation(activeStation.stationToken, afterDelete)
        }

        function cancelDelete() {
          forceFocus(mgmtBladeList);
        }

        function afterStationRename(confirm) {
          if (confirm) {
            Pandora.uiPopulateStations();
            stationBladeList.currentIndex = 0;
            mgmtBlade.close(stationBladeList);
          } else forceFocus(mgmtBladeList);
        }

        function afterKeyboard(stationName) {
          var activeStation = stationBladeModel.get(stationBladeList.currentIndex);
          Pandora.renameStation({
            token: activeStation.stationToken,
            name: stationName
          }, afterStationRename);
        }

        Keys.onReturnPressed: {
          var selection = mgmtBladeModel.get(currentIndex);
          var activeStation = stationBladeModel.get(stationBladeList.currentIndex);

          if (selection.name === 'Play Station') {
            var verdict = Pandora.changeCurrentStation(activeStation.stationToken);

            if (verdict === -1 || verdict !== false) {
              mgmtBlade.close(buttonPlayPause);
              stationBlade.close(buttonPlayPause);
            } else
              Pandora.uiOkDialog('There was a problem playing the selected station.');
          } else if (selection.name === 'Delete Station') {
            if (!activeStation.allowDelete)
              Pandora.uiOkDialog('You are not allowed to delete this station.');
            else
              Pandora.uiConfirmDialog('Pandora', 'Are you sure you want to delete this station?', confirmDelete, cancelDelete);
          } else if (selection.name === 'Rename Station') {
            if (!activeStation.allowRename)
              Pandora.uiOkDialog('You are not allowed to rename this station.');
            else
              Pandora.uiKeyboardDialog('Rename Station', activeStation.stationName, afterKeyboard)
          }
        }

        Keys.onUpPressed: {
          if (!currentIndex)
            mgmtBlade.setCloseFocus();
          else
            mgmtBladeList.decrementCurrentIndex();
        }

        delegate: PandoraGenericItem {
          text: name
          linkList: mgmtBladeList
        }

        model: ListModel {
          id: mgmtBladeModel
          ListElement {
            name: "Play Station"
          }
          ListElement {
            name: "Delete Station"
          }
          ListElement {
            name: "Rename Station"
          }
        }
      }

    }

    PandoraPane {
      id: quickStationBlade

      property string markType: "artist"
      property PandoraLabelButton onCloseFocusItem: buttonArtistName

      yWhenOn: 350
      closeButtonLabel: "Bookmark / Create Station"
      onAfterClose: forceFocus(onCloseFocusItem);
      onNavigateDown: forceFocus(quickStationBladeList);

      onIsOpenChanged: {
        buttonLogout.opacity = isOpen ? 0.50 : 1;
      }

      ListView {
        id: quickStationBladeList
        y: 150
        width: parent.width - 80
        height: 693
        clip: true
        contentHeight: 63
        contentWidth: 550
        orientation: ListView.Vertical
        anchors.horizontalCenter: parent.horizontalCenter

        Keys.onReturnPressed: {
          function afterCreateStation(stationToken) {
            if (!stationToken)
              quickStationBlade.close();
            else if (stationToken === 'alreadyPlaying')
              quickStationBlade.close(buttonPlayPause);
            else if (Pandora.changeCurrentStation(stationToken))
              quickStationBlade.close(buttonPlayPause);
          }

          var token = Global.currentTrack.trackToken;
          var selection = quickStationBladeModel.get(currentIndex);
          var data = {
            token: token,
            type: quickStationBlade.markType
          };

          if (selection.name === 'Bookmark')
            Pandora.addBookmark(data, quickStationBlade.close);
          else if (selection.name === 'Create Station')
            Pandora.createStationFromTrackToken(data, afterCreateStation)
        }

        Keys.onUpPressed: {
          if (!currentIndex)
            quickStationBlade.setCloseFocus();
          else
            quickStationBladeList.decrementCurrentIndex();
        }

        delegate: PandoraGenericItem {
          text: name
          linkList: quickStationBladeList
        }

        model: ListModel {
          id: quickStationBladeModel
          ListElement {
            name: "Bookmark"
          }
          ListElement {
            name: "Create Station"
          }
        }
      }
    }

    PandoraPane {
      id: explainBlade
      yWhenOff: 1100
      onAfterClose: forceFocus(buttonInfo);

      function showWhyPanel(whytext) {
        if (whytext === undefined || !whytext) {
          Pandora.uiOkDialog("An error occurred trying to get 'Why this track?' data.")
          return false;
        }

        var track = Global.currentTrack;
        explainBladeLabel.text = Pandora.sprintf(whytext, track.label, track.artist);
        explainBlade.open(explainBlade.getCloseButton());
      }

      Text {
        id: explainBladeLabel
        y: 160
        height: 693
        width: parent.width - 160
        text: ""
        color: "white"
        font.pixelSize: 30
        wrapMode: Text.WordWrap
        anchors.horizontalCenter: parent.horizontalCenter
      }
    }
  }

  Item {
    id: searchPanel
    opacity: 0
    visible: searchBlade.visible

    Rectangle {
      width: root.width
      height: root.height
      color: "black"
    }

    Image {
      x: 60
      y: 120
      width: 364
      height: 64
      source: "media/pandora_logo.png"
    }

    NumberAnimation {
      id: showSearchPanel
      target: searchPanel
      properties: "opacity"
      from: 0
      to: 1
      duration: 300
    }

    NumberAnimation {
      id: hideSearchPanel
      target: searchPanel
      properties: "opacity"
      from: 1
      to: 0
      duration: 300
    }
  }

  PandoraPane {
    id: searchBlade
    yWhenOn: 250
    yWhenOff: 1100
    width: parent.width + 100
    showCloseButton: false
    visible: activeArea.visible
    anchors.horizontalCenter: parent.horizontalCenter
    onAfterClose: forceFocus(buttonCreateStation);

    onBeforeOpen: {
      searchModel.clear();
      searchLabel.text = "";
      keyboard.currentIndex = 0;
    }

    Label {
      x: 100
      y: 100
      width: 400
      color: "#FFFFFF"
      font.bold: true
      font.pixelSize: 42
      text: "Create a New Station"
    }

    Label {
      x: 100
      y: 180
      width: 625
      color: "white"
      font.pixelSize: 36
      wrapMode: Text.WordWrap
      text: "Type in the name of your favorite artist, track or composer and we'll create a radio station featureing that music and more like it."
    }

    Item {
      y: 18
      x: 745
      width: 501
      height: root.height

      Image {
        anchors.fill: parent
        source: "media/pandora_keyboard_background.png";
      }

      Image {
        y: 60
        width: 435
        height: 69
        anchors.right: parent.right
        source: "media/pandora_keyboard_textbox.png"
      }

      Label {
        id: searchLabel
        y: 67
        x: 10
        clip: true
        width: 415
        height: 69
        color: "white"
        font.bold: true
        font.pixelSize: 36
        anchors.right: parent.right
        verticalAlignment: Text.AlignVCenter
      }

      PandoraKeyboard {
        id: keyboard
        y: 180
        externalLabel: searchLabel
        anchors.horizontalCenterOffset: 10
        anchors.horizontalCenter: parent.horizontalCenter

        function fillResult(list) {
          if (list !== undefined) {
            searchModel.clear()
            for (var i = 0; i < list.length; i++)
              searchModel.append(list[i]);
          }
        }

        onKeyboardRight: {
          if (searchModel.count > 0) {
            searchList.currentIndex = 0;
            forceFocus(searchList);
          }
        }

        onCommitPressed: {
          if (labelText.length > 0)
            Pandora.searchPandora(labelText, fillResult)
        }

        onExternalLabelChange: {
          if (updateAutoComplete)
            Pandora.autoComplete(labelText, fillResult);
          if (!labelText)
            searchModel.clear();
        }
      }
    }

    ListView {
      id: searchList
      y: 80
      x: 1240
      width: 660
      height: 693
      clip: true
      contentHeight: 63
      contentWidth: 660
      orientation: ListView.Vertical
      preferredHighlightBegin: 315
      preferredHighlightEnd: 378
      highlightRangeMode: ListView.ApplyRange
      section.property: "searchtype"
      section.criteria: ViewSection.FullString
      KeyNavigation.left: keyboard

      Keys.onReturnPressed: {
        function afterCreateStation(stationToken) {
          if (!stationToken) {
            searchBlade.close(buttonCreateStation);
          } else if (stationToken) {
            if (stationToken !== 'alreadyPlaying')
              Pandora.changeCurrentStation(stationToken);
            searchBlade.close();
            stationBlade.close(buttonPlayPause);
          }
        }

        Pandora.createStationFromToken(searchModel.get(currentIndex).token, afterCreateStation);
      }

      model: ListModel {
        id: searchModel
      }
      delegate: PandoraGenericItem {
        width: 700
        text: name
        linkList: searchList
      }

      section.delegate: Item {
        width: 660
        height: 63
        Label {
          x: 85
          width: 660
          font.bold: true
          font.pixelSize: 32
          text: section
          color: "grey"
          anchors.verticalCenter: parent.verticalCenter
        }
      }
    }
  }

  Item {
    id: activatePandora
    x: 1207
    width: 698
    height: root.height
    visible: false

    Image {
      anchors.fill: parent
      source: "media/pandora_active_area.png"
    }

    Label {
      id: activateLabel
      color: "white"
      font.pixelSize: 42
      width: parent.width - 120
      wrapMode: Text.WordWrap
      anchors.topMargin: 120
      anchors.top: parent.top
      anchors.horizontalCenter: parent.horizontalCenter
      text: "It's a new kind of radio - stations that play only music you like."
    }

    PandoraButton {
      id: activateButton
      y: 460
      text: "Activate Pandora"
      anchors.topMargin: 80
      anchors.top: activateLabel.bottom
      anchors.horizontalCenter: parent.horizontalCenter
      visible: !activationScreen.visible

      function getStationList() {
        return Global.stationList;
      }

      function launchInReadOnly() {
        Global.status = Pandora.PandoraStatus.LOGGEDIN;
        Global.isAssociated = true;
        Pandora.storeSetting('isAssociated', true);
        Pandora.uiShowPandora();
      }

      function handle_deviceLink(result) {
        if (result.isOk) {
          Global.status = Pandora.PandoraStatus.LOGGEDIN;
          Global.isAssociated = true;
          Pandora.storeSetting('isAssociated', true);
          Pandora.uiShowPandora();
        } else if (result.code === 1000)
          Pandora.uiOkDialog(result.description, launchInReadOnly);
        else
          Pandora.uiOkDialog(result.description, Pandora.uiShowActivatePandora);
      }

      function handle_userLogin(result) {
        Pandora.uiHideWait();
        if (result.isOk && Global.userAuthToken)
          Pandora.associateDevice(handle_deviceLink)
        else
          Pandora.uiOkDialog(result.description, Pandora.uiShowActivatePandora());
      }

      function handle_linkRequest() {
        if (!boxeeAPI.hasInternetConnection()) {
          activatePandora.visible = true;
          forceFocus(activateButton);
          Pandora.uiOkDialog(Pandora.getErrorReponse(9000), cancel_listRequest);
          return;
        }

        Pandora.uiShowWait();
        Pandora.userLogin(handle_userLogin);
      }

      function cancel_listRequest() {
        activatePandora.visible = true;
        forceFocus(activateButton);
      }

      function displayActivationMessage(result) {
        if (result.isOk) {
          activatePandora.visible = false;
          Pandora.printf('successfully received device link token (%s, %s)', result.response.activationCode, result.response.activationUrl);
          var message = "Activate your device at %s by entering the code shown below. Once you've activated Pandora, hit the DONE button to use the app.\n\n%s";
          message = Pandora.sprintf(message, result.response.activationUrl, result.response.activationCode);
          Pandora.uiConfirmDialog('Pandora', message, handle_linkRequest, cancel_listRequest, 'Back', 'Done');
        } else
          Pandora.uiOkDialog(result.description, cancel_listRequest);
      }

      Keys.onReturnPressed: {
        if (!boxeeAPI.hasInternetConnection()) {
          activatePandora.visible = true;
          forceFocus(activateButton);
          Pandora.uiOkDialog(Pandora.getErrorReponse(9000), cancel_listRequest);
        } else
          Pandora.getAuthToken(displayActivationMessage);
      }
    }

    Column {
      id: activationScreen
      x: 60
      y: 340
      spacing: 60
      visible: false
      width: parent.width

      Label {
        id: activationScreenLabel
        width: parent.width - 120
        color: "white"
        font.bold: true
        font.pixelSize: 44
        wrapMode: Text.WordWrap
        horizontalAlignment: Text.AlignHCenter
        text: ""
      }

      Label {
        id: activationScreenCode
        color: "#FF9900"
        font.bold: true
        font.pixelSize: 72
        width: parent.width - 120
        horizontalAlignment: Text.AlignHCenter
        text: ""
      }
    }
  }

  Timer {
    id: positionUpdate
    interval: 1000
    repeat: true

    onTriggered: {
      if (mediaOpen) {
        positionLabel.text = boxeeAPI.msToHMSorMS(boxeeAPI.mediaPlayer().position());
        var p = (boxeeAPI.mediaPlayer().position() * 100) / boxeeAPI.mediaPlayer().duration();
        progressBar.percentage = p
      }
    }
  }

  onMediaOpenChanged: {
    printWindowProperties();
    if (mediaOpen) {
      durationLabel.text = boxeeAPI.msToHMSorMS(boxeeAPI.mediaPlayer().duration());
      positionLabel.text = "00:00"
      progressBar.percentage = 0
      positionUpdate.start();
    } else {
      durationLabel.text = ""
      positionLabel.text = ""
      progressBar.percentage = 0
      positionUpdate.stop();
    }
  }
}
