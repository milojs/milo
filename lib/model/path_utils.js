'use strict';


var check = require('../util/check')
	, Match = check.Match
	, _ = require('mol-proto');

var pathUtils = module.exports = {
	parseAccessPath: parseAccessPath,
	createRegexPath: createRegexPath,
	getPathNodeKey: getPathNodeKey
};


var pathParsePattern = /\.[A-Za-z][A-Za-z0-9_]*|\[[0-9]+\]/g
	, patternPathParsePattern = /\.[A-Za-z][A-Za-z0-9_]*|\[[0-9]+\]|\.\*|\[\*\]|\*/g
	, pathNodeTypes = {
		'.': { syntax: 'object', empty: '{}' },
		'[': { syntax: 'array', empty: '[]'},
		'*': { syntax: 'star', empty: '{}'}
	};

function parseAccessPath(path, nodeParsePattern) {
	nodeParsePattern = nodeParsePattern || pathParsePattern;

	var parsedPath = [];

	if (! path)
		return parsedPath;

	var unparsed = path.replace(nodeParsePattern, function(nodeStr) {
		var pathNode = { property: nodeStr };
		_.extend(pathNode, pathNodeTypes[nodeStr[0]]); // TODO maybe do some default value if not in map
		parsedPath.push(pathNode);
		return '';
	});
	if (unparsed)
		throw new ModelError('incorrect model path: ' + path);

	return parsedPath;
}


var nodeRegex = {
	'.*': '\\.[A-Za-z][A-Za-z0-9_]*',
	'[*]': '\\[[0-9]+\\]'
};
nodeRegex['*'] = nodeRegex['.*'] + '|' + nodeRegex['[*]'];
function createRegexPath(path) {
	check(path, Match.OneOf(String, RegExp));

	if (path instanceof RegExp || path.indexOf('*') == -1)
		return path;

	var parsedPath = pathUtils.parseAccessPath(path, patternPathParsePattern)
		, regexStr = '^'
		, regexStrEnd = ''
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
			if (patternsStarted)
				throw new ModelError('"*" path segment cannot be in the middle of the path: ' + path);
			regexStr += prop.replace(/(\.|\[|\])/g, '\\$1');
		}
	});

	regexStr += /* regexStrEnd + */ '$';

	try {
		return new RegExp(regexStr);
	} catch (e) {
		throw new ModelError('can\'t construct regex for path pattern: ' + path);
	}
}


function getPathNodeKey(pathNode) {
	var prop = pathNode.property;
	return pathNode.syntax == 'array'
		? prop.slice(1, prop.length - 1)
		: prop.slice(1);
}
