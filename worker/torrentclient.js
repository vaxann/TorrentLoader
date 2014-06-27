var Transmission = require('./torrent_clients/transmission');
var UTorrent = null; //require('./torrent_clients/utorrent');

function TorrentClient(server){
    var TorrentClient = this;

    TorrentClient.server = server;

    if (TorrentClient.server.application == 'transmission'){
        TorrentClient.application = new Transmission(TorrentClient.server);
    } else {
        TorrentClient.application = new UTorrent(TorrentClient.server);
    }

    TorrentClient.Init = function(callback) {
        TorrentClient.application.Init(callback);
    };

    TorrentClient.ChangeDownloadDir = function(dir, callback){
        TorrentClient.application.ChangeDownloadDir(dir, callback);
    };

    TorrentClient.AddTorrent = function(torrentFile, dir, callback){
        TorrentClient.application.AddTorrent(torrentFile, dir, callback);
    };

    TorrentClient.CheckDownloadState = function(hash, callback){
        TorrentClient.application.CheckDownloadState(hash, callback);
    };

    TorrentClient.GetParam = function(hash, param, callback){
        //TODO: Add param mapping for anther torrent application
        TorrentClient.application.GetParam(hash, param, callback);
    };

    TorrentClient.SetParam = function(hash, param, value, callback){
        //TODO: Add param mapping for anther torrent application
        TorrentClient.application.SetParam(hash, param, value, callback);
    };

    TorrentClient.RemoveTorrent = function(hash, deleteData, callback){
        TorrentClient.application.RemoveTorrent(hash, callback);
    };
}

module.exports = TorrentClient;