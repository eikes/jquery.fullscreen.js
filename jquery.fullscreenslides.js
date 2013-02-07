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
 * <a href="image-1-large.jpg" class="gallery" rel="gallery-1" title="woot"> 
 *    image or text
 * </a>
 * <a href="image-2-large.jpg" class="gallery" rel="gallery-1" title="woot">
 *    image or text
 * </a>
 * <a href="image-3-large.jpg" class="gallery" rel="gallery-1" title="woot">
 *    image or text
 * </a>
 * 
 * You are free to place any images or text inside the links or hide them when you only want one start button
 * 
 * You would then call it like this:
 * 
 * <script src="http://code.jquery.com/jquery.js"></script>
 * <script src="fullscreenslides.js"></script>
 * <script>
 *  $(function(){
 *    $("a.gallery").fullscreenslides();
 *    
 *    // start the slideshow with the particular picture
 *    $('a.gallery').click(function(){
 *      $container.trigger("show",$(this).data("slide"));
 *      return false;
 *    });
 * 
 *    // start slideshow with a click on any html element
 *    $('.startbutton').click(function(){
 *        $container.trigger("start",["gallery-1",slideNo]);
 *        return false;
 *    });
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
          // do not resize unless told to
          wh = (wh > slide.$img.height() && $container.data("options").noEnlarge) ? slide.$img.height() : wh;
          slide.$img.css({
            "height" : wh + "px",
            "width"  : "auto"
          });
        } else {
          // do not resize unless told to
          ww = (ww > slide.$img.width()  && $container.data("options").noEnlarge) ? slide.$img.width() : ww;
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

    // Load a slide
    $container.bind("loadSlide", function(event, newSlide) {
        // if it is not loaded yet then initialize the dom object and load it
        if (!("$img" in newSlide)) {
          $(newSlide).data("loading",true);
          newSlide.$img = $('<img class="slide">')
            .css({
              "position"    : "absolute",
              "left"        : "50%",
              "top"         : "50%"
            })
            .hide()
            // on load get the images dimensions and show it
            .load(function(){
              $(newSlide).data("loading",false);
              updateSlideSize(newSlide);
              // loading the currently requested slide - otherwise it was a preload
              if ($(newSlide).data("requestShow")) {
                $(newSlide).data("requestShow",false);
                $container.trigger("stopLoading");
                changeSlide($container.data("currentSlide"), newSlide);
              } 
            })
            .error(function(){
              $(newSlide).data("loading",false);
              newSlide.error = true;
              $container
                .trigger("stopLoading")
                .trigger("error", newSlide);
            })
            .attr("src", newSlide.image);
          $container.append(newSlide.$img);
        }
    });
    
    
    // Show individual slides
    var isLoading = false;
    $container.bind("showSlide", function(event, newSlide) {
      // check if preload has finished
      if (!$(newSlide).data("loading")) {
        var oldSlide = $container.data("currentSlide");
        // if it is not loaded yet then initialize the dom object and load it, only to avoid raceconditions with the preloader
        if (!("$img" in newSlide)) {
          $container.trigger("startLoading");
          $(newSlide).data("requestShow",true);
          $container.trigger("loadSlide",newSlide);
        } else {
          changeSlide(oldSlide, newSlide);
        }
      } else {
        $(newSlide).data("requestShow",true);
      }
    });
    
    $container.bind("prevSlide nextSlide", function(event, preLoad) {
      var nextID,
          slides = $container.data("slides"),
          currentSlide = $container.data("currentSlide"),
          currentID = currentSlide && currentSlide.id || 0,
          options = $container.data("options");
      // sanitary check for race condition which can occour if slideshow is timer triggered in the user app
      if (!slides) return;
      if (event.type == "nextSlide") {
        nextID = (currentID + 1) % slides.length;
        // no loop
        if ((nextID < currentID) && options.noLoop && !preLoad) {
            $container.trigger("close");
            return;
        }
      } else {
        nextID = (currentID - 1 + slides.length) % slides.length;
      }
      // check if the next slide should be shown or just preloaded
      if (preLoad)
          $container.trigger("loadSlide", slides[nextID]);
      else
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
      $container.trigger("nextSlide", true);
    }
    
    // Start Slideshow
    $container.bind("start", function(event, rel, slideNo) {
        var slideshow = $container.data("slideshows")[rel];
        var slide = slideshow[slideNo] ;
        $container.trigger("show", slide);
    })
    
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
        if (document.mozFullScreen) {
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
    
    // Set options at runtime. This is usefull when you want to set options on user request -> after init, but before start
    $container.bind("setOptions", function (event, options){
      var o = $container.data("options");
      o = $.extend(o,options|| {});
      $container.data("options", o);
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
    $container.bind("show", function(event, slide){
      var rel = slide.rel;
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
      "noEnlarge"         : true,
      "noLoop"            : false,
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
      if (!this.rel) this.setAttribute("rel", "__all__");
      var slide = {
        image: this.href,
        title: this.title,
        rel: this.rel
      };
      slideshows[slide.rel] = slideshows[slide.rel] || [];
      slideshows[slide.rel].push(slide);
      slide.id = slideshows[slide.rel].length - 1;
      $(this).data("slide", slide);
    });
    $container.data("slideshows", slideshows);
  }
})(jQuery);
