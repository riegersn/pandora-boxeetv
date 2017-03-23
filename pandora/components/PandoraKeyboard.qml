// TedButton.qml
import QtQuick 1.1
import boxee.components 1.0

FocusScope {
  id: keyboard
  width: 402
  height: 469

  property Label externalLabel: null
  property string commitButtonLabel: "SEARCH"
  property alias currentIndex: keyboardGridView.currentIndex

  signal keyboardRight
  signal keyboardLeft
  signal keyboardUp
  signal keyboardDown
  signal spacePressed
  signal clearPressed
  signal deletePressed
  signal commitPressed(string labelText)
  signal externalLabelChange(string labelText, bool updateAutoComplete)
  signal keyPressed(string letter)

  Component.onCompleted: {
    keyboardListModel.clear();
    var str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    for (var i = 0; i < str.length; i++) {
      var nextChar = str.charAt(i);
      keyboardListModel.append({
        name: nextChar
      })
      console.log({
        name: nextChar
      });
    }

    keyboardGridView.currentIndex = 0;
  }

  GridView {
    id: keyboardGridView
    focus: true
    cellWidth: 67
    cellHeight: 67
    width: cellWidth * 6
    height: cellHeight * 6

    Keys.onReturnPressed: {
      if (externalLabel) {
        externalLabel.text += keyboardListModel.get(currentIndex).name;
        externalLabelChange(externalLabel.text, true);
      }

      keyPressed(keyboardListModel.get(currentIndex).name);
    }

    Keys.onUpPressed: {
      if (currentIndex < 6)
        keyboardUp()
      else
        moveCurrentIndexUp()
    }

    Keys.onRightPressed: {
      if (currentIndex % 6 === 5)
        keyboardRight()
      else
        moveCurrentIndexRight()
    }

    Keys.onLeftPressed: {
      if (currentIndex % 6 === 0)
        keyboardLeft()
      else
        moveCurrentIndexLeft()
    }

    Keys.onDownPressed: {
      if (currentIndex > 29) {
        if (currentIndex <= 32)
          forceFocus(keyboardSpace)
        else
          forceFocus(keyboardDelete)
      }
      else
        moveCurrentIndexDown()
    }

    delegate: Component {
      Rectangle {
        width: 60
        height: 60
        radius: 10
        border.width: 1
        border.color: "black"
        color: (GridView.isCurrentItem && keyboardGridView.activeFocus) ? "#FF9900" : "white"

        Label {
          text: name
          color: "black"
          font.bold: true
          font.pixelSize: 34
          anchors.verticalCenterOffset: 5
          anchors.verticalCenter: parent.verticalCenter
          anchors.horizontalCenter: parent.horizontalCenter
        }
      }
    }

    model: ListModel {
      id: keyboardListModel
    }
  }

  Row {
    height: 63
    width: keyboardGridView.width - 7
    spacing: 7
    anchors.topMargin: 5
    anchors.left: keyboardGridView.left
    anchors.top: keyboardGridView.bottom
    Keys.onDownPressed: keyboardDown();

    Rectangle {
      id: keyboardSpace
      width: 100
      height: 60
      radius: 10
      color: (keyboardSpace.activeFocus) ? "#FF9900" : "white"

      KeyNavigation.right: keyboardDelete
      Keys.onDownPressed: keyboardDown();
      Keys.onLeftPressed: keyboardLeft();
      Keys.onUpPressed: forceFocus(keyboardGridView)

      Keys.onReturnPressed: {
        if (externalLabel) {
          externalLabel.text += " "
          externalLabelChange(externalLabel.text, false);
        }

        spacePressed();
      }

      Label {
        text: "SPC"
        color: "black"
        font.bold: true
        font.pixelSize: 34
        anchors.verticalCenterOffset: 5
        anchors.verticalCenter: parent.verticalCenter
        anchors.horizontalCenter: parent.horizontalCenter
      }
    }

    Rectangle {
      id: keyboardDelete
      width: keyboardSpace.width
      height: 60
      radius: 10
      color: (keyboardDelete.activeFocus) ? "#FF9900" : "white"

      KeyNavigation.left: keyboardSpace
      KeyNavigation.right: keyboardCommit
      Keys.onDownPressed: keyboardDown();
      Keys.onUpPressed: forceFocus(keyboardGridView)

      Keys.onReturnPressed: {
        if (externalLabel) {
          externalLabel.text = externalLabel.text.slice(0, -1);
          var ok = (externalLabel.text.charAt(externalLabel.text.length - 1) === " ") ? false : true;
          externalLabelChange(externalLabel.text, ok);
        }

        deletePressed();
      }

      Label {
        text: "DEL"
        color: "black"
        font.bold: true
        font.pixelSize: 34
        anchors.verticalCenterOffset: 5
        anchors.verticalCenter: parent.verticalCenter
        anchors.horizontalCenter: parent.horizontalCenter
      }
    }

    Rectangle {
      id: keyboardCommit
      width: 181
      height: 60
      radius: 10
      color: (keyboardCommit.activeFocus) ? "#FF9900" : "white"
      KeyNavigation.left: keyboardDelete
      Keys.onRightPressed: keyboardRight();
      Keys.onDownPressed: keyboardDown();
      Keys.onUpPressed: forceFocus(keyboardGridView)
      Keys.onReturnPressed: commitPressed(externalLabel.text);

      Label {
        text: commitButtonLabel
        color: "black"
        font.bold: true
        font.pixelSize: 34
        anchors.verticalCenterOffset: 5
        anchors.verticalCenter: parent.verticalCenter
        anchors.horizontalCenter: parent.horizontalCenter
      }
    }
  }
}
