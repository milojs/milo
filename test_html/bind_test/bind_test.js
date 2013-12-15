'use strict';
// won't work in node - only in browser

describe('milo binder', function() {
    it('should bind components based on ml-bind attribute', function() {
		expect({p: 1}).property('p', 1);

        console.log(milo.binder.scan());

        console.log('one pass binding');
    	var ctrl1 = milo.binder();
        console.log(ctrl1);

        console.log('two pass binding');
        var ctrl = milo.binder.twoPass();
        console.log(ctrl);

    	ctrl.articleButton.events.on('click mouseenter', function(eType, evt) {
    		console.log('button', eType, evt);
    	});

        ctrl.main.events.on('click mouseenter input keypress', function(eType, evt) {
            console.log('div', eType, evt);
        });

    	ctrl.articleIdInput.data.on('datachanged', logData);

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

        var listArray = [
            {title: 'Title 1', desc: 'Description 1'},
            {title: 'Title 2', desc: 'Description 2'},
            {title: 'Title 3', desc: 'Description 3'},
            {title: 'Title 4', desc: 'Description 4'},
            {title: 'Title 5', desc: 'Description 5'}
        ];

        myList.list.m('.list').set(listArray);

        listButton.events.on('mousedown', function (eventType, event) {
            myList.list.m('.list[2]').set({title: 'New Title', desc: 'New Description'});
        });
    });
});
