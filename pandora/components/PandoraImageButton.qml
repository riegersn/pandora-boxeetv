// PandoraImageButton
// Label that emulates a button
import QtQuick 1.1
import boxee.components 1.0
import "../js/pandora.js"
as PD

FocusScope {
  id: button
  property string imageBase: ""
  property string imageBaseAlt: ""
  property bool disabled: false
  property bool isToggle: false
  property bool alternateOn: false

  signal enter()
  signal altEnter()
  signal disabledSelect()

  onFocusChanged: {
    if (disabled)
      disabledSelect();
  }

  Keys.onReturnPressed: {
    if (isToggle && alternateOn) {
      //alternateOn = false;
      altEnter();
    }
    else {
      //if (isToggle) alternateOn = true;
      enter();
    }
  }

  Item {
    Image {
      visible: (!button.activeFocus && !disabled)
      source: (!alternateOn) ? "../media/" + imageBase + ".png" : "../media/" + imageBaseAlt + ".png"
    }

    Image {
      visible: (button.activeFocus && !disabled)
      source: (!alternateOn) ? "../media/" + imageBase + "_on.png" : "../media/" + imageBaseAlt + "_on.png"
    }

    Image {
      visible: (disabled)
      source: (!alternateOn) ? "../media/" + imageBase + "_disabled.png" : "../media/" + imageBaseAlt + "_disabled.png"
    }
  }
}
