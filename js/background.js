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

// Show the shortcut key in the browser action's description
if(localStorage.shortcut_key!=null) {
  chrome.browserAction.setTitle({title: "Tab Sugar ("+localStorage.shortcut_key+")"});
}

var icebox;
var groups = [];


/**
 * FUNCTIONS
 */

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
          var width = 500;
          var height = Math.round(width / factor);
          resizeImage(dataUrl, width, height, function(dataUrl) {
            var t = new SugarTab(tab);
            t.update_preview(dataUrl);
            // let's request the extension to update the preview accordingly
            chrome.extension.sendRequest({action: "update tab preview", tab: tab, preview: dataUrl});
          });
        });
      }
    });
  });
}

// finds out which window corresponds to a group id
function getWindowFromGid(gid, callback) {
  console.debug('getWindowFromGid', gid);
  // 1. Find the group object
  var group_found = false;
  var group = null;
  if(gid==0) {
    group_found = true;
    group = icebox;
  }
  if(!group_found) {
    for(var g in groups) {
      group = groups[g];
      if(group.id == gid) {
        group_found = true;
        break;
      }
    }
  }
  if(!group_found) {
    // the group couldn't be found :-|
    console.error('The group #'+gid+' could not be found');
    callback(null);
  } else {
    // the group was found, let's check the actual windows now for comparison
    chrome.windows.getAll({populate:true}, function(windows) {
      for(var w in windows) {
        var window = windows[w];
        console.debug('Window', '#'+w, window);
        var tabs = window.tabs;
        var window_tabs = [];
        for(var t in tabs) {
          if(SugarTab.persistable(t.url)) {
            window_tabs.push(t);
          }
        }
        console.debug('...has', window_tabs.length, 'tabs');
        console.debug('...whereas the group has', group.tabs.length, 'tabs');
        if(window_tabs.length == group.tabs.length) {
          console.debug('=> OK!');
          // 1st test is OK: the group and the window have the same tabs count
          var same_tabs = true;
          for(var t in window_tabs) {
            var wtab = window_tabs[t];
            var gtab = group.tabs[t];
            console.debug(' tabs', '#'+t, wtab, gtab);
            same_tabs = wtab.url == gtab.url;
            if(!same_tabs) {
              console.debug(' ... are not the same');
              break;
            }
          }
          if(same_tabs) {
            // 2nd test is OK: the group tabs and the window tabs share the same characteristics
            console.debug('===> OK!');
            callback(window);
            return;
          }
        } else {
          console.debug('=> KO');
        }
      }
    });
  }
}

// finds out which tab corresponds to a group id and index
function getTabFromTid(gid, index, callback) {
  console.debug('getTabFromTid', gid, index);
  getWindowFromGid(gid, function(window) {
    var tab_found = false;
    var tab = null;
    var idx = 0;
    for(var t in window.tabs) {
      tab = window.tabs[t];
      if(SugarTab.persistable(t.url)) {
        idx++;
      }
      if(idx == index) {
        tab_found = true;
        break;
      }
    }
    if(tab_found) {
      callback(window, tab);
    } else {
      console.error('Couldn\'t find a match for the tab', gid, index)
    }
  });
}

// syncs the the 'icebox' and 'groups' variables with the ones from the database
function syncGroupsFromDb(callback) {
  SugarGroup.load_icebox({
    success: function(rs) {
      // load the other groups
      SugarGroup.load_groups({
        success: callback
      });
    }
  });
}


/**
 * MESSAGE PASSING with both the dashboard and the options pages
 */

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  console.debug('Request', request.sender, request.action, request);
  var interaction = request.action;
  // sender: dashboard
  if(interaction == "open") {
    openTabSugar();
  } else if(request.action == "gimme the shortcut key") {
    // BI12 – Use the extension shortcut key
    sendResponse({shortcut_key: localStorage.shortcut_key});
  } else if(request.action == "DI01") {
    // DI01 – Create a new group
    var group = new SugarGroup(request.group);
    // 3. The background page inserts the new group in the database
    group.db_insert({
      success: function(rs) {
        // add it to the group list
        //groups.push( group );
        syncGroupsFromDb(function() {
          sendResponse({status: "OK"});
        });
      },
      error: function() {
        chrome.extension.sendRequest({action: 'error', message: 'Error while storing the group in the db'});
      }
    });
  } else if(interaction == "DI02") {
    // DI02 – Rename a group
    var gid = request.gid;
    var name = request.name;
    // 3. The background page renames the group in the database
    Storage.update({
      table: "groups",
      conditions: "`id`="+gid,
      changes: {name: name},
      success: function() {
        // refresh the icebox and the groups
        syncGroupsFromDb(function() {
          sendResponse({status: "OK"});
        });
      },
      error: function() {
        chrome.extension.sendRequest({action: 'error', message: 'Error while renaming the group in the db'});
      }
    });
  } else if(interaction == "DI03") {
    // DI03 – Resize a group
    var gid = request.gid;
    var width = request.width;
    var height = request.height;
    // 3. The background page updates the group sizes in the database
    Storage.update({
      table: "groups",
      conditions: "`id`="+gid,
      changes: {
        width: width,
        height: height
      },
      success: function() {
        // update the right group in the groups array
        /*if(gid==0) {
          icebox.width = width;
          icebox.height = height;
        } else {
          for(var g in groups) {
            var group = groups[g];
            if(group.id == gid) {
              group.width = width;
              group.height = height;
            }
          }
        }*/
        // refresh the icebox and the groups
        syncGroupsFromDb(function() {
          sendResponse({status: "OK"});
        });
      },
      error: function() {
        chrome.extension.sendRequest({action: 'error', message: 'Error while updating the group sizes in the db'});
      }
    });
  } else if(interaction == "DI04") {
    // DI04 – Move a group
    var gid = request.gid;
    var posX = request.posX;
    var posY = request.posY;
    // 3. The background page updates the group coordinates in the database
    Storage.update({
      table: "groups",
      conditions: "`id`="+gid,
      changes: {
        posX: posX,
        posY: posY
      },
      success: function() {
        // update the icebox or the right group in the groups array
        /*if(gid==0) {
          icebox.posX = posX;
          icebox.posY = posY;
        } else {
          for(var g in groups) {
            var group = groups[g];
            if(group.id == gid) {
              group.posX = posX;
              group.posY = posY;
            }
          }
        }*/
        // refresh the icebox and the groups
        syncGroupsFromDb(function() {
          sendResponse({status: "OK"});
        });
      },
      error: function() {
        chrome.extension.sendRequest({action: 'error', message: 'Error while moving the tab in the db'});
      }
    });
  } else if(interaction == "DI05") {
    // DI05 – Close a group
    var gid = request.gid;
    // 3. The background page sends a request to the browser to close the corresponding window
    getWindowFromGid(gid, function(window) {
      var wid = window.id;
      chrome.windows.remove(wid);
    });
    // 4. -On success-, the background page deletes the group from the database
    Storage.delete({
      table: "groups",
      conditions: "`id`="+gid,
      success: function() {
        // remove the right group in the groups array
        /*for(var g in groups) {
          var group = groups[g];
          if(group.id == gid) {
            delete groups[g];
            return;
          }
        }*/
        // refresh the icebox and the groups
        syncGroupsFromDb(function() {
          sendResponse({status: "OK"});
        });
      },
      error: function() {
        chrome.extension.sendRequest({action: 'error', message: 'Error while deleting the group in the db'});
      }
    });
  } else if(interaction == "DI08") {
    // DI08 – Move a tab to an existing group
    var src_gid = request.src_gid;
    var src_index = request.src_index;
    var dest_gid = request.dest_gid;
    var dest_index = request.dest_index;
    // 3. The background page sends a request to the browser to move the
    //    corresponding tab from its current window to the destination window
    getTabFromTid(src_gid, src_index, function(src_window, src_tab) {
      getWindowFromGid(dest_gid, function(dest_window) {
        chrome.tabs.move(src_tab.id, {windowId: dest_window.id, index: dest_index})
      });
    });
    // 4. -On success-, the background page updates the tab’s group id in the database
    // 4.1. increment the index of the above tabs in the destination group
    Storage.update({
      table: "tabs",
      conditions: "`group_id`="+dest_gid+" AND `index`>="+dest_index,
      changes: {
        raw_sql_index: "`index`+1"
      },
      success: function() {},
      error: function() {}
    });
    // 4.2. move the tab
    Storage.update({
      table: "tabs",
      conditions: "`group_id`="+src_gid+" AND `index`="+src_index,
      changes: {
        group_id: dest_gid,
        index: dest_index
      },
      success: function() {
        // refresh the icebox and the groups
        syncGroupsFromDb(function() {
          sendResponse({status: "OK"});
        });
      },
      error: function() {
        chrome.extension.sendRequest({action: 'error', message: 'Error while moving the tab in the db'});
      }
    });
    // 4.3. decrement the index of the above tabs in the destination group
    Storage.update({
      table: "tabs",
      conditions: "`group_id`="+src_gid+" AND `index`>"+src_index,
      changes: {
        raw_sql_index: "`index`-1"
      },
      success: function() {},
      error: function() {}
    });
  } else if(interaction == "DI09") {
    // DI09 – Close a tab
    // 3. The background page sends a request to the browser to close the corresponding tab
    var gid = request.gid;
    var index = request.index;
    getTabFromTid(gid, index, function(window, tab) {
      var tid = tab.id;
      chrome.tabs.remove(tid);
    });
    // 4. -On success-, the background page deletes the tab from the database
    Storage.delete({
      table: "tabs",
      conditions: "`group_id`="+gid+" AND `index`="+index,
      success: function() {
        // decrement other tabs indexes for the same group
        Storage.update({
          table: "tabs",
          conditions: "`group_id`="+gid+" AND `index`>"+index,
          changes: {
            raw_sql_index: "`index`-1"
          },
          success: function() {
            // refresh the icebox and the groups
            syncGroupsFromDb(function() {
              sendResponse({status: "OK"});
            });
          },
          error: function() {
            // having an error here doesn't mean this is wrong: it just means
            // that the removed tab was the last one
            
            // refresh the icebox and the groups
            syncGroupsFromDb(function() {
              sendResponse({status: "OK"});
            });
          }
        });
        // remove the right tab in the groups array
        /*for(var g in groups) {
          var group = groups[g];
          if(group.id == gid) {
            for(var t in group.tabs) {
              var tab = group.tabs[t];
              if(t == index) {
                delete groups[g].tabs[t];
                return;
              }
            }
          }
        }*/
      },
      error: function() {
        chrome.extension.sendRequest({action: 'error', message: 'Error while deleting the tab in the db'});
      }
    });
  }
});


/**
 * INITIALIZE THE EXTENSION
 */

// At first execution of Tab Sugar...
var initialized = localStorage.initialized == "true";
if(!initialized) {
  // initialize the database
  Storage.init({
    success: function() {
      // load the icebox
      SugarGroup.load_icebox({
        success: function(rs) {
          // the extension has been initialized with all the already opened tabs
          localStorage.initialized = "true";
          // tab preview feature is ON by default
          localStorage.feature_tab_preview = "true";
          // tabs resizing feature is ON by default
          localStorage.feature_autoresize = "true";
          // snap groups feature is OFF by default
          localStorage.feature_snapgroups = "false";
          // the next group will be identified as "group 1"
          localStorage.group_last_index = 0;
          // initialize the extension by listing all the tabs of all the windows
          chrome.windows.getAll({populate:true}, function (windows) {
            console.debug('chrome.windows.getAll', windows);
            chrome.windows.getCurrent(function(current_window) {
              var gid = 1;
              for(var w in windows) {
                var group = icebox;
                if(current_window.id != w.id) {
                  group = new SugarGroup({id: gid, width: 400, height: 150, posX: 10, posY: 10+gid*180});
                }
                var tabs = windows[w].tabs;
                for(var t in tabs) {
                  var tab = tabs[t];
                  if(SugarTab.persistable(tab.url)) {
                    var tab = new SugarTab(tab);
                    group.add_tab(tab, true);
                  }
                }
                if(current_window.id != w.id && group.tabs.length > 0) {
                  group.db_insert({
                    success: function() {}
                  });
                  groups.push(group);
                  gid++;
                }
              }
              track('Background', 'Initialize', 'Initialize the extension with the default features and a listing of each opened windows and tabs', icebox.tabs.length);
            });
          });
        }
      });
    }
  });
} else { // already initialized
  // let's sync with the db
  syncGroupsFromDb(function() {});
  track('Background', 'Developer traces', '', localStorage.debug=="true");
  track('Background', 'Tab preview feature', '', localStorage.feature_tab_preview=="true");
  track('Background', 'Auto resize feature', '', localStorage.feature_autoresize=="true");
}


/**
 * BROWSER INTERACTIONS
 * @see http://github.com/arnaud/chrome-tab-sugar/wiki/Interactions
 */

// BI01 – Create a window
//TODO

// BI02 – Focus a window
//TODO

// BI03 – Close a window
//TODO

// BI04 – Attach a tab to a window
//TODO

// BI05 – Create a tab
chrome.tabs.onCreated.addListener(function(tab) {
  console.debug('chrome.tabs.onCreated', tab);
  chrome.tabs.getSelected(null, function(t2) {
    chrome.windows.getCurrent(function(window) {
      chrome.extension.sendRequest({action: "new tab", wid: window.id, tab: tab});
    });
  });
});

// BI06 – Detach a tab from a window
//TODO

// BI07 – Move a tab within a window
//TODO

// BI08 – Close a tab
chrome.tabs.onRemoved.addListener(function(tabId) {
  console.debug('chrome.tabs.onRemoved', tabId);
  chrome.windows.getCurrent(function(window) {
    chrome.extension.sendRequest({action: "close tab", window: window.id, tid: tabId});
  });
  //TODO tabs.unshift(tab);
});

// BI09 – Select a tab
chrome.tabs.onSelectionChanged.addListener(function(tabId, selectInfo) {
  console.debug('chrome.tabs.onSelectionChanged', tabId, selectInfo);
  captureCurrentTab();
});

// BI10 – Update a tab
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if(changeInfo.status == "complete") {
    console.debug('chrome.tabs.onUpdated', tabId, changeInfo, tab);
    chrome.windows.getCurrent(function(window) {
      chrome.extension.sendRequest({action: "update tab", wid: window.id, tab: tab});
      captureCurrentTab();
    });
  }
});

// BI11 – Click on the extension action button
chrome.browserAction.onClicked.addListener(openTabSugar);


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
