const axios = require('axios');
const process = require('process');

const os = getOS();

const bus = require('./bus.js');
const { request, download, extract, remove } = require('./utils.js');
const dependencies = require('../json/dependencies.json');

function getOS() {
    switch (process.platform) {
        case "darwin":
            return "osx";
        case "linux":
            return "x86";
        case "win32":
            return "windows";
    }
}

function generatePaths(config) {
    return {
        version: `${config.root}/versions/${config.version}`,
        libraries: `${config.root}/libraries`,
        natives: `${config.root}/natives/${config.version}`,
        assets: `${config.root}/assets`
    };
}

function prepareClient(config) {
    const source = generatePaths(config);
    return new Promise(async function(resolve,reject) {
        // Get link to Version file
        const versionRequest = await request(dependencies.versions);
        const version = versionRequest.versions.filter(v => v.id === config.version)[0];

        // Install Version
        const versionPath = await download(version.url,`${source.version}/${config.version}.json`);
        const versionJSON = require(versionPath);

        // Install Assets
        const assetsPath = await download(versionJSON.assetIndex.url,`${source.assets}/indexes/${versionJSON.assetIndex.id}.json`);
        const assetsJSON = require(assetsPath);

        const classPath = [];

        // Install Client
        const clientPath = await download(versionJSON.downloads.client.url,`${source.version}/${config.version}.jar`);
        classPath.push(clientPath);

        // Install Libraries
        for (let lib of versionJSON.libraries) {
            if (lib.rules) {
                let skip = false;
                for (let rule of lib.rules) {
                    if (rule.action === "disallow") {
                        skip = true;
                        break;
                    }
                }
                if (skip) continue;
            }
            let libPath = await download(lib.downloads.artifact.url,`${source.libraries}/${lib.downloads.artifact.path}`);
            classPath.push(libPath);

            // Install Natives
            let classifiers = lib.downloads.classifiers;
            if (classifiers) {
                let native = classifiers[`natives-${config.os}`];
                if (native) {
                    let nativePath = await download(native.url,`${source.natives}/${native.path.replace(/^.*[\\\/]/, '')}`);
                    let nativeExtract = await extract(nativePath,source.natives);
                    remove(nativePath);
                }
            }
        }

        // Install Asset Objects
        for (let obj in assetsJSON.objects) {
            let hash = assetsJSON.objects[obj].hash;
            let hex = hash.slice(0,2);
            let objPath = await download(`${dependencies.assets}/${hex}/${hash}`,`${source.assets}/objects/${hex}/${hash}`);
        }

        // Get JVM arguments
        let jvm = [];
        for (let rule of versionJSON.arguments.jvm) {
            if (typeof rule === 'string') continue;
            if (os === rule.rules[0].os.name) {
                if (Array.isArray(rule.value)) {
                    jvm = jvm.concat(rule.value);
                } else {
                    jvm.push(rule.value);
                }
            }
        }

        resolve({
            natives: source.natives,
            classPath: classPath.join(':').replace(" ","\\ "),
            mainClass: versionJSON.mainClass,
            version: config.version,
            gameDir: config.root,
            assetsDir: source.assets,
            assetIndex: versionJSON.assetIndex.id,
            versionType: versionJSON.type,
            jvm
        });
    });
}

function authenticate(username,password) {
    return new Promise(async function(resolve,reject) {
        let agent = { name: "Minecraft", version: 1 };
        let response1 = await axios.post(dependencies.authentication,{ agent, username, password });
        let response2 = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${response1.data.selectedProfile.name}`);
        resolve({
            username: response1.data.selectedProfile.name,
            accessToken: response1.data.accessToken,
            uuid: response2.data.id
        });
    });
}

module.exports = { prepareClient, authenticate };
