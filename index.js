const querystring = require('querystring');
const http = require('http');
const fs = require('fs');
const PORT = process.env.PORT || 3000;
const base = './public';

function checkFile(filename) {
    return new Promise((resolve, reject) => {
        fs.stat(filename, (err, stat) => {
            if (err) return reject(err);
            if (stat.isDirectory()) {
                return resolve(checkFile(filename + 'index.html'));
            }
            if (!stat.isFile()) return reject('Not a file');
            fs.access(filename, fs.R_OK, err => {
                if (err) reject(err);
                resolve(filename);
            })
        });
    });
}

function parse(data, type) {
    switch (type) {
        case 'application/json':
            data = JSON.parse(data);
            break;
        case 'application/x-www-form-urlencoded':
            data = querystring.parse(data);
            break;
    }
    return data;
}

function handler(req, res) {

    if (req.method === "POST") {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => {
            data = parse(data, req.headers['content-type']);
            let fn = data.firstName;
            let ln = data.lastName;

            let lastName = JSON.stringify({
                "lastName": data.lastName
            });

            let options = {
                hostname: 'netology.tomilomark.ru',
                port: 80,
                path: '/api/v1/hash',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Firstname': data.firstName,
                    'Content-Length': Buffer.byteLength(lastName)
                }
            };

            function clientHandler(response) {
                let data = '';
                response.on('data', function(chunk) {
                    data += chunk;
                });
                response.on('end', function() {
                    res.writeHead(200, 'OK', {
                        'Content-Type': 'application/json'
                    });
                    let resData = JSON.parse(data);
                    let result = JSON.stringify({
                        "firstName": fn,
                        "lastName": ln,
                        "secretKey": resData.hash
                    });
                    res.write(result);
                    res.end();
                });
            }

            let request = http.request(options);
            request.write(lastName);
            request.on('response', clientHandler);
            request.end();




        });
    } else {



        checkFile(base + req.url)
            .then(filename => {
                res.writeHead(200, 'OK', {
                    'Content-Type': 'text/html'
                });
                fs.createReadStream(filename).pipe(res);
            })
            .catch(err => {
                res.writeHead(404, http.STATUS_CODES[404], {
                    'Content-Type': 'text/html'
                });
                res.end('File not found');
            });


    }

}


const server = http.createServer();
server.on('error', err => console.error(err));
server.on('request', handler);
server.on('listening', () => {
    console.log('Start HTTP on port %d', PORT);
});
server.listen(PORT);