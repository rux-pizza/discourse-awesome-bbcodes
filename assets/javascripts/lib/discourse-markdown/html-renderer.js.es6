import { TreeType } from './tree';
import { isStringy, isArray } from './utilities';

export default class Renderer {
  constructor(bbTags){
    this.bbTags = bbTags;
  }
  flushBlock(subTreeStack, block){
    // found a line-break,
    let j = subTreeStack.length - 1;
    let b = false;
    let result = block;
    let ele = null;
    for(; (j >= 0 && !b); j--) {
      ele = subTreeStack[j];
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
  }
  breakLine(subTreeStack, disableInlineSemantics, position){
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
  }

  treeToJsonML(subTrees) {
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
    return Renderer.jsonMLToHtml(this.treeToJsonML(tree.subTrees));
  }
}
