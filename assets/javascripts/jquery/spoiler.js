(function($) {

  var isIE = /*@cc_on!@*/false || document.documentMode,
      globalIdCounter = 0;

  var blurText = function($spoiler, radius) {
    var textShadow = "gray 0 0 " + radius + "px";
    if (isIE) { textShadow = radius <= 0 ? "0 0 0 0 gray" : "0 0 " + radius + "px .1px gray"; }

    $spoiler.css("background-color", "transparent")
            .css("color", "rgba(0, 0, 0, 0)")
            .css("text-shadow", textShadow);
  };

  var blurImage = function($spoiler, radius) {
    // on the first pass, transform images into SVG
    $("img", $spoiler).wrap("<div style='display: inline-block; overflow: hidden;'></div>").each(function(index, image) {
      var transform = function() {
        var w = image.width,
            h = image.height,
            id = ++globalIdCounter;
        var svg = "<svg data-spoiler-id='" + id + "' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='" + w + "' height='" + h + "'>" +
                  "<defs><filter id='blur-" + id + "'><feGaussianBlur id='gaussian-" + id + "' stdDeviation='" + radius + "'></feGaussianBlur></filter></defs>" +
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
      svg.getElementById("gaussian-" + id).setAttribute("stdDeviation", radius);
    });
  };

  var applySpoilers = function($spoiler, options) {
    var maxBlurText = options.maxBlurText,
        partialBlurText = options.partialBlurText,
        maxBlurImage = options.maxBlurImage,
        partialBlurImage = options.partialBlurImage;

    $spoiler.data("spoiler-state", "blurred");

    blurImage($spoiler, maxBlurImage);
    blurText($spoiler, maxBlurText);

    $spoiler.on("mouseover", function() {
      $spoiler.css("cursor", "pointer");
      if ($spoiler.data("spoiler-state") === "blurred") {
        blurImage($spoiler, partialBlurImage);
        blurText($spoiler, partialBlurText);
      }
    }).on("mouseout", function() {
      if ($spoiler.data("spoiler-state") === "blurred") {
        blurImage($spoiler, maxBlurImage);
        blurText($spoiler, maxBlurText);
      }
    }).on("click", function(e) {
      if ($spoiler.data("spoiler-state") === "blurred") {
        $spoiler.data("spoiler-state", "revealed").css("cursor", "auto");
        blurImage($spoiler, 0);
        blurText($spoiler, 0);
      } else {
        $spoiler.data("spoiler-state", "blurred").css("cursor", "pointer");
        blurImage($spoiler, partialBlurImage);
        blurText($spoiler, partialBlurText);
      }
      e.preventDefault();
    });

  };

  $.fn.spoilContent = function(options) {
    var defaults = { maxBlurText: 10, partialBlurText: 5, maxBlurImage: 20, partialBlurImage: 6 },
        opts = $.extend(defaults, options || {});

/*.html(function($i, $content) {
 //return Discourse.Markdown.cook($content);
 return $content;
 }),*/
    return this.each(function() {
      applySpoilers($(this), opts, blurText);
    });
  };

})(jQuery);
