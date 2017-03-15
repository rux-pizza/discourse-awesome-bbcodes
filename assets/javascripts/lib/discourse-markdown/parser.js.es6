import { TreeType, Tree } from './tree';
import { TokenType } from './tokenizer';

class Parser {
  constructor(bbTags) {
    this.bbTags = bbTags;
  }
  parse(tokens) {
    const subTreeStack = [[null, []]];
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
          subTrees.push(new Tree(TreeType.Text, currentToken.content));
          break;
        case TokenType.NewLine:
          // add a LineBreak leaf, this will be useful later for splitting inline tags into multiple line spanning tags
          subTrees.push(new Tree(TreeType.LineBreak, currentToken.content));
          break;
        case TokenType.StartTag:
          bbTag = this.bbTags[currentToken.tagName];
          if (typeof(bbTag) === "undefined") {
            subTrees.push(new Tree(TreeType.Text, currentToken.content));
          } else {
            subTreeStack.push([currentToken, []]);
          }
          break;
        case TokenType.EndTag:
          bbTag = this.bbTags[currentToken.tagName];
          if (typeof(bbTag) === "undefined") {
            subTrees.push(new Tree(TreeType.Text, currentToken.content));
          } else {
            if (openingToken !== null) {
              if (openingToken.tagName === currentToken.tagName) {
                subTreeStack.pop();
                parentEle = subTreeStack[subTreeStack.length - 1];
                parentSubTrees = parentEle[1];
                parentSubTrees.push(new Tree(TreeType.Tag, currentToken.tagName, openingToken.tagAttributes, subTrees, currentToken.id, openingToken, currentToken));
              } else {
                // closing-tag with non-matching opening tag. output it as raw text.
                subTrees.push(new Tree(TreeType.Text, currentToken.content))
              }
            } else {
              // closing-tag with missing start-tag, output it as raw text
              subTrees.push(new Tree(TreeType.Text, currentToken.content))
            }
          }
          break;
      }
    }

    let result = null;

    while (subTreeStack.length > 0) {
      ele = subTreeStack.pop();
      openingToken = ele[0];
      if (openingToken !== null) {
        subTrees = ele[1];
        parentEle = subTreeStack.pop();
        parentSubTrees = parentEle[1];
        parentSubTrees.push(new Tree(TreeType.Text, openingToken.index, openingToken.length, openingToken.raw));
        parentSubTrees = parentSubTrees.concat(subTrees);
        subTreeStack.push([parentEle[0], parentSubTrees])
      } else {
        result = ele[1];
      }
    }
    return new Tree(TreeType.Root, "", {}, result);
  }
}

export default Parser;
