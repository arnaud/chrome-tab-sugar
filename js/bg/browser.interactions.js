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
  console.warn('Live interaction:', 'BI01', window);
  track('Browser', 'Create a window', 'Create a window');
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
    height: 150
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
//TODO

// BI03 – Close a window
//TODO

// BI04 – Attach a tab to a window
//TODO

// BI05 – Create a tab
chrome.tabs.onCreated.addListener(function(tab) {
  console.warn('Live interaction:', 'BI05', tab);
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
//TODO

// BI07 – Move a tab within a window
//TODO

// BI08 – Close a tab
chrome.tabs.onRemoved.addListener(function(tabId) {
  console.warn('Live interaction:', 'BI08', tabId);
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
            // decrement other tabs indexes for the same group
            Storage.update({
              table: "tabs",
              conditions: "`group_id`="+gid+" AND `index`>"+index,
              changes: {
                raw_sql_index: "`index`-1"
              },
              success: function() {
                // refresh the icebox and the groups
                syncGroupsFromDb();
              },
              error: function() {
                // having an error here doesn't mean this is wrong: it just means
                // that the removed tab was the last one
                
                // refresh the icebox and the groups
                syncGroupsFromDb();
              }
            });
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
  console.warn('Live interaction:', 'BI09', tabId, selectInfo);
  captureCurrentTab();
});

// BI10 – Update a tab
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  console.warn('Live interaction:', 'BI10', tabId, changeInfo, tab);
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
  console.warn('Live interaction:', 'BI11');
  openDashboard();
});
