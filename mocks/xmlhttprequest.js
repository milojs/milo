'use strict';


window.XMLHttpRequest = function XMLHttpRequestMock() {};

_.extendProto(window.XMLHttpRequest, {
    open: open,
    setRequestHeader: setRequestHeader,
    send: send,
});

_.extend(window.XMLHttpRequest, {
    setMockRoutes: setMockRoutes
});


var _mock_routes;
function setMockRoutes(routes) {
    _mock_routes = routes;
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
    var methodRoutes = _mock_routes[this.method.toUpperCase()] || {};

    var handlerKey = _.find(Object.keys(methodRoutes), function(regex) {
        return url.match(new RegExp(regex));
    });

    var handler = methodRoutes[handlerKey];

    if (handler) {
        if (typeof handler == 'function' && handler.length == 2)
            return handler(data, done);
        
        var response = typeof handler == 'function' ? handler(data) : handler;
        _.deferMethod(this, _response_ready, response);
    } else {
        milo.util.logger.error('*unknown mock route', this.method, this.url);
        response = {
            status: 404,
            body: 'unknown mock route: ' + this.method + ' ' + this.url
        };
    }

    function done(res) {
        _.deferMethod(self, _response_ready, res);
    }
}


function _response_ready(response) {
    if (typeof this.onreadystatechange == 'function') {
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
        this.onreadystatechange({ type: 'readystatechange' });
    } else
        milo.util.logger.warn('no request handler');
}


var ARGS_PATTERN = /\(\s*([^)]+?)\s*\)/;
var WHITESPACE_PATTERN = /\s*,\s*/;
function extractFuncArgs(func) {
    var str = func.toString();
    var args = ARGS_PATTERN.exec(str)[1];
    if (args) return args.split(WHITESPACE_PATTERN);
}
