'use strict';
/* Only use this style of comments, not "//" */

/**
 * Inserts code to create model tree as neccessary for `set` and `splice` accessors and to add messages to send list if the tree changes.
 */
{{## def.createTree:method:
    var wasDef = true;
    var old = m;

    {{ var emptyProp = it.parsedPath[0] && it.parsedPath[0].empty; }}
    {{? emptyProp }}
        {{ /* create top level model if it was not previously defined */ }}
        if (! m) {
            m = {{# def.modelAccessPrefix }} = {{= emptyProp }};
            wasDef = false;

            if (this._options.reactive !== false) {
                {{# def.addMsg }} '', type: 'added',
                      newValue: m });
            }
        }
    {{??}}
        {{? method == 'splice' }}
            if (! m) {
        {{?}}
                m = {{# def.modelAccessPrefix }} = cloneTree(value);
                wasDef = typeof old != 'undefined';
        {{? method == 'splice' }}
            }
        {{?}}       
    {{?}}


    {{ /* create model tree if it doesn't exist */ }}
    {{  var modelDataProperty = '';
        var nextNode = it.parsedPath[0];
        var count = it.parsedPath.length - 1;

        for (var i = 0; i < count; i++) {
            var currNode = nextNode;
            var currProp = currNode.property;
            nextNode = it.parsedPath[i + 1];
            var emptyProp = nextNode && nextNode.empty;
    }}

        {{# def.createTreeStep }}

    {{  } /* for loop */ }}
#}}


/**
 * Inserts code to create one step in the model tree
 */
{{## def.createTreeStep:
    {{# def.changeAccessPath }}

    if (! {{# def.wasDefined }}) { 
        {{ /* property does not exist */ }}
        m = m{{# def.currProp }} = {{= emptyProp }};

        if (this._options.reactive !== false) {
            {{# def.addMsg }} accessPath, type: 'added', 
                  newValue: m });
        }

    } else if (typeof m{{# def.currProp }} != 'object') {
        {{ /* property is not object */ }}
        var old = m{{# def.currProp }};
        m = m{{# def.currProp }} = {{= emptyProp }};

        if (this._options.reactive !== false) {
            {{# def.addMsg }} accessPath, type: 'changed', 
                  oldValue: old, newValue: m });
        }

    } else {
        {{ /* property exists, just traverse down the model tree */ }}
        m = m{{# def.currProp }};
    }
#}}
