import { TreeType } from './tree';
import { isStringy, isArray } from './utilities';

class RendererState {
  // subtrees, subTree index, has current-tag been opened?, jsonML sequence, inline semantic, unknown
  constructor(children, index, isOpen, jsonML, inline, unknown){
    this.children = children;
    this.index = index;
    this.isOpen = isOpen;
    this.jsonML = jsonML;
    this.inline = inline;
    this.unknown = unknown;
  }
}

export default class Renderer {
  constructor(bbTags){
    this.tags = bbTags;
  }
  flushBlock(stack, block){
    // found a line-break,
    let j = stack.length - 1;
    let b = false;
    let result = block;
    let state = null;
    for(; (j >= 0 && !b); j--) {
      state = stack[j];
      const currentTree = state.children[state.index];
      const bbTag = this.tags[currentTree.content];
      if(bbTag.inline && !state.inline && !state.unknown) {
        result = bbTag.markupGenerator([result], currentTree.attributes, false, currentTree.id);
        state.inline = true;
      }else {
        b = true;
      }
    }
    state.jsonML.push(result);
  }
  breakLine(stack, disableInlineSemantics, position){
    // found a line-break,
    let j = (typeof(position) === "undefined")?stack.length - 1:position;
    let b = false;
    let found = false;
    let lastInline = null;
    for(; (j >= 0 && !b); j--) {
      const state = stack[j];
      if (!found && state.jsonML.length === 0){
        state.unknown = true;
        if(state.inline){
          lastInline = j;
        }
        state.inline = false;
      }else{
        found = true;
      }
      if(j > 0 && state.inline && !state.unknown){
        // inline semantic
        const parentState = stack[j - 1];
        const parentTree = parentState.children[parentState.index];
        //assert(parentTree.treeType === TreeType.Tag)
        // parentTree is an inline-tag and inline semantics are being enforced
        // push into current line of parent
        const bbTag = this.tags[parentTree.content];
        parentState.jsonML.push(
          bbTag.markupGenerator(state.jsonML, parentTree.attributes, true, parentTree.id)
        );
        state.jsonML = [];
        if(disableInlineSemantics){
          state.inline = false;
        }
      }else{
        b = true;
      }
    }
    if(!disableInlineSemantics && lastInline !== null){
      this.breakLine(stack, true, lastInline - 1);
    }
  }

  treeToJsonML(children) {
    const stack = [];
    let resultJsonML = [];
    let resultInline = true;
    if(children.length > 0){
      stack.push(new RendererState(children, 0, false, [""], false, false));
    }
    while(stack.length > 0 ){
      const state = stack[stack.length - 1];
      const currentTree = state.children[state.index];
      const last = state.index === state.children.length - 1;
      switch(currentTree.treeType){
        case TreeType.Text:
          stack.pop();
          state.jsonML.push(currentTree.content);
          break;
        case TreeType.LineBreak:
          this.breakLine(stack, false);
          state.jsonML.push(currentTree.content);
          stack.pop();
          break;
        default:
          const bbTag = this.tags[currentTree.content];
          if(state.isOpen){
            stack.pop();
            if(resultInline){
              if(resultJsonML.length > 0){
                state.jsonML.push(bbTag.markupGenerator(resultJsonML, currentTree.attributes, true, currentTree.id));
              }
            }else{
              const block = bbTag.markupGenerator(resultJsonML, currentTree.attributes, false, currentTree.id);
              if(stack.length === 0 || (!state.inline)){
                state.jsonML.push(block);
              }else{
                this.flushBlock(stack, block);
              }
            }
          }else{
            stack.pop();
            if(!bbTag.inline){
              this.breakLine(stack, true);
            }
            stack.push(new RendererState(state.children, state.index, true, state.jsonML, state.inline, state.unknown));
            resultJsonML = [];
            resultInline = bbTag.inline;
            if(currentTree.children.length > 0){
              stack.push(new RendererState(currentTree.children, 0, false, [], bbTag.inline, false));
            }
          }
          break;
      }
      if(currentTree.treeType !== TreeType.Tag || state.isOpen ) {
        if(last){
          resultJsonML = state.jsonML;
          resultInline = state.inline;
        }else{
          stack.push(new RendererState(state.children, state.index + 1, false, state.jsonML, state.inline, state.unknown));
        }
      }
    }
    return resultJsonML;
  }

  static jsonMLToHtml(root) {
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
  }

  render(tree){
    return Renderer.jsonMLToHtml(this.treeToJsonML(tree.children));
  }
}
