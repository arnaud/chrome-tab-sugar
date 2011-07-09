window.waitForAsync = function waitForAsync(fn) {
  var done = false
  
  waitsFor(function() { return done; });
  
  return function() {
    console.log(arguments);
    done = true;
    fn.apply(fn, arguments);
  }
};
