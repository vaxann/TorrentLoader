var Type = require('type-of-is');

// clone object properties
function clone(destinationObj, sourceObj, propArray, recursively){
    if (!Type(sourceObj,Object)) return false;
    if (!Type(destinationObj,Object)) return false;
    if (!Type(propArray,Array)) return false;
    if (!Type.any(recursively,[undefined, Boolean])) return false;
    if (Type(undefined)) recursively = false;

    for (var propObj in propArray) {
        var prop = null;
        var propType = null;
        if (Type(propObj,Object)) {
            prop = propObj.key;
            propType = propObj[prop];
        }

        if (Type(sourceObj[prop],undefined)) continue;

        if (Type(sourceObj[prop], Object) && recursively) {
            sourceObj[prop] = {};
            if (!clone(destinationObj[prop], sourceObj[prop], propArray, recursively))
                return false;
        } else {
            destinationObj[prop] = sourceObj[prop];
        }
    }
    return true;
}

exports.clone = clone;