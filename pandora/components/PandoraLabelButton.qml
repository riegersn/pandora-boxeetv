// PandoraLabelButton
// Label that emulates a button
import QtQuick 1.1
import boxee.components 1.0

FocusScope {
  id: label

  width: 420
  height: 70

  property string buttonLabel: ""
  property bool labelCenter: true
  property int labelMargin: 10
  property int pixelSize: 32
  property bool bold: false
  property int verticalOffset: 3

  Rectangle {
    id: anchorLeft
    width: 2
    height: parent.height
    color: "#FF9900"
    anchors.left: parent.left
    visible: (label.activeFocus)
  }

  Rectangle {
    id: anchorRight
    width: 2
    height: parent.height
    color: "#FF9900"
    anchors.right: parent.right
    visible: (label.activeFocus)
  }

  Item {
    clip: true
    height: parent.height
    width: (parent.width - 4) - (labelMargin * 2)
    anchors.left: anchorLeft.right
    anchors.leftMargin: labelMargin

    Label {
      visible: (labelCenter)
      text: buttonLabel
      font.bold: bold
      font.pixelSize: pixelSize
      color: (label.activeFocus) ? "#FF9900" : "#FFFFFF"
      anchors.verticalCenter: parent.verticalCenter
      anchors.horizontalCenter: parent.horizontalCenter
      anchors.verticalCenterOffset: verticalOffset
    }

    Text {
      visible: !(labelCenter)
      text: buttonLabel
      font.bold: bold
      font.pixelSize: pixelSize
      color: (label.activeFocus) ? "#FF9900" : "#FFFFFF"
      width: parent.width
      anchors.top: parent.top
      anchors.left: parent.left
      anchors.topMargin: 2
      wrapMode: Text.Wrap
    }
  }

}
