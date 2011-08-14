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
 * LOGS FUNCTIONS
 */

var LOG_FILENAME = 'tabsugar.log';
var LOG_SIZE = 50;

Date.prototype.logFormat = function() {
    var year, month, day;
    year = String(this.getFullYear());
    year = year.substr(2, 2);
    month = String(this.getMonth() + 1);
    if (month.length == 1) {
        month = "0" + month;
    }
    day = String(this.getDate());
    if (day.length == 1) {
        day = "0" + day;
    }
    return year + "." + month + "." + day + " " + this.toLocaleTimeString();
};

function pausecomp(ms) {
  ms += new Date().getTime();
  while (new Date() < ms){}
}

function stringify(object) {
  if(typeof object === 'object') {
    try {
      return JSON.stringify(object, function(key, value) {
        if(key == 'preview') {
          return '';
        }
        if(typeof value === 'string' && value.length > 40) {
          return value.substr(0,37) + '...';
        }
        return value;
      }).replace(/,"preview":""/g, '');
    } catch(e) {
      return object;
    }
  }
  return object;
}

function errorHandler(e) {
  var msg = '';
  switch (e.code) {
    case FileError.QUOTA_EXCEEDED_ERR:
      msg = 'QUOTA_EXCEEDED_ERR';
      break;
    case FileError.NOT_FOUND_ERR:
      msg = 'NOT_FOUND_ERR';
      break;
    case FileError.SECURITY_ERR:
      msg = 'SECURITY_ERR';
      break;
    case FileError.INVALID_MODIFICATION_ERR:
      msg = 'INVALID_MODIFICATION_ERR';
      break;
    case FileError.INVALID_STATE_ERR:
      msg = 'INVALID_STATE_ERR';
      break;
    default:
      msg = 'Unknown Error';
      break;
  };
  console.log('Error: ' + msg);
}
BlobBuilder = window.WebKitBlobBuilder;
window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
var logs_locked = false;
function write_to_logs(type, message) {
  var date = (new Date()).logFormat();
  var page = window.location.pathname.replace('/','').replace('.html','').toUpperCase();
  if(page == "SUGAR") page = "UI";
  if(page == "BACKGROUND") page = "BG";
  type = '['+type.toUpperCase()+']';
  for(var i = type.length; i < 7; i++) {
    type += ' '
  }
  //while(logs_locked) { pausecomp(50) }
  window.requestFileSystem(window.PERSISTENT, LOG_SIZE*1024*1024, function(fs) {
    fs.root.getFile(LOG_FILENAME, {create: true}, function(fileEntry) {
      // Create a FileWriter object for our FileEntry (log.txt).
      logs_locked = true;
      fileEntry.file(function(file) {
        var reader = new FileReader();
        reader.onloadend = function(e) {
          var current_log_content = this.result;
          fileEntry.createWriter(function(fileWriter) {
            var reader = new FileReader();
            fileWriter.onwriteend = function(e) {
              logs_locked = false;
            };
            fileWriter.onerror = function(e) {
              logs_locked = false;
            };
            //fileWriter.seek(fileWriter.length); // Start write position at EOF.
            // Create a new Blob and write it to log.txt.
            var bb = new BlobBuilder(); // Note: window.WebKitBlobBuilder in Chrome 12.
            bb.append(date+' '+page+' '+type+message + '\n');
            bb.append(current_log_content);
            fileWriter.write(bb.getBlob('text/plain'));
          }, errorHandler);
        };
        reader.readAsText(file);
      }, errorHandler);
    }, errorHandler);
  }, errorHandler);
}
//window._console = window.console.bind({});
function logging_console(type) {
  var message = '';
  var args = Array.prototype.slice.call(arguments);
  args.shift();
  for (var i in args) {
    if (args.hasOwnProperty(i)) {
      message += ' ' + stringify(args[i]);
    }
  }
  write_to_logs(type, message);
}
window.console = {
  debug: function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('debug');
    logging_console.apply(this, args);
  },
  log: function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('log');
    logging_console.apply(this, args);
  },
  warn: function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('warn');
    logging_console.apply(this, args);
  },
  error: function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('error');
    logging_console.apply(this, args);
  }
}

function get_logs(logs) {
  window.requestFileSystem(window.PERSISTENT, LOG_SIZE*1024*1024, function(fs) {
    fs.root.getFile(LOG_FILENAME, {}, function(fileEntry) {
      // Get a File object representing the file,
      // then use FileReader to read its contents.
      fileEntry.file(function(file) {
         var reader = new FileReader();
         reader.onloadend = function(e) {
           logs(this.result);
         };
         reader.readAsText(file);
      }, errorHandler);
    }, function(){ logs('')});
  }, errorHandler);
}

function remove_logs() {
  window.requestFileSystem(window.PERSISTENT, LOG_SIZE*1024*1024, function(fs) {
    fs.root.getFile(LOG_FILENAME, {create: false}, function(fileEntry) {
      fileEntry.remove(function() {
      }, errorHandler);
    }, errorHandler);
  }, errorHandler);
}
