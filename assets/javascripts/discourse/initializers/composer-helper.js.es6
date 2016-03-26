import { withPluginApi } from 'discourse/lib/plugin-api';
import initializeBBCodeComposer from 'discourse/plugins/discourse-awesome-bbcodes/discourse/components/bbcode-composer';
import autocompleteTag from 'discourse/plugins/discourse-awesome-bbcodes/jquery/autocomplete-tag';

function initializePlugin(api){
  var bbCodeList = [];

  const siteSettings = api.container.lookup('site-settings:main');
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

  const typefacesList = (siteSettings.awesome_bbcodes_typefaces_list.length === 0)?[]:siteSettings.awesome_bbcodes_typefaces_list.split("|");
  bbCodeList = bbCodeList.concat(typefacesList).sort();

  if(bbCodeList.length > 0){
    initializeBBCodeComposer(bbCodeList, autocompleteTag);
  }
}

export default
{
  name: 'composer-awesome-bbcodes-helper',
  initialize(container)
  {
    withPluginApi('0.1', api => initializePlugin(api));
  }
};
