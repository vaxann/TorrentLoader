var Fs = require('fs');
var Path = require('path');
var Async = require('async');
var Log = require('../log/index')(module);
var Type = require('type-of-is');

var fileNameOfDump = Path.join(Path.dirname(__dirname), 'dump.json');
var dumpHash = {};
var dumpListByDir = {};
var dumpList = [];

// add to end of file
function push(step, file, hash, callback) { // step - stage of addition torrent
    if(!Type(callback,'Function'))
        return Log.error('Error, in dump.push function type of attr "callback" must be a "Function"');

    if(!Type(step,Number))
        return callback(new Error('Error, type of attr "step" must be a "Number"'));
    if(!Type(file,String))
        return callback(new Error('Error, type of attr "file" must be a "String"'));
    if(!Type(hash,String))
        return callback(new Error('Error, type of attr "hash" must be a "String"'));

    var obj = {step: step, file: file, hash: hash};

    var oldObj = getDumpByHash(hash);
    if (oldObj == null) {
        dumpList.push(obj);

        Async.parallel([
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
    if(!Type(callback,'Function'))
        return Log.error('Error, in dump.changeStep function type of attr "callback" must be a "Function"');

    if(!Type(hash,String))
        return callback(new Error('Error, type of attr "hash" must be a "String"'));
    if(!Type(step,Number))
        return callback(new Error('Error, type of attr "step" must be a "Number"'));


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
    if(!Type(callback,'Function'))
        return Log.error('Error, in dump.rebuildIndexes function type of attr "callback" must be a "Function"');

    dumpHash = {};
    dumpListByDir = {};

    if (dumpList) {
        Async.each(dumpList, function(obj,callback) {
            dumpHash[obj.hash] = obj;

            var dir = Path.dirname(obj.file);
            if (dir in dumpListByDir)
                dumpListByDir[dir].push(obj);
            else
                dumpListByDir[dir] = [obj];


            callback();
        }, callback);
    } else {
        callback(new Error('Error dump is null'));
    }
}

// first init
function init(callback){
    if(!Type(callback,'Function'))
        return Log.error('Error, in dump.init function type of attr "callback" must be a "Function"');

    Async.waterfall([
            serialize,
            rebuildIndexes
        ],callback);
}

//
function getDumpByHash(hash){
    if(!Type(hash,String)) {
        Log.error('Error, in dump.getDumpByHash function type of attr "hash" must be a "String"');
        return null;
    }

    if (hash in dumpHash) {
        return dumpHash[hash];
    } else {
        return null;
    }
}

function getDumpListByDir(dir){
    if(!Type(dir,String)) {
        Log.error('Error, in dump.getDumpListByDir function type of attr "dir" must be a "String"');
        return null;
    }

    if (dir in dumpListByDir) {
        return dumpListByDir[dir];
    } else {
        return null;
    }
}


function removeDumpByHash(hash, callback) {
    if(!Type(callback,'Function'))
        return Log.error('Error, in dump.removeDumpByHash function type of attr "callback" must be a "Function"');

    if(!Type(hash,String))
        return callback(new Error('Error, type of attr "hash" must be a "String"'));

    if (hash in dumpHash) {
        var obj = dumpHash[hash];

        var index = dumpList.indexOf(obj);
        if (index >= 0) dumpList.splice(index, 1);

        Async.parallel([
            rebuildIndexes,
            deserialize
        ],callback);
    } else {
        callback('Error removeDumpByHash, can\'t find hash');
    }
}



// load form file
function serialize(callback) {
    if(!Type(callback,'Function'))
        return Log.error('Error, in serialize.removeDumpByHash function type of attr "callback" must be a "Function"');

    Async.waterfall([
            function(callback){ //reading file
                Fs.readFile(fileNameOfDump,'utf8',function(err, data){
                    if (err) return callback(err);

                    callback(null,data);
                });
            },
            function(data, callback){ //parsing file data to object
                var parsedData = null;
                try {
                    parsedData = JSON.parse(data);
                } catch (err){
                    return callback(err);
                }
                callback(null, parsedData);
            },
            function(parsedData, callback) { //checking data types
                if (!Type(parsedData, Array))
                    return callback(new Error('Error, loaded dump is\'t array'));

                Async.each(parsedData, function(obj, callback) {
                    if(!Type(obj,Object))
                        return callback(new Error('Error with loading dump, type of dump[] must be an "Object"'));
                    if(!Type(obj.step,Number))
                        return callback(new Error('Error with loading dump, type of attr "step" must be a "Number"'));
                    if(!Type(obj.file,String))
                        return callback(new Error('Error with loading dump, type of attr "file" must be a "String"'));
                    if(!Type(obj.hash,String))
                        return callback(new Error('Error with loading dump, type of attr "hash" must be a "String"'));

                    callback();
                }, function(err){
                    if (err) return callback(err);

                    dumpList = parsedData;
                    callback();
                });
            }
        ],callback);
}


// save to file
function deserialize(callback)
{
    if(!Type(callback,'Function'))
        return Log.error('Error, in serialize.deserialize function type of attr "callback" must be a "Function"');

    Fs.writeFile(fileNameOfDump, JSON.stringify(dumpList,null,4),'utf8',callback);
}


exports.dumpList = dumpList;
exports.changeStep = changeStep;
exports.getDumpListByDir = getDumpListByDir;
exports.getByHash = getDumpByHash;
exports.removeDumpByHash = removeDumpByHash;
exports.init = init;
exports.push = push;

