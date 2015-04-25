import ComposerView from 'discourse/views/composer'

import AutocompleteTag from 'discourse/plugins/discourse-awesome-bbcodes/jquery/autocomplete-tag';

const bbCodeList = ["alpha", "color=", "corporate", "humanism", "hide=", "nsfw", "rainbow", "smartass", "spoiler"];

const searchBBCodes = function(term, options) {
  var maxResults = (options && options["maxResults"]) || -1;
  if (maxResults === 0) { return []; }

  var toSearch = bbCodeList;

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

export default ComposerView.reopen({
  initEditor(){
    this._super();
    $.fn.autocompleteTag = AutocompleteTag;
    const template = this.container.lookup('template:javascripts/discourse-awesome-bbcodes/templates/bbcode-autocomplete.raw');
    console.log(template);
    $('#wmd-input').autocompleteTag({
      template: template,
      key: "[",
      transformComplete(v) {
        if(v.code.indexOf('=', v.code.length - 1) !== -1){
          return {
            text: v.code + "]" + "[/" + v.code.substring(0, v.code.length - 1) + "]",
            caretPosition: v.code.length + 1
          }
        }else{
          return {
            text: v.code + "]" + "[/" + v.code + "]",
            caretPosition: v.code.length + 2
          }
        }
      },
      dataSource(term){
        return new Ember.RSVP.Promise(function(resolve) {
          term = term.toLowerCase();

          const options = searchBBCodes(term, {maxResults: 10});

          return resolve(options);
        }).then(function(list) {
            return list.map(function(i) {
              return {code: i};
            });
          });
      }
    });
  }
});
