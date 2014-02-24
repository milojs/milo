'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto');

var LIST_CHANGE_MESSAGE = 'mllistchange'
    , DELETE_BUTTON_NAME = 'deleteBtn';


var MLList = Component.createComponentClass('MLList', {
    dom: {
        cls: 'ml-ui-list'
    },
    data: {
        get: MLList_get,
        set: MLList_set,
        del: MLList_del,
        event: LIST_CHANGE_MESSAGE,
    },
    events: undefined,
    model: {
        messages: {
            '**': { subscriber: onItemsChange, context: 'owner' }
        }
    },
    list: undefined
});


componentsRegistry.add(MLList);

module.exports = MLList;


_.extendProto(MLList, {
    init: MLList$init,
});


function MLList$init() {
    Component.prototype.init.apply(this, arguments);
    this.on('childrenbound', onChildrenBound);
}


function MLList_get() {
    var value = this.model.get();
    return typeof value == 'object' ? _.clone(value) : value;
}

function MLList_set(value) {
    this.model.set(value);
}

function MLList_del() {
    return this.model.set([]);
}

function onChildrenBound() {
    this.model.set([]);
    milo.minder(this.model, '<<<->>>', this.data);
}


var ITEM_PATH_REGEX = /^\[([0-9]+)\]$/;
function onItemsChange(msg, data) {
    var self = this;
    _.defer(function() {
        if (data.type == 'added' && ITEM_PATH_REGEX.test(data.path)) {
            var index = +data.path.match(ITEM_PATH_REGEX)[1];
            var newItem = self.list.item(index);
            var btn = newItem.container.scope[DELETE_BUTTON_NAME];
            btn.events.on('click',
                { subscriber: deleteItem, context: newItem });
        }

        function deleteItem(msg, data) {
            btn.events.off('click',
                { subscriber: deleteItem, context: this });
            var index = this.data.getKey();
            self.model.splice(index, 1);
            //this.data.getMessageSource().dispatchMessage(LIST_CHANGE_MESSAGE);
        }
    });
}
