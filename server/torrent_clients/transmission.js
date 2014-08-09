var Request = require('request');
var Util = require('util');
var Log = require('../../log/index')(module);
var Fs = require('fs');
var Type = require('type-of-is');

function Transmission(server){
    var Transmission = this;

    Transmission.server = server;

    if (Transmission.server.user && Transmission.server.password) {
        Transmission.options = {
            auth: {
                user: Transmission.server.user,
                pass: Transmission.server.password,
                sendImmediately: true
            }
        };
    } else {
        Transmission.options = {};
    }

    Transmission.options.followRedirect = false;

    Transmission.Init = function(callback){
        if(!callback || !Type.is(callback, Function))
            return Log.error('Callback in Init can\'t defined');

        Transmission.getRedirectPath(function(err, path) {
            if (err) return callback(err);

            Transmission.uri = path + 'rpc';
            callback();
        });
    };

    Transmission.ChangeDownloadDir = function(dir, callback, cycle){
        if(!callback || !Type(callback, Function))
            return Log.error('Callback in ChangeDownloadDir can\'t defined');
        if(!Transmission.uri || !Type(Transmission.uri, String))
            return callback(new Error('Uri can\'t defined, make Init'));
        if(!dir || !Type(dir, String))
            return callback(new Error('Dir can\'t defined'));
        if(Type(cycle,undefined)|| !Type(cycle, Number))
            cycle = 0;

        Transmission.options.json = true;

        Transmission.options.body  = JSON.stringify({
            'method':'session-set',
            'arguments':{
                'download-dir': dir}
        });

        Request.post(Transmission.uri, Transmission.options, function(error, response, body){
            if (error) return callback(error);

            if (response.statusCode == 409 && response.headers['x-transmission-session-id']) {
                if (cycle > 1) return callback(new Error('Error looping with x-transmission-session-id'));

                Transmission.options.headers = {'x-transmission-session-id' : response.headers['x-transmission-session-id']};
                return Transmission.ChangeDownloadDir(dir, callback, cycle+1);
            }

            if (response.statusCode != 200)
                return callback(new Error('Bad statusCode '+ response.statusCode));

            if (!body || !Type(body, Object))
                return callback(new Error('Can\'t parse body: '+ body));

            if (body.result && body.result == 'success')
                callback();
            else
                callback(new Error('Download dir does not changed, reason: ' + body));

        });
    };

    // can be 4: (torrentFile, dir, callback, cycle) or 3: (torrentFile, callback, cycle) arguments
    // if you use 3 arguments, then will be used default dir
    Transmission.AddTorrent = function(torrentFile, dir, callback, cycle){
        if(!callback || !Type(callback, Function)) {
            if (dir && Type(dir, Function)) {
                cycle = callback;
                callback = dir;
                dir = null;
            }
            else
                return Log.error('Callback in AddTorrent can\'t defined');
        }

        if (!torrentFile || !Type(torrentFile,String))
            return callback(new Error('Torrent file can\'t defined'));
        if (!Fs.existsSync(torrentFile))
            return callback(new Error(Util.format('Torrent file %s can\'t find'), torrentFile));


        if (dir && !Type(dir, String))
            return callback(new Error('Dir file can\'t defined correct'));

        if(Type(cycle,undefined) || !Type(cycle, Number))
            cycle = 0;

        Transmission.options.json = true;

        try {
            var body = {
                'method':'torrent-add',
                'arguments':{
                    'paused': false,
                    'metainfo': Fs.readFileSync(torrentFile).toString("base64")}
            };

            if (dir) body.arguments['download-dir'] = dir;

            Transmission.options.body  = JSON.stringify(body);
        } catch (err){
            return callback(err);
        }


        Request.post(Transmission.uri, Transmission.options, function(error, response, body){
            if (error) return callback(error);

            if (response.statusCode == 409 && response.headers['x-transmission-session-id']) {
                if (cycle > 1) return callback(new Error('Error looping with x-transmission-session-id'));

                Transmission.options.headers = {'x-transmission-session-id' : response.headers['x-transmission-session-id']};
                return Transmission.AddTorrent(torrentFile, dir, callback, cycle+1);
            }

            if (response.statusCode != 200)
                return callback(new Error(Util.format('Bad statusCode = %d for torrent %s', response.statusCode, torrentFile)));

            if (!body || !Type(body,Object))
                return callback(new Error(Util.format('Can\'t parse response body %s when adding torrent %s ', body, torrentFile)));

            if (body.result && body.result == 'success') {
                if (body.arguments['torrent-added']) {
                    var arg = body.arguments['torrent-added'];
                    callback(null, arg.hashString, arg.id);
                } else if (body.arguments['torrent-duplicate']) {
                    var arg = body.arguments['torrent-duplicate'];
                    callback(new Error(Util.format('Torrent %s does not added, reason: duplicate, hash=%s, id=%d', torrentFile, arg.hashString, arg.id)));
                } else
                    callback(new Error(Util.format('Torrent %s does not added, reason:%j', torrentFile, body)));
            } else
                callback(new Error(Util.format('Torrent %s does not added, reason:%j', torrentFile, body)));

        });
    };

    // You can send single hash or array of hashes and return single respond or array of res
    Transmission.CheckDownloadState = function(hash, callback) {
        Transmission.GetParam(hash, ['isFinished','percentDone'], callback);
    };

    // You can send single hash,param or/and array of hashes, params and return single respond or array of res
    Transmission.GetParam = function(hash, param, callback, cycle, isHashArray, isParamsArray) {
        if(!callback || !Type(callback, Function))
            return Log.error('Callback can\'t defined');

        if (!hash || !(Type(hash, Array) || Type(hash, String)))
            return callback(new Error('Hash can\'t defined'));
        if (Type(hash, String)) {
            hash = [hash];
            isHashArray = false;
        } else {
            if (hash.length <= 0)
                return callback(new Error('Hash can\'t defined'));
        }

        if (!param || !(Type(param,Array) || Type(param,String)))
            return callback(new Error('Params can\'t defined'));
        if (Type(param, String)) {
            param = [param];
            isParamsArray = false;
        } else {
            if (param.length <= 0)
                return callback(new Error('Param can\'t defined'));
        }

        if(Type(cycle,undefined) || !Type(cycle,Number))
            cycle = 0;

        if(Type(isHashArray,undefined) || !Type(isHashArray,Boolean))
            isHashArray = true;

        if(Type(isParamsArray,undefined) || !Type(isParamsArray,Boolean))
            isParamsArray = true;

        Transmission.options.json = true;

        Transmission.options.body  = JSON.stringify({
            'method':'torrent-get',
            'arguments':{
                'fields': param,
                'ids': hash}
        });

        Request.post(Transmission.uri, Transmission.options, function(error, response, body){
            if (error) return callback(error);

            if (response.statusCode == 409 && response.headers['x-transmission-session-id']) {
                if (cycle > 1) return callback(new Error('Error looping with x-transmission-session-id'));

                Transmission.options.headers = {'x-transmission-session-id' : response.headers['x-transmission-session-id']};
                return Transmission.GetParam(hash, param, callback, cycle+1, isHashArray, isParamsArray);
            }

            if (response.statusCode != 200)
                return callback(new Error('Bad statusCode '+ response.statusCode));

            if (!body || !Type(body, Object))
                return callback(new Error('Can\'t parse body: '+ body));

            if (body.result && body.result == 'success' && body.arguments) {
                var args = body.arguments.torrents;

                if (!args || args.length <= 0 || args.length != hash.length)
                    return callback(new Error('Response args count can\'t  equal requested hashes'));

                for(var i = 0; i < args.length; i++) {
                    for(var j= 0; j < param.length; j++)
                        if (Type(args[i][param[j]],undefined))
                            return callback(new Error('Cant\'t find requested param '+ param[j]));

                    if (!isParamsArray)
                        args[i] = args[i][param[0]];
                }

                if (isHashArray)
                    callback(null, args);
                else
                    callback(null, args[0]);
            } else
                callback(new Error('Can\'t find torrent data: '+body));

        });


    };


    Transmission.RemoveTorrent = function(hash, deleteData, callback, cycle, isHashArray) {
        if(!callback || !Type(callback, Function))
            return Log.error('Callback in ChangeDownloadDir can\'t defined');
        if(!Transmission.uri || !Type(Transmission.uri, String))
            return callback(new Error('Uri can\'t defined, make Init'));

        if (!hash || !(Type(hash, Array) || Type(hash, String)))
            return callback(new Error('Hash can\'t defined'));
        if (Type(hash, String)) {
            hash = [hash];
            isHashArray = false;
        } else {
            if (hash.length <= 0)
                return callback(new Error('Hash can\'t defined'));
        }

        if(!Type(deleteData, Boolean))
            deleteData = false;

        if(Type(cycle,undefined)|| !Type(cycle, Number))
            cycle = 0;

        if(Type(isHashArray,undefined) || !Type(isHashArray,Boolean))
            isHashArray = true;

        Transmission.options.json = true;

        Transmission.options.body  = JSON.stringify({
            'method':'torrent-remove',
            'arguments':{
                'delete-local-data':deleteData,
                'ids': hash}
        });


        Request.post(Transmission.uri, Transmission.options, function(error, response, body){
            if (error) return callback(error);

            if (response.statusCode == 409 && response.headers['x-transmission-session-id']) {
                if (cycle > 1) return callback(new Error('Error looping with x-transmission-session-id'));

                Transmission.options.headers = {'x-transmission-session-id' : response.headers['x-transmission-session-id']};
                return Transmission.RemoveTorrent(hash, deleteData, callback, cycle+1, isHashArray);
            }

            if (response.statusCode != 200)
                return callback(new Error('Bad statusCode '+ response.statusCode));

            if (!body || !Type(body,Object))
                return callback(new Error('Can\'t parse body: '+ body));

            if (body.result && body.result == 'success') {
                callback();
            } else
                callback(new Error('Torrent does not added'), body);

        });
    };


    /// Private functions ///

    Transmission.getRedirectPath = function(callback){
        if (!Transmission.server.host || !Type(Transmission.server.host, String))
            return callback(new Error('Server Host can\'t defined'));
        if (!Transmission.server.port || !Type(Transmission.server.port, Number))
            Transmission.server.port = 9091;
        if(!callback || !Type(callback, Function))
            return Log.error('Callback can\'t defined');

        Transmission.uri = Util.format('http://%s:%d/',
            Transmission.server.host,
            Transmission.server.port);

        Request.get(Transmission.uri, Transmission.options, function(error, response, body){
            if (error) return callback(error);

            if (response.statusCode < 300 && response.statusCode > 399)
                return callback(new Error(Util.format('StatusCode=%s not equal 3XX', response.statusCode)));

            var location =  response.headers.location.split('/').slice(1,2).join('/');

            callback(null, Util.format('http://%s:%d/%s/',
                                         Transmission.server.host,
                                         Transmission.server.port,
                                         location));
        });
    }
}

module.exports = Transmission;