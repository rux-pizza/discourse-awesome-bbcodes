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

class Tree {
  constructor(treeType, content, attributes, children, id, startTagToken, endTagToken) {
    this.treeType = treeType;
    this.content = content;
    this.attributes = attributes;
    this.id = id;
    if (typeof children === 'undefined') {
      this.children = [];
    } else {
      this.children = children;
    }
    this.startTagToken = startTagToken;
    this.endTagToken = endTagToken;
  }

  toString() {
    return TreeType[this.treeType] + " - " + this.content;
  }
}

export { TreeType, Tree };
