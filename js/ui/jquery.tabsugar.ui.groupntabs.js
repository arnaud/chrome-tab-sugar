/**
 * Copyright (c) 2010 Arnaud Leymet
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * Chrome Tab Sugar <http://github.com/arnaud/chrome-tab-sugar>
 */

(function($) {

  /**
   * Tabs resizing constants and methods
   */
  var TAB_MIN_WIDTH = 70;
  var TAB_SCALE = 14 / 13; //TODO should auto adjust to the screen format
  var TAB_MIN_HEIGHT = TAB_MIN_WIDTH / TAB_SCALE;
  var TAB_TITLE_HEIGHT = 18;
  var GROUP_MIN_WIDTH = 150;
  var GROUP_MIN_HEIGHT = 150;
  var GROUP_TAB_SPACING_X = 4;
  var GROUP_TAB_SPACING_Y = 4;
  var GROUP_PADDING_TOP = 5+12;
  var GROUP_PADDING_LEFT = 5+2+1;
  var GROUP_PADDING_RIGHT = 5+2+1;
  var GROUP_PADDING_BOTTOM = 5+18;

  function tab_width(gw, ntabx) {
    var tw = ( gw - (ntabx - 1) * GROUP_TAB_SPACING_X ) / ntabx
    return Math.max(tw, TAB_MIN_WIDTH);
  }

  function tab_height(tw) {
    var th = tw / TAB_SCALE;
    return th;
  }

  function max_tab_height(gh, ntaby) {
    return ( gh - (ntaby - 1) * GROUP_TAB_SPACING_Y ) / ntaby;
  }

  /**
   * Number of tabs per column
   * @param ntabx Number of tabs per line
   * @param th Tab height
   * @returns [Number] Number of tabs per column
   */
  function nb_tabs_per_column(t, ntabx) {
    return Math.ceil( t / ntabx );
  }

  /**
   * Determines the Tab size from the Group size
   * @param gw Group width
   * @param gh Group height
   * @param t Number of tabs in the group
   * @returns [Object]
   * {
   *  width: Width of the tab
   *  height: Height of the tab
   *  ntabx: Number of tabs per line
   *  ntaby: Number of tabs per column
   *  mode: "grid" | "stacked"
   * }
   */
  function tab_size(gw, gh, t) {
    var mode = "grid";
    var ntabx = 1;
    gw = gw - GROUP_PADDING_LEFT - GROUP_PADDING_RIGHT;
    gh = gh - GROUP_PADDING_TOP - GROUP_PADDING_BOTTOM;
    var tw = tab_width(gw, ntabx);
    var th = tab_height(tw);
    var ntaby = nb_tabs_per_column(t, ntabx);
    var th_max = max_tab_height(gh, ntaby);
    while(th > th_max) {
      ntabx++;
      tw = tab_width(gw, ntabx);
      th = tab_height(tw);
      ntaby = nb_tabs_per_column(t, ntabx);
      th_max = max_tab_height(gh, ntaby);
      if(ntabx>50) {
        mode = "stacked";
        tw = gw;
        th = gh;
        break;
      }
    }
    if(tw == TAB_MIN_WIDTH) {
      mode = "stacked";
      tw = gw - 10; // *.8 is for border paddings
      th = tab_height(tw);
      if(th > gh) {
        th = gh - 10 / TAB_SCALE;
        tw = th * TAB_SCALE;
      }
    }
    return {width: tw, height: th, ntabx: ntabx, ntaby: ntaby, mode: mode};
  }


  // resize the embedded tabs accordingly to the group size
  $.fn.autoFitTabs = function() {

    this.each(function(i) {

      if(!$(this).isGroup()) {
        console.error('The autoFitTabs method only applies to groups');
        return $(this);
      }

      var gw = $(this).width();
      var gh = $(this).height();

      if(localStorage.feature_autoresize=="true") {
        var nb_tabs = $(this).find('.tab').length;
        var tabsize = tab_size(gw, gh, nb_tabs);
        var mode = tabsize.mode;
        var w_tab_preview = tabsize.width;
        var h_tab_preview = tabsize.height - TAB_TITLE_HEIGHT;
        if(mode=="grid") {
          $('.tab.active', $(this)).parent().find('.stacked_tabs_bg').remove();
          $('.fan_icon', $(this)).remove();
          $('.tab', $(this)).normalizeTab(tabsize.width, tabsize.height);
        } else if(mode=="stacked") {
          $('.tab:first-child', $(this)).addClass("active");
          var margin_left = ( gw - tabsize.width - 8 ) / 2; // handle the centering of the stacked tabs
          var margin_top = 10;
          // delete the potentially already present background
          $('.tab.active', $(this)).parent().find('.stacked_tabs_bg').remove();
          // create the background
          var nb_backgrounds = Math.min(nb_tabs-1, 5);
          for(var i=1; i<=nb_backgrounds; i++) {
            var bg = $('<div></div>').addClass('stacked_tabs_bg').addClass('stacked_tabs_bg_'+i)
              .width(w_tab_preview)
              .height(h_tab_preview)
              .css("margin", margin_top+"px 0 0 "+margin_left+"px");
            if(i==1) {
              bg.addClass("first");
            }
            $('.tab.active', $(this)).parent().prepend(bg);
          }
          // create the fan icon
          if($('.fan_icon', $(this)).length == 0) {
            var fan_icon = $('<div></div>').addClass('fan_icon');
            fan_icon.live('click', function(e) {
              //TODO open a fan window
            });
            $(this).append(fan_icon);
          }
          // handle tabs
          $('.tab.active', $(this))
            .width(tabsize.width)
            .height(tabsize.height)
            .css("margin", margin_top+"px 0 0 "+margin_left+"px");
          $('.tab.active .preview', $(this))
            .width(w_tab_preview)
            .height(h_tab_preview);
          $('.tab:not(.active)', $(this)).hide();
          $('.tab.active .title, .tab.active .close', $(this)).hide();
        }
        if(localStorage.debug=="true") {
          var id = $(this).attr('id');
          $('.debug', $(this)).html('id:'+id+' / '+tabsize.mode+' / w:'+gw+' / h:'+gh+' / ntabx:'+tabsize.ntabx+' / ntaby:'+tabsize.ntaby);
        }
      }

    });

    return this;
  },
  
  // get the tabs of a group
  $.fn.tabs = function() {
    if(this == null || this.length == 0) return $('#nothing');
    if(!this.isGroup()) {
      console.error('The tabs method only applies to groups');
      return $('#nothing');
    }
    return this.find('>ul>.tab');
  },

  // get the group of a tab
  $.fn.group = function() {
    if(!this.isTab()) {
      console.error('The group method only applies to tabs');
      return;
    }
    var g = this.parent().parent();
    if(!g.isGroup()) {
      console.error('Error while getting the tab\'s group');
      return;
    }
    return g
  },

  // get the position of the element relative to its siblings elements
  $.fn.indexWithinParent = function() {
    return this.parent().find('>.tab').index(this);
  },

  // get all the dashboard groups
  $.groups = function() {
    return $('#dashboard .group').not('.fangroup');
  },

  // get the title of a group or a tab
  $.fn.title = function() {
    if(this.isGroup()) {
      return this.find('>.title').html();
    } else if(this.isTab()) {
      return this.find('>div>.title>span').html();
    } else {
      console.error('The title method only applies to groups or tabs');
      return "";
    }
  },

  // get the URL of a tab
  $.fn.url = function() {
    if(this.isTab()) {
      return this.find('>div>.url').html();
    } else {
      console.error('The url method only applies to tabs');
      return "";
    }
  },

  // get the favicon of a tab
  $.fn.favIconUrl = function() {
    if(this.isTab()) {
      return this.find('>div>.favicon').attr('src');
    } else {
      console.error('The favIconUrl method only applies to tabs');
      return "";
    }
  },

  // is there a group at the [x,y] position?
  $.fn.isGroupAtPosition = function(x, y) {
    var is_group = false;
    $.groups().each(function() {
      var x1 = $(this).position().left + 10;
      var y1 = $(this).position().top + 10;
      var x2 = x1 + $(this).width() + 10;
      var y2 = y1 + $(this).height() + 20;
      if(x >= x1 && x <= x2 && y >= y1 && y <= y2) {
        is_group = true;
      }
    });
    return is_group;
  }

  // adds a tab into a group
  $.fn.addTab = function(tab) {
    this.find('ul').append( tab );
    return this;
  },
  
  // tests wether the object is a group
  $.fn.isGroup = function() {
    return this.is('.group');
  },
  
  // tests wether the object is a tab
  $.fn.isTab = function() {
    return this.is('.tab');
  },

  // get the unique ID (group or tab)
  $.fn.uid = function() {
    var uid = null;
    if(this.isGroup()) {
      uid = this.attr('id').replace('group-','');
      uid = parseInt(uid);
    } else if(this.isTab()) {
      uid = this.attr('id');
    } else {
      console.error('The uid method only applies to groups or tabs');
    }
    return uid;
  },

  // normalizes a tab
  $.fn.normalizeTab = function(width, height) {
    this.each(function() {
      $(this).removeClass("active")
        .css("margin", "2px")
        .width(width)
        .height(height)
        .show();
      $('.preview', $(this))
        .width(width)
        .height(height - TAB_TITLE_HEIGHT);
      $('.title, .close', $(this)).show();
    });
    return this;
  },

  // displayed the group tabs in a fanned out way
  $.fn.fanOut = function() {
    var g = $('<div></div>').addClass('fangroup').hide();
    $(this).tabs().each(function() {
      var t = $(this).clone()
        .normalizeTab(2*TAB_MIN_WIDTH, 2*TAB_MIN_HEIGHT);
      g.append(t);
    });
    $(this).append(g);
    g.show('puff');
  },

  // hide the fanned group
  $.fn.fanOutHide = function() {
    $('.fangroup', this).hide('puff', function() {
      $(this).remove();
    });
  },

  // find a group by its group id
  $.findGroup = function(gid) {
    return $('#group-'+gid);
  },

  // find a tab by its group id and its own data
  $.findTab = function(gid, tab) {
    return $.findGroup(gid).tabs().filter(':eq('+tab.index+')');
  }
  
})(jQuery);
