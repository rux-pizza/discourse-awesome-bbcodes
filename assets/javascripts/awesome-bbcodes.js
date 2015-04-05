(function(){

  var TokenType = {
    "Text": 0,
    "StartTag": 1,
    "EndTag": 2,
    0: "Text",
    1: "StartTag",
    2: "EndTag"
  };

  var TreeType = {
    "Root": 0,
    "Text": 1,
    "Tag": 2,
    0: "Root",
    1: "Text",
    2: "Tag"
  };

  var Token = function (tokenType, content, raw, tagAttributes) {
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

  Token.prototype.asTextToken = function () {
    return new Token(0, this.raw);
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
  var pattern = '\\[(/\\w*)\\]|\\[(\\w+)(|'+ quotedAttrPatternString +'|=([^\\]]*))\\]';
  var tagPattern = new RegExp(pattern, "g");

  var Tokenizer = function (bbTags) {
    this.bbTags = bbTags;
  };

  Tokenizer.textToken = function (content) {
    return new Token(0, content);
  };

  Tokenizer.tagToken = function (match) {
    if (typeof match[1] === 'undefined') {
      var tagName = match[2];
      var attributes = [];
      var attrStr = match[3];
      var attrMatch;
      if(quotedAttrPattern.test(attrStr)) {
        attributes[tagName] = "";
        while (attrMatch = attrPattern.exec(attrStr)) {
          console.log(attrMatch);
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
      return new Token(1, tagName, match[0], attributes);
    } else {
      var content = match[1].substr(1, match[1].length - 1);
      return new Token(2, content, "[" + match[1] + "]")
    }
  };

  // Non-nested unclosed tag forces the rest of the content to be ignored.
  // TODO: Fix the above problem
  Tokenizer.prototype.tokenizeString = function (str) {
    var tokens = this.getTokens(str);
    var newTokens = [];
    var noNesting = false;
    var noNestingTag = "";
    var noNestedTagContent = [];
    var length = tokens.length;
    for (var i = 0; i < length; i++) {
      var currentToken = tokens[i];
      var bbTag = this.bbTags[currentToken.content];
      var addTag = true;
      if (typeof bbTag === 'undefined' && !noNesting) {
        currentToken = currentToken.asTextToken();
      } else {
        if (noNesting) {
          if (currentToken.tokenType == 2 && currentToken.content == noNestingTag) {
            noNesting = false;
            newTokens.push(Tokenizer.textToken(noNestedTagContent.join('')));
          } else {
            currentToken = currentToken.asTextToken();
            noNestedTagContent.push(currentToken.content);
            addTag = false;
          }
        } else {
          if (bbTag.noNesting && currentToken.tokenType == 1) {
            noNesting = true;
            noNestingTag = currentToken.content;
            noNestedTagContent = [];
          }
        }
      }
      if (addTag) {
        newTokens.push(currentToken);
      }
    }
    return newTokens;
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
    return tokens
  };


  var BBTag = function (tagName, noNesting, markupGenerator) {
    this.tagName = tagName;
    this.noNesting = noNesting;
    this.markupGenerator = markupGenerator;
    if (markupGenerator == undefined) {
      this.markupGenerator = function (tag, content) {
        return "<" + tag.tagName + ">" + content + "</" + tag.tagName + ">";
      }
    }
  };

  BBTag.createSimpleTag = function (tagName) {
    return new BBTag(tagName, false);
  };

  BBTag.createTag = function (tagName, markupGenerator) {
    return new BBTag(tagName, false, markupGenerator);
  };

  var BBCodeParseTree = function (treeType, content, attributes, closed) {
    this.treeType = treeType;
    this.content = content;
    this.attributes = attributes;
    this.subTrees = [];
    if (typeof closed === 'undefined') {
      this.closed = true;
    } else {
      this.closed = closed;
    }
  };

  BBCodeParseTree.prototype.toString = function () {
    return TreeType[this.treeType] + " - " + this.content;
  };

  BBCodeParseTree.buildTree = function (str, bbTags) {
    var tokenizer = new Tokenizer(bbTags);
    var tokens = tokenizer.tokenizeString(str);
    return new BBCodeParseTree(0, str).buildTreeFromTokens(tokens.reverse());
  };

  // TODO: remove recursion
  BBCodeParseTree.prototype.buildTreeFromTokens = function (tokens, currentTag) {
    if (typeof currentTag === "undefined") {
      currentTag = ""
    }
    if (tokens.length == 0) {
      return this
    }
    var currentToken = tokens.pop();
    if (currentToken.tokenType == 0) {
      this.subTrees.push(new BBCodeParseTree(1, currentToken.content))
    }
    var tagName = currentToken.content;
    if (currentToken.tokenType == 1) {
      var childTree = new BBCodeParseTree(2, tagName, currentToken.tagAttributes, false).buildTreeFromTokens(tokens, tagName);
      if (!childTree.closed) {
        this.subTrees.push(new BBCodeParseTree(1, currentToken.asTextToken().content));
        this.subTrees = this.subTrees.concat(childTree.subTrees);
      } else {
        this.subTrees.push(childTree);
      }
    }
    if (currentToken.tokenType == 2) {
      if (tagName == currentTag) {
        this.closed = true;
        return this;
      } else {
        this.subTrees.push(new BBCodeParseTree(1, '[/' + currentToken.content + ']'));
        return this;
      }
    }
    if (tokens.length == 0) {
      if (currentTag != "") {
        return this;
      }
    }
    return this.buildTreeFromTokens(tokens, currentTag);
  };


  var BBCodeParser = function (bbTags) {
    this.bbTags = bbTags
  };

  BBCodeParser.prototype.parseString = function (content) {
    var parseTree = BBCodeParseTree.buildTree(content, this.bbTags);
    return this.treeToHtml(parseTree.subTrees)
  };

  BBCodeParser.prototype.treeToHtml = function (subTrees) {
    var self = this;
    var htmlString = [];
    // TODO optimize recursion
    subTrees.forEach(function (currentTree) {
      if (currentTree.treeType == 1) {
        var textContent = currentTree.content;
        htmlString.push(textContent)
      } else {
        var bbTag = self.bbTags[currentTree.content];
        var content = self.treeToHtml(currentTree.subTrees);
        htmlString.push(bbTag.markupGenerator(bbTag, content, currentTree.attributes));
      }
    });
    return htmlString.join('');
  };


  var bbTags = {};

  bbTags["color"] = new BBTag("color", false, function (tag, content,attrs) {
    return "<font color='" + attrs["color"] + "'>" + content + "</font>";
  });

  bbTags["nsfw"] = new BBTag("nsfw", false, function (tag, content) {
    return "<details><summary>NSFW</summary>" + content + "</details>";
  });

  bbTags["hide"] = new BBTag("hide", false, function (tag, content, attrs) {
    return "<details><summary>" + attrs["hide"] + "</summary>" + content + "</details>";
  });

  bbTags["spoiler"] = new BBTag("spoiler", false, function (tag, content) {
    return "<div class='spoiler'>" + content + "</div>";
  });

  var parser = new BBCodeParser(bbTags);

  function replaceBBCodes(text) {
    return parser.parseString(text);
  }

  ['smartass','corporate','humanism','alpha','rainbow'].forEach(function(typeface){
    bbTags[typeface] = new BBTag(typeface, false, function (tag, content) {
      return '<span class="typefaces-tag ' + typeface +'">' + content + '</span>';
    });
  });

  Discourse.Dialect.addPreProcessor(replaceBBCodes);
  //color whitelist
  Discourse.Markdown.whiteListTag('font', 'color');
  Discourse.Markdown.whiteListTag('spoiler');
  //typeface whitelist
  Discourse.Markdown.whiteListTag('span', 'class', '*');
})();
