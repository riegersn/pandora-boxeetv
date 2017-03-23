// PandoraToolTip
import QtQuick 1.1
import boxee.components 1.0

Item {
  id: tooltip

  property PandoraLabelButton anchor: null
  property int delay: 1000
  property int duration: 500
  property alias text: label.text

  width: 620
  height: 116

  anchors.bottom: anchor.top
  anchors.right: anchor.left
  anchors.bottomMargin: -10
  anchors.rightMargin: -142
  visible: anchor.activeFocus
  opacity: 0

  onVisibleChanged: {
    tooltip.opacity = 0;
    if (tooltip.visible)
      animation.start()
  }

  SequentialAnimation on opacity {
    id: animation
    PauseAnimation {
      duration: delay
    }
    NumberAnimation {
      from: 0;to: 1;duration: duration
    }
  }

  Image {
    id: tooltipimage
    anchors.fill: parent
    source: "../media/pandora_tooltip.png"
  }

  Label {
    id: label
    color: "black"
    font.bold: true
    font.pixelSize: 29
    anchors.top: tooltipimage.top
    anchors.topMargin: 32
    anchors.horizontalCenter: parent.horizontalCenter
  }
}
