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

var DB_VERSION_MAJOR = 1;
var DB_VERSION_MINOR = 3;
var DB_VERSION = DB_VERSION_MAJOR + "." + DB_VERSION_MINOR;

// Opens the database at version "1.<version>"
function openDbVersion(version) {
  var v = DB_VERSION_MAJOR + "." + version;
  if(version < 0) {
    console.error('Databse version error! Now let\'s panic!');
    return;
  }
  try {
    return openDatabase("TabSugar", v, "Tab Sugar", this.DB_SIZE * 1024 * 1024);
  } catch(ex) {
    return openDbVersion(version-1);
  }
}

// Opens the database, whatever its version
function openDb() {
  var db = openDbVersion(DB_VERSION_MINOR);
  console.debug('Opening database version', db.version, db);
  return db;
}

/**
 * @class Storage
 */
var Storage = new JS.Class({

  // Database projected size (in MB)
  DB_SIZE: 50,

  // Actual db reference
  db: openDb(),

  initialize: function() {
  },

  // class methods
  extend: {
    // initializes the database for the first time: isnert tables
    init: function(settings) {
      console.debug("Storage init");
      var storage = new Storage();
      storage.db.transaction(function(tx) {

        function onError(tx, err) {
          console.error("An error occurred while initializing the db", err);
        };

        // Tables

        // Groups
        tx.executeSql("CREATE TABLE IF NOT EXISTS `groups` ("
                     +"`id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"
                     +"`name` TEXT,"
                     +"`posX` INTEGER,"
                     +"`posY` INTEGER,"
                     +"`width` INTEGER,"
                     +"`height` INTEGER,"
                     +"`incognito` INTEGER NOT NULL DEFAULT 0 CHECK (`incognito`=0 OR `incognito`=1),"
                     +"`type` TEXT NOT NULL CHECK (`type`='normal' OR `type`='popup' OR `type`='app'),"
                     +"`created_at` TEXT DEFAULT (datetime('now')),"
                     +"`updated_at` TEXT DEFAULT (datetime('now'))"
                     +")", [], null, onError);

        // Tabs
        tx.executeSql("CREATE TABLE IF NOT EXISTS `tabs` ("
                     +"`group_id` INTEGER NOT NULL,"
                     +"`index` INTEGER NOT NULL,"
                     +"`title` TEXT,"
                     +"`url` TEXT,"
                     +"`favIconUrl` TEXT,"
                     +"`selected` INTEGER DEFAULT 0 CHECK (`selected`=0 OR `selected`=1),"
                     +"`created_at` TEXT DEFAULT (datetime('now')),"
                     +"`updated_at` TEXT DEFAULT (datetime('now'))"
                     //+"CONSTRAINT primary_key PRIMARY KEY(`group_id`,`index`) ON CONFLICT FAIL"
                     //+"CONSTRAINT foreign_key FOREIGN KEY(`group_id`) REFERENCES `group_id`"
                     +")", [], null, onError);

        // Previews
        tx.executeSql("CREATE TABLE IF NOT EXISTS `previews` ("
                     +"`url` TEXT UNIQUE NOT NULL,"
                     +"`preview` BLOB NOT NULL,"
                     +"`created_at` TEXT DEFAULT (datetime('now')),"
                     +"`updated_at` TEXT DEFAULT (datetime('now'))"
                     +")", [], null, onError);

        // Triggers

        // TG01 - Reorganize tabs after tab delete
        tx.executeSql("DROP TRIGGER IF EXISTS reorganize_tabs_after_tab_delete;");
        tx.executeSql("CREATE TRIGGER IF NOT EXISTS reorganize_tabs_after_tab_delete AFTER DELETE ON `tabs`"
                     +"BEGIN"
                     +"  UPDATE `tabs`"
                     +"     SET `index` = `index` - 1"
                     +"   WHERE `group_id` = old.`group_id`"
                     +"     AND `index` > old.`index`;"
                     +"END;", [], null, onError);
        
        // TG02 - Reorganize tabs before tab insert
        tx.executeSql("DROP TRIGGER IF EXISTS reorganize_tabs_before_tab_insert;");
        tx.executeSql("CREATE TRIGGER IF NOT EXISTS reorganize_tabs_before_tab_insert BEFORE INSERT ON `tabs`"
                     +"BEGIN"
                     +"  UPDATE `tabs`"
                     +"     SET `index` = `index` + 1"
                     +"   WHERE `group_id` = new.`group_id`"
                     +"     AND `index` >= new.`index`;"
                     +"END;", [], null, onError);
        
        // TG03 - Reorganize tabs before tab update
        tx.executeSql("DROP TRIGGER IF EXISTS reorganize_tabs_before_tab_update;");
        tx.executeSql("CREATE TRIGGER IF NOT EXISTS reorganize_tabs_before_tab_update BEFORE UPDATE OF `group_id`, `index` ON `tabs`"
                     +" WHEN old.`group_id` <> new.`group_id` "
                     +"BEGIN"
                     +"  UPDATE `tabs`"
                     +"     SET `index` = `index` + 1"
                     +"   WHERE `group_id` = new.`group_id`"
                     +"     AND `index` >= new.`index`;"
                     +"END;", [], null, onError);

        // TG04 - Reorganize tabs after tab update
        tx.executeSql("DROP TRIGGER IF EXISTS reorganize_tabs_after_tab_update;");
        tx.executeSql("CREATE TRIGGER IF NOT EXISTS reorganize_tabs_after_tab_update AFTER UPDATE OF `group_id`, `index` ON `tabs`"
                     +" WHEN old.`group_id` <> new.`group_id` "
                     +"BEGIN"
                     +"  UPDATE `tabs`"
                     +"     SET `index` = `index` - 1"
                     +"   WHERE `group_id` = old.`group_id`"
                     +"     AND `index` > old.`index`;"
                     +"END;", [], null, onError);

        // TG05 - Delete tabs after group delete
        tx.executeSql("DROP TRIGGER IF EXISTS delete_tabs_after_group_delete;");
        tx.executeSql("CREATE TRIGGER IF NOT EXISTS delete_tabs_after_group_delete AFTER DELETE ON `groups`"
                     +"BEGIN"
                     +"  DELETE FROM `tabs`"
                     +"        WHERE `group_id` = old.`id`;"
                     +"END;", [], null, onError);
        
        // TG06 - Unselect all tabs of a group before tab selection
        tx.executeSql("DROP TRIGGER IF EXISTS unselect_tabs_before_tab_selection;");
        tx.executeSql("CREATE TRIGGER IF NOT EXISTS unselect_tabs_before_tab_selection BEFORE UPDATE OF `selected` ON `tabs`"
                     +" WHEN new.`selected` = 1 "
                     +"BEGIN"
                     +"  UPDATE `tabs`"
                     +"     SET `selected` = 0"
                     +"   WHERE `group_id` = new.`group_id`;"
                     +"END;", [], null, onError);

        // TG07 - Update the updated_at column after group update
        tx.executeSql("DROP TRIGGER IF EXISTS update_group;");
        tx.executeSql("CREATE TRIGGER IF NOT EXISTS update_group AFTER UPDATE ON `groups`"
                     +"BEGIN"
                     +"  UPDATE `groups`"
                     +"     SET `updated_at` = datetime('now')"
                     +"   WHERE `id` = old.`id`;"
                     +"END;", [], null, onError);

        // TG08 - Update the updated_at column after tab update
        tx.executeSql("DROP TRIGGER IF EXISTS update_tab;");
        tx.executeSql("CREATE TRIGGER IF NOT EXISTS update_tab AFTER UPDATE ON `tabs`"
                     +"BEGIN"
                     +"  UPDATE `tabs`"
                     +"     SET `updated_at` = datetime('now')"
                     +"   WHERE `group_id` = old.`group_id`"
                     +"     AND `index` = old.`index`;"
                     +"END;", [], null, onError);

        // TG09 - Update the updated_at column after preview update
        tx.executeSql("DROP TRIGGER IF EXISTS update_preview;");
        tx.executeSql("CREATE TRIGGER IF NOT EXISTS update_preview AFTER UPDATE ON `previews`"
                     +"BEGIN"
                     +"  UPDATE `previews`"
                     +"     SET `updated_at` = datetime('now')"
                     +"   WHERE `url` = old.`url`;"
                     +"END;", [], null, onError);

        console.debug("Tab Sugar database is ready");
        if(settings && settings.success) settings.success();
      });
    },

    // resets the database by dropping all of its tables
    reset: function(settings) {
      console.debug("Storage reset", settings);
      var storage = new Storage();
      storage.db.transaction(function (tx) {
        tx.executeSql("DROP TABLE IF EXISTS `groups`");
        tx.executeSql("DROP TABLE IF EXISTS `tabs`");
        tx.executeSql("DROP TABLE IF EXISTS `previews`");
      });
      if(settings && settings.success) {
        setTimeout(settings.success, 300);
      }
    },

    // removes the empty unnamed groups
    clean_groups: function(settings) {
      console.debug("Storage clean_groups");
      var storage = new Storage();
      storage.db.transaction(function(tx) {
        tx.executeSql("DELETE FROM `groups` WHERE (`name` IS NULL OR `name` = '') AND `id` NOT IN (SELECT DISTINCT `group_id` AS `id` FROM `tabs`)");
        console.debug("Groups cleaned from the database");
        if(settings && settings.success) settings.success();
      });
    },

    // returns only the appropriate attributes of an object and
    // correctly format its values
    _parse: function(object) {
      var o = {};
      for(var attr in object) {
        if(attr=="constructor") break;
        var val = object[attr];
        var type = typeof(val);
        if(type=="number") {
          if(isNaN(val)) { // NaN
            val = "NULL";
          } else { // finite number
            // do nothing
          }
        } else if(attr.indexOf("raw_sql_") != -1) {
          attr = attr.replace('raw_sql_','');
        } else if(type=="string") {
          val = "'" + val.replace(/'/g, "''") + "'";
        } else if(type=="undefined") {
          val = "NULL";
        } else {
          continue;
        }
        o[attr] = val;
      }
      return o;
    },

    // executes a query to the db
    execute_sql: function(settings) {
      var query = settings.query;
      var success = settings.success;
      var error = settings.error;
      console.debug("Storage execute_sql", query.substr(0, 200), settings);
      var storage = new Storage();
      storage.db.transaction(function (tx) {
        tx.executeSql(query, [], function (tx, rs) {
          if(query.indexOf("INSERT")==0 || query.indexOf("UPDATE")==0) {
            if (!rs.rowsAffected) {
              console.error("An error occurred while querying the db (no rows affected)", rs);
              if(error!=null) error(rs);
            } else {
              success(tx, rs);
            }
          } else {
            success(tx, rs);
          }
        }, function (tx, err) {
          console.error("An error occurred while querying the db", query, err);
          if(error!=null) error(err);
        });
      });
    },

    // query a SELECT
    select: function(settings) {
      console.debug("Storage select", settings);
      var what = settings.what;
      if(what == null) what = "*";
      var table = settings.table;
      var conditions = settings.conditions;
      var query = "SELECT "+what+" FROM `"+table+"`";
      if(conditions) {
        query += " WHERE "+conditions;
      }
      Storage.execute_sql({
        query: query,
        success: settings.success,
        error: settings.error
      });
    },

    // query an INSERT
    insert: function(settings) {
      console.debug("Storage insert", settings);
      var table = settings.table;
      var object = settings.object;
      var attributes = "";
      var values = "";
      object = Storage._parse(object);
      for(var attr in object) {
        var val = object[attr];
        if(attributes.length > 0) {
          attributes += ", ";
          values += ", ";
        }
        attributes += "`"+attr+"`";
        values += val;
      }
      var query = "INSERT INTO "+table+" ("+attributes+") VALUES ("+values+")";
      Storage.execute_sql({
        query: query,
        success: settings.success,
        error: settings.error
      });
    },

    // query an UPDATE
    update: function(settings) {
      console.debug("Storage update", settings);
      var table = settings.table;
      var conditions = settings.conditions;
      var changes = settings.changes;
      var changes_raw = "";
      changes = Storage._parse(changes);
      for(var attr in changes) {
        var val = changes[attr];
        if(changes_raw.length > 0) {
          changes_raw += ", ";
        }
        changes_raw += "`"+attr+"`="+val;
      }
      var query = "UPDATE `"+table+"` SET "+changes_raw;
      if(conditions) {
        query += " WHERE "+conditions;
      }
      Storage.execute_sql({
        query: query,
        success: settings.success,
        error: settings.error
      });
    },

    // query a DELETE
    remove: function(settings) {
      console.debug("Storage delete", settings);
      var table = settings.table;
      var conditions = settings.conditions;
      var query = "DELETE FROM `"+table+"` WHERE "+conditions;
      Storage.execute_sql({
        query: query,
        success: settings.success,
        error: settings.error
      });
    }
  }
});

// check if the database schema/version are up-to-date
// if not, then make sure it is
function makeDatabaseUpToDate(settings) {
  var db_up2date = localStorage.db_version==DB_VERSION;
  if(!db_up2date) {
    console.debug("MIGRATING THE DATABASE SCHEMA...");
    Storage.reset({
      success: function() {
        localStorage.db_version = DB_VERSION;
        localStorage.initialized = false;
        settings.success();
      }
    });
  } else {
    if(settings && settings.success) settings.success();
  }
}
