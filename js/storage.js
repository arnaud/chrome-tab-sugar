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

var db_size = 50; // Database projected size (in MB)

var db = null; // Actual db reference

$(function() {
  // Database initialization
  try {
    if (window.openDatabase) {
      db = openDatabase("TabSugar", "1.0", "Tab Sugar", db_size * 1024 * 1024);
      if (db) {
        db.transaction(function(tx) {
          tx.executeSql("CREATE TABLE IF NOT EXISTS groups (id REAL UNIQUE, name TEXT, posX REAL, posY REAL, width REAL, height REAL)");
          tx.executeSql("INSERT INTO groups (id,name) VALUES (0,'icebox')");
          tx.executeSql("CREATE TABLE IF NOT EXISTS tabs (group_id REAL, zindex REAL, title TEXT, url TEXT, favIconUrl TEXT, preview TEXT)");
          console.debug("Tab Sugar database is ready");
          updateUI();
        });
      } else {
        console.error("An error occurred trying to open the database");
      }
    } else {
      console.error("The Web Databases technology is not supported by your browser");
    }
  } catch(err) {
    db = null;
    console.error("An error occurred during the database initialization", err);
  }
});
