const axios = require('axios');
const unzip = require('unzipper');
const fs = require('fs');

const bus = require('./bus.js');

function request(url) {
    return new Promise((resolve,reject) => {
        axios.get(url)
        .then((response) => {
            resolve(response.data);
        });
    });
}

function download(url,path) {
    return new Promise(async function(resolve,reject) {
        if (fs.existsSync(path)) {
            resolve(path);
            bus.emit('download', `Skipping ${path}`);
        } else {
            let response = await axios({method: 'get', url, responseType: 'stream'});
            let dir = path.substring(0, path.lastIndexOf("/"));
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
            response.data.pipe(fs.createWriteStream(path), {end: true});
            response.data.on('end',() => resolve(path));
            bus.emit('download', `Downloading ${path}`);
        }
    });
}

function extract(path,destination) {
    return new Promise(async function (resolve,reject) {
        const archive = fs.createReadStream(path);
        const dir = destination || path.replace(/\.[^/.]+$/, '');
        archive.pipe(unzip.Extract({
            path: dir
        }));
        resolve(dir);
    });
}

function remove(path) {
    return new Promise(function(resolve,reject) {
        fs.unlink(path,resolve);
    });
}

module.exports = { request, download, extract, remove };
