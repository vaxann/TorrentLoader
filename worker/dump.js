var fs = require('fs');
var path = require('path');
var async = require('async');
var log = require('../log')(module);

var fileNameOfDump = path.join(path.dirname(__dirname), 'dump.json');
var dumpHash = {};
var dumpListByDir = {};
var dumpList = [];

// add to end of file
function push(step, file, hash, callback) // step - stage of addition torrent
{
    debugger;
    var obj = {step: step, file: file, hash: hash};

    var oldObj = getDumpByHash(hash);
    if (oldObj == null) {
        dumpList.push(obj);

        async.parallel([
            rebuildIndexes,
            deserialize
        ],function(err){
            if (err) return callback(err);
            callback(null, obj);
        });
    } else {
        callback(null, oldObj);
    }
}


function changeStep(hash, step, callback){
    var obj = getDumpByHash(hash);
    if (obj) {
        obj.step = step;

        deserialize(function(err){
            if (err) return callback(err);
            callback(null, obj);
        });
    }
}


function rebuildIndexes(callback) {
    dumpHash = {};
    dumpListByDir = {};

    if (dumpList) {
        async.each(dumpList, function(obj,callback) {
            debugger;
            dumpHash[obj.hash] = obj;

            var dir = path.dirname(obj.file);
            if (!dir in dumpListByDir) dumpListByDir[dir] = [];
            dumpListByDir[dir].push(obj);

            callback();
        }, callback);
    } else {
        callback('Error dump is null');
    }
}

// first init
function init(callback){
    async.waterfall([
            serialize,
            rebuildIndexes
        ],callback);
}

//
function getDumpByHash(hash){
    if (hash in dumpHash) {
        return dumpHash[hash];
    } else {
        return null;
    }
}

function getDumpListByDir(dir){
    if (dir in dumpListByDir) {
        return dumpListByDir[dir];
    } else {
        return null;
    }
}


function removeDumpByHash(hash, callback) {
    if (hash in dumpHash) {
        var obj = dumpHash[hash];

        var index = dumpList.indexOf(obj);
        if (index >= 0) dumpList.splice(index, 1);

        async.parallel([
            rebuildIndexes,
            deserialize
        ],callback);
    } else {
        callback('Error removeDumpByHash, can\'t find hash');
    }
}



// load form file
function serialize(callback) {
    async.waterfall([
            function(callback){ //reading file
                fs.readFile(fileNameOfDump,'utf8',function(err, data){
                    if (err) return callback(err);

                    callback(null,data);
                });
            },
            function(data, callback){ //parsing file data to object
                try {
                    dumpList = JSON.parse(data);
                } catch (err){
                    return callback(err);
                }
                callback(null);
            }
        ],callback);
}


// save to file
function deserialize(callback)
{
    debugger;
    fs.writeFile(fileNameOfDump, JSON.stringify(dumpList,null,4),'utf8',
        function(err) {
           if (err) log.debug('Error writing file', err);
           callback(err);
        }
    );
}


exports.dumpList = dumpList;
exports.changeStep = changeStep;
exports.getDumpListByDir = getDumpListByDir;
exports.getByHash = getDumpByHash;
exports.removeDumpByHash = removeDumpByHash;
exports.init = init;
exports.push = push;

