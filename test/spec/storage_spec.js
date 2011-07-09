describe("Storage", function() {
  var storage;

  beforeEach(function() {
    storage = new Storage();
  });

  it("should be able to access the database", function() {
    expect(storage.db).toBeDefined();
  });

  it("should have the right version", function() {
    expect(storage.db.version).toEqual(DB_VERSION);
  });
});
