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

track('Background', 'Start', 'The extension starts');

// disable console debugs when the developer mode is off
if(localStorage.debug != "true") {
  console.debug = function() {}
}

var icebox;
var groups = [];

// @param no_listeners [optional] (boolean) Don't activate the listeners
function updateUI(no_listeners) {
  console.debug("updateUI");
  SugarGroup.load_icebox({
    success: function(rs) {
      SugarGroup.load_groups({
        success: function(rs) {
          if(typeof(no_listeners)=='undefined' || !no_listeners) {
            activate_listeners();
          }
        }
      });
    }
  });
}

function openTabSugar(tab) {
  console.debug('chrome.browserAction.onClicked', tab);

  // URL of the Sugar Tab dashboard
  var sugar_url = chrome.extension.getURL("sugar.html");

  var updated = false;

  // check wether Sugar Tab is already opened in the current window
  chrome.windows.getCurrent(function(window) {
    for(var t in window.tabs) {
      var tab = window.tabs[t];
      console.error(tab, tab.id, tab.url);
      if(tab.url == sugar_url) {
        // reuse the last dashboard and reload it
        chrome.tabs.update(tab.id, {url: sugar_url, selected: true});
        updated = true;
      }
    }
    if(!updated) {
      // no dashboard were reused: let's create a new tab
      //chrome.tabs.create({url: sugar_url});
    }
  });

  // opens Tab Sugar in a new window
  //chrome.windows.create({url:chrome.extension.getURL("sugar.html"), left:0, top:0});
  // opens Tab Sugar in a new tab
  chrome.tabs.create({url: sugar_url});
}

// Browser action
chrome.browserAction.onClicked.addListener(openTabSugar);

// Enable the use of a shortcut key from within the tabs
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  if(request.action == "open") {
    openTabSugar();
  } else if(request.action == "gimme the shortcut key") {
    sendResponse({shortcut_key: localStorage.shortcut_key});
  }
});

// Show the shortcut key in the browser action's description
if(localStorage.shortcut_key!=null) {
  chrome.browserAction.setTitle({title: "Tab Sugar ("+localStorage.shortcut_key+")"});
}

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
    // snap groups feature is OFF by default
    localStorage.feature_snapgroups = "false";
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
      track('Background', 'Initialize', 'Initialize the extension with the default features and a listing of each opened windows and tabs', icebox.tabs.length);
    });
  } else { // already initialized
    track('Background', 'Developer traces', '', localStorage.debug=="true");
    track('Background', 'Tab preview feature', '', localStorage.feature_tab_preview=="true");
    track('Background', 'Auto resize feature', '', localStorage.feature_autoresize=="true");
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

// resizes an image to the desired size
function resizeImage(url, width, height, callback) {
  var sourceImage = new Image();
  sourceImage.onload = function() {
    // create a canvas with the desired dimensions
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    // scale and draw the source image to the canvas
    canvas.getContext("2d").drawImage(sourceImage, 0, 0, width, height);

    // convert the canvas to a data URL in PNG format
    callback(canvas.toDataURL());
  }
  sourceImage.src = url;
}

// captures the current tab as a 200px-width PNG snapshot
function captureCurrentTab() {
  console.debug('captureCurrentTab');
  chrome.windows.getCurrent(function(window) {
    chrome.tabs.getSelected(null, function(tab) {
      if(SugarTab.persistable(tab.url)) {
        chrome.tabs.captureVisibleTab(null, function (dataUrl) {
          var factor = window.width / window.height;
          var width = 200;
          var height = Math.round(width / factor);
          resizeImage(dataUrl, width, height, function(dataUrl) {
            var tab2 = new SugarTab(tab);
            tab2.update_preview(dataUrl);
          });
        });
      }
    });
  });
}

/*
function searchTabs(text) {
  console.debug("searchTabs", text);
  var matching = SugarTab.search(text);
  console.error(matching.length);
  var not_matching = $('.group>ul>.tab').not(matching);
  matching.show();
  not_matching.css('opacity', 0.5);
}

chrome.experimental.omnibox.onInputChanged.addListener(function(text, suggest) {
  console.debug("onInputChanged");
  var suggestions = [];
  suggestions.push({ content: 'Coffee - Wikipedia', description: 'Coffee - Wikipedia' });
  suggest(suggestions);
});
chrome.experimental.omnibox.onInputEntered.addListener(function(text) {
  console.debug("onInputEntered");
  searchTabs(text);
});
chrome.experimental.omnibox.onInputStarted.addListener(function() {
  console.debug("onInputStarted");
  searchTabs(text);
});
chrome.experimental.omnibox.onInputCancelled.addListener(function() {
  console.debug("onInputCancelled");
  searchTabs(text);
});
*/
