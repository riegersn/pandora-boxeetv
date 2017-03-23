//PandoraTextBox
import QtQuick 1.1
import boxee.components 1.0

FocusScope {
  id: textbox

  width: 420
  height: 70

  property alias text: label.text
  property alias fontColor: label.color
  property alias fontSize: label.font.pixelSize
  property alias color: rectangle.color
  property alias radius: rectangle.radius

  Rectangle {
    id: rectangle
    width: parent.width
    height: parent.height
    radius: 8
    color: "#ffffff"

    Label {
      id: label
      color: "#000000"
      font.pixelSize: 36
      width: parent.width - 30;
      anchors.verticalCenter: parent.verticalCenter
      anchors.horizontalCenter: parent.horizontalCenter
      anchors.verticalCenterOffset: 5
    }
  }
}
