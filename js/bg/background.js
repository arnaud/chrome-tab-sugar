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

// show a loading icon as the browser action icon
chrome.browserAction.setIcon({path: '/ico/browser_action_loading.png'});

// disable console debugs when the developer mode is off
if(localStorage.debug != "true") {
  console.debug = function() {}
}

// Show the shortcut key in the browser action's description
if(localStorage.shortcut_key!=null) {
  chrome.browserAction.setTitle({title: "Tab Sugar ("+localStorage.shortcut_key+")"});
}

var groups = [];


/**
 * INITIALIZE THE EXTENSION
 */

// At first execution of Tab Sugar...

// check wether the database version is up-to-date
makeDatabaseUpToDate({success: function() {
  // the database schema are now up-to-date
  var initialized = localStorage.initialized == "true";
  if(!initialized) {
    // initialize the database
    Storage.init({
      success: function() {
        // the extension has been initialized with all the already opened tabs
        localStorage.initialized = "true";
        // tab preview feature is ON by default
        localStorage.feature_tab_preview = "true";
        // tabs resizing feature is ON by default
        localStorage.feature_autoresize = "true";
        // snap groups feature is OFF by default
        localStorage.feature_snapgroups = "false";
        // latest updates feature is ON by default
        localStorage.feature_latestupdates = "true";
        // the next group will be identified as "group 1"
        localStorage.group_last_index = 0;
        // initialize the extension by listing all the tabs of all the windows
        chrome.windows.getAll({populate:true}, function (windows) {
          console.debug('chrome.windows.getAll', windows);
          chrome.windows.getCurrent(function(current_window) {
            var gid = 1;
            for(var w in windows) {
              var group;
              if(current_window.id != w.id) {
                group = new SugarGroup({id: gid, width: 400, height: 150, posX: 0, posY: 17+(gid-1)*180});
              }
              var tabs = windows[w].tabs;
              for(var t in tabs) {
                var tab = tabs[t];
                //if(SugarTab.persistable(tab.url)) {
                  var tab = new SugarTab(tab);
                  group.add_tab(tab, true);
                //}
              }
              if(current_window.id != w.id && group.tabs.length > 0) {
                group.db_insert({
                  success: function() {}
                });
                groups.push(group);
                gid++;
              }
            }
            // let the windows and groups make a match
            matchWindowsAndGroups();
            // show the normal browser action icon
            chrome.browserAction.setIcon({path: '/ico/browser_action.png'});
            track('Background', 'Initialize', 'Initialize the extension with the default features and a listing of each opened windows and tabs');
          });
        });
      }
    });
  } else { // already initialized
    // let's sync with the db
    syncGroupsFromDb();
    // if the 'latest updates' feature wasn't set, ever, then set it on by default
    var lu = localStorage.feature_latestupdates;
    if(lu != "true" && lu != "false") localStorage.feature_latestupdates = "true";
    // show the normal browser action icon
    chrome.browserAction.setIcon({path: '/ico/browser_action.png'});
    // features tracking
    track('Background', 'Developer traces', '', localStorage.debug=="true");
    track('Background', 'Tab preview feature', '', localStorage.feature_tab_preview=="true");
    track('Background', 'Auto resize feature', '', localStorage.feature_autoresize=="true");
    track('Background', 'Latest updates feature', '', localStorage.feature_latestupdates=="true");
  }
}});


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
