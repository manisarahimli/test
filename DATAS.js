const fs = require('fs');

var arr = [];
var elemCount = 0;

fs.readFile('UsersData.json',function(err,data){
    data=JSON.parse(data).feeds;
    data.forEach(elem => {
        if (elemCount <= 100) {
            var obj = {'location': elem['location'], 'name': elem['name'], 'userId': elem['userId']};
            arr.push(obj);
        }
        elemCount++;
    });
})

exports.arr = arr;
