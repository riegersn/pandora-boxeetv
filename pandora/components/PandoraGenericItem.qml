import QtQuick 1.1
import boxee.components 1.0

Item {
  id: wrapper
  height: 63
  width: 550

  property alias text: label.text
  property alias pixelSize: label.font.pixelSize
  property bool isItemPlaying: false
  property bool showRightArrow: false
  property ListView linkList: null

  Image {
    y: 3
    width: 44
    height: 30
    source: "../media/pandora_nowplaying_icon.png"
    anchors.verticalCenterOffset: 2
    anchors.verticalCenter: parent.verticalCenter
    visible: isItemPlaying
  }

  Item {
    y: 3
    x: 64
    width: parent.width - 50
    height: 60

    Rectangle {
      y: -3
      height: 2
      width: parent.width
      color: "black"
      opacity: 0.3
    }

    Rectangle {
      width: parent.width
      height: parent.height
      color: "#FF9900"
      visible: wrapper.ListView.isCurrentItem && linkList.activeFocus
    }

    Image {
      width: 18
      height: 30
      source: "../media/pandora_arrow_right.png"
      anchors.rightMargin: 15
      anchors.right: parent.right
      anchors.verticalCenter: parent.verticalCenter
      visible: showRightArrow && wrapper.ListView.isCurrentItem && linkList.activeFocus
    }

    Label {
      id: label
      font.pixelSize: 32
      width: parent.width - 50
      elide: Text.ElideRight
      verticalAlignment: Text.AlignVCenter
      horizontalAlignment: Text.AlignLeft
      anchors.leftMargin: 15
      anchors.left: parent.left
      anchors.verticalCenterOffset: 5
      anchors.verticalCenter: parent.verticalCenter
      color: (wrapper.ListView.isCurrentItem && linkList.activeFocus) ? "black" : "white"
    }
  }
}
