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

  // tabs are draggable inside the dashboard
  $('.tab').live("mouseover", function() {
    $('.tab').draggable({
      cursor: 'move',
      containment: '#dashboard',
      revert: 'valid',
      cancel: 'a.ui-icon'
    })
    .sortable();
  });

  // groups are draggable, droppable and resizable
  $('.group').live("mouseover", function() {

    // groups are draggable inside the dashboard
    $('.group').draggable({
      cursor: 'move',
      containment: '#dashboard'
    });

    // groups accept tabs
    $('.group').droppable({
      accept: '.tab',
      hoverClass: 'hover',
      greedy: true
    });

    // dashboard accepts tabs (will create a new group)
    $('html > *').droppable({
      accept: '.tab',
      hoverClass: 'hover',
      greedy: true,
      drop: function(ev, ui) {
        var tab = ui.draggable;
        tab.fadeOut(function() {
          var new_group = createGroup();
          new_group.find('ul').append(tab);
          tab.fadeIn();
        });
      }
    });

    // groups are resizeable
    $('.group').resizable();

    // group titles are editable
    $('.group>.title').not('#icebox>.title').editable(function(value, settings) {
      //TODO
      return value;
    },
    {
      onblur: 'submit'
    });
  });

  // handle group creation with the mouse within the dashboard
  $('#dashboard, .group').live("mousedown", function(e) {
    console.debug(e.currentTarget);
    console.debug('mousedown', e.pageX, e.pageY)
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
    console.debug('mouseup', e.pageX, e.pageY);
    $('.group', this).not('#icebox').each(onGroupOrDashboardMouseUp);
  });
});

function onGroupOrDashboardMouseUp() {
  $(this).unbind('mousemove');
  var w = parseInt($(this).css('width').replace('px', ''));
  var h = parseInt($(this).css('height').replace('px', ''));
  console.debug($(this), w, h);
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
  return $('<section class="group"><span class="title">'+name+'</span><ul></ul><div class="clear" /></section>');
}

function addTabToGroup(tab, group) {
  //TODO
  addTabToGroupUI(tab, group);
}

function createTabUI(tab) {
  var url = tab.url;
  var preview = localStorage.getItem(tab.id+"-preview");
  if(preview==null) preview = "ico/blank_preview.png";
  var favicon = tab.favIconUrl;
  if(favicon==null) favicon = "ico/blank_preview.png";
  var title = tab.title
  return $('<li class="tab"><div><img class="preview" src="'+preview+'" /><img class="favicon" src="'+favicon+'" /><span class="title"><span>'+title+'</span></span></div></li>');
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



/*function createScreenShot(mess) {
  changeWorkStatus(chrome.i18n.getMessage("createimage"));
  if (cancel) {
    $(document).trigger("onfinish");
    return
  }
  var img = [];
  var theHeader, theFotter;
  canvas = $("canvas")[0];
  canvas.width = mess.width;
  theHeader = $("#txtHeader")[0].value;
  theFotter = $("#txtFotter")[0].value;
  if (!url) {
    url = mess.url
  }

  function replacim(inText) {
    return inText.replace(/%U/gi, url).replace(/%D/gi, (new Date))
  }
  theHeader = replacim(theHeader);
  theFotter = replacim(theFotter);
  var offsetTop = 0;
  if (theHeader) {
    mess.height += 20;
    offsetTop = 20
  }
  if (theFotter) {
    mess.height += 20
  }
  canvas.height = mess.height;
  for (var i = 0; i <= screens.length; i++) {
    if (cancel) {
      $(document).trigger("onfinish");
      return
    }
    ctx = canvas.getContext("2d");
    img[i] = $("<img tag=" + i + "/>");
    img[i].load(function () {
      if (cancel) {
        $(document).trigger("onfinish");
        return
      }
      var i;
      i = parseInt($(this).attr("tag"));
      img[i][0].width = 200;
      ctx.drawImage(img[i][0], 0, screens[i].top + offsetTop);
      img[i][0].src = "";
      img[i] = "";
      if (i == screens.length - 1) {
        ctx.font = "arial 20px";
        if (theFotter) {}
        ctx.textBaseline = "bottom";
        ctx.fillText(theFotter, 10, canvas.height, canvas.width - 20);
        if (theHeader) {}
        ctx.textBaseline = "up";
        ctx.fillText(theHeader, 10, 10, canvas.width - 20);
        updateFromCanvas()
      }
    });
    try {
      img[i].attr("src", screens[i].data)
    } catch (e) {}
  }
}*/