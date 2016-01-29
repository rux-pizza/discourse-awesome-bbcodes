import ComposerComponent from 'discourse/plugins/discourse-awesome-bbcodes/discourse/components/bbcode-composer';
import AutocompleteTag from 'discourse/plugins/discourse-awesome-bbcodes/jquery/autocomplete-tag';

export default
{
  name: 'composer-awesome-bbcodes-helper',
  initialize()
  {
    $.fn.autocompleteTag = AutocompleteTag;

  }
};
