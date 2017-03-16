import { TreeType, Tree } from './tree';
import { TokenType } from './tokenizer';

class ParserState {
  constructor(openingToken, children){
    this.openingToken = openingToken;
    this.children = children;
  }
}

class Parser {
  constructor(allowedTagNames) {
    this.allowedTagNames = allowedTagNames;
  }
  parse(tokens, lenient) {
    const statesStack = [new ParserState(null, [])];
    const length = tokens.length;
    let state, parentState, tag = null;
    for (let i = 0; i < length; i++) {
      const currentToken = tokens[i];
      // we build on the last element of the states stack
      state = statesStack[statesStack.length - 1];
      switch (currentToken.tokenType) {
        case TokenType.Text:
          state.children.push(new Tree(TreeType.Text, currentToken.content));
          break;
        case TokenType.NewLine:
          // add a LineBreak leaf, this will be useful later for splitting inline tags into multiple line spanning tags
          state.children.push(new Tree(TreeType.LineBreak, currentToken.content));
          break;
        case TokenType.StartTag:
          if (this.allowedTagNames != null && this.allowedTagNames[currentToken.tagName] == null) {
            state.children.push(new Tree(TreeType.Text, currentToken.content));
          } else {
            statesStack.push(new ParserState(currentToken, []));
          }
          break;
        case TokenType.EndTag:
          if (this.allowedTagNames != null && this.allowedTagNames[currentToken.tagName] == null) {
            state.children.push(new Tree(TreeType.Text, currentToken.content));
          } else {
            if (state.openingToken !== null) {
              if (lenient || state.openingToken.tagName === currentToken.tagName) {
                statesStack.pop();
                parentState = statesStack[statesStack.length - 1];
                parentState.children.push(new Tree(TreeType.Tag, currentToken.tagName, state.openingToken.tagAttributes, state.children, currentToken.id, state.openingToken, currentToken));
              } else {
                // closing-tag with non-matching opening tag. output it as raw text.
                state.children.push(new Tree(TreeType.Text, currentToken.content))
              }
            } else {
              // closing-tag with missing start-tag, output it as raw text
              state.children.push(new Tree(TreeType.Text, currentToken.content))
            }
          }
          break;
      }
    }

    let result = null;

    while (statesStack.length > 0) {
      state = statesStack.pop();
      if (state.openingToken !== null) {
        parentState = statesStack[statesStack.length - 1];
        parentState.children.push(new Tree(TreeType.Text, state.openingToken.content));
        parentState.children.push(...state.children);
      } else {
        result = state.children;
      }
    }
    return new Tree(TreeType.Root, "", {}, result);
  }
}

export default Parser;
