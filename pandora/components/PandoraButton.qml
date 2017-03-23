import QtQuick 1.1
import boxee.components 1.0
import "../js/pandora.js"
as PD

FocusScope {
  id: button

  width: 420
  height: 70

  property alias text: label.text

  Rectangle {
    width: parent.width
    height: parent.height
    radius: 8
    color: "#04294C"
    border.width: 4
    border.color: (button.activeFocus) ? "#FF9900" : "#FFFFFF"

    Label {
      id: label
      color: "#FFFFFF"
      font.pixelSize: 36
      anchors.verticalCenter: parent.verticalCenter
      anchors.horizontalCenter: parent.horizontalCenter
      anchors.verticalCenterOffset: 5
    }
  }
}
