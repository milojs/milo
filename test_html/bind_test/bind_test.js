'use strict';
// won't work in node - only in browser

describe('milo binder', function() {
    it('should bind components based on ml-bind attribute', function() {
		expect({p: 1}).property('p', 1);

        // console.log(milo.binder.scan());

        // console.log('one pass binding');
    	var ctrl = milo.binder();
        // console.log(ctrl);

        // console.log('two pass binding');
        // var ctrl2 = milo.binder.twoPass();
        // console.log(ctrl);

    	ctrl.articleButton.events.on('click mouseenter', function(eType, evt) {
    		console.log('button', eType, evt);
    	});

        // ctrl.main.events.on('click mouseenter input keypress', function(eType, evt) {
        //     console.log('div', eType, evt);
        // });

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
    });

    it('should bind a list, and instantiate list items', function() {
        var ctrl = milo.binder();

        var myList = ctrl.myList;
        var listButton = myList.container.scope.listButton;

        var m = new milo.Model;

        var myLinkedList = ctrl.myLinkedList;

        var cnct = milo.minder([
            [myList.data, '<<<->>>', m, {
                '[*].titleLabel': '[$1].caption',
                // '[*].titleLabel': '[$1].title', // code
                '[*].descField': '[$1].desc' 
            }],
            [m, '<<<->>>', myLinkedList.data, {
                '[*].title': '[$1].titleField',
                '[*].desc': '[$1].descLabel' 
            }]
        ]);
        // var cnct = milo.minder(myList.data, '->>>', myLinkedList.data);

        var listArray = [];
        for (var i = 0; i < 20; i++)
            listArray.push({title: 'Title ' + i, desc: 'Description ' + i});

        // myList.data.on(/.*/, function(msgType, data) {
        //     console.log(msgType, data);
        //     console.log(m.get());
        // })

        // milo.logger.level = 0; // errors

        m.set(listArray);

        listButton.events.on('mousedown', function (eventType, event) {
            myList.data.path('[2]').set({title: 'New Title', desc: 'New Description'});
            // console.log(myList.data.get());
        });

        ctrl.connectButton.events.on('click', function() {
            console.log('connecting');
            ctrl.linkState.data.set('linked');
            cnct[0].on();
            cnct[1].on();
        });

        ctrl.disconnectButton.events.on('click', function() {
            console.log('disconnecting');
            ctrl.linkState.data.set('not linked');
            cnct[0].off();
            cnct[1].off();
        });
    });
});
