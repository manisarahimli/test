const http = require('http');
const fs = require('fs');
const data = require('./DATAS.js');

var arr = data.arr;
var display = ``;

http.createServer(function (req, res) {
    arr.forEach(elem => {
        display += `<p><b>Location:</b> ${elem.location}, <b>Name</b> ${elem.name}, <b>User ID</b>: ${elem.userId}<p>`;
    });
    res.end(display);
}).listen(3000, function () {
    console.log('[*] Server started on port 3000...');
});

