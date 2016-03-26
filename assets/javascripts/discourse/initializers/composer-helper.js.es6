import initializeBBCodeComposer from 'discourse/plugins/discourse-awesome-bbcodes/discourse/components/bbcode-composer';
import autocompleteTag from 'discourse/plugins/discourse-awesome-bbcodes/jquery/autocomplete-tag';

export default
{
  name: 'composer-awesome-bbcodes-helper',
  initialize(container)
  {
    var bbCodeList = [];

    const siteSettings = container.lookup('site-settings:main');
    if(siteSettings.awesome_bbcodes_spoiler_enabled){
      bbCodeList.push("spoiler");
    }
    if(siteSettings.awesome_bbcodes_nsfw_enabled){
      bbCodeList.push("nsfw");
    }
    if(siteSettings.awesome_bbcodes_hide_enabled){
      bbCodeList.push("hide=");
    }
    if(siteSettings.awesome_bbcodes_color_enabled){
      bbCodeList.push("color=");
    }
    bbCodeList = bbCodeList.concat(siteSettings.awesome_bbcodes_typefaces_list.split("|")).sort();

    if(bbCodeList.length > 0){
      initializeBBCodeComposer(bbCodeList, autocompleteTag);
    }

  }
};
