var isIE = /*@cc_on!@*/false || document.documentMode,
    globalIdCounter = 0;

// handle lazyYT onebox
function blurLazyYT($spoiler) {
  $("div.lazyYT", $spoiler).each(function(index) {
    $(this).replaceWith("<p>https://youtube.com/watch?v=" + $(this).data('youtube-id') + "</p>");
  });
}

var blurText = function($spoiler, radius, color) {
  var textShadow = "gray 0 0 " + radius + "px";
  if (isIE) { textShadow = radius <= 0 ? "0 0 0 0 gray" : "0 0 " + radius + "px .1px gray"; }
  $spoiler.css("background-color", "transparent");
  if (radius === 0){
    $spoiler.css("text-shadow", "");
  }else{
    $spoiler.css("text-shadow", textShadow);
  }
  if(color){
    $spoiler.css("color", "rgba(0, 0, 0, 0)");
    $(".typefaces-tag.rainbow", $spoiler).css("background-image", "none");
    $('.color-tag', $spoiler).each(function(index, ele){
      var $ele = $(ele);
      var eleColor = $ele.css('color');
      var dataColor = $ele.data('spoiler-color');
      if(eleColor){
        if(typeof(dataColor) === "undefined"){
          $ele.data('spoiler-color', eleColor);
        }
        $ele.css("color",  "rgba(0, 0, 0, 0)");
      }
    });
  }else{
    $spoiler.css("color", "");
    $(".typefaces-tag.rainbow", $spoiler).css("background-image", "");
    $('.color-tag', $spoiler).each(function(index, ele){
      var $ele = $(ele);
      var eleColor = $ele.data('spoiler-color');
      if(eleColor){
        $ele.css("color", eleColor);
      }
    });
  }
};


function blurImage($spoiler, radius) {
  // on the first pass, transform images into SVG
  $("img", $spoiler).each(function(index, image) {
    var isEmoji = $(this).hasClass('emoji');
    var transform = function() {
      var w = isEmoji ? 20 : image.width,
        h = isEmoji ? 20 : image.height,
        id = ++globalIdCounter;
      var minimum = Math.min(w,h)/3;
      var adjustedRadius = radius;
      if(radius >= minimum) {
        adjustedRadius = minimum;
      }
      var svg = "<svg data-spoiler-id='" + id + "' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='" + w + "' height='" + h + "'>" +
        "<defs><filter id='blur-" + id + "'><feGaussianBlur id='gaussian-" + id + "' stdDeviation='" + adjustedRadius + "'></feGaussianBlur></filter></defs>" +
        "<image xlink:href='" + image.src + "' filter='url(#blur-" + id + ")' style='filter: url(#blur-" + id + ")' width='" + w + "' height='" + h + "'></image>" +
        "</svg>";
      $(image).replaceWith(svg);
    };
    // do we need to wait for the image to load?
    if (image.naturalWidth === 0 || image.naturalHeight === 0) {
      image.onload = transform;
    } else {
      transform();
    }
  });

  // change the blur radius
  $("svg", $spoiler).each(function(index, svg) {
    var id = svg.getAttribute("data-spoiler-id");
    var width = parseInt(svg.getAttribute("width"));
    var height = parseInt(svg.getAttribute("height"));
    var minimum = Math.min(width,height)/3;
    var adjustedRadius = radius;
    if(radius >= minimum){
      adjustedRadius = minimum;
    }
    var element = svg.getElementById("gaussian-" + id);
    if (element) { element.setAttribute("stdDeviation", adjustedRadius); }
  });

};

var spoilLinks = function($spoiler, enable){
  if(enable){
    $('a', $spoiler).replaceWith(function(){
      var href = $(this).attr('href');
      return $("<span />", {html: $(this).html()})
        .data('spoiler-is-link', true)
        .data('spoiler-href', href);
    });
  }else{
    $('span', $spoiler).filter(function( index ) {
      return $(this).data("spoiler-is-link");
    }).replaceWith(function(){
      var href = $(this).data('spoiler-href');
      return $("<a />", {html: $(this).html()}).attr('href', href);
    });
  }
};

var applySpoilers = function($spoiler, options, $postElement) {
  var maxBlurText = options.maxBlurText,
      partialBlurText = options.partialBlurText,
      maxBlurImage = options.maxBlurImage,
      partialBlurImage = options.partialBlurImage;

  $spoiler.data("spoiler-state", "blurred").css("cursor", "pointer");
  var spoilerTagIdSelector = "[data-spoiler-tag-id='" + $spoiler.data("spoiler-tag-id") + "']";
  var $spoilerSiblings = $(spoilerTagIdSelector, $postElement);
  var $linkedSpoiler = function(spoilerState){
    if(typeof(spoilerState) === "undefined"){
      return $spoilerSiblings;
    }else{
      return $spoilerSiblings.filter(function( index ) {
        return $(this).data("spoiler-state") === spoilerState;
      });
    }
  };
  blurLazyYT($spoiler);
  blurImage($spoiler, maxBlurImage);
  blurText($spoiler, maxBlurText, true);
  spoilLinks($spoiler, true);

  $spoiler.on("mouseenter", function() {
    var $blurredSpoilers = $linkedSpoiler("blurred");
    blurImage($blurredSpoilers, partialBlurImage);
    blurText($blurredSpoilers, partialBlurText, true);
  }).on("mouseleave", function() {
    var $blurredSpoilers = $linkedSpoiler("blurred");
    blurImage($blurredSpoilers, maxBlurImage);
    blurText($blurredSpoilers, maxBlurText, true);
  }).on("click", function(e) {
    var $blurredSpoilers = $linkedSpoiler("blurred");
    var $revealedSpoilers = $linkedSpoiler("revealed");
    $blurredSpoilers.data("spoiler-state", "revealed").css("cursor", "auto");
    spoilLinks($blurredSpoilers, false);
    blurImage($blurredSpoilers, 0);
    blurText($blurredSpoilers, 0, false);
    $revealedSpoilers.data("spoiler-state","blurred").css("cursor", "pointer");
    blurImage($revealedSpoilers, partialBlurImage);
    blurText($revealedSpoilers, partialBlurText, true);
    spoilLinks($revealedSpoilers, true);
  });

};

export default function($postElement) {
  var options = { maxBlurText: 10, partialBlurText: 5, maxBlurImage: 20, partialBlurImage: 6 };

  return this.each(function() {
    applySpoilers($(this), options, $postElement);
  });
};
