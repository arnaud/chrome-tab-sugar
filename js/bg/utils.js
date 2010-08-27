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
 * UTILITY FUNCTIONS
 */

function openTabSugar(tab) {
  console.debug('chrome.browserAction.onClicked', tab);

  // URL of the Sugar Tab dashboard
  var sugar_url = chrome.extension.getURL("sugar.html");

  var updated = false;

  // check wether Sugar Tab is already opened in the current window
  chrome.windows.getCurrent(function(cur_win) {
    var wid = cur_win.id;
    getWindowWithTabs(wid, function(window) {
      for(var t in window.tabs) {
        var tab = window.tabs[t];
        if(tab.url == sugar_url) {
          // reuse the last dashboard and reload it
          chrome.tabs.update(tab.id, {url: sugar_url, selected: true});
          updated = true;
        }
      }
      if(!updated) {
        // no dashboard were reused
        chrome.tabs.getSelected(wid, function(tab) {
          if(tab.url == 'chrome://newtab/') {
            // let's reuse the current 'new tab' tab
            chrome.tabs.update(tab.id, {url: sugar_url, selected: true});
          } else {
            // let's create a new tab
            chrome.tabs.create({url: sugar_url});
          }
        });
      }
    }, function() {
      // couldn't find the current window?!?
      chrome.tabs.create({url: sugar_url});
    });
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
      //if(SugarTab.persistable(tab.url)) {
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
      //}
    });
  });
}

// checks whether the group matches the window
// @param exceptionTab: optional, a tab that is contained by the window but that
// must not be part of the comparison
function compareGroupAndWindow(group, window, exceptionTab) {
  console.debug('compareGroupAndWindow', group, window);
  var tabs = window.tabs;
  var window_tabs = [];
  for(var t in tabs) {
    var tab = tabs[t];
    //if(SugarTab.persistable(t.url)) {
      /*if(exceptionTab!=null && tab.id == exceptionTab.id) {
        // do nothing
      } else*/ //if(tab.status == 'loading') {
        // do nothing
      //} else {
        window_tabs.push(tab);
      //}
    //}
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
      return true;
    }
  } else {
    console.debug('=> KO');
    return false;
  }
}

function getWindowWithTabs(wid, success, error) {
  chrome.windows.getAll({populate:true}, function(windows) {
    for(var w in windows) {
      var window = windows[w];
      if(window.id == wid) {
        success(window);
        return;
      }
    }
    if(error) error();
  });
}

// finds out which group corresponds to a window id
function getGroupFromWid(wid, callback) {
  console.debug('getGroupFromWid', wid);
  var gid = parseInt( sessionStorage['w'+wid] );
  console.debug('getGroupFromWid', 'gid=', gid);
  if(gid == null || isNaN(gid)) {
    console.warn('Group not found for window #'+wid);
    return;
  }
  for(var g in groups) {
    var group = groups[g];
    if(group.id == gid) {
      callback(group);
      break;
    }
  }
}

// finds out which window corresponds to a group id
function getWindowFromGid(gid, callback, error) {
  console.debug('getWindowFromGid', gid);
  var wid = parseInt( sessionStorage['g'+gid] );
  console.debug('getWindowFromGid', 'wid=', wid);
  if(wid == null || isNaN(wid)) {
    console.warn('Window not found for group #'+gid);
    if(error) error();
    return;
  }
  getWindowWithTabs(wid, function(window) {
    bindWindowToGroup(wid, gid);
    callback(window);
  }, error);
}

// binds a window to a group in the session storage
function bindWindowToGroup(wid, gid) {
  sessionStorage['g'+gid] = wid;
  sessionStorage['w'+wid] = gid;
}

// let windows and groups match together
function matchWindowsAndGroups(callback) {
  console.debug('matchWindowsAndGroups');
  chrome.windows.getAll({populate:true}, function(windows) {
    for(var w in windows) {
      var window = windows[w];
      for(var g in groups) {
        var group = groups[g];
        if(compareGroupAndWindow(group, window)) {
          bindWindowToGroup(window.id, group.id);
        }
      }
    }
    if(callback) callback();
  });
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
      //if(SugarTab.persistable(t.url)) {
        idx++;
      //}
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

// find the window a tab belongs to
function getWidFromTid(tid, callback) {
  chrome.windows.getAll({populate:true}, function(windows) {
    for(var w in windows) {
      var window = windows[w];
      for(var t in window.tabs) {
        var tab = window.tabs[t];
        if(tab.id == tid) {
          callback(window.id, window);
          return;
        }
      }
    }
  });
}

// syncs the the 'icebox' and 'groups' variables with the ones from the database
function syncGroupsFromDb(callback) {
  console.debug('SYNC');
  icebox = null;
  groups = [];
  SugarGroup.load_icebox({
    success: function(rs) {
      // load the other groups
      SugarGroup.load_groups({
        success: function() {
          // let the windows and groups make a match
          matchWindowsAndGroups();
          // do our little thing
          callback();
        }
      });
    }
  });
}
