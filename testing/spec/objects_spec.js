describe("Objects", function() {
  
  beforeEach(function() {
  });
  
  describe("Groups", function() {
    var group;
    var tab;
    
    beforeEach(function() {
      group = new SugarGroup({
        id: 1,
        name: null,
        posX: 5,
        posY: 5,
        width: 300,
        height: 150,
        incognito: false,
        type: 'normal'
      });
      tab = new SugarTab({
        group_id: group.id,
        index: 1,
        title: 'My current tab',
        url: 'http://google.com',
        favIconUrl: 'chrome://favicon/http://google.com'
      });
      expect(group).toBeDefined();
    });
    
    it("should be able to receive new tabs", function() {
      expect(group.tabs).toEqual([]);
      
      group.add_tab(tab, false);
      
      expect(group.tabs).toEqual([tab]);
      expect(group.tabs[0].to_s()).toEqual(tab.to_s());
    });
    
    it("should be able to remove existing tabs", function() {
      group.add_tab(tab, false);
      expect(group.tabs).toEqual([tab]);
      
      group.remove_tab(tab);
      
      expect(group.tabs).toEqual([]);
    });
    
    it("should be able to create its own visual representation", function() {
      var group_ui = group.ui_create();
      
      expect(group_ui).toBe('section.group');
      expect(group_ui).toHaveId('group-'+group.id);
      expect(group_ui.css('width')).toEqual(group.width+'px');
      expect(group_ui.css('height')).toEqual(group.height+'px');
      expect(group_ui.css('top')).toEqual(group.posY+'px');
      expect(group_ui.css('left')).toEqual(group.posX+'px');
      expect(group_ui).toContain('.close');
      expect(group_ui).toContain('ul');
      expect(group_ui).toContain('.new_tab');
    });
  });
  
  describe("Tabs", function() {
    var tab;
    
    beforeEach(function() {
      tab = new SugarTab({
        group_id: 1,
        index: 1,
        title: 'My current tab',
        url: 'http://google.com',
        favIconUrl: 'chrome://favicon/http://google.com'
      });
    });
    
    it("should be able to create its own visual representation", function() {
      var tab_ui = tab.ui_create();
      
      expect(tab_ui).toBe('li.tab');
      expect(tab_ui).toContain('img.favicon');
      expect(tab_ui).toContain('img.preview');
      expect(tab_ui).toContain('.title');
      expect(tab_ui).toContain('.close');
      expect(tab_ui.find('.favicon')).toHaveAttr('src', tab.faviconUrl);
      expect(tab_ui.find('.url')).toHaveAttr('url', tab.url);
    });
  });
});
