var fs = require('fs');
var path = require('path');
var log = require('../log')(module);

var fileNameOfDump = path.join(__dirname, 'dump.json');
var dumpHash = {};
var dumpDir = {};
var dump = [];

// add to end of file
function push(step, file, hash) // step - stage of addition torrent
{
    var obj = {step: step, file: file, hash: hash};

    var oldObj = getDumpByHash(hash);
    if (oldObj == null) {
        dump.push(obj);

        rebuildIndexes();

        deserialize();

        return obj;
    } else {
        log.debug("File already added to dump", file);
        return oldObj;
    }
}


function changeStep(hash, step){
    var obj = getDumpByHash(hash);
    if (obj) {
        obj.step = step;

        deserialize();
    }
}


// first ini dumpHash module
function rebuildIndexes() {
    dumpHash = {};
    dumpDir = {};

    if (dump) {
        dump.forEach(function (obj) {
            dumpHash[obj.hash] = obj;

            var dir = path.dirname(obj.file);
            if (!dir in dumpDir) dumpDir[dir] = [];
            dumpDir[dir].push(obj);
        });
    }
}

// first init
function init(){
    if (serialize()) {
        //make dumpHash and dumpDir
        rebuildIndexes();
    }
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
    if (dir in dumpDir) {
        return dumpDir[dir];
    } else {
        return null;
    }
}


function removeDumpByHash(hash) {
    if (hash in dumpHash) {
        var obj = dumpHash[hash];

        var index = dump.indexOf(obj);
        if (index >= 0) dump.splice(index, 1);

        rebuildIndexes();

        deserialize();

        return true;
    } else {
        return false;
    }
}



// load form file
function serialize() {
    var data;
    try {
        data = fs.readFileSync(fileNameOfDump, 'utf8');
    } catch (err) {
        log.error('Error load dump', err);
        return false;
    }

    try {
        dump = JSON.parse(data);
    } catch (err){
        log.error('Error parsing dump', err);
        return false;
    }

    return true;
}


// save to file
function deserialize()
{
    try{
        fs.writeFileSync(fileNameOfDump, JSON.stringify(dump,null,4),'utf8');
    } catch (err){
        log.error('Error write dumpHash file', err);
        return false;
    }

    return true;
}


exports.dumpList = dump;
exports.changeStep = changeStep;
exports.getDumpListByDir = getDumpListByDir;
exports.getByHash = getDumpByHash;
exports.removeDumpByHash = removeDumpByHash;
exports.init = init;
exports.push = push;

