'use strict';
/* Only use this style of comments, not "//" */

/**
 * Inserts initialization code
 */
 {{## def.initVars:
    var m = {{# def.modelAccessPrefix }};
    var messages = [], messagesHash = {};
    var accessPath = '';
    var treeDoesNotExist;
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
    /* if (sendingNotifications)
        logger.error('Model accessor: sending notifications before another notifactions batch is finished'); */
    sendingNotifications = true;

    messages.forEach(function(msg) {
        {{# def.modelPostMessageCode }}(msg.path, msg);
    }, this);
    if (messages.length)
        {{# def.modelPostMessageCode }}('finished', { type: 'finished' });

    sendingNotifications = false;
#}}
