import { registerOption } from 'pretty-text/pretty-text';

import BBTag from './bb-tag';
import Parser from './parser';
import {Tokenizer} from './tokenizer';
import Renderer from './html-renderer';


registerOption((siteSettings, opts) => {
  opts.features["awesome-bbcodes"] = true;
  opts.awesomeBBCodes ={
    spoilerEnabled: siteSettings.awesome_bbcodes_spoiler_enabled,
    nsfwEnabled: siteSettings.awesome_bbcodes_nsfw_enabled,
    hideEnabled: siteSettings.awesome_bbcodes_hide_enabled,
    colorEnabled: siteSettings.awesome_bbcodes_color_enabled,
    typefacesList: (siteSettings.awesome_bbcodes_typefaces_list.length === 0)?[]:siteSettings.awesome_bbcodes_typefaces_list.split("|")
  }
});

export function replaceAwesomeBBCodes(text, options) {

  const bbTags = {};

  function defineBBCode(tagName, inline, emitter){
    bbTags[tagName] = new BBTag(tagName, inline, emitter);
  }

  // The following tests whether this code is executing client-side or server-side
  const serverSide = (typeof(window.Discourse) === "undefined");

  function hideTag(title, content){
    // This is necessary since we want to keep hides open in the client preview by default.
    if(serverSide) {
      return ['details', ['summary', title], ['div'].concat(content)];
    }else{
      return ['details', {"open": ''}, ['summary', title], ['div'].concat(content)];
    }
  }

  function discourseBBCode(tagName, inline){
    var start = "[" + tagName + "]";
    var end = "[/" + tagName + "]";
    defineBBCode(tagName, inline, function(content){
      var l = ["",start].concat(content);
      l.push(end);
      return l;
    });
  }

  if(options.colorEnabled){
    defineBBCode("color", true, function (content, attrs, inline) {
      return [(inline? 'span':'div'), {
        "class": 'color-tag',
        "style": 'color:' + attrs["color"]
      }].concat(content);
    });
  }

  if(options.nsfwEnabled){
    defineBBCode("nsfw", false, function (content) {
      return hideTag("NSFW", content);
    });
  }

  if(options.hideEnabled){
    defineBBCode("hide", false, function (content, attrs) {
      return hideTag( attrs["hide"] , content);
    });
  }

  if(options.spoilerEnabled){
    defineBBCode("spoiler", true, function (content, attributes, inline, id) {
      return [(inline? 'span':'div'), {
        "class": 'spoiler',
        "data-spoiler-tag-id": id
      }].concat(content);
    });
  }

  options.typefacesList.forEach(function(typeface){
    var classTag = 'typefaces-tag ' + typeface;
    defineBBCode(typeface, true, function (content, attributes, inline) {
      return [(inline? 'span':'div'), {
        "class": classTag
      }].concat(content);
    });
  });

  // Discourse BBCodes that can be mixed with our custom BBCodes
  defineBBCode("b", true, function(content, attributes, inline){
    return [(inline? 'span':'div'), {'class': 'bbcode-b'}].concat(content);
  });
  defineBBCode("i", true, function(content, attributes, inline){
    return [(inline? 'span':'div'), {'class': 'bbcode-i'}].concat(content);
  });
  defineBBCode("u", true, function(content, attributes, inline){
    return [(inline? 'span':'div'), {'class': 'bbcode-u'}].concat(content);
  });
  defineBBCode("s", true, function(content, attributes, inline){
    return [(inline? 'span':'div'), {'class': 'bbcode-s'}].concat(content);
  });
  defineBBCode("size", true, function(content, attributes, inline){
    return [(inline? 'span':'div'), {'class': "bbcode-size-" + (parseInt(attributes["size"], 10) || 1)}].concat(content);
  });
  discourseBBCode("ul", false);
  discourseBBCode("ol", false);
  discourseBBCode("li", false);


  const tokenizer = new Tokenizer();
  const parser = new Parser(bbTags);
  const renderer = new Renderer(bbTags);

  const tokens = tokenizer.tokenize(text);
  const tree = parser.parse(tokens);
  return renderer.render(tree)
}

export function setup(helper) {
  helper.whiteList([
    'span[style]',
    'span[class]',
    'span[data-spoiler-tag-id]',
    'div[style]',
    'div[class]',
    'div[data-spoiler-tag-id]',
    'summary',
    'summary[title]',
    'details',
    'details[open]',
    'details.elided'
  ]);

  helper.addPreProcessor(text => replaceAwesomeBBCodes(text, helper.getOptions().awesomeBBCodes));
}
