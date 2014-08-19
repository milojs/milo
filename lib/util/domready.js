'use strict';


var _ = require('mol-proto');


module.exports = domReady;


var domReadyFuncs = []
    , domReadySubscribed = false;


function domReady(func) { // , arguments
    var self = this
        , args = _.slice(arguments, 1);
    if (isReady.call(this))
        callFunc();
    else {
        if (!domReadySubscribed) {
            document.addEventListener('readystatechange', onDomReady);
            domReadySubscribed = true;
        }
        domReadyFuncs.push(callFunc); // closure is added, so every time different function will be called
    }

    function callFunc() {
        func.apply(self, args);
    }
}


function onDomReady() {
    document.removeEventListener('readystatechange', onDomReady);
    domReadyFuncs.forEach(function(func) { func(); });
}


_.extend(domReady, {
    isReady: isReady
});


function isReady() {
    var readyState = document.readyState;
    return readyState == 'loading' ? false : readyState;
}
