/**
 This is a jQuery plugin to support autocompleting values in our text fields.

 @module $.fn.autocompleteTag
 **/

export var CANCELLED_STATUS = "__CANCELLED";

var keys = {
  backSpace: 8,
  tab: 9,
  enter: 13,
  shift: 16,
  ctrl: 17,
  alt: 18,
  esc: 27,
  space: 32,
  leftWindows: 91,
  rightWindows: 92,
  pageUp: 33,
  pageDown: 34,
  end: 35,
  home: 36,
  leftArrow: 37,
  upArrow: 38,
  rightArrow: 39,
  downArrow: 40,
  insert: 45,
  deleteKey: 46,
  zero: 48,
  a: 65,
  z: 90
};


export default function(options) {
  var autocompletePlugin = this;

  if (this.length === 0) return;

  if (options === 'destroy') {

    $(this).off('keypress.autocomplete')
      .off('keydown.autocomplete')
      .off('paste.autocomplete');

    return;
  }

  if (options && options.cancel && this.data("closeAutocomplete")) {
    this.data("closeAutocomplete")();
    return this;
  }

  if (this.length !== 1) {
    alert("only supporting one matcher at the moment");
  }

  var autocompleteOptions = null;
  var selectedOption = null;
  var completeStart = null;
  var completeEnd = null;
  var me = this;
  var div = null;

  var closeAutocomplete = function() {
    if (div) {
      div.hide().remove();
    }
    div = null;
    completeStart = null;
    autocompleteOptions = null;
  };

  var completeTerm = function(term) {
    if (term) {
      var transformed;
      if (options.transformComplete) {
        transformed = options.transformComplete(term);
      }else{
        transformed = {
          text: term,
          caretPosition:  1 + term.length
        }
      }
      var text = me.val();
      text = text.substring(0, completeStart) + (options.key || "") + transformed.text + text.substring(completeEnd + 1, text.length);
      me.val(text);
      Discourse.Utilities.setCaretPosition(me[0], completeStart + transformed.caretPosition);
    }
    closeAutocomplete();
  };

  var markSelected = function() {
    var links = div.find('li a');
    links.removeClass('selected');
    return $(links[selectedOption]).addClass('selected');
  };

  var renderAutocomplete = function() {
    if (div) {
      div.hide().remove();
    }
    if (autocompleteOptions.length === 0) return;

    div = $(options.template({ options: autocompleteOptions }));

    var ul = div.find('ul');
    selectedOption = 0;
    markSelected();
    ul.find('li').click(function() {
      selectedOption = ul.find('li').index(this);
      completeTerm(autocompleteOptions[selectedOption]);
      return false;
    });
    var pos = null;
    var vOffset = 0;
    var hOffset = 0;
    pos = me.caretPosition({
      pos: completeStart,
      key: options.key
    });
    hOffset = 27;
    div.css({
      left: "-1000px"
    });

    me.parent().append(div);

    vOffset = div.height();

    var mePos = me.position();
    var borderTop = parseInt(me.css('border-top-width'), 10) || 0;
    div.css({
      position: 'absolute',
      top: (mePos.top + pos.top - vOffset + borderTop) + 'px',
      left: (mePos.left + pos.left + hOffset) + 'px'
    });
  };

  var updateAutoComplete = function(r) {

    if (completeStart === null) return;

    if (r && r.then && typeof(r.then) === "function") {
      if (div) {
        div.hide().remove();
      }
      r.then(updateAutoComplete);
      return;
    }

    // Allow an update method to cancel. This allows us to debounce
    // promises without leaking
    if (r === CANCELLED_STATUS) {
      return;
    }

    autocompleteOptions = r;
    if (!r || r.length === 0) {
      closeAutocomplete();
    } else {
      renderAutocomplete();
    }
  };

  // chain to allow multiples
  var oldClose = me.data("closeAutocomplete");
  me.data("closeAutocomplete", function() {
    if (oldClose) {
      oldClose();
    }
    closeAutocomplete();
  });

  $(this).on('paste.autocomplete', function() {
    _.delay(function(){
      me.trigger("keydown");
    }, 50);
  });

  $(this).on('keypress.autocomplete', function(e) {
    var caretPosition, term;

    // keep hunting backwards till you hit a the @ key
    if (options.key && e.which === options.key.charCodeAt(0)) {
      caretPosition = Discourse.Utilities.caretPosition(me[0]);
      var prevChar = me.val().charAt(caretPosition - 1);
      completeStart = completeEnd = caretPosition;
      updateAutoComplete(options.dataSource(""));
    } else if ((completeStart !== null) && (e.charCode !== 0)) {
      caretPosition = Discourse.Utilities.caretPosition(me[0]);
      term = me.val().substring(completeStart + (options.key ? 1 : 0), caretPosition);
      term += String.fromCharCode(e.charCode);
      updateAutoComplete(options.dataSource(term));
    }
  });

  $(this).on('keydown.autocomplete', function(e) {
    var c, caretPosition, i, initial, next, prev, prevIsGood, stopFound, term, total, userToComplete;

    if(e.ctrlKey || e.altKey || e.metaKey){
      return true;
    }

    if(options.allowAny){
      // saves us wiring up a change event as well, keypress is while its pressed

    }

    if (!options.key) {
      completeStart = 0;
    }
    if (e.which === keys.shift) return;
    if ((completeStart === null) && e.which === keys.backSpace && options.key) {
      c = Discourse.Utilities.caretPosition(me[0]);
      next = me[0].value[c];
      c -= 1;
      initial = c;
      prevIsGood = true;
      while (prevIsGood && c >= 0) {
        c -= 1;
        prev = me[0].value[c];
        stopFound = prev === options.key;
        if (stopFound) {
          prev = me[0].value[c - 1];
          completeStart = c;
          caretPosition = completeEnd = initial;
          term = me[0].value.substring(c + 1, initial);
          updateAutoComplete(options.dataSource(term));
          return true;
        }
        prevIsGood = /[a-zA-Z\.]/.test(prev);
      }
    }

    // ESC
    if (e.which === keys.esc) {
      if (div !== null) {
        closeAutocomplete();
        return false;
      }
      return true;
    }

    if (completeStart !== null) {
      caretPosition = Discourse.Utilities.caretPosition(me[0]);

      // If we've backspaced past the beginning, cancel unless no key
      if (caretPosition <= completeStart && options.key) {
        closeAutocomplete();
        return false;
      }

      // Keyboard codes! So 80's.
      switch (e.which) {
        case keys.enter:
        case keys.rightArrow:
        case keys.tab:
          if (!autocompleteOptions) return true;
          if (selectedOption >= 0 && (userToComplete = autocompleteOptions[selectedOption])) {
            completeTerm(userToComplete);
          } else {
            // We're cancelling it, really.
            return true;
          }
          e.stopImmediatePropagation();
          return false;
        case keys.upArrow:
          selectedOption = selectedOption - 1;
          if (selectedOption < 0) {
            selectedOption = 0;
          }
          markSelected();
          return false;
        case keys.downArrow:
          total = autocompleteOptions.length;
          selectedOption = selectedOption + 1;
          if (selectedOption >= total) {
            selectedOption = total - 1;
          }
          if (selectedOption < 0) {
            selectedOption = 0;
          }
          markSelected();
          return false;
        case keys.backSpace:
          completeEnd = caretPosition;
          caretPosition--;

          if (caretPosition < 0) {
            closeAutocomplete();
            return true;
          }

          term = me.val().substring(completeStart + (options.key ? 1 : 0), caretPosition);

          updateAutoComplete(options.dataSource(term));
          return true;
        default:
          completeEnd = caretPosition;
          return true;
      }
    }
  });

  return this;
}
