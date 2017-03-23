// TedButton.qml
import QtQuick 1.1
import boxee.components 1.0

FocusScope {
  id: search

  Image {
    id: background
    width: root.width
    height: root.height
    source: "../media/pandora_background.png"
  }

  Image {
    id: logo
    x: 60
    y: 120
    width: 364
    height: 64
    source: "../media/pandora_logo.png"
  }

}
