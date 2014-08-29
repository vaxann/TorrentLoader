var Log = require('../log')(module);
var Express = require('express');
var Io = require('socket.io');
var Http = require('http');
var Routes = require('./routes');
var Sockets = require('./sockets');
var Lib = require('../lib');
var Path = require('path');

function WebServer(webServerData, servers) {
    var WebServer = this;

    // cloning webServerData
    if (!Lib.clone(WebServer, webServerData, [{'listenPort':'Number'},
                                              {'user':['String','undefined']},
                                              {'password':['String','undefined']}]))
    {
        throw Error('Error with cloning properties from "serverData" to "Server" object');
    }

    WebServer.servers = servers;
    WebServer.app = null;
    WebServer.server = null;
    WebServer.io = null;
    WebServer.sockets = [];

    // Starting web server
    WebServer.Init = function() {
        WebServer.app = Express();
        WebServer.server = Http.Server(WebServer.app);
        WebServer.io = Io(WebServer.server);

        WebServer.app.set('views', Path.join(__dirname, 'templates'));
        WebServer.app.set('view engine', 'jade');
        WebServer.app.locals.pretty = true;
        //WebServer.app.engine('jade', require('jade').__express);

        var bodyParser = require('body-parser');
        WebServer.app.use(bodyParser.urlencoded({ extended: false }));

        //TODO: reed why in needed
        //WebServer.app.use(Express.methodOverride());

        var cookieParser = require('cookie-parser');
        WebServer.app.use(cookieParser());

        WebServer.app.use(Express.static(Path.join(__dirname, 'public')));

        Routes(WebServer);
        Sockets(WebServer);

        WebServer.server.listen(WebServer.listenPort);
    }

    WebServer.push =  function(data){

    }
}

module.exports = WebServer;