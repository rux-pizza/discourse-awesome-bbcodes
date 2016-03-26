import { decorateCooked } from "discourse/lib/plugin-api";
import applyDetails from 'discourse/plugins/discourse-awesome-bbcodes/jquery/details';

export default {
  name: "awesome-bbcodes-apply-details",

  initialize(container) {
    const siteSettings = container.lookup('site-settings:main');
    if (!(siteSettings.awesome_bbcodes_hide_enabled || siteSettings.awesome_bbcodes_nsfw_enabled)) { return; }
    decorateCooked(container, $elem => applyDetails.call($("details", $elem)));
  }

};
