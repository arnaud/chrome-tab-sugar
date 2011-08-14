describe("Utils", function() {

  beforeEach(function() {
  });

  it("should be able to get the extension version", function() {
    var version = getVersion();
    
    expect(version).toBeDefined();
    expect(version.substring(0,3)).toEqual("0.1");
  });
});
