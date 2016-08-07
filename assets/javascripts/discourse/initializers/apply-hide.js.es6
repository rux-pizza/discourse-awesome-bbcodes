import { withPluginApi } from 'discourse/lib/plugin-api';
import hide from 'discourse/plugins/discourse-awesome-bbcodes/jquery/hide';
import ComposerController from 'discourse/controllers/composer';

function initializeHide(api) {
  const siteSettings = api.container.lookup('site-settings:main');
  if (!(siteSettings.awesome_bbcodes_hide_enabled || siteSettings.awesome_bbcodes_nsfw_enabled)) { return; }

  api.decorateCooked($elem => hide.call($("details", $elem)));

  api.addToolbarPopupMenuOptionsCallback(() => {
    return {
      action: 'insertHide',
      icon: 'caret-right',
      label: 'hide.title'
    };
  });

  ComposerController.reopen({
    actions: {
      insertHide() {
        this.get("toolbarEvent").applySurround(
          `[hide=${I18n.t("composer.hide_title")}]`,
          "[/hide]",
          "hide_text")
        ;
      }
    }
  });
}

export default {
  name: "apply-hide",

  initialize() {
    withPluginApi('0.5', initializeHide);
  }
};
