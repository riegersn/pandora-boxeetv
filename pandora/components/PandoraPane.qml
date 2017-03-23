import QtQuick 1.1
import boxee.components 1.0
import "../js/global.js"
as Global
import "../js/pandora.js"
as Pandora

FocusScope {
  id: pane
  y: yWhenOff
  width: 698
  height: 1080

  property int yWhenOn: 125
  property int yWhenOff: 1100
  property bool showCloseButton: true
  property string closeButtonLabel: "Close"

  signal navigateDown;
  signal navigateUp;
  signal afterOpen;
  signal afterClose;
  signal beforeOpen;
  signal beforeClose;
  signal closeButtonPressed;
  signal exit;

  property bool isOpen: false

  Keys.onDownPressed: navigateDown();
  Keys.onUpPressed: navigateUp();
  Keys.onEscapePressed: close();

  function getCloseButton() {
    return closeButton;
  }

  function toggle(focusItem) {
    if (!isOpen) open(focusItem);
    else close(focusItem);
  }

  function setCloseFocus() {
    forceFocus(closeButton)
  }

  function open(focusItem) {
    if (!isOpen) {
      beforeOpen();
      Pandora.updateActivityTimestamp();
      animationUp.start();
      afterOpen();

      if (focusItem !== undefined)
        forceFocus(focusItem);

      isOpen = true;
    }
  }

  function close(focusItem) {
    if (isOpen) {
      beforeClose();
      animationDown.start();
      afterClose();

      if (focusItem !== undefined)
        forceFocus(focusItem);

      isOpen = false;
    }
  }

  onFocusChanged: {
    if (pane.activeFocus && showCloseButton)
      forceFocus(closeButton);
  }

  NumberAnimation {
    id: animationUp
    target: pane
    properties: "y"
    from: yWhenOff
    to: yWhenOn
    duration: 250
    easing {
      type: Easing.OutBack;
    }
  }

  NumberAnimation {
    id: animationDown
    target: pane
    properties: "y"
    from: yWhenOn
    to: yWhenOff
    duration: 250
    easing {
      type: Easing.InBack;
    }
  }

  Image {
    width: parent.width - 34
    height: parent.height
    anchors.top: parent.top
    source: "../media/pandora_list_area.png"
    anchors.horizontalCenter: parent.horizontalCenter
  }

  Image {
    width: 30
    height: 18
    anchors.bottomMargin: -10
    anchors.bottom: closeButton.top
    anchors.horizontalCenter: closeButton.horizontalCenter
    source: (closeButton.activeFocus) ? "../media/pandora_arrow_down_on.png" : "../media/pandora_arrow_down.png"
    visible: isOpen
  }

  Image {
    width: 30
    height: 18
    anchors.bottomMargin: -10
    anchors.bottom: closeButton.top
    anchors.horizontalCenter: closeButton.horizontalCenter
    source: (closeButton.activeFocus) ? "../media/pandora_arrow_up_on.png" : "../media/pandora_arrow_up.png"
    visible: !isOpen
  }

  PandoraLabelButton {
    id: closeButton
    buttonLabel: closeButtonLabel
    pixelSize: 36
    verticalOffset: 7
    width: parent.width - 150
    anchors.top: parent.top
    anchors.topMargin: 38
    anchors.horizontalCenter: parent.horizontalCenter
    Keys.onReturnPressed: toggle();
    Keys.onDownPressed: navigateDown();
    Keys.onUpPressed: navigateUp();
    visible: showCloseButton
    Keys.onEscapePressed: {
      if (isOpen)
        close();
      else
        exit();
    }
  }
}
