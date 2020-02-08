const bus = require('./bus.js');
const service = require('./service.js');
const fs = require('fs');
const { spawn } = require('child_process');

class Launcher {

    constructor(config) {
        this.config = config;
        this.config.userType = this.config.userType || 'mojang';
    };

    async runClient() {
        if (this.config.password) {
            this.config.credentials = await service.authenticate(this.config.username,this.config.password);
            if (this.config.credentials.accessToken) {
                this.config.accessToken = this.config.credentials.accessToken
                this.config.username = this.config.credentials.username;
                this.config.uuid = this.config.credentials.uuid;
            } else {
                bus.emit('error','Invalid username and password. Must use email if using password!');
                return;
            }
        }
        let argConfig = await service.prepareClient(this.config);
        let args = [];
        args.push(`-Djava.library.path=${argConfig.natives}`);
        args = args.concat(argConfig.jvm);
        args.push("-cp");
        args.push(argConfig.classPath);
        args.push(argConfig.mainClass);
        args.push(`--username ${this.config.username}`);
        args.push(`--version ${argConfig.version}`);
        args.push(`--gameDir ${argConfig.gameDir}`);
        args.push(`--assetsDir ${argConfig.assetsDir}`);
        args.push(`--assetIndex ${argConfig.assetIndex}`);
        args.push(`--uuid ${this.config.uuid}`)
        args.push(`--accessToken ${this.config.accessToken}`);
        args.push(`--userType ${this.config.userType}`);
        args.push(`--versionType ${argConfig.versionType}`);
        bus.emit('args', args);
        const launch = spawn(`cd ${this.config.root} && java`, args, {shell: true});
        launch.stdout.on('data',(data) => bus.emit('launch', data.toString()));
        launch.stderr.on('data', (data) => bus.emit('error', `stderr: ${data.toString()}`));
        launch.on('close', (code) => bus.emit('exit', `child process exited with code ${code}`));
    }

    on(event,cb) {
        bus.on(event,cb);
    }
}

module.exports = Launcher;
