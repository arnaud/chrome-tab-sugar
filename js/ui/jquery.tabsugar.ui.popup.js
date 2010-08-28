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

(function($) {

  // open a link as a popup
  $.fn.opensAsPopup = function() {
    this.click(function(e) {
      var title = $(this).attr('rel');
      var url = $(this).attr('href');
      var container = $('<div>').addClass('popup_container');
      var popup = $('<div>').addClass('popup');
      var top = $('<div>').addClass('top');
      title = $('<p>').addClass('title').html(title);
      top.append(title);
      var close = $('<div>').addClass('close').click(function(e) {
        $(this).parent().parent().parent().remove();
      });
      top.append(close);
      popup.append(top);
      var content = $('<iframe>').attr('src', url);
      popup.append(content);
      popup.draggable();
      container.append(popup);
      $('body').append(container);
      return false;
    });
  };
  
})(jQuery);
