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

$(function() {

  // disable right-click contextual menu
  $(document).bind("contextmenu", function(e) {
    return false;
  });

  // tabs are draggable inside the dashboard
  $('.tab').live("mouseover", function(e) {
    console.debug('Event', 'tab mouseover', e);
    $('.tab').draggable({
      cursor: 'move',
      containment: '#dashboard',
      revert: 'valid',
      cancel: 'a.ui-icon'
    })
    .sortable();
  });

  // tabs are closeable
  $('.tab .close').live("click", function(e) {
    console.debug('Event', 'tab close click', e);
    var tab = $(this).parent().parent();
    tab.fadeOut();
    //TODO
    // when grabbing the last tab of a group, the initial group should disappear if empty
    var old_group = $(tab).parent().parent();
    var nb_tabs_in_old_group = old_group.find('.tab').not(tab).length;
    if(nb_tabs_in_old_group == 0) {
      old_group.fadeOut();
      //TODO
    }
    // prevent the tab clicking event to activate
    return false;
  });

  // tabs are clickable
  $('.tab').live("click", function(e) {
    console.debug('Event', 'tab click', e);
    var group = $(this).parent().parent();
    var selected_tab = $(this);
    var url = selected_tab.find('.url').html();
    // open a new window
    chrome.windows.create({ url: url }, function(window) {
      // with all its tabs
      group.find('.tab').each(function(index) {
        // don't open the current tab (already opened with the window)
        if($(this).get(0) != selected_tab.get(0)) {
          var url = $(this).find('.url').html();
          chrome.tabs.create({ windowId: window.id, index: index, url: url, selected: false });
        }
        //alert(index+" "+url);
      });
    });
  });

  // groups are draggable, droppable and resizable
  $('.group').live("mouseover", function(e) {
    console.debug('Event', 'group mouseover', e);

    // groups are draggable inside the dashboard
    $('.group').draggable({
      cursor: 'move',
      containment: '#dashboard'
    });

    // groups accept tabs
    $('.group').droppable({
      accept: '.tab',
      hoverClass: 'hover',
      greedy: true,
      drop: function(ev, ui) {
        var tab = ui.draggable;
        var old_group = $(tab).parent().parent();
        var new_group = $(this);
        console.debug(old_group, new_group);
        if(old_group.get(0) == new_group.get(0)) {
          return false;
        }
        // the tab should fade out and appear in a newly created group
        tab.fadeOut(function() {
          new_group.find('>ul').append(tab);
          tab.fadeIn();
        });
        // when grabbing the last tab of a group, the initial group should disappear if empty
        var old_group = $(ui.helper.context.parentElement).parent();
        var nb_tabs_in_old_group = old_group.find('.tab').not(tab).length;
        if(nb_tabs_in_old_group == 0) {
          old_group.fadeOut();
          //TODO
        }
      }
    });

    // dashboard accepts tabs (will create a new group)
    $('html > *').droppable({
      accept: '.tab',
      hoverClass: 'hover',
      greedy: true,
      drop: function(ev, ui) {
        var tab = ui.draggable;
        // the tab should fade out and appear in a newly created group
        tab.fadeOut(function() {
          var new_group = createGroup();
          new_group.find('>ul').append(tab);
          tab.fadeIn();
        });
        // when grabbing the last tab of a group, the initial group should disappear if empty
        var old_group = $(ui.helper.context.parentElement).parent();
        var nb_tabs_in_old_group = old_group.find('.tab').not(tab).length;
        if(nb_tabs_in_old_group == 0) {
          old_group.fadeOut();
          //TODO
        }
      }
    });

    // groups are resizeable
    $('.group').resizable({
      // inner tabs are resized accordingly
      resize: function(event, ui) {
        /*var nb_tabs = $(this).find('.tabs').length;
        var _factor = 140.0 / 112.0;
        var w = ui.size.width;
        var h = ui.size.height;
        var factor = w / h;
        var columns = 5 * (factor / _factor);
        var w_tab = 0;
        var h_tab = 0;
        var w_tab_preview = 0;
        var h_tab_preview = 0;
        //if(factor / _factor >= 0.9) { // normal grid
          w_tab = w/columns - 20;
          w_tab_preview = w_tab;
          h_tab_preview = w_tab_preview / _factor;
          h_tab = h_tab_preview + 20;
        //} else { // ?
        //  return false;
        //}
        $('.tab', this).css("width", w_tab+"px").css("height", h_tab+"px");
        $('.tab .preview', this).css("width", w_tab_preview+"px").css("height", h_tab_preview+"px");
        $('.debug', this).html('w: '+w+' / h: '+h+' / col: '+parseInt(columns)+' / w_tab: '+parseInt(w_tab)+' / h_tab: '+parseInt(h_tab));*/
      }
    });

    // group titles are editable
    $('.group>.title').not('#icebox>.title').editable(function(value, settings) {
      //TODO
      return value;
    },
    {
      onblur: 'submit'
    });

    // groups are closeable
    $('.group>.close').live("click", function(e) {
      console.debug('Event', 'group close click', e);
      var group = $(this).parent();
      group.fadeOut();
      //TODO
    });
  });

  // handle group creation with the mouse within the dashboard
  $('#dashboard, .group').live("mousedown", function(e) {
    console.debug('Event', 'dashboard/group mousedown', e.currentTarget, e.pageX, e.pageY, e);
    var groupUI = createGroupUI();
    groupUI.css('width', 30).css('height', 20).css('position', 'absolute').css('top', (e.pageY-10)+'px').css('left', (e.pageX-10)+'px').css('opacity', 0).find('.title').hide();
    groupUI.mousemove(function(e){
      console.debug('mousemove');
      var w = e.pageX - $(this).css('left').replace('px', '') + 20;
      var h = e.pageY - $(this).css('top').replace('px', '') + 10;
      var opacity = (h + w < 200) ? 0.5 : 1;
      $(this).css('width', w+'px').css('height', h+'px').css('opacity', opacity);
    });
    groupUI.mouseup(onGroupOrDashboardMouseUp);
    $(this).append(groupUI);
    return groupUI;
  });

  // get rid of any group mousemove events on mouseup
  $('#dashboard').mouseup(function(e){
    console.debug('Event', 'dashboard mouseup', e.pageX, e.pageY, e);
    $('.group', this).not('#icebox').each(onGroupOrDashboardMouseUp);
  });
});

function onGroupOrDashboardMouseUp() {
  $(this).unbind('mousemove');
  var w = parseInt($(this).css('width').replace('px', ''));
  var h = parseInt($(this).css('height').replace('px', ''));
  //console.debug($(this), w, h);
  // minimal size in order to keep the group displayed
  if(h + w < 200) {
    $(this).fadeOut();
  } else {
    $('.title', this).show();
  }
}

function initDashboard() {
  console.debug('initDashboard');
  // get the current windows and tabs state
  var tabs = chrome.extension.getBackgroundPage().tabs;
  console.debug('tabs', tabs);
  for(var i=0; i<tabs.length; i++) {
    var tab = tabs[i];
    addTabToGroup(tab, null);
  }
}

function createGroup(name) {
  var groupUI = createGroupUI(name);
  $('#dashboard').append(groupUI);
  return groupUI;
}

function createGroupUI(name) {
  name = typeof(name) != 'undefined' ? name : "New group";
  return $('<section class="group"><span class="title">'+name+'</span><div class="close"></div><ul></ul><div class="debug" /><div class="clear" /></section>');
}

function addTabToGroup(tab, group) {
  //TODO
  addTabToGroupUI(tab, group);
}

function createTabUI(tab) {
  var url = tab.url;
  var preview = localStorage.getItem(tab.windowId+"-"+tab.id+"-preview");
  if(preview==null) {
    preview = '<img class="preview empty" />';
  } else {
    preview = '<img class="preview" src="'+preview+'" />';
  }
  var favicon = tab.favIconUrl;
  if(favicon==null) favicon = "ico/blank_preview.png";
  var title = tab.title
  return $('<li class="tab"><div>'+preview+'<img class="favicon" src="'+favicon+'" /><span class="title"><span>'+title+'</span></span><span class="url">'+url+'</span><div class="close"></div></div></li>');
}

function addTabToGroupUI(tab, group) {
  var tabUI = createTabUI(tab);
  if(group == null) {
    $('#icebox>ul').append(tabUI);
  } else {
    //TODO
  }
}


$(function() {
  initDashboard();
});
