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

  tabs: [],

  initialize: function(item) {
    console.debug("Group initialize", item);
    if(typeof(item)=='undefined') return;
    this.id = item.id;
    this.name = item.name;
    if(this.name == null) this.name = '';
    this.posX = item.posX;
    this.posY = item.posY;
    this.width = item.width;
    if(!this.width) this.width = 0;
    this.height = item.height;
    if(!this.height) this.height = 0;
    this.tabs = [];
    this.incognito = item.incognito;
    if(this.incognito == false) this.incognito = 0;
    else if(this.incognito == true) this.incognito = 1;
    else this.incognito = 0;
    this.type = item.type;
    if(this.type == null) this.type = "normal";
  },

  to_s: function() {
    console.debug("Group to_s");
    return 'Group "' + this.name + '"';
  },

  add_tab: function(tab, persist, callback) {
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
      tab.db_insert({
        success: function(rs) {
          console.debug("Tab insertion was successfull", rs);
          if(callback != null) callback();
        }
      });
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
    this.db_update({
      success: function(rs) {
        console.debug("Tab removal was successfull", rs);
      }
    });
  },

  // PERSISTABLE methods

  db_insert: function(settings) {
    console.debug("Group insert", this, settings);
    if(settings == null) settings = {};
    Storage.insert({
      table: "groups",
      object: this,
      success: function() {
        localStorage.group_last_index++;
        settings.success();
      },
      error: settings.error
    });
  },

  db_update: function(settings) {
    console.debug("Group update", this, settings.key, settings.val, settings);
    if(settings == null) settings = {};
    var key = settings.key;
    var val = settings.val;
    Storage.update({
      table: "groups",
      conditions: "`id`="+this.id,
      changes: {key: val},
      success: function() {
        this[key] = val;
        settings.success();
      },
      error: settings.error
    });
  },

  db_delete: function(settings) {
    console.debug("Group delete", this);
    if(settings == null) settings = {};
    Storage.remove({
      table: "groups",
      conditions: "`id`="+this.id,
      success: settings.success,
      error: settings.error
    });
  },

  // UI methods

  ui_create: function() {
    console.debug("Group UI create");
    //if(!this.id) this.id = Math.floor(Math.random()*1001);
    var group = $('<section class="group" id="group-'+this.id+'"><input type="text" placeholder="'+chrome.i18n.getMessage('groupTitlePlaceholder')+'" class="title" value="'+this.name+'" spellcheck="false"></input><div class="close"></div></section>')
      .width(this.width)
      .height(this.height)
      .css('position', 'absolute')
      .css('top', this.posY+'px')
      .css('left', this.posX+'px')
      .append($('<ul></ul>'))
      .append($('<div class="new_tab" />'))
      .append($('<div class="debug" />'))
      .append($('<div class="clear" />'));
    if(localStorage.feature_snapgroups=="true") {
      group
        .append($('<div class="snapper main"></div>'))
        .append($('<div class="snapper top"></div>'))
        .append($('<div class="snapper left"></div>'))
        .append($('<div class="snapper right"></div>'))
        .append($('<div class="snapper bottom"></div>'));
    }
    if(localStorage.debug=="true") {
      $('.debug', group).html('Group #'+this.id);
    }
    return group;
  },

  ui_get: function() {
    console.debug("Group UI get");
    return $('#group-'+this.id+' ul');
  },

  // class methods
  extend: {
    // find a group by its id
    find: function(id) {
      console.debug("Group find", id);
      console.warn("TODO");
    },

    // loads all groups
    load_groups: function(settings) {
      console.debug("Group load_groups", settings);
      if(settings == null) settings = {};
      groups = [];
      Storage.select({
        table: "groups",
        conditions: "1=1 ORDER BY `id` ASC",
        success: function(tx ,rs) {
          console.debug("Loading "+(rs.rows ? rs.rows.length : 0)+" groups from db");
          if(rs.rows.length==0) {
            settings.success();
            return;
          }
          for(var r=0; r<rs.rows.length; r++) {
            var last_group = r==(rs.rows.length-1);
            // groups
            var group_item = rs.rows.item(r);
            var group = new SugarGroup(group_item);
            groups.push(group);
            // tabs
            Storage.select({
              table: "tabs",
              conditions: "`group_id`="+group.id+" ORDER BY `index` ASC",
              success: function(tx, rs) {
                console.debug("Loading "+(rs.rows ? rs.rows.length : 0)+" tabs for group "+group.id+" from db");
                for(var r=0; r<rs.rows.length; r++) {
                  var tab_item = rs.rows.item(r);
                  var tab = new SugarTab(tab_item);
                  for(var g in groups) {
                    var grp = groups[g];
                    if(grp.id == tab.group_id) {
                      groups[g].add_tab(tab, false);
                    }
                  }
                }
                if(last_group) {
                  settings.success();
                }
              },
              error: settings.error
            });
          }
        },
        error: settings.error
      });
    },

    next_index: function() {
      var index = 1;
      if(localStorage.group_last_index) {
        index = parseInt(localStorage.group_last_index) + 1;
      }
      return index;
    },

    next_position: function() {
      var x = Math.floor(Math.random()*1000);
      var y = Math.floor(Math.random()*700);
      return {x: x, y: y};
    }
  }
});

/**
 * @class SugarTab
 * @param item (Hash) -> { (id,) title, url, favIconUrl, index (, group_id, active) }
 */
var SugarTab = new JS.Class({
  initialize: function(item) {
    console.debug("Tab initialize", item);
    if(typeof(item)=='undefined') return;
    this.group_id = item.group_id;
    if(typeof(this.group_id)!="number") this.group_id = 0;
    this.index = item.index;
    this.title = item.title;
    this.url = item.url;
    this.favIconUrl = item.favIconUrl;
    if(!this.favIconUrl) this.favIconUrl = "ico/blank_preview.png";
    this.selected = item.selected;
    if(this.selected == false) this.selected = 0;
    else if(this.selected == true) this.selected = 1;
    else this.selected = 0;
  },

  to_s: function() {
    console.debug("Tab to_s");
    return 'Tab "' + this.title + '"';
  },

  update_preview: function(preview) {
    console.debug("Tab update_preview", parseInt(preview.length/1024)+"KB");
    var url = this.url;
    Storage.update({
      table: "previews",
      conditions: "`url`='"+this.url+"'",
      changes: {
        preview: preview
      },
      success: function() {
      },
      error: function() {
        Storage.insert({
          table: "previews",
          object: {
            url: url,
            preview: preview
          },
          success: function() {
          }
        });
      }
    });
  },

  // PERSISTABLE methods

  db_insert: function(settings) {
    console.debug("Tab insert", this, settings);
    if(settings == null) settings = {};
    Storage.insert({
      table: "tabs",
      object: this,
      success: settings.success,
      error: settings.error
    });
  },

  db_update: function(settings) {
    console.debug("Tab update", this, settings, settings.key, shorten_text(settings.val));
    if(settings == null) settings = {};
    var key = settings.key;
    var val = settings.val;
    Storage.update({
      table: "tabs",
      conditions: "`group_id`="+this.group_id+"`index`="+this.index,
      changes: {key: val},
      success: function() {
        this[key] = val;
        settings.success();
      },
      error: settings.error
    });
  },

  db_delete: function(settings) {
    console.debug("Tab delete", this, settings);
    if(settings == null) settings = {};
    Storage.remove({
      table: "tabs",
      conditions: "`group_id`="+this.group_id+" AND `index`="+this.index,
      success: settings.success,
      error: settings.error
    });
  },

  // UI methods

  ui_create: function() {
    console.debug("Tab UI create");
    this.preview = localStorage['preview-'+this.url];
    var preview = $('<img>').addClass('preview');
    if(this.preview==null || localStorage.feature_tab_preview!="true") {
      preview
        .addClass('empty')
        .css('background-image', 'url(chrome://favicon/'+this.url+'), url(/ico/blank_preview.png)');
    } else {
      preview.attr('src',this.preview);
    }
    var tab = $('<li class="tab"><div><img class="favicon" src="'+this.favIconUrl+'" /><span class="title"><span>'+this.title+'</span></span><span class="url" url="'+this.url+'">'+this.url+'</span><div class="close"></div></div></li>');
    tab.find('>div').prepend(preview);
    return tab;
  },

  // CLASS METHODS

  extend: {
    // tests whether an url is persistable in the db
    // filters all the "chrome://*" special pages
    persistable: function(url) {
      var rs = !SugarTab.CHROME_PAGE.exec(url);
      console.debug("Tab persistable", rs, shorten_text(url));
      return rs;
    },

    // search for tabs by title
    search: function(text) {
      console.debug("Tab search", text);
      var results = $('#nothing');
      $('.group>ul>.tab').each(function() {
        var tab = $(this);
        if(tab.title().indexOf(text) != -1) {
          results = results.add(tab);
        }
      });
      return results;
    },

    // CONSTANTS
    CHROME_PAGE: /(chrome|chrome-extension):\/\/.*/
  }
});
