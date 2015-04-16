(function($) {

  var isIE = /*@cc_on!@*/false || document.documentMode,
      globalIdCounter = 0;

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
      $("span.typefaces-tag.rainbow", $spoiler).css("background-image", "none");
      $('span:not(.spoiler)', $spoiler).each(function(index, span){
        var $span = $(span);
        var spanColor = $span.css('color');
        var dataColor = $span.data('spoiler-color');
        if(spanColor){
          if(typeof(dataColor) === "undefined"){
            $span.data('spoiler-color', spanColor);
          }
          $span.css("color",  "rgba(0, 0, 0, 0)");
        }
      });
    }else{
      $spoiler.css("color", "");
      $("span.typefaces-tag.rainbow", $spoiler).css("background-image", "");
      $('span:not(.spoiler)', $spoiler).each(function(index, span){
        var $span = $(span);
        var spanColor = $span.data('spoiler-color');
        if(spanColor){
          $span.css("color", spanColor);
        }
      });
    }
  };

  var blurImage = function($spoiler, radius) {
    // on the first pass, transform images into SVG
    //
    $("img", $spoiler).each(function(index, image) {
      var transform = function() {
        var w = image.width,
            h = image.height,
            id = ++globalIdCounter;
        var minimum = Math.min(w,h)/3;
        var adjustedRadius = radius;
        if(radius >= minimum) {
          adjustedRadius = minimum;
        }
        var svg = "<svg data-spoiler-id='" + id + "' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='" + w + "' height='" + h + "'>" +
                  "<defs><filter id='blur-" + id + "'><feGaussianBlur id='gaussian-" + id + "' stdDeviation='" + adjustedRadius + "'></feGaussianBlur></filter></defs>" +
                  "<image xlink:href='" + image.src + "' filter='url(#blur-" + id + ")' width='" + w + "' height='" + h + "'></image>" +
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
      svg.getElementById("gaussian-" + id).setAttribute("stdDeviation", adjustedRadius);
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

  $.fn.spoilContent = function($postElement) {
    var options = { maxBlurText: 10, partialBlurText: 5, maxBlurImage: 20, partialBlurImage: 6 };

    return this.each(function() {
      applySpoilers($(this), options, $postElement);
    });
  };

})(jQuery);
