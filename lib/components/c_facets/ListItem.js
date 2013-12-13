'use strict';

var ComponentFacet = require('../c_facet')
  , facetsRegistry = require('./cf_registry')
  , Model = require('../../model')
  , _ = require('mol-proto')
  , miloMail = require('../../mail');


// data model connection facet
var ListItem = _.createSubclass(ComponentFacet, 'ListItem');

_.extendProto(ListItem, {
  init: init,
  start: start,
  setData: setData,
  update: update,
  require: ['Container', 'Dom']
  // _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(ListItem);

module.exports = ListItem;


// initialize ListItem facet
function init() {
  ComponentFacet.prototype.init.apply(this, arguments);
  
}


//start ListItem facet
function start() {
  var self = this;
  miloMail.onMessage('scopeready', function(){
});

  
}


function setData(data) {
  _.defineProperty(this, '_data', data);
  this.update();
}

function update() {
  _.eachKey(this.owner.container.scope, function(scopeItem, name) {
    scopeItem.el.innerHTML = this._data[name];
  }, this, true);
}