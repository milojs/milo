'use strict';

var ComponentFacet = require('../c_facet')
    , Component = require('../c_class')
    , facetsRegistry = require('./cf_registry')
    , Model = require('../../model')
    , _ = require('mol-proto')
    , miloMail = require('../../mail')
    , binder = require('../../binder')
    , ListError = require('../../util/error').List;


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
    _.defineProperty(this, 'listItemType', null, false, false, true);

    this.m.on(/.*/, function (eventType, data) {
        self.update(eventType, data);
    });
}


//start List facet
function start() {
    var self = this;

    function onScopeReady() {
        var foundChild;

        _.eachKey(self.owner.container.scope, function(child, name) {
            if (child.listItem) {
                if (foundChild) throw new ListError('More than one child component has ListItem Facet')
                foundChild = child;
            }
        }, self, true);

        if (! foundChild) throw new ListError('No child component has ListItem Facet');

        self.listItemType = foundChild;    
        self.listItemType.dom.hide();

        //TODO: think about how to manage "scope ready" with multiple binds
        miloMail.offMessage('scopeready', onScopeReady);
    }

    miloMail.onMessage('scopeready', onScopeReady);
}

//update list
function update(eventType, data) {
    var itemModels = data.newValue;

    for (var i = 0; i < itemModels.length; i++) {
        var itemModel = itemModels[i];

        // Copy component
        var component = Component.copy(this.listItemType, true);
        
        // Bind contents of component
        var temp = binder(component.el)[component.name];

        // Set new component scope to bind result
        component.container.scope = temp.container.scope;
        
        // Set list item data of component
        component.listItem.setData(itemModel);

        // Add it to the dom
        this.owner.dom.append(component.el);

        // Add to list items hash
        this.listItems[component.name] = component;

        // Show the list item component
        component.dom.show();
    };
}
