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

  var BBCodeParseTree = function (treeType, content, attributes, subTrees) {
    this.treeType = treeType;
    this.content = content;
    this.attributes = attributes;
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
    return new BBCodeParseTree(0, str, {}, BBCodeParseTree.buildTreeFromTokens(tokens));
  };

  BBCodeParseTree.buildTreeFromTokens = function (tokens) {
    var subTreeStack = [[null,[]]];
    var length = tokens.length;
    for (var i = 0; i < length; i++) {
      var currentToken = tokens[i];
      // we build on the last element of the subtree stack
      var ele = subTreeStack[subTreeStack.length - 1];
      var openingToken = ele[0];
      var subTrees = ele[1];
      if (currentToken.tokenType == 0) {
        subTrees.push(new BBCodeParseTree(1, currentToken.content));
      }
      if (currentToken.tokenType == 1) {
        subTreeStack.push([currentToken, []]);
      }
      if (currentToken.tokenType == 2) {
        if(openingToken !== null){
          if(openingToken.content === currentToken.content){
            subTreeStack.pop();
            var parentEle = subTreeStack[subTreeStack.length - 1];
            var parentSubTrees = parentEle[1];
            parentSubTrees.push(new BBCodeParseTree(2, currentToken.content, openingToken.tagAttributes, subTrees));
          }else{
            subTrees.push(new BBCodeParseTree(1, currentToken.raw))
          }
        }else{
          subTrees.push(new BBCodeParseTree(1, currentToken.raw))
        }
      }
    }

    var result = null;

    while(subTreeStack.length > 0){
      var ele = subTreeStack.pop();
      var openingToken = ele[0];
      if(openingToken !== null){
        var subTrees = ele[1];
        var parentEle = subTreeStack.pop();
        var parentSubTrees = parentEle[1];
        parentSubTrees.push(new BBCodeParseTree(1, openingToken.raw))
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

  BBCodeParser.prototype.parseString = function (content) {
    var parseTree = BBCodeParseTree.buildTree(content, this.bbTags);
    return this.treeToHtml(parseTree.subTrees)
  };

  BBCodeParser.prototype.treeToHtml = function (subTrees) {
    var stack = [];
    var result = "";
    if(subTrees.length > 0){
      stack.push([subTrees, 0, false, []]);
    }
    while(stack.length > 0 ){
      var ele = stack.pop();
      var currentSubTrees = ele[0];
      var currentIndex = ele[1];
      var open = ele[2];
      var html = ele[3];
      var currentTree = currentSubTrees[currentIndex];
      var last = currentIndex === currentSubTrees.length - 1;
      if (currentTree.treeType == 1) {
        var textContent = currentTree.content;
        html.push(textContent)
      } else {
        if(open){
          var bbTag = this.bbTags[currentTree.content];
          html.push(bbTag.markupGenerator(bbTag, result, currentTree.attributes));
        }else{
          stack.push([currentSubTrees, currentIndex, true, html]);
          result = "";
          if(currentTree.subTrees.length > 0){
            stack.push([currentTree.subTrees, 0, false, []]);
          }
        }
      }
      if(currentTree.treeType == 1 || open ) {
        if(last){
          result = html.join('');
        }else{
          stack.push([currentSubTrees, currentIndex + 1, false, html]);
        }
      }
    }
    return result;
  };

  var bbTags = {};

  function splitLines(content, transformation){
    var result = [];
    content.split('\n').forEach(function(line){
      result.push(transformation(line));
    });
    return result.join('\n');
  }

  bbTags["color"] = new BBTag("color", false, function (tag, content,attrs) {
    return splitLines(content, function(line){
      return '<span style="color:' + attrs["color"] + '">' + line + '</span>';
    });
  });

  bbTags["nsfw"] = new BBTag("nsfw", false, function (tag, content) {
    return "<details><summary>NSFW</summary>" + content + "</details>";
  });

  bbTags["hide"] = new BBTag("hide", false, function (tag, content, attrs) {
    return "<details><summary>" + attrs["hide"] + "</summary>" + content + "</details>";
  });

  bbTags["spoiler"] = new BBTag("spoiler", false, function (tag, content) {
    return splitLines(content, function(line){
      return "<span class='spoiler'>" + line + "</span>";
    });
  });

  var parser = new BBCodeParser(bbTags);

  function replaceBBCodes(text) {
    return parser.parseString(text);
  }

  ['smartass','corporate','humanism','alpha','rainbow'].forEach(function(typeface){
    bbTags[typeface] = new BBTag(typeface, false, function (tag, content) {
      return splitLines(content, function(line) {
        return '<span class="typefaces-tag ' + typeface + '">' + line + '</span>';
      });
    });
  });

  Discourse.Dialect.addPreProcessor(replaceBBCodes);
  //color whitelist
  Discourse.Markdown.whiteListTag('span', 'style');
  //typeface whitelist
  Discourse.Markdown.whiteListTag('span', 'class', '*');
})();
