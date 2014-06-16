var vows = require('vows'),
    assert = require('assert');

var Transmission = require('../worker/torrent_clients/transmission');
var transmission = null;

/*//Automatic tests
vows.describe('Transmission plugin').addBatch({
    'Good scenario:': {
        'new Transmission': {
            topic:  function() {
                transmission = new Transmission({
                    application: 'transmission',
                    host: '25.199.18.121',
                    port: 9091,
                    user:'tvuser',
                    password:'frtgbfrtgb'});

                return transmission;
            },
            'object not null': function(topic){
                assert.isNotNull(topic);
            }
        },
        'getRedirectPath': {
            topic: function() {
                transmission.getRedirectPath(this.callback);
            },
            'Callback must included no errors, new path': function(err, path) {
                assert.isNull(err);
                assert.isString(path);
            }
        },
        'Init': {
            topic: function () {
                transmission.Init(this.callback);
            },
            'Callback must included no errors' : function(err) {
                assert.isUndefined(err);
            }
        },
        'ChangeDownloadDir': {
            topic: function () {
                transmission.ChangeDownloadDir('/test/dir/',this.callback);
            },
            'Callback must included no errors' : function(err) {
                assert.isUndefined(err);
            }
        }
    },
    'Bad scenario:': {
        'new Transmission': {
            topic:  function() {
                transmission = new Transmission({
                    application: 'transmission',
                    host: '25.199.18.1214',   // error in addr
                    port: 9091,
                    user:'tvuser',
                    password:'frtgbfrtgb'});

                return transmission;
            },
            'object not null': function(topic){
                assert.isNotNull(topic);
            }
        },
        'getRedirectPath': {
            topic: function() {
                transmission.getRedirectPath(this.callback);
            },
            'Callback must included error': function(err, path) {
                assert.isNotNull(err);
                assert.isUndefined(path);
            }
        },
        'Init': {
            topic: function () {
                transmission.Init(this.callback);
            },
            'Callback must included error' : function(err) {
                assert.isNotNull(err);
            }
        }
    }
}).run({reporter : require('vows/lib/vows/reporters/spec')});*/


//Debug tests
transmission = new Transmission({
    application: 'transmission',
    host: '25.199.18.121',
    port: 9091,
    user:'tvuser',
    password:'frtgbfrtgb'});

transmission.Init(function(err) {
    console.log('Init return: err = ', err);
    transmission.AddTorrent('test/123.torrent', '/Users/tvuser/Movies/TV Shows', function(err, hash, id) {
        console.log('AddTorrent returns:');
        console.log('err =', err);
        console.log('hash =', hash);
        console.log('id = ', id);

        if (err) return;

        transmission.CheckDownloadState(hash,function(err, arg){
            console.log('CheckDownloadState returns:');
            console.log('err =', err);
            console.log('arg =', arg);
        });

        transmission.GetParam(
            ['773d1ac2a23ca59b3cd14a041a476d83583a2ed6', '25b55987e1ece73631dbb9b93872a4e391529396'],
            'percentDone',
            function(err, arg) {
                console.log('CheckDownloadState returns:');
                console.log('err =', err);
                console.log('arg =', arg);
            });
    });


});
