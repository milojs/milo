'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto');


var MLDate = Component.createComponentClass('MLDate', {
    events: undefined,
    data: {
        get: MLDate_get,
        set: MLDate_set,
        del: MLDate_del,
    },
    dom: {
        cls: 'ml-ui-date'
    }
});

componentsRegistry.add(MLDate);

module.exports = MLDate;


function MLDate_get() {
    var dateStr = this.el.value;

    return _.toDate(dateStr);
}


function MLDate_set(value) {   
    var date = _.toDate(value);
    if (! date) {
        this.el.value = '';
        return;
    }

    var dateArr = [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate())
    ];
    var dateStr = dateArr.join('-');
    this.el.value = dateStr;
    return dateStr;
                        
    function pad(n) {return n < 10 ? '0' + n : n; }
}


function MLDate_del() {
    this.el.value = '';
}
