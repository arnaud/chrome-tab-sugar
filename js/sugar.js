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

// disable console debugs when the developer mode is off
if(localStorage.debug != "true") {
  console.debug = function() {}
}

// keep a reference of the background page
var back = chrome.extension.getBackgroundPage();

// needed for storage.js to work with sugar.js
function updateUI() {
  console.debug("updateUI", back.icebox, back.groups);
  back.updateUI(true);
  setTimeout(updateSugarUI, 200);
}

function updateSugarUI() {
  $(function() {
    // update the icebox
    var ice = back.icebox;
    $('#icebox').width(ice.width).height(ice.height).css('position', 'absolute').css('top', ice.posY+'px').css('left', ice.posX+'px').show();
    for(var t in ice.tabs) {
      var tab = ice.tabs[t];
      $('#icebox>ul').append( tab.ui_create() );
    }
    $('#icebox').autoFitTabs();

    // update the groups
    var groups = back.groups;
    for(var g in groups) {
      var group = groups[g];
      var group_ui = group.ui_create();
      $('#dashboard').append( group_ui );
      group_ui = $('#group-'+group.id);
      for(var t in group.tabs) {
        var tab = group.tabs[t];
        group_ui.addTab( tab.ui_create() );
      }
      group_ui.autoFitTabs();
    }
  });
}


$(function() {

  // disable right-click contextual menu
  $.disableContextMenu();

  // tabs are draggable inside the dashboard
  $('.tab').live("mouseover", function(e) {
    console.debug('Event', 'tab mouseover', e);
    $('.tab').draggable({
      cursor: 'move',
      containment: '#dashboard',
      revert: 'valid',
      cancel: 'a.ui-icon',
      start: function(ev, ui) {
        //TODO $(this).effect('size', {to: {width: 100, height: 80}});
      }
    })
    .sortable();
  });

  // tabs are closeable
  $('.tab .close').live("click", function(e) {
    console.debug('Event', 'tab close click', e);
    var tab = $(this).parent().parent();
    var group = tab.group();

    // visually
    tab.fadeOut(function() {
      $(this).remove();
    });

    // in the db
    var group_id = group.uid();
    if(group_id=="icebox") group_id = 0;
    var index = JSON.parse(tab.attr('obj')).index;
    var t = new SugarTab({group_id: group_id, index: index});
    t.db_delete();

    // when grabbing the last tab of a group, the initial group should disappear if empty
    var old_group = $(tab).group();
    var nb_tabs_in_old_group = old_group.find('.tab').not(tab).length;
    if(nb_tabs_in_old_group == 0) {
      // visually
      group.fadeOut(function() {
        $(this).remove();
      });
      // in the db
      var id = group.uid();
      var group = new SugarGroup({id: id});
      group.db_delete();

    // if the source group still has tabs, let's resize'em all
    } else {
      old_group.autoFitTabs();
    }

    // prevent the tab clicking event to activate
    return false;
  });

  // tabs are clickable
  $('.tab').live("click", function(e) {
    console.debug('Event', 'tab click', e);
    var group = $(this).group();
    var selected_tab = $(this);
    var url = selected_tab.find('.url').html();
    // open a new window
    chrome.windows.create({ url: url }, function(window) {
      // with all its tabs
      group.tabs().each(function(index) {
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
    console.debug('Event', 'group mouseover');

    // groups are draggable inside the dashboard
    $('.group').draggable({
      cursor: 'move',
      containment: '#dashboard',
      snap: true,
      snapMode: 'outer',
      stop: function(ev, ui) {
        var id = $(this).uid();
        if(id=="icebox") id = 0;
        var x = $(this).position().left;
        var y = $(this).position().top;
        var group = new SugarGroup({id: id});
        group.db_update('posX', x);
        group.db_update('posY', y);
      }
    });

    // groups accept tabs
    $('.group').droppable({
      accept: '.tab',
      hoverClass: 'hover',
      greedy: true,
      drop: function(ev, ui) {
        var tab_ui = ui.draggable;
        var old_group_ui = $(tab_ui).group();
        var new_group_ui = $(this);
        console.debug(old_group_ui, new_group_ui);
        if(old_group_ui.get(0) == new_group_ui.get(0)) {
          return false;
        }
        // the tab should fade out and appear in a newly created group
        tab_ui.fadeOut(function() {
          old_group_ui.autoFitTabs();
          new_group_ui.addTab(tab_ui);
          // db
          var group_id = old_group_ui.uid();
          var index = JSON.parse(tab_ui.attr('obj')).index;
          if(group_id=="icebox") group_id = 0;
          var tab = new SugarTab({group_id: group_id, index: index});
          group_id = new_group_ui.uid();
          index = new_group_ui.tabs().length;
          tab.db_update('group_id', group_id);
          tab.db_update('index', index);
          // visual
          tab_ui.css('top',0).css('left',0);
          tab_ui.show();
          new_group_ui.autoFitTabs();
        });
        // when grabbing the last tab of a group, the initial group should disappear if empty
        var nb_tabs_in_old_group = old_group_ui.tabs().not(tab_ui).length;
        if(nb_tabs_in_old_group == 0) {
          // visually
          old_group_ui.fadeOut(function() {
            $(this).remove();
          });
          // in the db
          var id = old_group_ui.uid();
          var old_group = new SugarGroup({id: id});
          old_group.db_delete();

        // if the source group still has tabs, let's resize'em all
        } else {
          old_group_ui.autoFitTabs();
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

        var new_group = new SugarGroup({
          id: SugarGroup.next_index(),
          name: "New group",
          posX: ev.clientX-ev.layerX-17,
          posY: ev.clientY-ev.layerY-36,
          width: 155,
          height: 150
        });

        // the tab should fade out and appear in a newly created group
        tab.fadeOut(function() {

          // visual
          var new_group_ui = new_group.ui_create();
          $('#dashboard').append(new_group_ui);
          new_group_ui.addTab(tab);
          tab.show();
          new_group_ui.autoFitTabs();

          // db
          new_group.db_insert();
          var group_id = JSON.parse(tab.attr('obj')).group_id;
          var index = JSON.parse(tab.attr('obj')).index;
          var t = new SugarTab({group_id: group_id, index: index});
          t.db_update('group_id', new_group.id);
          t.db_update('index', 0);
          new_group_ui.addTab(tab);

          // add it to the group list
          back.updateUI(true);

        });

        // when grabbing the last tab of a group, the initial group should disappear if empty
        //FIXME When dropping a tab in the dashboard from a group that isn't the icebox, it loses the tab
        /*var old_group = $(ui.helper.context.parentElement).parent();
        var nb_tabs_in_old_group = old_group.find('.tab').not(tab).length;
        if(nb_tabs_in_old_group == 0) {
          // visually
          old_group.fadeOut();
          // in the db
          var id = old_group.uid();
          var group = new SugarGroup({id: id});
          group.db_delete();
        }*/
      }
    });

    // groups are resizeable
    $('.group').resizable({
      // inner tabs are resized accordingly
      minHeight: 150, // GROUP_MIN_HEIGHT
      minWidth: 150, // GROUP_MIN_WIDTH
      stop: function(ev, ui) {
        var id = $(this).uid();
        if(id=="icebox") id = 0;
        var w = $(this).width();
        var h = $(this).height();
        var group = new SugarGroup({id: id});
        group.db_update('width', w);
        group.db_update('height', h);
      },
      resize: function(ev, ui) {
        $(this).autoFitTabs();
      }
    });

    // group titles are editable
    $('.group>.title').not('#icebox>.title').editable(function(value, settings) {
      var id = $(this).parent().uid();
      var group = new SugarGroup({id:id});
      group.db_update('name', value);
      if(localStorage.debug=="true") {
        $('.debug', $(this).parent()).html('#'+id+' / '+value);
      }
      return value;
    },
    {
      onblur: 'submit'
    });
  });

  // groups are closeable
  $('.group>.close').live("click", function(e) {
    console.debug('Event', 'group close click', e);
    var group = $(this).parent();

    // visually
    group.fadeOut(function() {
      $(this).remove();
    });

    // in the db
    var id = $(this).parent().uid();
    var group = new SugarGroup({id: id});
    group.db_delete();
  });

  // stacked tabs can be fanned out
  $('.fan_icon').live("click", function(e) {
    console.debug('Event', 'group fan out click', e);
    var group = $(this).parent();
    var tabs = group.tabs();
    group.fanOut();
  });

  // fanned groups disappear when the mouse isn't hover anymore
  $('.fangroup').live("mouseleave", function(e) {
    console.debug('Event', 'group fan out mouseleave', e);
    var group = $(this).parent();
    var tabs = group.tabs();
    group.fanOutHide();
  });

  // handle group creation with the mouse within the dashboard
  $('#dashboard').live("mousedown", function(e) {
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
    $('.group', this).not('#icebox').unbind('mousemove');
  });
});

function onGroupMouseUp() {
  console.debug('onGroupMouseUp', $(this).attr('status'));
  $(this).unbind('mousemove');
  var id = $(this).uid();
  var title = $('.title', this).html();
  var w = $(this).width();
  var h = $(this).height();
  var x = $(this).position().left;
  var y = $(this).position().top;
  //console.debug($(this), w, h);
  // minimal size in order to keep the group displayed
  if(h + w < 200) {
    $(this).fadeOut(function() {
      $(this).remove();
    });
  } else {
    if($(this).attr('status')=='new') { // new group
      // visual
      $('.title', this).show();
      // db
      var group = new SugarGroup({
        id: SugarGroup.next_index(),
        name: title,
        posX: x,
        posY: y,
        width: w,
        height: h
      });
      group.db_insert();
      // add it to the group list
      //back.groups.push( group );
      back.updateUI(true);
      // keep references between the group object and the group UI
      $(this).attr('id', 'group-'+group.id);
      // change the status of the group ui
      $(this).attr('status', 'update');
    } else { // existing group
      var group = new SugarGroup({id: id});
      group.db_update('width', w);
      group.db_update('height', h);
      group.db_update('posX', x);
      group.db_update('posY', y);
    }
  }
}
