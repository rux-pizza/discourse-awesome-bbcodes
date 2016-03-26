/**
  Apply our spoilers when the app boots
**/
import { decorateCooked } from 'discourse/lib/plugin-api';
import spoilContent from 'discourse/plugins/discourse-awesome-bbcodes/jquery/spoiler';

export default {
  name: "awesome-bbcodes-apply-spoilers",
  initialize: function(container) {
    const siteSettings = container.lookup('site-settings:main');
    if (!siteSettings.awesome_bbcodes_spoiler_enabled) { return; }
    decorateCooked(container, function($elem) {
      // text
      //not(:has(img))
      spoilContent.call($('.spoiler', $elem).removeClass('spoiler').addClass('spoiled'), $elem)
    });
  }
};
