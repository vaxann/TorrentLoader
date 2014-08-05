var Server = require('./server');
var Dump = require('./dump/index');
var Log = require('./log')(module);
var Config = require('./config');
var Type = require('type-of-is');
var Fs = require('fs');
var Async = require('async');
var Lib = require('./lib');


Log.info('Starting app');

var servers =[];
var serversData = Config.get('servers');

if (Type(serversData, Array)) {
    Dump.init(function(err) { //Init dump
        if (err) Log.error('Init dump error:', err.message);

        Async.each(serversData,
            function(serverData, callback) { //add servers
                var checkPropertyStatus = CheckServerDataProperties(serverData);
                if (checkPropertyStatus)
                    return callback(new Error(Lib.buildPropertyReport('Error type of param "%propName%" must be "%propType%", ', checkPropertyStatus)));


                var server = new Server(serverData);
                servers.push(server);
                Log.info("Add server", server.name);

                Async.waterfall([
                        function(callback) { //add jobs
                            var jobsData = serverData.jobs;

                            Async.each(jobsData,
                                function(jobData, callback){ //add job
                                    var checkPropertyStatus = checkJobDataProperties(jobData);

                                    if (!Fs.existsSync(jobData.watchDir))
                                        return callback(new Error('Error Dir in param "watchDir" must be exists, can\'t add jobData: '+jobData.name));

                                    if (checkPropertyStatus)
                                        return callback(new Error(Lib.buildPropertyReport('Error type of param "%propName%" must be "%propType%", ', checkPropertyStatus)));

                                    server.AddJob(jobData, callback);
                                },
                                callback
                            );
                        },
                        server.Init //init server & check availability
                    ],
                    callback
                );
            },
            function(err){ //callback
                if (err) Log.error(err.message);
            }
        );
    });
} else {
    Log.error('Error loading "servers" form config file');
}

function CheckServerDataProperties(serverData) {
    return Lib.checkPropertyTypes([
        [
            {'serverData': serverData},
            'Object'
        ],
        [
            {'serverData.name': serverData.name},
            'String'
        ],
        [
            {'serverData.application': serverData.application},
            'String'
        ],
        [
            {'serverData.host': serverData.host},
            'String'
        ],
        [
            {'serverData.port': serverData.port},
            ['Number', 'undefined']
        ],
        [
            {'serverData.user': serverData.user},
            ['String', 'undefined']
        ],
        [
            {'serverData.password': serverData.password},
            ['String', 'undefined']
        ],
        [
            {'serverData.jobs': serverData.jobs},
            'Array'
        ]
    ]);
}


function checkJobDataProperties(jobData) {
    return Lib.checkPropertyTypes([
        [
            {'jobData.name': jobData.name},
            'String'
        ],
        [
            {'jobData.checkFrequency': jobData.checkFrequency},
            'Number'
        ],
        [
            {'jobData.watchDir': jobData.watchDir},
            'String'
        ],
        [
            {'jobData.downloadDir': jobData.downloadDir},
            'String'
        ],
        [
            {'jobData.completesActions': jobData.completesActions},
            ['Array', 'undefined']
        ]
    ]);
}