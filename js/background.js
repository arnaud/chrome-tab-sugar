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

var icebox;
var groups = [];

// @param no_listeners [optional] (boolean) Don't activate the listeners
function updateUI(no_listeners) {
  console.debug("updateUI");
  SugarGroup.load_icebox();
  SugarGroup.load_groups();
  if(typeof(no_listeners)=='undefined' || !no_listeners) {
    setTimeout(activate_listeners, 1000);
  }
}

function openTabSugar(tab) {
  console.debug('chrome.browserAction.onClicked', tab);
  // opens Tab Sugar in a new window
  //chrome.windows.create({url:chrome.extension.getURL("sugar.html"), left:0, top:0});
  // opens Tab Sugar in a new tab
  chrome.tabs.create({url:chrome.extension.getURL("sugar.html")});
}

// Browser action
chrome.browserAction.onClicked.addListener(openTabSugar);

// Enable the use of a shortcut key from within the tabs
chrome.extension.onRequest.addListener(openTabSugar);

function activate_listeners() {

  // At first execution of Tab Sugar...
  var initialized = localStorage.initialized == "true";
  if(!initialized) {
    // the extension has been initialized with all the already opened tabs
    localStorage.initialized = "true";
    // tab preview feature is ON by default
    localStorage.feature_tab_preview = "true";
    // tabs resizing feature is ON by default
    localStorage.feature_autoresize = "true";
    // initialize the extension by listing all the tabs of all the windows
    chrome.windows.getAll({populate:true}, function (windows) {
      console.debug('chrome.windows.getAll', windows);
      for(var w in windows) {
        var tabs = windows[w].tabs;
        for(var t in tabs) {
          var tab = tabs[t];
          if(SugarTab.persistable(tab.url)) {
            var tab = new SugarTab(tab);
            icebox.add_tab(tab, true);
          }
        }
      }
    });
  }

  // Check for tab opening
  //chrome.tabs.onCreated.addListener(function(tab) {
  //  console.debug('chrome.tabs.onCreated', tab);
  //  chrome.tabs.getSelected(null, function(t2) {
  //    console.log('created tab ' + tab.id + ', selected tab is ' + t2.id);
  //    tabs.unshift(tab);//TODO ??
  //  });
  //});

  // Check for tab URL change
  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if(changeInfo.status == "complete") {
      console.debug('chrome.tabs.onUpdated', tabId, changeInfo, tab);
      captureCurrentTab();
    }
  });

  // Check for tab closing
  chrome.tabs.onRemoved.addListener(function(tabId) {
    console.debug('chrome.tabs.onRemoved', tabId);
    //TODO tabs.unshift(tab);
  });

}

function captureCurrentTab() {
  console.debug('captureCurrentTab');
  chrome.windows.getCurrent(function(window) {
    chrome.tabs.getSelected(null, function(tab) {
      if(SugarTab.persistable(tab.url)) {
        chrome.tabs.captureVisibleTab(null, function (dataUrl) {
          var tab = new SugarTab(tab);
          tab.update_preview(dataUrl);
        });
      }
    });
  });
}
