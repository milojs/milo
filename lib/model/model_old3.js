'use strict';


function Model(data, schema) {
	check(data, schema || Object);

	Object.defineProperties(this, {
		data: { value: data },
		schema: { value: schema }
	});

	var messageSource = new ObserveMessageSource(this.value);
	var messenger = new Messenger(this, Messenger.defaultMethods, messageSource);

	Object.defineProperties(this, {
		_messenger: { value: messenger },
		_messageSource: { value: messageSource }
	});
}

_.extendProto(Model, {
	setValue: setModelValue
});


function setModelValue(newData) {
	_.deepExtend(this.data, newData);
	if (this.schema)
		check(this.data, this.schema);
}



function ModelMap(data, schema) {
	
}


