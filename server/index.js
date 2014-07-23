var Request = require('request');
var Util = require('util');
var Extend  = Util._extend;
var Type = require('type-of-is');
var Lib = require('../lib');
var TorrentClient = require('torrent_client');

function Server(serverData) {
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


    Server.jobs = [];
    Server.isOnline = false;
    Server.torrentClient = new TorrentClient(Server);

    Server.Init = function(callback){
        Server.torrentClient.Init(callback);
    };
}

module.exports = Server;