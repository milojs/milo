'use strict';

var check = require('../util/check')
	, Match = check.Match;

module.exports = Message;

function Message(message) {
	check(message, Object);
	check(message.type, Match.Where(IsNonEmptyString));
	check(message.sender, Match.Optional(Object));
	check(message.stack, Match.Optional([Object]));
	check(message.data, Match.Optional(Object));
	check(message.reciever, Match.Optional(Object));
	check(message.event, Match.Optional(Object));

	this.type = message.type;
	this.sender = message.sender;
	this.stack = message.stack;
	this.data = message.data;
	this.reciever = message.reciever;
	this.event = message.event;
}

function IsNonEmptyString(str) {
	check(str, String);
	return str.length > 0;
}