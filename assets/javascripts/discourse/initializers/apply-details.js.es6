import { withPluginApi } from 'discourse/lib/plugin-api';
import applyDetails from 'discourse/plugins/discourse-awesome-bbcodes/jquery/details';

function initializePlugin(api){
  const siteSettings = api.container.lookup('site-settings:main');
  if (!(siteSettings.awesome_bbcodes_hide_enabled || siteSettings.awesome_bbcodes_nsfw_enabled)) { return; }
  api.decorateCooked($elem => applyDetails.call($("details", $elem)));
}

export default {
  name: "awesome-bbcodes-apply-details",

  initialize(container) {
    withPluginApi('0.1', api => initializePlugin(api));
  }

};
