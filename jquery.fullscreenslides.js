/*
 * Copyright Eike Send: http://eike.se/nd
 * License: MIT / GPLv2
 * 
 * This is a jQuery plugin to generate full screen galleries.
 *
 * https://github.com/eikes/jquery.fullscreen.js
 */
;
/* 
 * It assumes that your images are wrapped in links like this:
 * 
 * <a href="image-1-large.jpg" rel="gallery-1" title="woot">
 *   <img src="image-1-small"/>
 * </a>
 * <a href="image-2-large.jpg" rel="gallery-1" title="woot">
 *   <img src="image-2-small"/>
 * </a>
 * <a href="image-3-large.jpg" rel="gallery-1" title="woot">
 *   <img src="image-3-small"/>
 * </a>
 * 
 * You would then call it like this:
 * 
 * <script src="http://code.jquery.com/jquery.js"></script>
 * <script src="fullscreenslides.js"></script>
 * <script>
 *  $(function(){
 *    $("img").fullscreenslides();
 *    
 *    // You can then use the container:
 *    var $container = $('#fullscreenSlideshowContainer');
 *    
 *    // Bind to events:
 *    $container
 *      .bind("init", function() { 
 *
 *        // Do something like adding a logo and adding a UI
 *        $container
 *          .append('<div class="ui" id="fullscreen-close">&times;</div>')
 *          .append('<div class="ui" id="fullscreen-loader"></div>')
 *          .append('<div class="ui" id="fullscreen-prev">&larr;</div>')
 *          .append('<div class="ui" id="fullscreen-next">&rarr;</div>');
 *
 *        $('#fullscreen-prev').click(function(){
 *          // You can trigger events as well:
 *          $container.trigger("prevSlide");
 *        });
 *        $('#fullscreen-next').click(function(){
 *          // You can trigger events as well:
 *          $container.trigger("nextSlide");
 *        });
 *        $('#fullscreen-close').click(function(){
 *          // You can trigger events as well:
 *          $container.trigger("close");
 *        });
 *
 *      })
 *      .bind("startLoading", function() { 
 *        // show spinner
 *      })
 *      .bind("stopLoading", function() { 
 *        // hide spinner
 *      })
 *      .bind("startOfSlide", function(event, slide) { 
 *        // show Caption, notice the slide element
 *      })
 *      .bind("stopLoading", function(event, slide) { 
 *        // hide caption
 *      })
 *    
 *  });
 * </script>
 * 
 */

(function($){
  
  var $container;

  var attachEvents = function(){
    
    // deal with resizing the browser window and resize container
    $container.bind("updateSize orientationchange", function(event) {
      $container.height($(window).height());
      updateSlideSize();
    });
    
    // privat function to update the image size and position of a slide
    var updateSlideSize = function(slide) {
      if (slide === undefined) {
        var slide = $container.data("currentSlide");
      }
      if (slide && slide.$img) {
        var wh = $(window).height();
        var ww = $(window).width();
        // compare the window aspect ratio to the image aspect ratio
        // to use either maximum width or height
        if ((ww / wh) > (slide.$img.width() / slide.$img.height())) {
          slide.$img.css({
            "height" : wh + "px",
            "width"  : "auto"
          });
        } else {
          slide.$img.css({
            "height" : "auto",
            "width"  : ww + "px"
          });
        }
        // update margins to position in the center
        slide.$img.css({
          "margin-left" : "-" + (0.5 * slide.$img.width()) + "px",
          "margin-top"  : "-" + (0.5 * slide.$img.height()) + "px"
        });
      }
    }
    
    $(window).bind("resize", function(){
      //todo: throttle
      $container.trigger("updateSize");
    });
    
    // Show individual slides
    var isLoading = false;
    $container.bind("showSlide", function(event, newSlide) {
      if (!isLoading) {
        var oldSlide = $container.data("currentSlide");
        // if it is not loaded yet then initialize the dom object and load it
        if (!("$img" in newSlide)) {
          isLoading = true;
          $container.trigger("startLoading");
          newSlide.$img = $('<img class="slide">')
            .css({
              "position"    : "absolute",
              "left"        : "50%",
              "top"         : "50%"
            })
            .hide()
            // on load get the images dimensions and show it
            .load(function(){
              isLoading = false;
              $container.trigger("stopLoading");
              updateSlideSize(newSlide);
              changeSlide(oldSlide, newSlide);
            })
            .error(function(){
              isLoading = false;
              newSlide.error = true;
              $container
                .trigger("stopLoading")
                .trigger("error", newSlide);
            })
            .attr("src", newSlide.image);
          $container.append(newSlide.$img);
        } else {
          changeSlide(oldSlide, newSlide);
        }
      }
    });
    
    $container.bind("prevSlide nextSlide", function(event) {
      var nextID,
          slides = $container.data("slides"),
          currentSlide = $container.data("currentSlide"),
          currentID = currentSlide && currentSlide.id || 0;
      if (event.type == "nextSlide") {
        nextID = (currentID + 1) % slides.length;
      } else {
        nextID = (currentID - 1 + slides.length) % slides.length;
      }
      $container.trigger("showSlide", slides[nextID]);
    });
    
    // privat function to change between slides
    var changeSlide = function(oldSlide, newSlide) {
      if (oldSlide !== undefined) {
        $container.trigger("endOfSlide", oldSlide);
        oldSlide.$img.fadeOut();
      }
      if (newSlide.$img && !newSlide.error) {
        newSlide.$img.fadeIn(function(){
          $container.trigger("startOfSlide", newSlide);
        });
      } else {
        $container.trigger("startOfSlide", newSlide);
      }
      $container.data("currentSlide", newSlide);
    }
    
    // keyboard navigation
    var keyFunc = function(event) {
      if (event.keyCode == 27) { // ESC
        $container.trigger("close");
      }
      if (event.keyCode == 37) { // Left
        $container.trigger("prevSlide");
      }
      if (event.keyCode == 39) { // Right
        $container.trigger("nextSlide");
      }
    }
    
    // Close the viewer
    $container.bind("close", function (){
      var options = $container.data("options");
      var oldSlide = $container.data("currentSlide");
      oldSlide && oldSlide.$img && oldSlide.$img.hide();
      $container.trigger("endOfSlide", oldSlide);
      $(document).unbind("keydown", keyFunc);
      // Use the fancy new FullScreenAPI:
      if (options.useFullScreen) {
        if (document.cancelFullScreen) {  
          document.cancelFullScreen();  
        } 
        if (document.mozCancelFullScreen) {
          $("html").css("overflow", "auto");
          $(document).scrollTop($container.data("mozScrollTop"));
          document.mozCancelFullScreen();
        } 
        if (document.webkitCancelFullScreen) {
          document.webkitCancelFullScreen();
        }
        document.removeEventListener('fullscreenchange', changeFullScreenHandler);
        document.removeEventListener('mozfullscreenchange', changeFullScreenHandler);
        document.removeEventListener('webkitfullscreenchange', changeFullScreenHandler);
      } else {
        $container.data("hiddenElements").show();
        $(window).scrollTop($container.data("originalScrollTop"));
      }
      $container
        .removeData("currentSlide slides width height originalScrollTop hiddenElements")
        .hide();
    });
    
    // When ESC is pressed in full screen mode, the keypressed event is not
    // triggered, so this here catches the exit-fullscreen event:
    function changeFullScreenHandler(event) {
      if ($container.data("isFullScreen")) {
        $container.trigger("close");
      }
      $container.data("isFullScreen", true);
    }
    
    var firstrun = true;
    // Show a particular slide
    $container.bind("show", function(event, rel, slide){
      var options = $container.data("options");
      var slideshows = $container.data("slideshows");
      var slides = slideshows[rel];
      $container.data("slides", slides);
      $container.trigger("updateSize");
      $(document).bind("keydown", keyFunc);
      // Use the fancy new FullScreenAPI:
      if (options.useFullScreen) {
        con = $container[0];
        if (con.requestFullScreen) {
          con.requestFullScreen();
          document.addEventListener('fullscreenchange', changeFullScreenHandler);
        } 
        if (con.mozRequestFullScreen) {
          con.mozRequestFullScreen();
          document.addEventListener('mozfullscreenchange', changeFullScreenHandler);
          $container.data("mozScrollTop", $(document).scrollTop());
          $("html").css("overflow", "hidden");
        } 
        if (con.webkitRequestFullScreen) {
          con.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
          document.addEventListener('webkitfullscreenchange', changeFullScreenHandler);
        } 
        $container.data("isFullScreen", false);
      } 
      if (firstrun) {
        $container.trigger("init");
        firstrun = false;
      }
      if (!options.useFullScreen) {
        $container.data("hiddenElements", $('body > *').filter(function(){return $(this).css("display")!="none";}).hide());
      }
      if (!$container.data("originalScrollTop")) {
        $container.data("originalScrollTop", $(window).scrollTop());
      }
      $container.show();
      $container.trigger("showSlide", slide);
    });
    
  }

  $.fn.fullscreenslides = function(options) {
    $container = $('#fullscreenSlideshowContainer');
    if ($container.length == 0) {
      $container = $('<div id="fullscreenSlideshowContainer">').hide();
      $("body").append($container);
      attachEvents();
    }
    // initialize variables
    var options = $.extend({
      "bgColor"           : "#000",
      "useFullScreen"     : true,
      "startSlide"        : 0
    }, options || {});
    // Check if fullScreenApi is available
    options.useFullScreen = options.useFullScreen && !!(
      $container[0].requestFullScreen ||
      $container[0].mozRequestFullScreen ||
      $container[0].webkitRequestFullScreen);
    $container.data("options", options);
    // Apply default styles
    $container.css({
      "position"         : "absolute",
      "top"              : "0px",
      "left"             : "0px",
      "width"            : "100%",
      "text-align"       : "center",
      "background-color" : options.bgColor
    });
    var slideshows = {};
    // Store galleries
    this.each(function(){
      var link = $(this).parents("a")[0];
      if (!link.rel) link.setAttribute("rel", "__all__");
      var slide = {
        image: link.href,
        title: link.title,
        rel: link.rel
      };
      slide.data = $.extend({}, $(this).data(), $(link).data());
      slideshows[slide.rel] = slideshows[slide.rel] || [];
      slideshows[slide.rel].push(slide);
      slide.id = slideshows[slide.rel].length - 1;
      $(link).data("slide", slide);
      $(link).click(function(event){
        $container.trigger("show", [this.rel, $(this).data("slide")]);
        event.preventDefault();
      });
    });
    $container.data("slideshows", slideshows);
  }
})(jQuery);
