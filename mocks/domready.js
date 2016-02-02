'use strict';


var mockDomIsReady = false
    , messenger = new milo.Messenger;


milo.util.domReady = domReady;
function domReady(func) { // , arguments
    var self = this
        , args = _.slice(arguments, 1);
    if (isReady.call(this))
        callFunc();
    else
        messenger.once('domready', callFunc);

    function callFunc() {
        func.apply(self, args);
    }
}


_.extend(domReady, {
    isReady: isReady,
    trigger: trigger
});


function trigger() {
    mockDomIsReady = true;
    messenger.postMessage('domready');
}


function isReady() {
    return mockDomIsReady;
}
