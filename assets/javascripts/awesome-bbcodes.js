(function(){

  var TokenType = {
    "Text": 0,
    "StartTag": 1,
    "EndTag": 2,
    "NewLine": 3,
    0: "Text",
    1: "StartTag",
    2: "EndTag",
    3: "NewLine"
  };

  var TreeType = {
    "Root": 0,
    "Text": 1,
    "Tag": 2,
    "LineBreak": 3,
    0: "Root",
    1: "Text",
    2: "Tag",
    3: "LineBreak"
  };

  var tokenIdCounter = 0;

  var Token = function (tokenType, content, raw, tagAttributes) {
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

  //var attrNameChars = "[a-zA-Z0-9.-_:;]";
  //var unquotedAttrValueChars = '\\w';
  //var attrValueChars = '[^"]';
  //var attrValue = '"' + attrValueChars + '*"|' + unquotedAttrValueChars + '*';
  //var attrPattern = new RegExp("(" + attrNameChars + '+)?=(?:("' + attrValueChars + '*")|(' + unquotedAttrValueChars + '*' + '))', "g");
  //var pattern = '\\[(/\\w*)\\]|\\[(\\w+)(?:=(?:' + attrValue + '))?(?: ' + attrNameChars + '+=(?:' + attrValue + '))*\\]';
  //var tagPattern = new RegExp(pattern, "g");

  var attrNameChars = "[a-zA-Z0-9.-_:;]";
  var attrValueChars = '[^"]';
  var attrPattern = new RegExp("(" + attrNameChars + '+)?="(' + attrValueChars + '*)"', "g");
  var quotedAttrPatternString = '(?:="' + attrValueChars + '*")?(?: ' + attrNameChars + '+="' + attrValueChars + '*")*';
  var quotedAttrPattern = new RegExp('^' + quotedAttrPatternString + '$');
  var pattern = '\\[(/\\w*)\\]|\\[(\\w+)(|'+ quotedAttrPatternString +'|=([^\\]]*))\\]|\\n';
  var tagPattern = new RegExp(pattern, "g");

  var Tokenizer = function (bbTags) {
    this.bbTags = bbTags;
  };

  Tokenizer.textToken = function (content) {
    return new Token(0, content);
  };

  Tokenizer.tagToken = function (match) {
    if (match[0] === '\n'){
      return new Token(TokenType.NewLine, match[0]);
    }else if (typeof match[1] === 'undefined') {
      var tagName = match[2];
      var attributes = [];
      var attrStr = match[3];
      var attrMatch;
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
      var content = match[1].substr(1, match[1].length - 1);
      return new Token(TokenType.EndTag, content, "[" + match[1] + "]")
    }
  };

  Tokenizer.prototype.tokenizeString = function (str) {
    var tokens = this.getTokens(str);
    //var newTokens = [];
    //var length = tokens.length;
    //for (var i = 0; i < length; i++) {
    //  var currentToken = tokens[i];
    //  var bbTag = this.bbTags[currentToken.content];
    //  if (typeof bbTag === 'undefined') {
    //    currentToken = currentToken.asTextToken();
    //  }
    //  newTokens.push(currentToken);
    //}
    return tokens;
  };

  Tokenizer.prototype.getTokens = function (str) {
    var tokens = [];
    var match;
    var lastIndex = 0;
    while (match = tagPattern.exec(str)) {
      var delta = match.index - lastIndex;
      if (delta > 0) {
        tokens.push(Tokenizer.textToken(str.substr(lastIndex, delta)))
      }
      tokens.push(Tokenizer.tagToken(match));
      lastIndex = tagPattern.lastIndex
    }
    var delta2 = str.length - lastIndex;
    if (delta2 > 0) {
      tokens.push(Tokenizer.textToken(str.substr(lastIndex, delta2)))
    }
    return tokens;
  };


  var BBTag = function (tagName, inline, markupGenerator) {
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

  var BBCodeParseTree = function (treeType, content, attributes, subTrees, id) {
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
    var tokenizer = new Tokenizer(bbTags);
    var tokens = tokenizer.tokenizeString(str);
    return new BBCodeParseTree(0, str, {}, BBCodeParseTree.buildTreeFromTokens(tokens, bbTags));
  };

  BBCodeParseTree.buildTreeFromTokens = function (tokens, bbTags) {
    var subTreeStack = [[null,[]]];
    var length = tokens.length;
    var ele, openingToken, subTrees, parentEle, parentSubTrees, bbTag = null;
    for (var i = 0; i < length; i++) {
      var currentToken = tokens[i];
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

    var result = null;

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

  var BBCodeParser = function (bbTags) {
    this.bbTags = bbTags
  };

  // check if string or number
  var isStringy = function(arg) {
    return typeof arg === 'string' || typeof arg === 'number';
  };

  // check if array
  var isArray = Array.isArray || function(arg) {
    return toString.call(arg) === '[object Array]';
  };

  var jsonMLToHtml = function(root) {
    var html = [];
    var stack = root;
    while(stack.length > 0){
      var elems = stack.pop();
      if(isArray(elems)){
        var isTag = elems[0];
        var closed = false;
        if(isTag) {
          html.push(">");
          html.push(elems[0]);
          html.push("</");
          stack.push("<");
          stack.push(elems[0]);
        }else{
          closed = true;
        }
        for (var i = 1; i < elems.length; i++) {
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
            var attributes = elems[i];
            closed = true;
            for (var aKey in attributes) {
              if(attributes.hasOwnProperty(aKey)){
                var v = attributes[aKey];
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
    var parseTree = BBCodeParseTree.buildTree(content, this.bbTags);
    return jsonMLToHtml(this.treeToHtml(parseTree.subTrees));
  };

  BBCodeParser.prototype.flushBlock = function(subTreeStack, block){
    // found a line-break,
    var j = subTreeStack.length - 1;
    var b = false;
    var result = block;
    for(; (j >= 0 && !b); j--) {
      var ele = subTreeStack[j];
      var currentTree = ele[0][ele[1]];
      var bbTag = this.bbTags[currentTree.content];
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
    var j = (typeof(position) === "undefined")?subTreeStack.length - 1:position;
    var b = false;
    var found = false;
    var lastInline = null;
    for(; (j >= 0 && !b); j--) {
      var ele = subTreeStack[j];
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
        var parentEle = subTreeStack[j - 1];
        var parentTree = parentEle[0][parentEle[1]];
        //assert(parentTree.treeType === TreeType.Tag)
        // parentTree is an inline-tag and inline semantics are being enforced
        // push into current line of parent
        var bbTag = this.bbTags[parentTree.content];
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
    var stack = [];
    var result = [[],[""]];
    if(subTrees.length > 0){
      // subtrees, subTree index, has current-tag been opened?, jsonML sequence, inline semantic
      stack.push([subTrees, 0, false, [""], false, false]);
    }
    while(stack.length > 0 ){
      var ele = stack[stack.length - 1];
      var currentSubTrees = ele[0];
      var currentIndex = ele[1];
      var open = ele[2];
      var jsonML = ele[3];
      var currentTree = currentSubTrees[currentIndex];
      var last = currentIndex === currentSubTrees.length - 1;
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
          var bbTag = this.bbTags[currentTree.content];
          if(open){
            stack.pop();
            if(result[1]){
              if(result[0].length > 0){
                jsonML.push(bbTag.markupGenerator(result[0], currentTree.attributes, true, currentTree.id));
              }
            }else{
              var block = [bbTag.markupGenerator(result[0], currentTree.attributes, false, currentTree.id)];
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

  var bbTags = {};

  var defineBBCode = function(tag, inline, emitter){
    bbTags[tag] = new BBTag(tag, inline, emitter);
  };

  var init = function(){

    const spoilerEnabled = Discourse.SiteSettings.awesome_bbcodes_spoiler_enabled;
    const nsfwEnabled = Discourse.SiteSettings.awesome_bbcodes_nsfw_enabled;
    const hideEnabled = Discourse.SiteSettings.awesome_bbcodes_hide_enabled;
    const colorEnabled = Discourse.SiteSettings.awesome_bbcodes_color_enabled;
    const typefacesList = (Discourse.SiteSettings.awesome_bbcodes_typefaces_list.length === 0)?[]:Discourse.SiteSettings.awesome_bbcodes_typefaces_list.split("|");
    // The following tests whether this code is executing client-side or server-side
    var serverSide = (typeof(window.Discourse) === "undefined");

    if(!spoilerEnabled && !nsfwEnabled && !hideEnabled && !colorEnabled && typefacesList.length === 0) { return; }

    if(colorEnabled){
      defineBBCode("color", true, function (content, attrs, inline) {
        return [(inline? 'span':'div'), {
          "class": 'color-tag',
          "style": 'color:' + attrs["color"]
        }].concat(content);
      });
    }

    var hideTag = function(title, content){
      // This is necessary since we want to keep hides open in the client preview by default.
      if(serverSide) {
        return ['details', ['summary', title], ['div'].concat(content)];
      }else{
        return ['details', {"open": ''}, ['summary', title], ['div'].concat(content)];

      }
    };


    if(nsfwEnabled){
      defineBBCode("nsfw", false, function (content) {
        return hideTag("NSFW", content);
      });
    }

    if(hideEnabled){
      defineBBCode("hide", false, function (content, attrs) {
        return hideTag( attrs["hide"] , content);
      });
    }

    if(spoilerEnabled){
      defineBBCode("spoiler", true, function (content, attributes, inline, id) {
        return [(inline? 'span':'div'), {
          "class": 'spoiler',
          "data-spoiler-tag-id": id
        }].concat(content);
      });
    }
    typefacesList.forEach(function(typeface){
      var classTag = 'typefaces-tag ' + typeface;
      defineBBCode(typeface, true, function (content, attributes, inline) {
        return [(inline? 'span':'div'), {
          "class": classTag
        }].concat(content);
      });
    });

    var discourseBBCode = function(tag, inline){
      var start = "[" + tag + "]";
      var end = "[/" + tag + "]";
      defineBBCode(tag, inline, function(content){
        var l = ["",start].concat(content);
        l.push(end);
        return l;
      });
    };

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

    var parser = new BBCodeParser(bbTags);

    function replaceBBCodes(text) {
      return parser.parseString(text);
    }

    Discourse.Dialect.addPreProcessor(replaceBBCodes);
    //color whitelist
    Discourse.Markdown.whiteListTag('span', 'style');
    //typeface whitelist
    Discourse.Markdown.whiteListTag('span', 'class', '*');
    Discourse.Markdown.whiteListTag('span', 'data-spoiler-tag-id', '*');
    Discourse.Markdown.whiteListTag('div', 'style');
    Discourse.Markdown.whiteListTag('div', 'class', '*');
    Discourse.Markdown.whiteListTag('div', 'data-spoiler-tag-id', '*');

  };

  if (Discourse.SiteSettings) {
    init();
  } else {
    Discourse.initializer({initialize: init, name: 'awesome-bbcodes-initialize-processor'});
  }
})();
