// PandoraProgressBar
import QtQuick 1.1

Item {
  id: progress

  height: 5
  width: 420

  property alias radius: base.radius
  property alias color: base.color
  property alias fillcolor: fill.color
  property int percentage: 0

  Rectangle {
    id: base
    color: "white"
    anchors.fill: parent
  }

  Rectangle {
    id: fill
    height: parent.height
    color: "#FF9900"
    width: Math.round((percentage / 100) * base.width)
  }
}
