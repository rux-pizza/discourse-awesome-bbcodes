import { registerOption } from 'pretty-text/pretty-text';

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

const TokenType = {
  "Text": 0,
  "StartTag": 1,
  "EndTag": 2,
  "NewLine": 3,
  0: "Text",
  1: "StartTag",
  2: "EndTag",
  3: "NewLine"
};

const TreeType = {
  "Root": 0,
  "Text": 1,
  "Tag": 2,
  "LineBreak": 3,
  0: "Root",
  1: "Text",
  2: "Tag",
  3: "LineBreak"
};

let tokenIdCounter = 0;

const Token = function (tokenType, content, raw, tagAttributes) {
  tokenIdCounter ++;
  this.id = tokenIdCounter;
  this.tokenType = tokenType;
  this.content = content;
  this.tagAttributes = tagAttributes;
  if (typeof raw === 'undefined') {
    this.raw = content;
  } else {
    this.raw = raw;
  }
};

Token.prototype.toString = function () {
  return this.content + " (" + TokenType[this.tokenType] + ")";
};

Token.prototype.equals = function () {
  return this.tokenType == token.tokenType && this.content == token.content;
};

const attrNameChars = "[a-zA-Z0-9.-_:;]";
const attrValueChars = '[^"]';
const attrPattern = new RegExp("(" + attrNameChars + '+)?="(' + attrValueChars + '*)"', "g");
const quotedAttrPatternString = '(?:="' + attrValueChars + '*")?(?: ' + attrNameChars + '+="' + attrValueChars + '*")*';
const quotedAttrPattern = new RegExp('^' + quotedAttrPatternString + '$');
const pattern = '\\[(/\\w*)\\]|\\[(\\w+)(|'+ quotedAttrPatternString +'|=([^\\]]*))\\]|\\n';
const tagPattern = new RegExp(pattern, "g");

const Tokenizer = function (bbTags) {
  this.bbTags = bbTags;
};

Tokenizer.textToken = function (content) {
  return new Token(0, content);
};

Tokenizer.tagToken = function (match) {
  if (match[0] === '\n'){
    return new Token(TokenType.NewLine, match[0]);
  }else if (typeof match[1] === 'undefined') {
    const tagName = match[2];
    const attributes = [];
    const attrStr = match[3];
    let attrMatch;
    if(quotedAttrPattern.test(attrStr)) {
      attributes[tagName] = "";
      while (attrMatch = attrPattern.exec(attrStr)) {
        var name = (typeof attrMatch[1] === 'undefined') ? tagName : attrMatch[1];
        if (typeof attrMatch[2] === 'undefined') {
          attributes[name] = attrMatch[3];
        } else {
          attributes[name] = attrMatch[2];
        }
      }
    }else{
      if(typeof match[4] === 'undefined'){
        attributes[tagName] = '';
      }else{
        attributes[tagName] = match[4];
      }
    }
    return new Token(TokenType.StartTag, tagName, match[0], attributes);
  } else {
    const content = match[1].substr(1, match[1].length - 1);
    return new Token(TokenType.EndTag, content, "[" + match[1] + "]")
  }
};

Tokenizer.prototype.tokenizeString = function (str) {
  const tokens = this.getTokens(str);
  return tokens;
};

Tokenizer.prototype.getTokens = function (str) {
  const tokens = [];
  let match;
  let lastIndex = 0;
  while (match = tagPattern.exec(str)) {
    const delta = match.index - lastIndex;
    if (delta > 0) {
      tokens.push(Tokenizer.textToken(str.substr(lastIndex, delta)))
    }
    tokens.push(Tokenizer.tagToken(match));
    lastIndex = tagPattern.lastIndex
  }
  const delta2 = str.length - lastIndex;
  if (delta2 > 0) {
    tokens.push(Tokenizer.textToken(str.substr(lastIndex, delta2)))
  }
  return tokens;
};


const BBTag = function (tagName, inline, markupGenerator) {
  this.tagName = tagName;
  this.inline = inline;
  this.markupGenerator = markupGenerator;
  if (markupGenerator == undefined) {
    this.markupGenerator = function (content) {
      return "<" + tagName + ">" + content + "</" + tagName + ">";
    }
  }
};

BBTag.createSimpleTag = function (tagName) {
  return new BBTag(tagName, false);
};

BBTag.createTag = function (tagName, markupGenerator) {
  return new BBTag(tagName, false, markupGenerator);
};

const BBCodeParseTree = function (treeType, content, attributes, subTrees, id) {
  this.treeType = treeType;
  this.content = content;
  this.attributes = attributes;
  this.id = id;
  if (typeof subTrees === 'undefined') {
    this.subTrees = [];
  } else {
    this.subTrees = subTrees;
  }
};

BBCodeParseTree.prototype.toString = function () {
  return TreeType[this.treeType] + " - " + this.content;
};

BBCodeParseTree.buildTree = function (str, bbTags) {
  const tokenizer = new Tokenizer(bbTags);
  const tokens = tokenizer.tokenizeString(str);
  return new BBCodeParseTree(0, str, {}, BBCodeParseTree.buildTreeFromTokens(tokens, bbTags));
};

BBCodeParseTree.buildTreeFromTokens = function (tokens, bbTags) {
  const subTreeStack = [[null,[]]];
  const length = tokens.length;
  let ele, openingToken, subTrees, parentEle, parentSubTrees, bbTag = null;
  for (let i = 0; i < length; i++) {
    const currentToken = tokens[i];
    // we build on the last element of the subtree stack
    ele = subTreeStack[subTreeStack.length - 1];
    openingToken = ele[0];
    subTrees = ele[1];
    switch (currentToken.tokenType) {
      case TokenType.Text:
        subTrees.push(new BBCodeParseTree(TreeType.Text, currentToken.content));
        break;
      case TokenType.NewLine:
        // add a LineBreak leaf, this will be useful later for splitting inline tags into multiple line spanning tags
        subTrees.push(new BBCodeParseTree(TreeType.LineBreak, currentToken.content));
        break;
      case TokenType.StartTag:
        bbTag = bbTags[currentToken.content];
        if(typeof(bbTag) === "undefined"){
          subTrees.push(new BBCodeParseTree(TreeType.Text, currentToken.raw));
        }else{
          subTreeStack.push([currentToken, []]);
        }
        break;
      case TokenType.EndTag:
        bbTag = bbTags[currentToken.content];
        if(typeof(bbTag) === "undefined") {
          subTrees.push(new BBCodeParseTree(TreeType.Text, currentToken.raw));
        }else{
          if(openingToken !== null){
            if(openingToken.content === currentToken.content){
              subTreeStack.pop();
              parentEle = subTreeStack[subTreeStack.length - 1];
              parentSubTrees = parentEle[1];
              parentSubTrees.push(new BBCodeParseTree(TreeType.Tag, currentToken.content, openingToken.tagAttributes, subTrees, currentToken.id));
            }else{
              // closing-tag with non-matching opening tag. output it as raw text.
              subTrees.push(new BBCodeParseTree(TreeType.Text, currentToken.raw))
            }
          }else{
            // closing-tag with missing start-tag, output it as raw text
            subTrees.push(new BBCodeParseTree(TreeType.Text, currentToken.raw))
          }
        }
        break;
    }
  }

  let result = null;

  while(subTreeStack.length > 0){
    ele = subTreeStack.pop();
    openingToken = ele[0];
    if(openingToken !== null){
      subTrees = ele[1];
      parentEle = subTreeStack.pop();
      parentSubTrees = parentEle[1];
      parentSubTrees.push(new BBCodeParseTree(1, openingToken.raw));
      parentSubTrees = parentSubTrees.concat(subTrees);
      subTreeStack.push([parentEle[0], parentSubTrees])
    }else{
      result = ele[1];
    }
  }
  return result;
};

const BBCodeParser = function (bbTags) {
  this.bbTags = bbTags
};

// check if string or number
const isStringy = function(arg) {
  return typeof arg === 'string' || typeof arg === 'number';
};

// check if array
const isArray = Array.isArray || function(arg) {
    return toString.call(arg) === '[object Array]';
  };

const jsonMLToHtml = function(root) {
  const html = [];
  const stack = root;
  while(stack.length > 0){
    const elems = stack.pop();
    if(isArray(elems)){
      const isTag = elems[0];
      let closed = false;
      if(isTag) {
        html.push(">");
        html.push(elems[0]);
        html.push("</");
        stack.push("<");
        stack.push(elems[0]);
      }else{
        closed = true;
      }
      for (let i = 1; i < elems.length; i++) {
        // check if argument is array
        if (isArray(elems[i])) {
          if(!closed){
            stack.push(">");
            closed = true;
          }
          stack.push(elems[i]);
          // check if string or number
        } else if (isStringy(elems[i])) {
          if(!closed){
            stack.push(">");
            closed = true;
          }
          stack.push(elems[i]);
        } else {
          const attributes = elems[i];
          closed = true;
          for (let aKey in attributes) {
            if(attributes.hasOwnProperty(aKey)){
              const v = attributes[aKey];
              stack.push(" ");
              stack.push(aKey);
              stack.push('="');
              stack.push(v);
              stack.push('"');
            }
          }
          stack.push(">");
        }
      }
      if(!closed){
        stack.push(">");
        closed = true;
      }
    }else{
      html.push(elems);
    }
  }
  return html.reverse().join('');
};

BBCodeParser.prototype.parseString = function (content) {
  const parseTree = BBCodeParseTree.buildTree(content, this.bbTags);
  return jsonMLToHtml(this.treeToHtml(parseTree.subTrees));
};

BBCodeParser.prototype.flushBlock = function(subTreeStack, block){
  // found a line-break,
  let j = subTreeStack.length - 1;
  let b = false;
  let result = block;
  for(; (j >= 0 && !b); j--) {
    const ele = subTreeStack[j];
    const currentTree = ele[0][ele[1]];
    const bbTag = this.bbTags[currentTree.content];
    if(bbTag.inline && !ele[4] && !ele[5]) {
      result = [bbTag.markupGenerator(result, currentTree.attributes, false, currentTree.id)];
      ele[4] = true;
    }else {
      b = true;
    }
  }
  ele[3].push.apply(ele[3], result);
};

BBCodeParser.prototype.breakLine = function(subTreeStack, disableInlineSemantics, position){
  // found a line-break,
  let j = (typeof(position) === "undefined")?subTreeStack.length - 1:position;
  let b = false;
  let found = false;
  let lastInline = null;
  for(; (j >= 0 && !b); j--) {
    const ele = subTreeStack[j];
    if (!found && ele[3].length === 0){
      ele[5] = true;
      if(ele[4]){
        lastInline = j;
      }
      ele[4] = false;
    }else{
      found = true;
    }
    if(j > 0 && ele[4] && !ele[5]){
      // inline semantic
      const parentEle = subTreeStack[j - 1];
      const parentTree = parentEle[0][parentEle[1]];
      //assert(parentTree.treeType === TreeType.Tag)
      // parentTree is an inline-tag and inline semantics are being enforced
      // push into current line of parent
      const bbTag = this.bbTags[parentTree.content];
      parentEle[3].push(
        bbTag.markupGenerator(ele[3], parentTree.attributes, true, parentTree.id)
      );
      ele[3] = [];
      if(disableInlineSemantics){
        ele[4] = false;
      }
    }else{
      b = true;
    }
  }
  if(!disableInlineSemantics && lastInline !== null){
    this.breakLine(subTreeStack, true, lastInline - 1);
  }
};

BBCodeParser.prototype.treeToHtml = function (subTrees) {
  const stack = [];
  let result = [[],[""]];
  if(subTrees.length > 0){
    // subtrees, subTree index, has current-tag been opened?, jsonML sequence, inline semantic
    stack.push([subTrees, 0, false, [""], false, false]);
  }
  while(stack.length > 0 ){
    const ele = stack[stack.length - 1];
    const currentSubTrees = ele[0];
    const currentIndex = ele[1];
    const open = ele[2];
    let jsonML = ele[3];
    const currentTree = currentSubTrees[currentIndex];
    const last = currentIndex === currentSubTrees.length - 1;
    switch(currentTree.treeType){
      case TreeType.Text:
        stack.pop();
        jsonML.push(currentTree.content);
        break;
      case TreeType.LineBreak:
        this.breakLine(stack, false);
        jsonML = ele[3];
        jsonML.push(currentTree.content);
        stack.pop();
        break;
      default:
        const bbTag = this.bbTags[currentTree.content];
        if(open){
          stack.pop();
          if(result[1]){
            if(result[0].length > 0){
              jsonML.push(bbTag.markupGenerator(result[0], currentTree.attributes, true, currentTree.id));
            }
          }else{
            const block = [bbTag.markupGenerator(result[0], currentTree.attributes, false, currentTree.id)];
            if(stack.length === 0 || (!ele[4])){
              jsonML.push.apply(jsonML,block)
            }else{
              this.flushBlock(stack, block);
            }
            jsonML = ele[3];
          }
        }else{
          stack.pop();
          if(!bbTag.inline){
            this.breakLine(stack, true);
            jsonML = ele[3];
          }
          stack.push([currentSubTrees, currentIndex, true, jsonML, ele[4], ele[5]]);
          result = [[],bbTag.inline];
          if(currentTree.subTrees.length > 0){
            stack.push([currentTree.subTrees, 0, false, [], bbTag.inline, false]);
          }
        }
        break;
    }
    if(currentTree.treeType !== TreeType.Tag || open ) {
      if(last){
        result = [jsonML, ele[4]];
      }else{
        stack.push([currentSubTrees, currentIndex + 1, false, jsonML, ele[4], ele[5]]);
      }
    }
  }
  return result[0];
};


export function replaceAwesomeBBCodes(text, options) {

  const bbTags = {};

  function defineBBCode(tag, inline, emitter){
    bbTags[tag] = new BBTag(tag, inline, emitter);
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

  function discourseBBCode(tag, inline){
    var start = "[" + tag + "]";
    var end = "[/" + tag + "]";
    defineBBCode(tag, inline, function(content){
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

  const parser = new BBCodeParser(bbTags);

  return parser.parseString(text);
}

export function setup(helper) {
  helper.whiteList(['span[style]',
    'span[class]',
    'span[data-spoiler-tag-id]',
    'div[style]',
    'div[class]',
    'div[data-spoiler-tag-id]']);

  helper.whiteList([
    'summary',
    'summary[title]',
    'details',
    'details[open]',
    'details.elided'
  ]);

  helper.addPreProcessor(text => replaceAwesomeBBCodes(text, helper.getOptions().awesomeBBCodes));
}
