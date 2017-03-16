import { TreeType } from './tree';

function replaceBetween(content, start, end, what) {
  return content.substring(0, start) + what + content.substring(end);
}

export default function (root, changeIndex, changeTagTo, addAttributes) {
  const stack = [];
  let result = [];
  if(root.children.length > 0){
    stack.push(...root.children);
  }
  let hasChanged = false;
  while(stack.length > 0 ){
    const tree = stack.pop();
    if(tree.treeType != null){
      switch(tree.treeType){
        case TreeType.Tag:
          let change = (changeIndex >= tree.startTagToken.startIndex && changeIndex < tree.startTagToken.endIndex) || (changeIndex >= tree.endTagToken.startIndex && changeIndex < tree.endTagToken.endIndex);
          if(change){
            hasChanged = true;
            result.push(replaceBetween(tree.endTagToken.content, 2, 2 + tree.endTagToken.tagName.length, changeTagTo));
            if(addAttributes && tree.startTagToken.content.substr(1 + tree.startTagToken.tagName.length, 1) !== "="){
              stack.push(replaceBetween(tree.startTagToken.content, 1, 1 + tree.startTagToken.tagName.length, changeTagTo + "="));
            }else{
              stack.push(replaceBetween(tree.startTagToken.content, 1, 1 + tree.startTagToken.tagName.length, changeTagTo));
            }
          }else{
            result.push(tree.endTagToken.content);
            stack.push(tree.startTagToken.content);
          }
          stack.push(...tree.children);
          break;
        default:
          result.push(tree.content);
      }
    }else{
      result.push(tree)
    }
  }
  return {
    text: result.reverse().join(''),
    hasChanged: hasChanged
  };
}
