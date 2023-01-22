import { aaDatabase } from "../../index.js";

export async function buildFile(getMeta, type, animation, dbType, variant, color, customPath) {
    if (!dbType && !customPath) { return false }

    if (customPath) {
        return { file: customPath, fileData: customPath }
    }

    if (!aaDatabase[dbType]?.[type]?.[animation]) {
        return { file: aaDatabase[dbType]?.[type]}
    }

    const cleanType = getCleanProperty(aaDatabase[dbType], type);
    const cleanAnimation = getCleanProperty(aaDatabase[dbType][cleanType], animation);
    const cleanVariant = getCleanProperty(aaDatabase[dbType][cleanType][cleanAnimation], variant);
    const cleanColor = getCleanProperty(aaDatabase[dbType][cleanType][cleanAnimation][cleanVariant], color);

    const returnArray = Object.keys(aaDatabase.return.weapon);
    
    return {
        fileData: color === "random" 
            ? aaDatabase[dbType][cleanType]?.[cleanAnimation]?.[cleanVariant] 
            : aaDatabase[dbType][cleanType]?.[cleanAnimation]?.[cleanVariant]?.[cleanColor][0],
        file: color === "random" 
            ? `autoanimations.${dbType}.${[cleanType]}.${cleanAnimation}.${cleanVariant}` 
            : `autoanimations.${dbType}.${[cleanType]}.${cleanAnimation}.${cleanVariant}.${cleanColor}`,
        returnFile: returnArray.some(el => cleanAnimation === el) 
            ? `autoanimations.return.weapon.${cleanAnimation}.${cleanVariant}.${cleanColor}` 
            : false,
    }

    function getCleanProperty(path, prop) {
        let newArray = Object.keys(path ?? {});
        if (newArray.length) {
            clearMarker(newArray)
        }
        return cleanProperty(newArray, prop)
    }

    function clearMarker(inArray) {
        let markerCheck = inArray.indexOf("_markers");
        if (markerCheck !== -1) {
            inArray.splice(markerCheck, 1)
        }
    }
    
    function cleanProperty(inArray, prop) {
        return inArray.some(el => prop === el) ? prop : inArray[0]
    }

    function getReturnDBPath() {

    }
}




