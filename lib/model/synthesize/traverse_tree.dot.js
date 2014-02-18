'use strict';
/* Only use this style of comments, not "//" */

/**
 * Inserts code to traverse model tree for `delete` and `splice` accessors.
 */
{{## def.traverseTree:
    {{ 
        var count = it.parsedPath.length-1;

        for (var i = 0; i < count; i++) { 
            var currNode = it.parsedPath[i];
            var currProp = currNode.property;
    }}
            {{# def.traverseTreeStep }}

    {{ } /* for loop */

        var i = count;
        while (i--) { /* closing braces for else's above */
    }}
            }
    {{ } /* while loop */ }}
#}}


/**
 * Inserts code to traverse one step in the model tree
 */
{{## def.traverseTreeStep:
    if (! (m && m.hasOwnProperty && {{# def.wasDefined}} ) )
        treeDoesNotExist = true;
    else {
        m = m{{# def.currProp }};
        {{# def.changeAccessPath }}
    {{ /* brace from else is not closed on purpose - all braces are closed in while loop */ }}
#}}
