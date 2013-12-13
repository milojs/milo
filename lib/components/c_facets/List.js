'use strict';

var ComponentFacet = require('../c_facet')
  , Component = require('../c_class')
  , facetsRegistry = require('./cf_registry')
  , Model = require('../../model')
  , _ = require('mol-proto')
  , miloMail = require('../../mail')
  , binder = require('../../binder');


// data model connection facet
var List = _.createSubclass(ComponentFacet, 'List');

_.extendProto(List, {
  init: init,
  start: start,
  update: update,
  require: ['Container', 'Dom']
  // _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(List);

module.exports = List;


// initialize List facet
function init() {
  ComponentFacet.prototype.init.apply(this, arguments);
  var model = new Model()
    , self = this;

  _.defineProperty(this, 'm', model);
  _.defineProperty(this, 'listItems', {});
  this.m.on('.list', function (eventType, event) {
    self.update();
  });
}


//start List facet
function start() {
  var self = this;

  function onScopeReady() {
    var foundChild;

    _.eachKey(self.owner.container.scope, function(child, name) {
      if (child.listItem) {
        foundChild = child;
      }
    }, self, true);

    if (! foundChild) throw new ListError('No child component has ListItem Facet');

    self.listItemType = foundChild;  
    self.listItemType.dom.hide();
  }

  miloMail.onMessage('scopeready', onScopeReady);
}

//update list
function update() {
  var itemModels = this.m('.list').get();
  var self = this;
  for (var i = 0; i < itemModels.length; i++) {
    var itemModel = itemModels[i];

    var component = Component.copy(this.listItemType, true);
    
    var temp = binder.twoPass(component.el)[component.name];
    component.container.scope = temp.container.scope;
    
    component.listItem.setData(itemModel);
    this.owner.dom.append(component.el);
    this.owner.container.scope._add(component, component.name);
    this.listItems[component.name] = component;
    
    
  };
  _.eachKey(this.listItems, function(item) {
    item.dom.show();
  });
}
