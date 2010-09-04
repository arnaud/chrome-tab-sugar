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
 * MESSAGE PASSING with both the dashboard and the options pages
 */

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  var interaction = request.action;
  console.warn('Live interaction:', interaction, request);

  if(interaction == "open") {
    openDashboard();

  } else if(request.action == "gimme the shortcut key") {
    // BI12 – Use the extension shortcut key
    sendResponse({shortcut_key: localStorage.shortcut_key});

  } else if(request.action == "gimme the tab preview") {
    // Get the preview of a tab
    var tab = request.tab;
    var url = tab.url;
    Storage.select({
      table: "previews",
      what: "preview",
      conditions: "`url`='"+url.replace(/'/g,"''")+"'",
      success: function(tx, rs) {
        if(rs.rows && rs.rows.length > 0) {
          console.debug("Tab preview found", tx, rs);
          var preview = rs.rows.item(0).preview;
          chrome.extension.sendRequest({action: 'update tab preview', tab: tab, preview: preview});
        }
      },
      error: function() {}
    });


  /* Dashboard Interactions */


  } else if(interaction == "DI01") {
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
        // refresh the groups
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
        // refresh the groups
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
        // refresh the groups
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
    Storage.remove({
      table: "groups",
      conditions: "`id`="+gid,
      success: function() {
        // refresh the groups
        syncGroupsFromDb(function() {
          sendResponse({status: "OK"});
        });
      },
      error: function() {
        chrome.extension.sendRequest({action: 'error', message: 'Error while deleting the group in the db'});
      }
    });

  } else if(interaction == "DI06") {
    // DI06 – Move a tab to the dashboard
    var src_tab = request.src_tab;
    var dest_group = request.dest_group;
    // 3. The background page sends a request to the browser to close the corresponding tab
    getTabFromTid(src_tab.group_id, src_tab.index, function(window, tab) {
      var tid = tab.id;
      chrome.tabs.remove(tid);
    });
    // 4. -On success-, the background page inserts a new group and updates the tab’s group id in the database
    dest_group = new SugarGroup(dest_group);
    dest_group.db_insert({
      success: function() {
        Storage.update({
          table: "tabs",
          conditions: "`group_id`="+src_tab.group_id+" AND `index`="+src_tab.index,
          changes: {
            group_id: dest_group.id,
            index: 0
          },
          success: function() {
            // refresh the groups
            syncGroupsFromDb(function() {
              sendResponse({status: "OK"});
            });
          },
          error: function() {
            chrome.extension.sendRequest({action: 'error', message: 'Error while moving the tab to the new group in the db'});
          }
        });
      },
      error: function() {
        chrome.extension.sendRequest({action: 'error', message: 'Error while creating the new group in the db'});
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
    // 4.2. move the tab
    Storage.update({
      table: "tabs",
      conditions: "`group_id`="+src_gid+" AND `index`="+src_index,
      changes: {
        group_id: dest_gid,
        index: dest_index
      },
      success: function() {
        // refresh the groups
        syncGroupsFromDb(function() {
          sendResponse({status: "OK"});
        });
      },
      error: function() {
        chrome.extension.sendRequest({action: 'error', message: 'Error while moving the tab in the db'});
      }
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
    Storage.remove({
      table: "tabs",
      conditions: "`group_id`="+gid+" AND `index`="+index,
      success: function() {
        // refresh the groups
        syncGroupsFromDb(function() {
          sendResponse({status: "OK"});
        });
      },
      error: function() {
        chrome.extension.sendRequest({action: 'error', message: 'Error while deleting the tab in the db'});
      }
    });

  } else if(interaction == "DI10") {
    // DI10 – Open all tabs of a group
    var gid = request.gid;
    var focused_url = request.focused_url;
    // 3. The background page sends a request to the browser to create a new window
    // with all the group tabs, and to focus the clicked tab
    var group;
    if(gid > 0) {
      for(var g in groups) {
        group = groups[g];
        if(group.id == gid) break;
      }
    }
    getWindowFromGid(gid, function(window) {
      if(window != null) {
        // 3a. If the window already is open, let's show it
        for(var t in window.tabs) {
          var tab = window.tabs[t];
          if(tab.url == focused_url) {
            chrome.tabs.update(tab.id, {selected: true});
            break;
          }
        }
      } else {
        console.error('Couldn\'t find a window for the group #'+gid);
      }
    }, function() {
      // 3b. If the window isn't open anymore, let's recreate it
      // but before, let's remember that the window that is going to create
      // won't have to be considered as a "new window"
      sessionStorage.new_window_from_dashboard = true;
      var tabs = group.tabs;
      chrome.windows.create({ url: focused_url }, function(window) {
        // with all its tabs
        for(var t in tabs) {
          var tab = tabs[t];
          var index = parseInt(t);
          // don't open the current tab (already opened with the window)
          if(tab.url != focused_url) {
            chrome.tabs.create({ windowId: window.id, index: index, url: tab.url, selected: false });
          }
        }
        // bind the group to the new window
        bindWindowToGroup(window, group);
      });
    });

  } else if(interaction == "DI11") {
    // DI11 – Open a single tab of a group
    var url = request.url;
    // 3. The background page sends a request to the browser to create a new window
    // with a single focused tab
    // but before, let's remember that the window that is going to create
    // won't have to be considered as a "new window"
    sessionStorage.new_window_from_dashboard = true;
    chrome.windows.create({ url: url });

  } else if(interaction == "DI12") {
    // DI12 - Create a new tab
    var gid = request.gid;
    var focused_url = 'chrome://newtab';
    // 3. The background page sends a request to the browser to create a new tab
    // in the corresponding window, and focus it
    getWindowFromGid(gid, function(window) {
      // 3a. the window is already opened, let's add a tab, shall we?
      var wid = window.id;
      chrome.tabs.create({windowId: wid, url: focused_url, selected: true});
    }, function() {
      // 3b. the window doesn't exist yet, let's create it
      sessionStorage.new_window_from_dashboard = true;
      var group = getGroupFromGid(gid);
      var tabs = group.tabs;
      chrome.windows.create({ url: focused_url }, function(window) {
        // with all its tabs
        for(var t in tabs) {
          var tab = tabs[t];
          var index = parseInt(t);
          chrome.tabs.create({ windowId: window.id, index: index, url: tab.url, selected: false });
        }
        // bind the group to the new window
        bindWindowToGroup(window, group);
      });
    });
  }
});
