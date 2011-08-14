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
 * MESSAGE PASSING with the background page
 */

// live interactions to the dashboard which responds to actual browser events
// see background.js for events requests sendings
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  var interaction = request.action;
  console.log('Live interaction:', interaction, request);

  if(interaction == "BI01") {
    // BI01 - Create a group
    var group = request.group;
    // 5. The dashboard creates the corresponding group (and its tab)
    var group = new SugarGroup(group);
    var group_ui = group.ui_create();
    $('#dashboard').append(group_ui);

  } else if(interaction == "update tab preview") {
    // update tab previews (& associated favicon)
    if(localStorage.feature_tab_preview=="true") {
      var tab = request.tab;
      var preview = request.preview;
      var tabs_ui = $.groups().tabs().find(".url[url='"+tab.url+"']").parent();
      tabs_ui.find('>.preview')
        .removeClass('empty')
        .attr('src', preview);
      tabs_ui.find('>.favicon').attr('src','chrome://favicon/'+tab.url); //tab.favIconUrl
    }

  } else if(interaction == "BI02") {
    // BI02 - Focus a window
    //TODO
    console.warn('TODO: BI02');
    
  } else if(interaction == "BI03") {
    // BI03 - Close a window
    var gid = request.gid;
    // 5. The dashboard hides and deletes the corresponding group and its tabs
    var group_ui = $.findGroup(gid);
    group_ui.close();

  } else if(interaction == "BI04") {
    // BI04 - Attach a tab to a window
    var tab_src = request.tab_src;
    var tab_dest = request.tab_dest;
    // 5. The dashboard moves the tab from its former window to its new one
    var tab_src = new SugarTab(tab_src);
    var tab_ui = $.findTab(tab_src.group_id, tab_src);
    var tab_dest = new SugarTab(tab_dest);
    var group_ui = $.findGroup(tab_dest.group_id);
    var tab_dest_ui = tab_ui.clone()
      .removeClass('ui-draggable-dragging')
      .css('top','')
      .css('left','');
    tab_ui.close();
    group_ui.addTab(tab_dest_ui, tab_dest.index);
    group_ui.autoFitTabs();

  } else if(interaction == "BI05") {
    // BI05 - Create a tab
    var gid = request.gid;
    var tab = request.tab;
    // 5. The dashboard adds the new tab into the corresponding group
    var tab = new SugarTab(tab);
    var tab_ui = tab.ui_create();
    var group_ui = $.findGroup(gid);
    group_ui.addTab(tab_ui);
    group_ui.autoFitTabs();

  } else if(interaction == "BI06") {
    // BI06 - Detach a tab from a window
    // Nothing to do

  } else if(interaction == "BI07") {
    // BI07 - Move a tab within a window
    //TODO
    console.warn('TODO: BI07');

  } else if(interaction == "BI08") {
    // BI08 - Close a tab
    var gid = request.gid;
    var tab = request.tab;
    // 5. The dashboard hides and deletes the corresponding tab
    var t = new SugarTab(tab);
    var tab_ui = $.findTab(gid, t);
    var group_ui = tab_ui.group();
    tab_ui.close();
    group_ui.autoFitTabs();

  } else if(interaction == "BI09") {
    // BI09 - Select a tab
    //TODO
    console.warn('TODO: BI09');

  } else if(interaction == "BI10") {
    // BI10 - Update a tab
    var gid = request.gid;
    var tab = request.tab;
    var t = new SugarTab(tab);
    var tab_ui = $.findTab(gid, t);
    tab_ui.find('.title>span').html(t.title);
    tab_ui.find('.url').attr('url',t.url).html(t.url);
    tab_ui.find('.favicon').attr('src','chrome://favicon/'+t.url); //t.favIconUrl
    tab_ui.find('.preview').addClass('empty').attr('src','/ico/transparent.gif');

  } else if(interaction == "error") {
    var message = request.message;
    showMessage('Oops! '+message);
  }
});
