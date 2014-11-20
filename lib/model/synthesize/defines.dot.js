'use strict';
/* Only use this style of comments, not "//" */

/**
 * Inserts initialization code
 */
 {{## def.initVars:method:
    var m = {{# def.modelAccessPrefix }};
    var messages = [], messagesHash = {};
    var accessPath = '';
    var treeDoesNotExist;
    /* hack to prevent sending finished events to allow for propagation of batches without splitting them */
    var inChangeTransaction = getTransactionFlag( {{= method }} );
 #}}

/**
 * Inserts the beginning of function call to add message to list
 */
{{## def.addMsg: addChangeMessage(messages, messagesHash, { path: #}}

/**
 * Inserts current property/index for both normal and interpolated properties/indexes
 */
{{## def.currProp:{{? currNode.interpolate }}[this._args[ {{= currNode.interpolate }} ]]{{??}}{{= currProp }}{{?}} #}}

/**
 * Inserts condition to test whether normal/interpolated property/index exists
 */
{{## def.wasDefined: m.hasOwnProperty(
    {{? currNode.interpolate }}
        this._args[ {{= currNode.interpolate }} ]
    {{??}}
        '{{= it.getPathNodeKey(currNode) }}'
    {{?}}
) #}}


/**
 * Inserts code to update access path for current property
 * Because of the possibility of interpolated properties, it can't be calculated in template, it can only be calculated during accessor call.
 */
{{## def.changeAccessPath:
    accessPath += {{? currNode.interpolate }}
        {{? currNode.syntax == 'array' }}
            '[' + this._args[ {{= currNode.interpolate }} ] + ']';
        {{??}}
            '.' + this._args[ {{= currNode.interpolate }} ];
        {{?}}
    {{??}}
        '{{= currProp }}';
    {{?}}
#}}


/**
 * Inserts code to post stored messages
 */
{{## def.postMessages:
    if (messages.length) {
        {{# def.modelPostBatchCode }}('datachanges', {
            changes: messages,
            transaction: inChangeTransaction
        });

        messages.forEach(function(msg) {
            {{# def.modelPostMessageCode }}(msg.path, msg);
        }, this);
    }
#}}
