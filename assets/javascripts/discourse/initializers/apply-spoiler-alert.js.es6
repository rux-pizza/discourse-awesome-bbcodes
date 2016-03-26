/**
  Apply our spoilers when the app boots
**/
import { withPluginApi } from 'discourse/lib/plugin-api';
import spoilContent from 'discourse/plugins/discourse-awesome-bbcodes/jquery/spoiler';

function initializePlugin(api){
  const siteSettings = api.container.lookup('site-settings:main');
  if (!siteSettings.awesome_bbcodes_spoiler_enabled) { return; }
  api.decorateCooked(function($elem) {
    // text
    //not(:has(img))
    spoilContent.call($('.spoiler', $elem).removeClass('spoiler').addClass('spoiled'), $elem)
  });
}

export default {
  name: "awesome-bbcodes-apply-spoilers",
  initialize: function(container) {
    withPluginApi('0.1', api => initializePlugin(api));
  }
};
