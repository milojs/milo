'use strict';
// won't work in node - only in browser

describe('milo binder', function() {
    it('should bind components based on ml-bind attribute', function() {
        expect({p: 1}).property('p', 1);

        var ctrl = milo.binder();

        ctrl.articleButton.events.on('click mouseenter', function(eType, evt) {
            //cnsole.log('button', eType, evt);
        });

        ctrl.articleIdInput.data.on('', logData);

        function logData(message, data) {
            //cnsole.log(message, data);
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
            //cnsole.log('Radio Group Event', msg, data);
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
            comboTestArray.push({value: {val: 'value ' + i, id: i}, label: 'Label ' + i});
        };
        _.deferMethod(ctrl.mySuperCombo, 'setOptions', comboTestArray);
        ctrl.mySuperCombo.data.on('', function(msg, data) {
            console.log('before', ctrl.myMLList.model.get() && _.clone(ctrl.myMLList.model.get()));

            ctrl.myMLList.model.push(data.newValue);
            
            console.log('after', ctrl.myMLList.model.get() && _.clone(ctrl.myMLList.model.get()));
        });


        // Setting comboList

        // ctrl.myComboList.setOptions(comboTestArray);
        // ctrl.myComboList.data.on('', function(msg, data) {
        //     //cnsole.log('COMBO LIST DATA', msg, data);
        // });

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
            //cnsole.log('connecting');
            ctrl.linkState.data.set('linked');
            cnct[0].turnOn();
            cnct[1].turnOn();
        });

        ctrl.disconnectButton.events.on('click', function() {
            //cnsole.log('disconnecting');
            ctrl.linkState.data.set('not linked');
            cnct[0].turnOff();
            cnct[1].turnOff();
        });


        // simple data to data connection
        milo.minder(ctrl.data1.data, '<<->>', ctrl.data2.data);



        var foldData = {items: [
            { label: 'Jason Green', id: '001', items:
                [
                    { label: 'child01', id: '005', items: 
                        [
                            { label: 'subchild01', id: '006', item: []}
                        ]
                    }
                ]
            },
            { label: 'Luis Fetzner', id: '002'},
            { label: 'Tom Burnell', id: '003', items:
                [
                    { label: 'child02', id: '007', items: 
                        [
                            { label: 'subchild02', id: '008', item: []}
                        ]
                    }
                ]
            },
            { label: 'Evgeny Poberezkin', id: '004'}
        ]};

        //Foldtree test
        ctrl.myTree.renderTree(foldData);
    });
});
