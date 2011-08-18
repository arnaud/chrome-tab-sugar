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

/**
 * DASHBOARD INTERACTIONS
 */

$(function() {
  
  // tabs are draggable inside the dashboard
  $('.tab').live('mouseover', function(e) {
    console.debug('Event', 'tab mouseover', e);
    $('.tab').draggable({
      cursor: 'move',
      containment: '#dashboard',
      revert: 'valid',
      cancel: 'a.ui-icon',
      start: function(ev, ui) {
        track('Sugar', 'Drag a tab');
        //TODO $(this).effect('size', {to: {width: 100, height: 80}});
      }
    })
    .sortable();
  });

  // tabs are closeable
  $('.tab .close').live('click', function(e) {
    console.debug('Event', 'tab close click', e);
    // DI09 – Close a tab
    track('Sugar', 'Close a tab');

    // 1. The user closes a tab
    var tab_ui = $(this).parent().parent();
    tab_ui.fadeOut(function() {
      var group_ui = $(this).group();
      $(this).remove();
      group_ui.autoFitTabs();
    });

    // 2. The dashboard sends a request to the background page
    var gid = tab_ui.group().uid();
    var index = tab_ui.indexWithinParent() + 1;
    chrome.extension.sendRequest({
      action: 'DI09', // Close a tab
      gid: gid,
      index: index
    },
    function(response) {
    });

    // prevent the tab clicking event to activate
    return false;
  });

  // tabs are clickable
  $('.tab').live('click', function(e) {
    console.debug('Event', 'tab click', e);
    if(!e.ctrlKey) {
      // DI10 – Open all tabs of a group
      var group_ui = $(this).group();
      track('Sugar', 'Click a tab', '', group_ui.tabs().length);
      // 1. The user clicks on a tab within a group (already done)
      //&2. The dashboard sends a request to the background page
      var gid = group_ui.uid();
      var selected_tab = $(this);
      var focused_url = selected_tab.find('.url').attr('url');
      chrome.extension.sendRequest({
        action: 'DI10', // Open all tabs of a group
        gid: gid,
        focused_url: focused_url
      },
      function(response) {
      });
    } else {
      // DI11 – Open a single tab of a group
      var group_ui = $(this).group();
      track('Sugar', 'Click a single tab', '', group_ui.tabs().length);
      // 1. The user ctrl+clicks on a tab within a group (already done)
      //&2. The dashboard sends a request to the background page
      var tab_ui = $(this);
      var url = tab_ui.find('.url').attr('url');
      chrome.extension.sendRequest({
        action: 'DI11', // Open a single tab of a group
        url: url
      },
      function(response) {
      });
    }
  });

  // new tabs can be created in groups
  $('.new_tab').live('click', function(e) {
    console.debug('Event', 'new tab', e);
    var group_ui = $(this).parent();
    track('Sugar', 'New tab', 'Create a new tab in a group', group_ui.tabs().length);
    // DI12 – Create a new tab
    // 1. The user clicks on the “new tab” icon of a group (already done)
    //&2. The dashboard sends a request to the background page
    var gid = group_ui.uid();
    chrome.extension.sendRequest({
      action: 'DI12', // Create a new tab
      gid: gid
    },
    function(response) {
    });
  });

  // groups are draggable, droppable and resizable
  $('.group').live('mouseover', function(e) {
    console.debug('Event', 'group mouseover');

    // groups are draggable inside the dashboard
    $('.group, .snapper').draggable({
      cursor: 'move',
      containment: '#dashboard',
      snap: true,
      snapMode: 'outer',
      snapTolerance: 10,
      start: function(ev, ui) {
        // DI03 – Resize a group
        track('Sugar', 'Drag a group', '', $(this).tabs().length);
      },
      stop: function(ev, ui) {
        // 1. The user moves a group in the dashboard (already done)
        //&2. The dashboard sends a request to the background page
        var gid = $(this).uid();
        var posX = $(this).position().left;
        var posY = $(this).position().top;
        chrome.extension.sendRequest({
          action: 'DI04', // Move a group
          gid: gid,
          posX: posX,
          posY: posY
        },
        function(response) {
        });
      }
    });

    // groups accept tabs
    $('.group').droppable({
      accept: '.tab',
      hoverClass: 'hover',
      greedy: true,
      drop: function(ev, ui) {
        // DI08 – Move a tab to an existing group
        track('Sugar', 'Drop a tab in a group', 'Drop a tab in an existing group', $(this).tabs().length);

        // 1. The user moves a tab to an existing group
        var tab_ui = ui.draggable;
        var src_group_ui = $(tab_ui).group();
        var dest_group_ui = $(this);
        var src_group_id = src_group_ui.uid();
        var dest_group_id = dest_group_ui.uid();
        if(src_group_ui.get(0) == dest_group_ui.get(0)) {
          return false;
        }
        var src_index = tab_ui.indexWithinParent();
        // the tab should fade out and appear in a newly created group
        /*tab_ui.fadeOut(function() {
          $(this).remove();
          dest_group_ui.addTab(tab_ui);
          tab_ui.show();
          src_group_ui.autoFitTabs();
          dest_group_ui.autoFitTabs();
*/
          // 2. The dashboard sends a request to the background page
          var dest_index = dest_group_ui.tabs().length;
          chrome.extension.sendRequest({
            action: 'DI08', // Move a tab to an existing group
            src_gid: src_group_id,
            src_index: src_index,
            dest_gid: dest_group_id,
            dest_index: dest_index
          },
          function(response) {
          });
/*        });*/
      }
    });

    // dashboard accepts tabs (will create a new group)
    $('html > *').droppable({
      accept: '.tab',
      hoverClass: 'hover',
      greedy: true,
      drop: function(ev, ui) {
        // DI06 – Move a tab to the dashboard
        track('Sugar', 'Drop a tab in a new group', 'Drop a tab in a new group');
        // 1. The user moves a tab to the dashboard
        var src_tab_ui = ui.draggable;
        var src_tab = new SugarTab({
          group_id: src_tab_ui.group().uid(),
          index: src_tab_ui.indexWithinParent(),
          title: src_tab_ui.title(),
          url: src_tab_ui.url(),
          favIconUrl: src_tab_ui.favIconUrl()
        });
        var src_group_ui = src_tab_ui.group();
        var dest_group = new SugarGroup({
          id: SugarGroup.next_index(),
          posX: ev.clientX-ev.layerX-17,
          posY: ev.clientY-ev.layerY-36,
          width: 155,
          height: 150
        });
        var dest_group_ui = dest_group.ui_create();
        var dest_tab = new SugarTab(src_tab);
        dest_tab.group_id = dest_group.id;
        dest_tab.index = 0;
        var dest_tab_ui = dest_tab.ui_create();
        // the tab should fade out and appear in a newly created group
        src_tab_ui.fadeOut(function() {
          src_tab_ui.remove();
          $('#dashboard').append(dest_group_ui);
          dest_group_ui.addTab(dest_tab_ui);
          dest_tab_ui.show();
          src_group_ui.autoFitTabs();
          dest_group_ui.autoFitTabs();
          //chrome.extension.sendRequest({action: 'gimme the tab preview', tab: dest_tab});
        });

        // 2. The dashboard sends a request to the background page
        chrome.extension.sendRequest({
          action: 'DI06', // Move a tab to the dashboard
          src_tab: src_tab,
          dest_group: dest_group
        },
        function(response) {
        });
      }
    });

    // groups are resizeable
    $('.group').resizable({
      // inner tabs are resized accordingly
      minHeight: 150, // GROUP_MIN_HEIGHT
      minWidth: 150, // GROUP_MIN_WIDTH
      stop: function(ev, ui) {
        // DI03 – Resize a group
        track('Sugar', 'Resize a group', '', $(this).tabs().length);
        // 1. The user resizes a group in the dashboard (already done)
        //&2. The dashboard sends a request to the background page
        var gid = $(this).uid();
        var width = $(this).width();
        var height = $(this).height();
        chrome.extension.sendRequest({
          action: 'DI03', // Resize a group
          gid: gid,
          width: width,
          height: height
        },
        function(response) {
        });
      },
      resize: function(ev, ui) {
        $(this).autoFitTabs();
      }
    });

  });
  
  // renames a group with a new name
  function renameGroup(group, name) {
    console.debug("renameGroup:", group, name);
    // DI02 – Rename a group
    track('Sugar', 'Rename a group', name, group.tabs().length);
    // 1. The user renames a group in the dashboard (already done)
    //&2. The dashboard sends a request to the background page
    var gid = group.uid();
    chrome.extension.sendRequest({
      action: 'DI02', // Rename a group
      gid: gid,
      name: name
    },
    function(response) {
    });

    if(localStorage.debug=="true") {
      $('.debug', group).html('#'+gid+' / '+name);
    }
    return name;
  }
  // group titles are editable
  $('.group>.title').live('blur', function(e) {
    var name = $(this).val();
    renameGroup($(this).parent(), name);
    return false;
  });
  $('.group>.title').live('keypress', function(e) {
    console.debug('Event keypress', e);
    if(e.keyCode == 13) { // 'Enter' key
      $(this).blur();
      return false;
    }
  });

  // groups are closeable
  $('.group>.close').live('click', function(e) {
    console.debug('Event', 'group close click', e);
    // DI04 – Close a group
    track('Sugar', 'Close a group', '', $(this).parent().tabs().length);

    // 1. The user closes a group in the dashboard
    var group_ui = $(this).parent();
    group_ui.fadeOut(function() {
      $(this).remove();
    });

    // 2. The dashboard sends a request to the background page
    var gid = group_ui.uid();
    chrome.extension.sendRequest({
      action: 'DI05', // Close a group
      gid: gid
    },
    function(response) {
    });
  });

  // stacked tabs can be fanned out
  $('.fan_icon').live('click', function(e) {
    console.debug('Event', 'group fan out click', e);
    var group = $(this).parent();
    track('Sugar', 'Fan out tabs', 'Fan out tabs of a group', group.tabs().length);
    group.fanOut();
    group.tabs().find('.close').hide();
  });

  // fanned groups disappear when the mouse isn't hover anymore
  $('.fangroup').live('mouseleave', function(e) {
    console.debug('Event', 'group fan out mouseleave', e);
    var group = $(this).parent();
    track('Sugar', 'Unfan out tabs', 'Unfan out tabs of a group', group.tabs().length);
    group.fanOutHide();
  });

  // handle group creation with the mouse within the dashboard
  $('#dashboard').live('mousedown', function(e) {
    console.debug('Event', 'dashboard/group mousedown', e.currentTarget, e.pageX, e.pageY, e);
    // if there is already a group at this position, stop the event
    if($(this).isGroupAtPosition(e.pageX, e.pageY)) {
      console.debug('Event', 'dashboard/group mousedown', 'aborted: There is already a group at this position');
      return;
    }
    // if not, then go create the group
    var id = SugarGroup.next_index();
    var group = new SugarGroup({id: id});
    var groupUI = group.ui_create();
    groupUI.width(30).height(20).css('position', 'absolute').css('top', (e.pageY-10)+'px').css('left', (e.pageX-10)+'px').css('opacity', 0).find('.title').hide();
    groupUI.mousemove(function(e){
      console.debug('mousemove');
      var w = e.pageX - $(this).position().left + 20;
      var h = e.pageY - $(this).position().top + 10;
      var opacity = (h + w < 200) ? 0.5 : 1;
      $(this).width(w).height(h).css('opacity', opacity);
    });
    groupUI.attr('status', 'new');
    groupUI.mouseup(onGroupMouseUp);
    $(this).append(groupUI);
    return groupUI;
  });

  // get rid of any group mousemove events on mouseup
  $('#dashboard').mouseup(function(e){
    console.debug('Event', 'dashboard mouseup', e.pageX, e.pageY, e);
    $('.group', this).unbind('mousemove');
  });
});

function onGroupMouseUp() {
  console.debug('onGroupMouseUp', $(this).attr('status'));
  $(this).unbind('mousemove');
  $(this).unbind('mouseup');
  var id = $(this).uid();
  var title = $('.title', this).html();
  var w = $(this).width();
  var h = $(this).height();
  var x = $(this).position().left;
  var y = $(this).position().top;
  //console.debug($(this), w, h);
  // minimal size in order to keep the group displayed
  if(h + w < 200) {
    track('Sugar', 'Create a group', 'Create a group with mousedown', false);
    $(this).fadeOut(function() {
      $(this).remove();
    });
  } else {
    if($(this).attr('status')=='new') { // new group
      // DI01 – Create a new group
      track('Sugar', 'Create a group', 'Create a group with mousedown', true);
      var group = new SugarGroup({
        id: SugarGroup.next_index(),
        name: title,
        posX: x,
        posY: y,
        width: w,
        height: h
      });
      // 1. The user creates a new group in the dashboard
      $(this).attr('id', 'group-'+group.id);
      $('.title', this).show();
      // 2. The dashboard sends a request to the background page
      chrome.extension.sendRequest({
        action: 'DI01', // Create a new group
        group: group
      },
      function(response) {
        // change the status of the group ui
        $(this).attr('status', 'update');
      });
    } else { // existing group
      var group = new SugarGroup({id: id});
      group.db_update({
        key: 'width',
        val: w,
        success: function(rs) {
          group.db_update({
            key: 'height',
            val: h,
            success: function(rs) {
              group.db_update({
                key: 'posX',
                val: x,
                success: function(rs) {
                  group.db_update({
                    key: 'posY',
                    val: y,
                    success: function(rs) {}
                  });
                }
              });
            }
          });
        }
      });
    }
  }
}
