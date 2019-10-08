
const mustache = require("mustache")
const fs = require('fs');

const textParserDefines = {
    URLEncode:function(content) {
        return encodeURIComponent(content);
    },
    URLDecode:function(content) {
        return decodeURIComponent(content);
    }
}

const parserDefines = {
    Bean: function (content) {
        return render("props", metaFromSql(content).params)
    },
    SPIParam: function (content) {
        var metas = metaFromSql(content).params.map(m => {
            if (m.type === "Date") {
                m.type = "long"
            }
            return m
        });
        metas[metas.length-1].comma = ")"
        return render("requestParams", metas)
    },
    Annotation: function(content) {
        return render("annotation", metaFromSql(content))
    },
    MethodParams: function(content) {
        var body = metaFromSql(content).params.map(v => {
            if (v.type === "Date") {
                v.type = "long"
            }
            return v.type +" "+ v.name 
        }).reduce((pre,cur) => {
            return  pre + "," +cur
        });
        return "(" + body + ")"
    },
    Mapper:function(content) {
        return render("mapper", metaFromSql(content))
    },
    SQLInsert:function(content) {
        return render("sqlInsert", metaFromSql(content))
    }
}

function parse(type, content) {
    return parserDefines[type](content);
}

function textParse(type, content) {
    return textParserDefines[type](content);
}

function metaFromSql(content) {

    let tableName = content.substring(content.indexOf("TABLE")+5,content.indexOf("(")).replace(" ","");
    
    var array = content.match(/`.*`.*,/g)
    if (!array) {
        throw "parse failure";
    }
    var params = array.map(x => parseParam(x));
    params[params.length-1].comma = ""

    var comment;
    if (content.lastIndexOf("COMMENT") >= 0) {
        comment = content.substring(content.lastIndexOf("COMMENT"), content.length - 1);
        comment = comment.substring(comment.indexOf("'")+1,comment.lastIndexOf("'"));
    }

    return { 
        tableName:tableName,
        params: params,
        comment:comment,
        time:new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
    }
}

function parseParam(content) {
    var obj = {comma:","}
    var strArray = content.split(" ")
    obj.name = strArray[0].replace(/`/g, '')

    let typeStr = strArray[1]
    if (typeStr.indexOf("int") !== -1) {
        obj.type = "int"
    } else if (typeStr.indexOf("bigint") !== -1) {
        obj.type = "long"
    } else if (typeStr.indexOf("datetime") !== -1) {
        obj.type = "Date"
    } else if (typeStr.indexOf("bit") !== -1 || typeStr.indexOf("boolean") !== -1) {
        obj.type = "boolean"
    } else if (typeStr.indexOf("char") !== -1) {
        obj.type = "String"
    }

    if (content.indexOf("COMMENT") >= 0) {
        var comment = content.substring(content.indexOf("COMMENT"), content.length - 1);
        obj.comment = comment.substring(comment.indexOf("'")+1,comment.lastIndexOf("'"));
    }
    return obj
}

function render(templateName, metas) {
    const path = require("path");
    let template = fs.readFileSync(path.resolve(__dirname, "./templates/schema2bean.mst"), 'utf8')
    return mustache.render(template, { [templateName]: metas });
}


function parseHTTPMethod(content) {
    if(content.indexOf("PostMapping") !== -1){
        return "POST"
    }else if(content.indexOf("GetMapping") !== -1){
        return "GET"
    }else if(content.indexOf("PutMapping") !== -1){
        return "PUT"
    }else {
        return null
    }
}

function parseParameter(name,content) {

    var defaultValue = ""
    if (content.indexOf("defaultValue") !== -1) {
        defaultValue = content.substring(content.indexOf("defaultValue"),content.length);
        let array = defaultValue.match(/".*"/g);
        defaultValue = array[array.length-1].replace(/"/g,"")
    }

    if(content.indexOf(name) !== -1){
        var array = content.replace(/,|;|\)/g,"").split(" ");
        return {
            name:array[array.length-1],
            defaultValue:defaultValue
        }
    }
    return {
        name: null
    }
}

function parseSpi(content) {

    var array = content.split("\n")
    let httpMethod = parseHTTPMethod(array[0])
    let url = array[0].match(/".*"/g)[0].replace(/"/g,"")
    let headers = array.map(line => {
        return parseParameter("RequestHeader",line)
    }).filter(x => !!x.name);

    let params = array.map(line => {
        return parseParameter("RequestParam",line)
    }).filter(x => !!x.name);

    return render2Curl({ method: httpMethod, url:url,
        headers:headers, params:params
     })
}

function render2Curl(meta) {
    const path = require("path");
    let template = fs.readFileSync(path.resolve(__dirname, "./templates/spi2request.mst"), 'utf8')
    return mustache.render(template, { [meta.method]: meta }).replace(/(\r\n|\n|\r)/gm," ");
}

const parserNames = Object.keys(parserDefines)
const textParserNames = Object.keys(textParserDefines)

module.exports = {
    parse,
    textParse,
    parserNames,
    textParserNames,
    parseSpi
}
