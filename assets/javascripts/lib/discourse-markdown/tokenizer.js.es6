const ATTRIBUTE_NAME_CHARACTERS = "[a-zA-Z0-9.-_:;]";
const ATTRIBUTE_VALUE_CHARACTERS = '[^"]';
const ATTRIBUTE_PATTERN = new RegExp("(" + ATTRIBUTE_NAME_CHARACTERS + '+)?="(' + ATTRIBUTE_VALUE_CHARACTERS + '*)"', "g");
const QUOTED_ATTRIBUTE_PATTERN_INNER = '(?:="' + ATTRIBUTE_VALUE_CHARACTERS + '*")?(?: ' + ATTRIBUTE_NAME_CHARACTERS + '+="' + ATTRIBUTE_VALUE_CHARACTERS + '*")*';
const QUOTED_ATTRIBUTE_PATTERN = new RegExp('^' + QUOTED_ATTRIBUTE_PATTERN_INNER + '$');
const TAG_PATTERN = new RegExp('\\[(/\\w*)\\]|\\[(\\w+)(|'+ QUOTED_ATTRIBUTE_PATTERN_INNER +'|=([^\\]]*))\\]|\\n', "g");

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

let tokenIdCounter = 0;

class Token {
  constructor (tokenType, index, length, content, tagName, tagAttributes) {
    tokenIdCounter ++;
    this.id = tokenIdCounter;
    this.tokenType = tokenType;
    this.index = index;
    this.length = length;
    this.content = content;
    this.tagName = tagName;
    this.tagAttributes = tagAttributes;
  }
  toString() {
    return this.content + " (" + TokenType[this.tokenType] + ")";
  }
  equals () {
    return this.tokenType == token.tokenType && this.content == token.content;
  }
}

class Tokenizer {
  constructor() {
  }
  static textToken(startIndex, endIndex, content) {
    return new Token(TokenType.Text, startIndex, endIndex, content);
  }
  static tagToken(startIndex, endIndex, match) {
    if (match[0] === '\n'){
      return new Token(TokenType.NewLine, startIndex, endIndex, match[0]);
    }else if (typeof match[1] === 'undefined') {
      let tagName = match[2];
      const attributes = [];
      const attrStr = match[3];
      let attrMatch;
      if(QUOTED_ATTRIBUTE_PATTERN.test(attrStr)) {
        attributes[tagName] = "";
        while (attrMatch = ATTRIBUTE_PATTERN.exec(attrStr)) {
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
      return new Token(TokenType.StartTag, startIndex, endIndex, match[0], tagName, attributes);
    } else {
      let tagName = match[1].substr(1, match[1].length - 1);
      return new Token(TokenType.EndTag, startIndex, endIndex, "[" + match[1] + "]", tagName)
    }
  }
  tokenize(str) {
    const tokens = [];
    let match;
    let previousIndex = 0;
    while (match = TAG_PATTERN.exec(str)) {
      let tokenLength = match.index - previousIndex;
      if (tokenLength > 0) {
        tokens.push(Tokenizer.textToken(previousIndex, match.index, str.substr(previousIndex, tokenLength)))
      }
      tokens.push(Tokenizer.tagToken(match.index, TAG_PATTERN.lastIndex, match));
      previousIndex = TAG_PATTERN.lastIndex
    }
    let lastTokenLength = str.length - previousIndex;
    if (lastTokenLength > 0) {
      tokens.push(Tokenizer.textToken(previousIndex, str.length, str.substr(previousIndex, lastTokenLength)))
    }
    return tokens;
  }
}

export {TokenType, Token, Tokenizer};
