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

function shorten_text(text) {
  text = "" + text;
  return text.substr(0,40)+((text.length>40)?'...':'');
}

/**
 * @class SugarGroup
 * @param item (Hash) -> { (id,) name, (posX, posY, width, height) }
 */
var SugarGroup = new JS.Class({
  initialize: function(item) {
    console.debug("Group initialize", item);
    if(typeof(item)=='undefined') return;
    this.id = item.id;
    this.name = item.name;
    if(!this.name) this.name = "New group";
    this.posX = item.posX;
    this.posY = item.posY;
    this.width = item.width;
    this.height = item.height;
    this.tabs = [];
    //if(item.tabs) {
    //  for(var t in item.tabs) {
    //    var tab = item.tabs[tab];
    //    var tab = new SugarTab(tab);
    //    this.tabs.push(tab);
    //  }
    //}
  },

  to_s: function() {
    console.debug("Group to_s");
    return 'Group "' + this.name + '"';
  },

  add_tab: function(tab, persist) {
    console.debug("Group add_tab", tab);

    // 1. Map the tab to the group
    tab.group_id = this.id;

    // 2. Insert the tab at the right index
    if(tab.index == null || tab.index == -1) {
      this.tabs.push(tab);
    } else {
      var i = 0;
      for(var t in this.tabs) {
        if(tab.index <= t.index) break;
        i++;
      }
      this.tabs.splice(i,0,tab);
    }

    // 3. Persist the tab
    if(persist) {
      tab.db_insert();
    }
  },

  remove_tab: function(tab) {
    console.debug("Group remove_tab", tab);
    var i = 0;
    for(var t in this.tabs) {
      if(t.url == tab.url) {
        this.tabs.splice(i, 1);
      }
      i++;
    }
    this.db_save();
  },

  // PERSISTABLE methods

  db_save: function() {
    console.debug("Group save", this);
    var group = this;
    db.transaction(function (tx) {
      console.debug("Saving group into db");
      if(group.id == null || group.id == -1) {
        group.db_insert();
      } else {
        db.transaction(function(tx) {
          tx.executeSql("SELECT * FROM groups WHERE id=?", [ group.id ], function(tx, res) {
            if (res.rows && res.rows.length == 1) {
              group.db_update();
            } else {
              group.db_insert();
            }
          }, function(tx, err) {
            console.error("An error occurred while testing the presence of the group in the db", err);
          });
        });
      }
    });
  },

  db_insert: function() {
    console.debug("Group insert", this);
    var group = this;
    db.transaction(function (tx) {
      tx.executeSql("INSERT INTO groups (id,name,posX,posY,width,height) VALUES (?,?,?,?,?,?)",
                    [ group.id, group.name, group.posX, group.posY, group.width, group.height ],
                    function (tx, res) {
        if (!res.rowsAffected) {
          console.error("An error occurred while inserting the group in the db");
        }
        localStorage.group_last_index = group.id;
      }, function (tx, err) {
        console.error("An error occurred while inserting the group in the db", err);
      });
    });
  },

  db_update: function(key, val) {
    console.debug("Group update", this, key, val);
    var group = this;
    db.transaction(function (tx) {
      tx.executeSql("UPDATE groups SET "+key+"=? WHERE id=?",
                    [ val, group.id ],
                    function (tx, res) {
        if (res.rowsAffected) {
          group[key] = val;
        } else {
          console.error("An error occurred while updating the group in the db", tx, res);
        }
      }, function (tx, err) {
        console.error("An error occurred while updating the group in the db", err);
      });
    });
  },

  db_delete: function() {
    console.debug("Group delete", this);
    var group = this;
    db.transaction(function (tx) {
      tx.executeSql("DELETE FROM tabs WHERE group_id=?",
                    [ group.id ],
                    function (tx, res) {
        if (!res.rowsAffected) {
          console.error("An error occurred while deleting the tabs in the db", tx, res);
        }
      }, function (tx, err) {
        console.error("An error occurred while deleting the tabs in the db", err);
      });
      tx.executeSql("DELETE FROM groups WHERE id=?",
                    [ group.id ],
                    function (tx, res) {
        if (!res.rowsAffected) {
          console.error("An error occurred while deleting the group in the db", tx, res);
        }
      }, function (tx, err) {
        console.error("An error occurred while deleting the group in the db", err);
      });
    });
  },

  // UI methods

  ui_create: function() {
    console.debug("Group UI create");
    //if(!this.id) this.id = Math.floor(Math.random()*1001);
    if(!this.name) this.name = "New group";
    var group = $('<section class="group" id="group-'+this.id+'"><span class="title">'+this.name+'</span><div class="close"></div><ul></ul><div class="debug" /><div class="clear" /></section>')
      .css('width', this.width+'px').css('height', this.height+'px').css('position', 'absolute').css('top', this.posY+'px').css('left', this.posX+'px')
      .attr('obj', JSON.stringify(this));
    if(localStorage.debug=="true") {
      $('.debug', group).html('Group #'+this.id);
    }
    return group;
  },

  ui_get: function() {
    console.debug("Group UI get");
    return $('#group-'+this.id);
  },

  // class methods
  extend: {
    // find a group by its id
    find: function(id) {
      console.debug("Group find", id);
      console.warn("TODO");
    },

    // loads the icebox
    load_icebox: function() {
      console.debug("Group load_icebox");
      db.transaction(function (tx) {
        tx.executeSql("SELECT * FROM groups WHERE id=0", [], function (tx, res) {
          console.debug("Loading the icebox from db");
          if (res.rows && res.rows.length == 1) {
            var icebox_item = res.rows.item(0);
            icebox = new SugarGroup(icebox_item);
            tx.executeSql("SELECT * FROM tabs WHERE group_id=0 ORDER BY zindex DESC", [], function (tx, res) {
              console.debug("Loading "+(res.rows ? res.rows.length : 0)+" tabs from db");
              if (res.rows && res.rows.length) {
                for (var j = 0; j < res.rows.length; j++) {
                  var tab_item = res.rows.item(j);
                  var tab = new SugarTab(tab_item);
                  icebox.add_tab(tab, false);
                }
              }
            }, function (tx, err) {
              console.error("An error occurred while loading icebox from db", err);
            });
          }
        }, function (tx, err) {
          console.error("An error occurred while loading icebox from db", err);
        });
      });
    },

    // loads all groups
    load_groups: function() {
      console.debug("Group load_groups");
      groups = [];
      db.transaction(function (tx) {
        tx.executeSql("SELECT * FROM groups WHERE id<>0 ORDER BY id DESC", [], function (tx, res) {
          console.debug("Loading "+(res.rows ? res.rows.length : 0)+" groups from db");
          for(var r=0; r<res.rows.length; r++) {
            // groups
            var group_item = res.rows.item(r);
            var group = new SugarGroup(group_item);
            groups.push(group);
            // tabs
            tx.executeSql("SELECT * FROM tabs WHERE group_id=? ORDER BY zindex DESC", [ group.id ], function (tx, res) {
              console.debug("Loading "+(res.rows ? res.rows.length : 0)+" tabs for group "+group.id+" from db");
              for(var r=0; r<res.rows.length; r++) {
                var tab_item = res.rows.item(r);
                var tab = new SugarTab(tab_item);
                for(var g in groups) {
                  var grp = groups[g];
                  if(grp.id == tab.group_id) {
                    groups[g].add_tab(tab, false);
                  }
                }
              }
            }, function (tx, err) {
              console.error("An error occurred while loading groups from db", err);
            });
          }
        });
      });
    },

    next_index: function() {
      var index = 1;
      if(localStorage.group_last_index) {
        index = parseInt(localStorage.group_last_index) + 1;
      }
      return index;
    }
  }
});

/**
 * @class SugarTab
 * @param item (Hash) -> { (id,) title, url, favIconUrl, index (, preview, group_id) }
 */
var SugarTab = new JS.Class({
  initialize: function(item) {
    console.debug("Tab initialize", item);
    if(typeof(item)=='undefined') return;
    this.group_id = item.group_id;
    if(typeof(this.group_id)!="number") this.group_id = 0;
    this.index = item.index;
    if(typeof(this.index)!="number") this.index = item.zindex;
    this.title = item.title;
    this.url = item.url;
    this.favIconUrl = item.favIconUrl;
    if(!this.favIconUrl) this.favIconUrl = "ico/blank_preview.png";
    this.preview = item.preview;
  },

  to_s: function() {
    console.debug("Tab to_s");
    return 'Tab "' + this.title + '"';
  },

  update_preview: function(preview) {
    console.debug("Tab update_preview", parseInt(preview.length/1024)+"KB");
    this.db_update("preview", preview);
  },

  // PERSISTABLE methods

  db_save: function() {
    console.debug("Tab save", this);
    var tab = this;
    db.transaction(function (tx) {
      console.debug("Saving tab into db");
      if(tab.id == null || tab.id == -1) {
        tab.db_insert();
      } else {
        console.error("TODO: db_save / update mode");
        //tab.db_update(key, val);
      }
    });
  },

  db_insert: function() {
    console.debug("Tab insert", this);
    var tab = this;
    db.transaction(function (tx) {
      tx.executeSql("INSERT INTO tabs (title,url,favIconUrl,group_id,zindex) VALUES (?,?,?,?,?)",
                    [ tab.title, tab.url, tab.favIconUrl, tab.group_id, tab.index ],
                    function (tx, res) {
        if (!res.rowsAffected) {
          console.error("An error occurred while inserting the tab in the db");
        }
        //tab.id = res.insertId;
      }, function (tx, err) {
        console.error("An error occurred while inserting the tab in the db", err);
      });
    });
  },

  db_update: function(key, val) {
    console.debug("Tab update", this, key, shorten_text(val));
    var tab = this;
    if(key=="index") key = "zindex";
    db.transaction(function (tx) {
      if(typeof(tab.group_id)=="number" && typeof(tab.index)=="number") {
        tx.executeSql("UPDATE tabs SET "+key+"=? WHERE group_id=? and zindex=?",
                      [ val, tab.group_id, tab.index ],
                      function (tx, res) {
          if (res.rowsAffected) {
            if(key=="zindex") key = "index";
            tab[key] = val;
          } else {
            console.error("An error occurred while updating the tab in the db");
          }
        }, function (tx, err) {
          console.error("An error occurred while updating the tab in the db", err);
        });
      } else {
        tx.executeSql("UPDATE tabs SET "+key+"=? WHERE url=?",
                      [ val, tab.url ],
                      function (tx, res) {
          if (res.rowsAffected) {
            if(key=="zindex") key = "index";
            tab[key] = val;
          } else {
            console.error("An error occurred while updating the tab in the db");
          }
        }, function (tx, err) {
          console.error("An error occurred while updating the tab in the db", err);
        });
      }
    });
  },

  db_delete: function() {
    console.debug("Tab delete", this);
    var tab = this;
    db.transaction(function (tx) {
      tx.executeSql("DELETE FROM tabs WHERE group_id=? and zindex=?",
                    [ tab.group_id, tab.index ],
                    function (tx, res) {
        if (!res.rowsAffected) {
          console.error("An error occurred while deleting the tab in the db", tx, res);
        }
      }, function (tx, err) {
        console.error("An error occurred while deleting the tab in the db", err);
      });
    });
  },

  // UI methods

  ui_create: function() {
    console.debug("Tab UI create");
    var preview;
    if(this.preview==null || localStorage.feature_tab_preview!="true") {
      preview = '<img class="preview empty" />';
    } else {
      preview = '<img class="preview" src="'+this.preview+'" />';
    }
    return $('<li class="tab"><div>'+preview+'<img class="favicon" src="'+this.favIconUrl+'" /><span class="title"><span>'+this.title+'</span></span><span class="url">'+this.url+'</span><div class="close"></div></div></li>')
      .attr('obj', JSON.stringify(this));
  },

  // CLASS METHODS

  extend: {
    // find a tab by its id
    find: function(id) {
      console.debug("Tab find", id);
      console.warn("TODO");
    },

    // tests whether an url is persistable in the db
    // filters all the "chrome://*" special pages
    persistable: function(url) {
      var res = !SugarTab.CHROME_PAGE.exec(url);
      console.debug("Tab persistable", res, shorten_text(url));
      return res;
    },

    // search for tabs by title or url
    search: function(text) {
      console.debug("Tab search", text);
      console.warn("TODO");
    },

    // CONSTANTS
    CHROME_PAGE: /(chrome|chrome-extension):\/\/.*/
  }
});
