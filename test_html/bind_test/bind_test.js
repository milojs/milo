'use strict';
// won't work in node - only in browser

describe('milo binder', function() {
    it('should bind components based on ml-bind attribute', function() {
		expect({p: 1}).property('p', 1);

        console.log(milo.binder.scan());

        console.log('one pass binding');
    	var ctrl = milo.binder();
        console.log(ctrl);

        // console.log('two pass binding');
        // var ctrl2 = milo.binder.twoPass();
        // console.log(ctrl);

    	ctrl.articleButton.events.on('click mouseenter', function(eType, evt) {
    		console.log('button', eType, evt);
    	});

        ctrl.main.events.on('click mouseenter input keypress', function(eType, evt) {
            console.log('div', eType, evt);
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
    });

    it('should bind a list, and instantiate list items', function() {
        var ctrl = milo.binder();

        var myList = ctrl.myList;
        var listButton = myList.container.scope.listButton;

        var m = new milo.Model;

        var myLinkedList = ctrl.myLinkedList;

        var cnct = milo.minder([
            [myList.data, '<<<->>>', m],
            [m, '<<<->>>', myLinkedList.data]
        ]);
        // var cnct = milo.minder(myList.data, '->>>', myLinkedList.data);

        var listArray = [
            {title: 'Title 1', desc: 'Description 1', notUsed: 1},
            {title: 'Title 2', desc: 'Description 2', notUsed: 2},
            {title: 'Title 3', desc: 'Description 3', notUsed: 3},
            {title: 'Title 4', desc: 'Description 4', notUsed: 4},
            {title: 'Title 5', desc: 'Description 5', notUsed: 5}
        ];

        myList.data.on(/.*/, function(msgType, data) {
            console.log(msgType, data);
            console.log(m.get());
        })

        var used = myList.data.set(listArray);

        console.log(used);
        console.log(myList.data.get());
        console.log(m.get());

        listButton.events.on('mousedown', function (eventType, event) {
            myList.data.path('[2]').set({title: 'New Title', desc: 'New Description'});
            console.log(myList.data.get());
        });
    });
});
