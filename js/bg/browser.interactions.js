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
  track('Sugar', 'Create a tab', 'Create a tab in a window');
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
        syncGroupsFromDb(function() {});
        // 4. The background page sends a request to the dashboard
        chrome.extension.sendRequest({action: "BI05", gid: gid, tab: tab});
      },
      error: function() {
        console.error('OOOOPS');
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
  // 1. The user opens a new tab
  console.debug('chrome.tabs.onRemoved', tabId);
  chrome.windows.getCurrent(function(window) {
    // 2. The browser sends a request to the background page
    getWidFromTid(tabId, function(wid, window) {
      getGroupFromWid(wid, function(group) {
        var cur_tab;
        for(var t in group.tabs) {
          var tab = group.tabs[t];
          if(tab.url == tabId.url) {
            cur_tab = tab;
            break;
          }
        }
        if(cur_tab != null) {
          chrome.extension.sendRequest({action: "B08", gid: group.id, tab: cur_tab});
        }
      });
    });
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
    console.debug('chrome.tabs.onUpdated', tab);
    track('Sugar', 'Update a tab', 'Update a tab in a window');
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
            syncGroupsFromDb(function() {});
            // 4. The background page sends a request to the dashboard
            chrome.extension.sendRequest({action: "BI10", gid: gid, tab: tab});
          },
          error: function() {
            console.error('OOOOPS');
          }
        });
      });
    });
  }
});

// BI11 – Click on the extension action button
chrome.browserAction.onClicked.addListener(openTabSugar);
