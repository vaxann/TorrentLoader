var Transmission = require('torrent_clients/transmission');
var UTorrent = require('torrent_clients/utorrent');

function TorrentClient(server){
    var TorrentClient = this;

    TorrentClient.server = server;

    if (TorrentClient.server.client == 'transmission'){
        TorrentClient.client = new Transmission(TorrentClient.server);
    } else {
        TorrentClient.client = new UTorrent(TorrentClient.server);
    }

    TorrentClient.ChangeDownloadDir = function(dir, callback){
        TorrentClient.client.ChangeDownloadDir(dir, callback);
    };

    TorrentClient.AddTorrent = function(torrentFile, callback){
        TorrentClient.client.AddTorrent(torrentFile, callback);
    };

    TorrentClient.CheckDownloadState = function(hash, callback){
        TorrentClient.client.CheckDownloadState(hash, callback);
    };

    TorrentClient.GetParam = function(hash, param, callback){
        TorrentClient.client.GetParam(hash, param, callback);
    };

    TorrentClient.MakeAction = function(hash, action, callback){
        TorrentClient.client.MakeAction(hash, action, callback);
    };
}

module.exports = TorrentClient;