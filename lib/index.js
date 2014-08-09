var Type = require('type-of-is');

// clone object properties
// if property in propArray not found in source object - skip it
// if property Type in propArray not correct in source object - return false
// Example:
// if (!Lib.clone(Server, serverData, [{'name':'String'},
//                                     {'application':'String'},
//                                     {'host':'String'},
//                                     {'port': 'Number'},
//                                     {'user':['String','undefined']},
//                                     {'password':['String','undefined']}]))

function clone(destinationObj, sourceObj, propArray, recursively){
    if (!Type.instance(sourceObj,Object)) return false;
    if (!Type.instance(destinationObj,Object)) return false;
    if (!Type(propArray,Array)) return false;
    if (!Type.any(recursively,[undefined, Boolean])) return false;
    if (Type(recursively, undefined)) recursively = false;

    for (var i = 0; i < propArray.length; i++) {
        var propObj = propArray[i];
        var prop = null;
        var propType = null;
        if (Type(propObj,Object)) {
            prop = first(propObj);
            propType = propObj[prop];
            if (!Type.any(propType, [Array,String]))
                return false;
            if (Type(propType, String))
                propType = [propType];

            if (Type(sourceObj[prop], undefined)) continue;

            if (!Type.any(sourceObj[prop], propType))
                return false;

        } else if (Type(propObj,String)) {
            prop = propObj;
            if (Type(sourceObj[prop], undefined)) continue;
        } else
            return false;

        if (Type.instance(sourceObj[prop], Object) && recursively) {
            sourceObj[prop] = {};
            if (!clone(destinationObj[prop], sourceObj[prop], propArray, recursively))
                return false;
        } else {
            destinationObj[prop] = sourceObj[prop];
        }
    }
    return true;
}

// Get first key in Object
function first(obj) {
    if (!Type(obj, Object)) throw Error('Error type of obj in first');

    for (var k in obj) return k;

    throw Error('Cat\'t find key in obj');
}

// Check array of vars (object properties) for equal of spec types
function checkPropertyTypes(propertyArray) {
    if (!Type(propertyArray,Array)) throw Error('Error type propertyArray attribute in checkPropertyTypes');

    var result = [];

    for(var i=0; i < propertyArray.length; i++) {
        var property  = propertyArray[i];

        if (!Type(property, Array)) throw Error('Error type property in propertyArray');

        var propName = first(property[0]);
        var propValue = property[0][propName];
        var propType = property[1];

        if (!Type(propName, String)) throw Error('Error type propName in property');

        if (!Type.any(propType, [String,Array])) throw Error('Error type propType in property');
        if (Type(propType, String)) propType = [propType];


        if (!Type.any(propValue, propType))
            result.push(property);
    }

    if (result.length == 0) return null;

    return result;
}

// Build text report for result of checkPropertyTypes function
function buildPropertyReport(template, propertyArray){
    if (!Type(template,String)) throw Error('Error template in buildPropertyReport');
    if (!Type(propertyArray,Array)) throw Error('Error propertyArray in buildPropertyReport');

    var result = '';

    for(var i=0; i < propertyArray.length; i++) {
        var property  = propertyArray[i];
        var tmp = template;

        if (!Type(property, Array)) throw Error('Error type property in propertyArray');

        var propName = first(property[0]);
        var propValue = property[0][propName];
        var propType = property[1];

        if (!Type(propName, String)) throw Error('Error type propName in property');

        if (!Type.any(propType, [String,Array])) throw Error('Error type propType in property');
        if (Type(propType, Array)) propType = propType.toString();

        tmp = tmp.replace(/\%propName\%/ig, propName);
        tmp = tmp.replace(/\%propValue\%/ig, propValue);
        tmp = tmp.replace(/\%propType\%/ig, propType);

        result += tmp;
    }

    return result;
}

// returns pas to dir without '/' in the end
function simplePath(path){
    pathTemplate = /([\s\S]*)\/$/g;
    var result = null;
    if ((result = pathTemplate.exec(path)) != null) {
        return result[1];
    } else {
        return path;
    }
}

exports.clone = clone;
exports.first = first;
exports.checkPropertyTypes = checkPropertyTypes;
exports.buildPropertyReport = buildPropertyReport;
exports.simplePath = simplePath;