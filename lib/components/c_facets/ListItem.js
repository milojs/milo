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
});

facetsRegistry.add(ListItem);

module.exports = ListItem;


// initialize ListItem facet
function init() {
    ComponentFacet.prototype.init.apply(this, arguments);
}


//start ListItem facet
function start() {
    _.defineProperty(this, '_data', null, false, false, true);
}


function setData(data) {
    this._data = data;
    this.update();
}


function update() {
    _.eachKey(this.owner.container.scope, function(child, name) {
        child.data.set(this._data[name]);
    }, this, true);
}
