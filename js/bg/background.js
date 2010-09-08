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

trackLoading(0, 'Initializing Tab Sugar...');

// show a loading icon as the browser action icon
chrome.browserAction.setIcon({path: '/ico/browser_action_loading.png'});
chrome.browserAction.setTitle({title: "Loading Tab Sugar..."});

// tell the extension that the background page isn't ready just yet
localStorage.background_page_ready = false;

// disable console debugs when the developer mode is off
if(localStorage.debug != "true") {
  console.debug = function() {}
}

// Show the shortcut key in the browser action's description
if(localStorage.shortcut_key!=null) {
  chrome.browserAction.setTitle({title: "Tab Sugar ("+localStorage.shortcut_key+")"});
}

var groups = [];
var tabs_to_insert = 0;
var inserted_tabs = 0;
var groups_to_insert = 0;
var inserted_groups = 0;

/**
 * INITIALIZE THE EXTENSION
 */

// At first execution of Tab Sugar...

// check if the version has changed
trackLoading(10, 'Checking for version updates...');
var currVersion = getVersion();
var prevVersion = localStorage['version']
if (currVersion != prevVersion) {
  // check if we just installed this extension
  if (typeof(prevVersion) == 'undefined') {
    track('Background', 'Install', 'First installation');
  } else {
    track('Background', 'Install', 'Update from '+prevVersion+' to '+currVersion);
  }
  localStorage['version'] = currVersion;
}

trackLoading(20, 'Migrating the database...');

// check wether the database version is up-to-date
makeDatabaseUpToDate({success: function() {
  // the database schema are now up-to-date
  var initialized = localStorage.initialized == "true";
  trackLoading(30, 'Database migrated');
  if(!initialized) {
    trackLoading(40, 'Initializing the database...');
    // initialize the database
    Storage.init({
      success: function() {
        trackLoading(50, 'Database initialized');
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
        trackLoading(60, 'Initializing tabs and groups...');
        chrome.windows.getAll({populate:true}, function (windows) {
          console.debug('chrome.windows.getAll', windows);
          var gid = 1;
          for(var w in windows) {
            var window = windows[w];
            var group = new SugarGroup({
              id: gid,
              width: 400,
              height: 150,
              posX: 0,
              posY: 17+(gid-1)*180,
              incognito: window.incognito,
              type: window.type
            });
            var tabs = window.tabs;
            tabs_to_insert += tabs.length;
            for(var t in tabs) {
              var tab = tabs[t];
              //if(SugarTab.persistable(tab.url)) {
                var tab = new SugarTab(tab);
                group.add_tab(tab, true, function() { inserted_tabs++; } );
              //}
            }
            if(group.tabs.length > 0) {
              groups_to_insert++;
              group.db_insert({
                success: function() { inserted_groups++; }
              });
              groups.push(group);
              gid++;
            }
          }
          function waitForGroupsAndTabsToBeInserted() {
            if(groups_to_insert == inserted_groups && tabs_to_insert == inserted_tabs) {
              trackLoading(90, 'Tabs and groups initialized');
              // let the windows and groups make a match
              matchWindowsAndGroups();
              // show the normal browser action icon
              chrome.browserAction.setIcon({path: '/ico/browser_action.png'});
              chrome.browserAction.setTitle({title: "Tab Sugar"});
              // tell the extension that the background page is ready now
              localStorage.background_page_ready = true;
              trackLoading(100, 'Tab Sugar is ready to use!');
              track('Background', 'Initialize', 'Initialize the extension with the default features and a listing of each opened windows and tabs');
            } else {
              setTimeout(waitForGroupsAndTabsToBeInserted, 500);
            }
          }
          waitForGroupsAndTabsToBeInserted();
        });
      }
    });
  } else { // already initialized
    // let's clean groups in the database (removes the empty unnamed groups)
    trackLoading(40, 'Synchronizing tabs and groups from the db');
    Storage.clean_groups({
      success: function() {
        trackLoading(60, 'Groups cleaned up');
        // let's sync with the db
        syncGroupsFromDb(function() {
          // tell the extension that the background page is ready now
          trackLoading(100, 'Tab Sugar is ready to use!');
          localStorage.background_page_ready = true;
        });
        // if the 'latest updates' feature wasn't set, ever, then set it on by default
        var lu = localStorage.feature_latestupdates;
        if(lu != "true" && lu != "false") localStorage.feature_latestupdates = "true";
        // show the normal browser action icon
        chrome.browserAction.setIcon({path: '/ico/browser_action.png'});
        chrome.browserAction.setTitle({title: "Tab Sugar"});
        // features tracking
        track('Background', 'Developer traces', '', localStorage.debug=="true");
        track('Background', 'Tab preview feature', '', localStorage.feature_tab_preview=="true");
        track('Background', 'Auto resize feature', '', localStorage.feature_autoresize=="true");
        track('Background', 'Latest updates feature', '', localStorage.feature_latestupdates=="true");
      }
    });
  }
}});

function trackLoading(percent, message) {
  localStorage.background_page_ready = percent == 100;
  chrome.extension.sendRequest({action: 'loading', percent: percent, message: message});
}
