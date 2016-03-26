import Editor from 'discourse/components/d-editor'

const searchBBCodes = function(term, toSearch, options) {
  var maxResults = (options && options["maxResults"]) || -1;
  if (maxResults === 0) { return []; }

  var i, results = [];

  var done = function() {
    return maxResults > 0 && results.length >= maxResults;
  };

  for (i=0; i < toSearch.length; i++) {
    if (toSearch[i].indexOf(term) === 0) {
      results.push(toSearch[i]);
      if(done()) { break; }
    }
  }

  if(!done()){
    for (i=0; i < toSearch.length; i++) {
      if (toSearch[i].indexOf(term) > 0) {
        results.push(toSearch[i]);
        if(done()) { break; }
      }
    }
  }

  return results;
};

export default function(bbCodeList, autocompleteTag){
  Editor.reopen({
    _applyBBCodesAutocomplete: function () {
      const container = this.get('container'),
        $editorInput = this.$('.d-editor-input');

      const template = this.container.lookup('template:javascripts/discourse-awesome-bbcodes/templates/bbcode-autocomplete.raw');
      autocompleteTag.call($editorInput, {
        template: template,
        key: "[",
        transformComplete(v) {
          if (v.code.indexOf('=', v.code.length - 1) !== -1) {
            return {
              text: v.code + "]" + "[/" + v.code.substring(0, v.code.length - 1) + "]",
              caretPosition: v.code.length + 1
            }
          } else {
            return {
              text: v.code + "]" + "[/" + v.code + "]",
              caretPosition: v.code.length + 2
            }
          }
        },
        dataSource(term) {
          return new Ember.RSVP.Promise(function (resolve) {
            term = term.toLowerCase();

            const options = searchBBCodes(term, bbCodeList, {maxResults: 10});

            return resolve(options);
          }).then(function (list) {
              return list.map(function (i) {
                return {code: i};
              });
            });
        }
      });
    }.on('didInsertElement')
  });
}
