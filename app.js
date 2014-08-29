var Server = require('./server');
var Dump = require('./dump/index');
var Log = require('./log')(module);
var WebLoggerStorage = require('./log/web_logger_storage');
var Config = require('./config');
var Type = require('type-of-is');
var Fs = require('fs');
var Async = require('async');
var Lib = require('./lib');
var WebServer = require('./web_server');

Log.info('Starting app');

var servers =[];
var webServer = null;
var webServerData = Config.get('webServer');
var serversData = Config.get('servers');

if (Type(serversData, Array)) {
    Dump.init(function(err) { //Init dump
        if (err) Log.error('Init dump error:', err.message);

        var checkPropertyStatus = CheckWebServerDataProperties(webServerData);
        if (checkPropertyStatus)
            return Log.error(Lib.buildPropertyReport('Error type of param "%propName%" must be "%propType%", ', checkPropertyStatus));

        webServer = new WebServer(webServerData, servers);

        Async.each(serversData,
            function(serverData, callback) { //add servers
                var checkPropertyStatus = CheckServerDataProperties(serverData);
                if (checkPropertyStatus)
                    return callback(new Error(Lib.buildPropertyReport('Error type of param "%propName%" must be "%propType%", ', checkPropertyStatus)));


                var server = new Server(serverData, webServer);
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
                if (err) return Log.error(err.message);

                webServer.Init();

                WebLoggerStorage.webServer = webServer;

                Log.info('All systems initialized');
            }
        );
    });
} else {
    Log.error('Error loading "servers" form config file');
}


function CheckWebServerDataProperties(webServerData) {
    return Lib.checkPropertyTypes([
        [
            {'webServer':webServerData},
            'Object'
        ],
        [
            {'webServer.listenPort':webServerData.listenPort},
            'Number'
        ],
        [
            {'webServer.user':webServerData.user},
            ['String', 'undefined']
        ],
        [
            {'webServer.password':webServerData.password},
            ['String', 'undefined']
        ]
    ]);
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