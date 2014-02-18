'use strict';
/* Only use this style of comments, not "//" */

method = function get() {
    var m = {{# def.modelAccessPrefix }};
    return m {{~ it.parsedPath :pathNode }}
        {{? pathNode.interpolate}}
            && (m = m[this._args[ {{= pathNode.interpolate }} ]])
        {{??}}
            && (m = m{{= pathNode.property }})
        {{?}} {{~}};
};
