/**
  Apply our spoilers when the app boots
**/
import { withPluginApi } from 'discourse/lib/plugin-api';
import ComposerController from 'discourse/controllers/composer';
import spoilContent from 'discourse/plugins/discourse-awesome-bbcodes/jquery/spoiler';

function initializeSpoiler(api) {
  const siteSettings = api.container.lookup('site-settings:main');
  if (!siteSettings.awesome_bbcodes_spoiler_enabled) { return; }

  api.decorateCooked(function($elem) {
    // text
    //not(:has(img))
    spoilContent.call($('.spoiler', $elem).removeClass('spoiler').addClass('spoiled'), $elem)
  });

  api.addToolbarPopupMenuOptionsCallback(() => {
    return {
      action: 'insertSpoiler',
      icon: 'magic',
      label: 'spoiler.title'
    };
  });

  ComposerController.reopen({
    actions: {
      insertSpoiler() {
        this.get("toolbarEvent").applySurround("[spoiler]", "[/spoiler]", "spoiler_text");
      }
    }
  });
}

export default {
  name: "awesome-bbcodes-apply-spoilers",
  initialize: function(container) {
    withPluginApi('0.5', initializeSpoiler);
  }
};
