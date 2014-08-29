var Request = require('request');
var Util = require('util');
var Type = require('type-of-is');
var Lib = require('../lib');
var TorrentClient = require('./torrent_client');
var Watcher = require('../watcher');
var Log = require('../log')(module);
var Async = require('async');
var Ping = require('ping');

function Server(serverData, webServer) {
    var Server = this;

    // cloning server data
    if (!Lib.clone(Server, serverData, [{'name':'String'},
                                        {'application':'String'},
                                        {'host':'String'},
                                        {'port': 'Number'},
                                        {'user':['String','undefined']},
                                        {'password':['String','undefined']}]))
    {
        throw Error('Error with cloning properties from "serverData" to "Server" object');
    }


    Server.webServer = webServer;
    Server.jobs = [];
    Server.isOnline = false;
    Server.torrentClient = new TorrentClient(Server);
    Server.checkFrequency = 10;
    Server.timer = Server.checkFrequency * 1000;
    Server.failCount = 0;
    Server.timeoutId = null;

    Server.AddJob = function(job, callback) {
        var watcher = new Watcher(Server, job);

        Server.jobs.push(watcher);
        Log.info("Add job", watcher.name);

        callback();
    };

    Server.Init = function(callback){
        Server.torrentClient.Init(function(err){
            if (err) {
                Server.failCount += 1;
                Log.error('Error with init torrentClient:', err);
                Server.timeoutId = setTimeout(Server.Ping, Server.CalcTimer());
                return callback();
            }

            Server.isOnline = true;
            Server.failCount = 0;

            Async.each(Server.jobs,
                function(watcher, callback){
                    watcher.Start(callback);
                },
                function (err) {
                    if (err) Log.error('Error with Start job:', err);
                    Server.timeoutId = setTimeout(Server.Ping, Server.CalcTimer());
                    Log.info("Server %s was initialized", Server.name);
                    callback();
                }
            );
        });
    };

    Server.Ping = function() {
        Log.debug('Ping server:', Server.name);
        Ping.sys.probe(Server.host, function(isAlive){
            if (isAlive) {
                if (Server.isOnline) {
                    Log.debug("Server %s is online", Server.name);
                    Server.timeoutId = setTimeout(Server.Ping, Server.CalcTimer());
                } else {
                    Server.Init(function(){
                        Log.info("Server %s is online", Server.name);
                    })
                }
            } else {
                if (Server.isOnline)
                    Log.info("Server %s is offline", Server.name);
                else
                    Log.debug("Server %s is offline", Server.name);

                Server.failCount += 1;
                Server.isOnline = false;

                Async.each(Server.jobs,
                    function(watcher, callback){
                        watcher.Stop(callback);
                    },
                    function(){
                        Server.timeoutId = setTimeout(Server.Ping, Server.CalcTimer());
                    });
            }               
        });
    };

    Server.CalcTimer = function(){
        var multiplier = Server.failCount;

        if (multiplier > 10)
            multiplier =  10;
        else if (multiplier == 0)
            multiplier =  1;
        
        return Server.timer * multiplier;
    };
}

module.exports = Server;