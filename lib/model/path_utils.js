'use strict';

// <a name="model-path"></a>
// ### model path utils

var check = require('../util/check')
    , Match = check.Match
    , _ = require('mol-proto')
    , ModelError = require('../util/error').Model;

var pathUtils = {
    parseAccessPath: parseAccessPath,
    createRegexPath: createRegexPath,
    getPathNodeKey: getPathNodeKey,
    wrapMessengerMethods: wrapMessengerMethods
};

module.exports = pathUtils;


var propertyPathSyntax = '\\.[A-Za-z_][A-Za-z0-9_]*'
    , arrayPathSyntax = '\\[[0-9]+\\]'
    , interpolationSyntax = '\\$[1-9][0-9]*'
    , propertyInterpolateSyntax = '\\.' + interpolationSyntax
    , arrayInterpolateSyntax = '\\[' + interpolationSyntax + '\\]'

    , propertyStarSyntax = '\\.\\*'
    , arrayStarSyntax = '\\[\\*\\]'
    , starSyntax = '\\*'

    , pathParseSyntax = [
                            propertyPathSyntax,
                            arrayPathSyntax,
                            propertyInterpolateSyntax,
                            arrayInterpolateSyntax
                        ].join('|')
    , pathParsePattern = new RegExp(pathParseSyntax, 'g')

    , patternPathParseSyntax =  [
                                    pathParseSyntax,
                                    propertyStarSyntax,
                                    arrayStarSyntax,
                                    starSyntax
                                ].join('|')
    , patternPathParsePattern = new RegExp(patternPathParseSyntax, 'g')

    //, targetPathParsePattern = /\.[A-Za-z][A-Za-z0-9_]*|\[[0-9]+\]|\.\$[1-9][0-9]*|\[\$[1-9][0-9]*\]|\$[1-9][0-9]/g
    , pathNodeTypes = {
        '.': { syntax: 'object', empty: '{}' },
        '[': { syntax: 'array', empty: '[]'},
        '*': { syntax: 'match', empty: '{}'},
    };

function parseAccessPath(path, nodeParsePattern) {
    nodeParsePattern = nodeParsePattern || pathParsePattern;

    var parsedPath = [];

    if (! path)
        return parsedPath;

    var unparsed = path.replace(nodeParsePattern, function(nodeStr) {
        var pathNode = { property: nodeStr };
        _.extend(pathNode, pathNodeTypes[nodeStr[0]]);
        if (nodeStr[1] == '$')
            pathNode.interpolate = getPathNodeKey(pathNode, true);

        parsedPath.push(pathNode);
        return '';
    });
    if (unparsed)
        throw new ModelError('incorrect model path: ' + path);

    return parsedPath;
}


var nodeRegex = {
    '.*': propertyPathSyntax,
    '[*]': arrayPathSyntax
};
nodeRegex['*'] = nodeRegex['.*'] + '|' + nodeRegex['[*]'];

function createRegexPath(path) {
    check(path, Match.OneOf(String, RegExp));

    if (path instanceof RegExp || path.indexOf('*') == -1)
        return path;

    var parsedPath = pathUtils.parseAccessPath(path, patternPathParsePattern)
        , regexStr = '^'
        // , regexStrEnd = ''
        , patternsStarted = false;

    parsedPath.forEach(function(pathNode) {
        var prop = pathNode.property
            , regex = nodeRegex[prop];
        
        if (regex) {
            // regexStr += '(' + regex;
            // regexStrEnd += '|)';
            regexStr += '(' + regex + '|)';
            // regexStrEnd += '|)';
            patternsStarted = true;
        } else {
            // if (patternsStarted)
            //  throw new ModelError('"*" path segment cannot be in the middle of the path: ' + path);
            regexStr += prop.replace(/(\.|\[|\])/g, '\\$1'); // add slash in front of symbols that have special meaning in regex
        }
    });

    regexStr += /* regexStrEnd + */ '$';

    try {
        return new RegExp(regexStr);
    } catch (e) {
        throw new ModelError('can\'t construct regex for path pattern: ' + path);
    }
}


function getPathNodeKey(pathNode, interpolated) {
    var prop = pathNode.property
        , startIndex = interpolated ? 2 : 1;
    return pathNode.syntax == 'array'
        ? prop.slice(startIndex, prop.length - 1)
        : prop.slice(startIndex);
}


// TODO allow for multiple messages in a string
function wrapMessengerMethods(methodsNames) {
    methodsNames = methodsNames || ['on', 'off'];
    var wrappedMethods = _.mapToObject(methodsNames, function(methodName) {
        var origMethod = this[methodName];
        // replacing message subsribe/unsubscribe/etc. to convert "*" message patterns to regexps
        return function(path, subscriber) {
            var regexPath = createRegexPath(path);
            origMethod.call(this, regexPath, subscriber);
        };
    }, this);
    _.defineProperties(this, wrappedMethods);
}
