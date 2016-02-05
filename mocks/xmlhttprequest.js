'use strict';


window.XMLHttpRequest = function XMLHttpRequestMock() {};

_.extendProto(window.XMLHttpRequest, {
    open: open,
    setRequestHeader: setRequestHeader,
    send: send,
});

_.extend(window.XMLHttpRequest, {
    setMockRoutes: setMockRoutes,
    setOptions: setOptions
});


var _mock_routes, _opts = {};

function setMockRoutes(routes) {
    _mock_routes = routes;
}

function setOptions(opts) {
    _opts = opts || {};
}


function open(method, url) {
    this.method = method;
    this.url = url;
    this.headers = {};
}


function setRequestHeader(header, content) {
    this.headers[header] = content;
}


function send(data) {
    var self = this;
    this.data = data;
    var url = this.url;
    var methodRoutes = _mock_routes && _mock_routes[this.method.toUpperCase()] || {};

    var handlerKey = _.find(Object.keys(methodRoutes), function(regex) {
        return url.match(new RegExp(regex));
    });

    var handler = methodRoutes[handlerKey];

    if (handler === undefined) {
        milo.util.logger.error('*unknown mock route', this.method, this.url);
        done({
            status: 404,
            body: 'unknown mock route: ' + this.method + ' ' + this.url
        });
    } else {
        if (typeof handler == 'function') {
            if (handler.length == 2) handler(data, done);
            else done(handler(data));
        } else
            done(handler);
    }

    function done(res) {
        var delay = _opts && _opts.delay;
        if (delay) _.delayMethod(self, _response_ready, delay, res);
        else _.deferMethod(self, _response_ready, res);
    }
}


function _response_ready(response) {
    var self = this;
    var handler, eventType;
    if (!setHandler('loadend'))
        if (!setHandler('readystatechange'))
            return milo.util.logger.warn('no request handler');

    this.readyState = 4;
    if (typeof response == 'object') {
        this.statusText = 'Error';
        this.status = response.status;
        this.responseText = response.body;
    } else {
        this.statusText = 'OK';
        this.status = 200;
        this.responseText = response;
    }
    handler({ type: eventType });

    function setHandler(et) {
        if (typeof self['on' + et] == 'function') {
            handler = self['on' + et];
            eventType = et;
            return true;
        }
    }
}


var ARGS_PATTERN = /\(\s*([^)]+?)\s*\)/;
var WHITESPACE_PATTERN = /\s*,\s*/;
function extractFuncArgs(func) {
    var str = func.toString();
    var args = ARGS_PATTERN.exec(str)[1];
    if (args) return args.split(WHITESPACE_PATTERN);
}
