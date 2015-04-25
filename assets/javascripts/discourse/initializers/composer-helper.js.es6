import ComposerController from 'discourse/plugins/discourse-awesome-bbcodes/discourse/controllers/bbcode-composer';
import ComposerView from 'discourse/plugins/discourse-awesome-bbcodes/discourse/views/bbcode-composer';
import AutocompleteTag from 'discourse/plugins/discourse-awesome-bbcodes/jquery/autocomplete-tag';

export default
{
  name: 'composer-awesome-bbcodes-helper',
  initialize()
  {
    $.fn.autocompleteTag = AutocompleteTag;

  }
};
