export default class BBTag {
  constructor(tagName, inline, markupGenerator) {
    this.tagName = tagName;
    this.inline = inline;
    this.markupGenerator = markupGenerator;
    if (markupGenerator == undefined) {
      this.markupGenerator = function (content) {
        return "<" + tagName + ">" + content + "</" + tagName + ">";
      }
    }
  }
}
