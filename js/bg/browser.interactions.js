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
 * BROWSER INTERACTIONS
 * @see http://github.com/arnaud/chrome-tab-sugar/wiki/Interactions
 */

// BI01 – Create a window
chrome.windows.onCreated.addListener(function(window) {
  console.log('Live interaction:', 'BI01', window);
  track('Browser', 'Create a window', 'Create a window');
  // handle when a window is created because of a dashboard interaction
  if(sessionStorage.new_window_from_dashboard == "true") {
    sessionStorage.new_window_from_dashboard = false;
    return;
  }
  // 1. The user opens a new window
  //&2. The browser sends a request to the background page
  var wid = window.id;
  // 3. The background page inserts the new group and its tab in the database
  var g_pos = SugarGroup.next_position();
  var group = new SugarGroup({
    id: SugarGroup.next_index(),
    name: null,
    posX: g_pos.x,
    posY: g_pos.y,
    width: 300,
    height: 150,
    incognito: false,
    type: "normal"
  });
  group.db_insert({
    success: function() {
      bindWindowToGroup(wid, group.id);
      syncGroupsFromDb();
      // 4. The background page sends a request to the dashboard
      chrome.extension.sendRequest({action: "BI01", group: group});
    },
    error: function(err) {
      console.error('BI01 - Create a window', err);
      chrome.extension.sendRequest({action: 'error', message: 'Error while inserting a group in the db [BI01]'});
    }
  });
});

// BI02 – Focus a window
chrome.windows.onFocusChanged.addListener(function(windowId) {
  console.log('Live interaction:', 'BI02', windowId);
  track('Browser', 'Focus a window', 'Focus a window');
  if(windowId == chrome.windows.WINDOW_ID_NONE) {
    // unfocus
    //TODO
  } else {
    // focus
    //TODO
  }
});

// BI03 – Close a window
chrome.windows.onRemoved.addListener(function(windowId) {
  console.log('Live interaction:', 'BI03', windowId);
  track('Browser', 'Close a window', 'Close a window');
  // 1. The user closes a window (Alt+F4)
  getGroupFromWid(windowId, function(group) {
    var name = group.name;
    if(name != null && name != "") {
      // keep it
    } else {
      // delete it
      // 2. The browser sends a request to the background page
      //&3. The background page deletes the corresponding group and its tabs from the database
      group.db_delete({
        success: function() {
          // refresh the groups
          syncGroupsFromDb();
          // 4. The background page sends a request to the dashboard
          chrome.extension.sendRequest({action: "BI03", gid: group.id});
        },
        error: function(err) {
          console.error('BI03 - Close a window', err);
          chrome.extension.sendRequest({action: 'error', message: 'Error while removing a group in the db [BI03]'});
        }
      });
      chrome.extension.sendRequest({action: "BI01", group: group});
    }
  });
});

// BI04 – Attach a tab to a window
chrome.tabs.onAttached.addListener(function(tabId, attachInfo) {
  console.log('Live interaction:', 'BI04', tabId, attachInfo);
  track('Browser', 'Attach a tab', 'Attach a tab to a window');
  // 1. The user attaches a tab to a window
  //&2. The browser sends a request to the background page
  var tid = tabId;
  var wid_dest = attachInfo.newWindowId;
  var index_dest = attachInfo.newPosition;
  var detachInfo = JSON.parse(sessionStorage.detached_tab);
  var wid_src = detachInfo.wid;
  var index_src = detachInfo.index;
  // 3. The background page updates the tab's window and index in the database
  sessionStorage.detached_tab = null; // nullify the detached tab data in storage
  getGroupFromWid(wid_src, function(group_src) {
    var gid_src = group_src.id;
    getGroupFromWid(wid_dest, function(group_dest) {
      var gid_dest = group_dest.id;
      Storage.update({
        table: "tabs",
        conditions: "`group_id`="+gid_src+" AND `index`="+index_src,
        changes: {
          group_id: gid_dest,
          index: index_dest
        },
        success: function() {
          syncGroupsFromDb();
          // 4. The background page sends a request to the dashboard
          chrome.extension.sendRequest({
            action: "BI04",
            tab_src: {
              group_id: gid_src,
              index: index_src
            },
            tab_dest: {
              group_id: gid_dest,
              index: index_dest
            }
          });
        },
        error: function(err) {
          console.error('BI04 - Attach a tab to a window', err);
          chrome.extension.sendRequest({action: 'error', message: 'Error while moving a tab in the db [BI04]'});
        }
      });
    });
  });
});

// BI05 – Create a tab
chrome.tabs.onCreated.addListener(function(tab) {
  console.log('Live interaction:', 'BI05', tab);
  track('Browser', 'Create a tab', 'Create a tab in a window');
  // 1. The user opens a new tab
  //&2. The browser sends a request to the background page
  var tab_backup = tab;
  var wid = tab.windowId;
  getGroupFromWid(wid, function(group) {
    var gid = group.id;
    var tab = new SugarTab(tab_backup);
    tab.group_id = gid;
    tab.db_insert({
      success: function() {
        // refresh the groups
        syncGroupsFromDb();
        // 4. The background page sends a request to the dashboard
        chrome.extension.sendRequest({action: "BI05", gid: gid, tab: tab});
      },
      error: function(err) {
        console.error('BI05 - Create a tab', err);
        chrome.extension.sendRequest({action: 'error', message: 'Error while inserting a tab in the db [BI05]'});
      }
    });
  });
});

// BI06 – Detach a tab from a window
chrome.tabs.onDetached.addListener(function(tabId, detachInfo) {
  console.log('Live interaction:', 'BI06', tabId, detachInfo);
  track('Browser', 'Detach a tab', 'Detach a tab from a window');
  // 1. The user detaches a tab from its window
  //&2. The browser sends a request to the background page
  var tid = tabId;
  var wid = detachInfo.oldWindowId;
  var index = detachInfo.oldPosition;
  // 3. The background page keeps track of the currently dragged tab
  sessionStorage.detached_tab = JSON.stringify({wid: wid, tid: tid, index: index});
});

// BI07 – Move a tab within a window
chrome.tabs.onMoved.addListener(function(tabId, moveInfo) {
  console.log('Live interaction:', 'BI07', tabId, moveInfo);
  track('Browser', 'Move a tab', 'Move a tab within a window');
  //TODO
});

// BI08 – Close a tab
chrome.tabs.onRemoved.addListener(function(tabId) {
  console.log('Live interaction:', 'BI08', tabId);
  track('Browser', 'Close a tab', 'Close a tab in a window');
  // 1. The user closes a tab
  //&2. The browser sends a request to the background page
  getWidFromTid(tabId, function(wid, window) {
    console.warn('02', wid, window);
    getGroupFromWid(wid, function(group) {
      console.warn('03', group);
      var diff = diffTabs(group.tabs, window.tabs);
      console.debug('diff:', diff);
      var cur_tab;
      if(diff.length > 0) {
        cur_tab = diff[0];
      }
      console.warn('04', cur_tab != null);
      if(cur_tab != null) {
        // 3. The background page deletes the corresponding tab from the database
        Storage.remove({
          table: "tabs",
          conditions: "`group_id`="+group.id+" AND `index`="+cur_tab.index,
          success: function() {
            console.warn('05', 'success');
            // refresh the groups
            syncGroupsFromDb();
            // 4. The background page sends a request to the dashboard
            chrome.extension.sendRequest({action: "BI08", gid: group.id, tab: cur_tab});
          },
          error: function(err) {
            console.error('BI08 - Close a tab', err);
            chrome.extension.sendRequest({action: 'error', message: 'Error while removing a tab from the db [BI08]'});
          }
        });
      }
    });
  });
});

// BI09 – Select a tab
chrome.tabs.onSelectionChanged.addListener(function(tabId, selectInfo) {
  console.log('Live interaction:', 'BI09', tabId, selectInfo);
  track('Browser', 'Select a tab', 'Select a tab');
  // capture the tab so that we prepare a preview that'll be displayed in the dashboard
  captureCurrentTab();
  // Also select the tab in the db
  /*var wid = selectInfo.windowId;
  getGroupFromWid(wid, function(group) {
    var gid = group.id;
    var index = 0; //TODO
    Storage.update({
      table: "tabs",
      conditions: "`group_id`="+gid+" AND `index`="+index,
      changes: {
        selected: 1
      },
      success: function() {
        syncGroupsFromDb();
        // 4. The background page sends a request to the dashboard
        chrome.extension.sendRequest({action: "BI10", gid: gid, tab: tab});
      },
      error: function(err) {
        console.error('BI09 - Select a tab', err);
        chrome.extension.sendRequest({action: 'error', message: 'Error while selecting a tab in the db [BI09]'});
      }
    });
  });*/
});

// BI10 – Update a tab
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  console.log('Live interaction:', 'BI10', tabId, changeInfo, tab);
  //if(changeInfo.status == "complete") {
    track('Browser', 'Update a tab', 'Update a tab in a window');
    // 1. The user changes the URL of a tab, navigates through a link, browse the web
    //&2. The browser sends a request to the background page
    var tab_backup = tab;
    getWidFromTid(tabId, function(wid, window) {
      getGroupFromWid(wid, function(group) {
        var gid = group.id;
        var index = tab_backup.index;
        var tab = new SugarTab(tab_backup);
        tab.group_id = gid;
        Storage.update({
          table: "tabs",
          conditions: "`group_id`="+gid+" AND `index`="+index,
          changes: {
            url: tab.url,
            title: tab.title
          },
          success: function() {
            syncGroupsFromDb();
            // 4. The background page sends a request to the dashboard
            chrome.extension.sendRequest({action: "BI10", gid: gid, tab: tab});
          },
          error: function(err) {
            console.error('BI10 - Update a tab', err);
            chrome.extension.sendRequest({action: 'error', message: 'Error while updating a tab in the db [BI10]'});
          }
        });
      });
    });
  //}
});

// BI11 – Click on the extension action button
chrome.browserAction.onClicked.addListener(function() {
  console.log('Live interaction:', 'BI11');
  track('Browser', 'BI11', 'Click on the extension action button');
  openDashboard();
});
