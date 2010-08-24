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

track('Sugar', 'Start', 'The dashboard starts');

// keep a reference of the background page
var back = chrome.extension.getBackgroundPage();


/**
 * FUNCTIONS
 */

// initializes the dashboard with the icebox and groups
function initUI() {
  var ice = back.icebox;
  // handle the situation where Tab Sugar isn't ready: the background page didn't do its work
  if(ice==null) {
    //showMessage('Tab Sugar isn\'t ready to rock just now. Please either reload the extension or restart Chrome.');
    chrome.extension.getBackgroundPage().location.reload();
    setTimeout(function() { this.location.reload() }, 500);
    return;
  }
  // update the icebox
  $('#icebox')
    .width(ice.width)
    .height(ice.height)
    .css('position', 'absolute')
    .css('top', ice.posY)
    .css('left', ice.posX)
    .show();
  for(var t in ice.tabs) {
    var tab = ice.tabs[t];
    $('#icebox').addTab( tab.ui_create() );
    chrome.extension.sendRequest({action: 'gimme the tab preview', tab: tab});
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
      chrome.extension.sendRequest({action: 'gimme the tab preview', tab: tab});
    }
    group_ui.autoFitTabs();
  }
}

function showMessage(message) {
  $('#message').hide().html('<span>'+message+' <a href="#" onclick="hideMessage()">[x]</a></span>').show('clip');
}

function hideMessage() {
  $('#message').hide('clip');
}


/**
 * UI INITIALIZATION
 */

$(function() {

  initUI();

  // disable right-click contextual menu
  $.disableContextMenu();

});
