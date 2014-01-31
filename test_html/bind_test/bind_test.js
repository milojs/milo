'use strict';
// won't work in node - only in browser

describe('milo binder', function() {
    it('should bind components based on ml-bind attribute', function() {
		expect({p: 1}).property('p', 1);

    	var ctrl = milo.binder();

    	ctrl.articleButton.events.on('click mouseenter', function(eType, evt) {
    		console.log('button', eType, evt);
    	});

    	ctrl.articleIdInput.data.on('', logData);

    	function logData(message, data) {
    		console.log(message, data);
    	}

        var myTmplComps = ctrl.myTemplate.template
                .set('<p ml-bind=":innerPara">I am rendered from template</p>')
                .render()
                .binder();

        var innerPara = ctrl.myTemplate.container.scope.innerPara;
        innerPara.el.innerHTML += ', then bound and changed via component inside template';

        var radio = ctrl.myRadioGroup;
        radio.model.m.set([
            { name: 'gender', value: 'female', label: 'Female' },
            { name: 'gender', value: 'male', label: 'Male' },
            { name: 'gender', value: 'other', label: 'Other' }
        ]);

        radio.data.on('', function(msg, data) {
            console.log('Radio Group Event', msg, data);
        });

        radio.data.set('male');
        assert.equal(radio.data.get(), 'male');
        radio.data.del();
        assert.equal(radio.data.get(), undefined);

        // Setting select options
        ctrl.mySelect.model.m.set([
            { value: 'female', label: 'Female' },
            { value: 'male', label: 'Male' },
            { value: 'other', label: 'Other' }
        ]);

        // Setting Super Combo options
        var comboTestArray = [];
        for (var i = 0; i < 20000; i++) {
            comboTestArray.push({value: 'value ' + i, label: 'Label ' + Math.random() + ' ' + i});
        };
        ctrl.mySuperCombo.setOptions(comboTestArray);

    // });

    // it('should bind a list, and instantiate list items', function() {
    //     var ctrl = milo.binder();

        var myList = ctrl.myList;
        var listButton = myList.container.scope.listButton;

        var m = new milo.Model;

        var myLinkedList = ctrl.myLinkedList;

        var cnct = milo.minder([
            [myList.data, '<<<->>>', m],
            [m, '<<<->>>', myLinkedList.data]
        ]);

        var listArray = [];
        for (var i = 0; i < 2; i++)
            listArray.push({title: 'Title ' + i, desc: 'Description ' + i});

        m.set(listArray);

        listButton.events.on('mousedown', function (eventType, event) {
            myList.data.path('[2]').set({title: 'New Title', desc: 'New Description'});
        });

        ctrl.connectButton.events.on('click', function() {
            console.log('connecting');
            ctrl.linkState.data.set('linked');
            cnct[0].turnOn();
            cnct[1].turnOn();
        });

        ctrl.disconnectButton.events.on('click', function() {
            console.log('disconnecting');
            ctrl.linkState.data.set('not linked');
            cnct[0].turnOff();
            cnct[1].turnOff();
        });


        // simple data to data connection
        milo.minder(ctrl.data1.data, '<<->>', ctrl.data2.data);
    });
});
