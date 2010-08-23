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

var DB_VERSION = "1.2";

function openDb() {
  var db;
  try {
    db = openDatabase("TabSugar", DB_VERSION, "Tab Sugar", this.DB_SIZE * 1024 * 1024);
  } catch(ex) {
    try {
      db = openDatabase("TabSugar", localStorage.db_version, "Tab Sugar", this.DB_SIZE * 1024 * 1024);
    } catch(ex2) {
      try {
        db = openDatabase("TabSugar", "1.0", "Tab Sugar", this.DB_SIZE * 1024 * 1024);
      } catch(ex3) {}
    }
  }
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
        tx.executeSql("CREATE TABLE IF NOT EXISTS `groups` (`id` REAL UNIQUE, `name` TEXT, `posX` REAL, `posY` REAL, `width` REAL, `height` REAL)");
        tx.executeSql("INSERT INTO `groups` (`id`,`name`,`width`,`height`) VALUES (0,'icebox',586,150)");
        tx.executeSql("CREATE TABLE IF NOT EXISTS `tabs` (`group_id` REAL, `index` REAL, `title` TEXT, `url` TEXT, `favIconUrl` TEXT)");
        tx.executeSql("CREATE TABLE IF NOT EXISTS `previews` (`url` TEXT UNIQUE, `preview` TEXT)");
        console.debug("Tab Sugar database is ready");
        if(settings && settings.success) settings.success.call();
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

    // returns only the appropriate attributes of an object and
    // correctly format its values
    _parse: function(object) {
      var o = {};
      for(var attr in object) {
        if(attr=="constructor") break;
        var val = object[attr];
        var type = typeof(val);
        if(type=="number" && val >= 0) {
          // do nothing
        } else if(type=="number") { // NaN case
          val = "NULL";
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
              if(error!=null) error.call();
            } else {
              success(tx, rs);
            }
          } else {
            success(tx, rs);
          }
        }, function (tx, err) {
          console.error("An error occurred while querying the db", query, err);
          if(error!=null) error.call();
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
    console.debug("UPDATING THE DATABASE SCHEMA...");
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
