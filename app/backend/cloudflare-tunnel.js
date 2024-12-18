/**
 MIT License

 Copyright (c) 2022 Louis Lam

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
*/

const childProcess = require("child_process");
const commandExistsSync = require("command-exists").sync;

class CloudflaredTunnel {

    constructor(cloudflaredPath = "cloudflared") {
        this.cloudflaredPath = cloudflaredPath;

        this.url = "http://localhost:80";
        this.hostname = "";
    }

    get token() {
        return this._token;
    }

    set token(token) {
        if (token && typeof token === "string") {
            token = token.trim();

            // try to strip out "cloudflared.exe service install"
            let array = token.split(" ");
            if (array.length > 1) {
                for (let i = 0; i < array.length - 1; i++) {
                    if (array[i] === "install") {
                        token = array[i + 1];
                    }
                }
            }
        }

        this._token = token;
    }

    checkInstalled() {
        return commandExistsSync(this.cloudflaredPath);
    }

    emitChange(msg, code) {
        console.log(msg);
    }

    emitError(msg) {

        const imp_err_ids= [
            "ERR Unable to establish connection with Cloudflare edge",
            "ERR Failed to fetch features, default to disable error",
            "ERR edge discovery: error looking up Cloudflare edge IPs:"
        ];

        if (imp_err_ids.some(subStr => msg.includes(subStr))) {
            throw new Error(msg.split('ERR')[1].trim());
        }

    }

    start(additionalArgs = {}) {
        if (this.childProcess) {
            this.emitError("Already started");
            return;
        }

        if (!this.checkInstalled()) {
            this.emitError(`Cloudflared error: ${this.cloudflaredPath} is not found`);
            return;
        }

        if (!this.token) {
            this.emitError("Cloudflared error: Token is not set");
            return;
        }

        const args = [
            "tunnel",
            "--no-autoupdate",
        ];

        if (!!additionalArgs.configPath) {
            args.push("--config");
            args.push(additionalArgs.configPath);
        }

        if (!!additionalArgs.metrics) {
            args.push("--metrics");
            args.push(`0.0.0.0:${additionalArgs.metrics}`);
        }

        if (!!additionalArgs.edgeIpVersion) {
            args.push("--edge-ip-version");
            args.push(additionalArgs.edgeIpVersion);
        }

        if (!!additionalArgs.edgeBindAddress) {
            args.push("--edge-bind-address");
            args.push(additionalArgs.edgeBindAddress);
        }

        if (!!additionalArgs.gracePeriod) {
            args.push("--grace-period");
            args.push(additionalArgs.gracePeriod);
        }

        if (!!additionalArgs.region) {
            args.push("--region");
            args.push(additionalArgs.region);
        }

        if (!!additionalArgs.retries) {
            args.push("--retries");
            args.push(additionalArgs.retries);
        }

        if (!!additionalArgs.protocol) {
            args.push("--protocol");
            args.push(additionalArgs.protocol);
        }

        args.push("run");
        args.push("--token");
        args.push(this.token);

        this.emitChange("Starting cloudflared");
        this.childProcess = childProcess.spawn(this.cloudflaredPath, args);
        this.childProcess.stdout.pipe(process.stdout);
        this.childProcess.stderr.pipe(process.stderr);

        this.childProcess.on("close", (code) => {
            this.childProcess = null;
            this.emitChange("Stopped cloudflared", code);
        });

        this.childProcess.on("error", (err) => {
            if (err.code === "ENOENT") {
                this.emitError(`Cloudflared error: ${this.cloudflaredPath} is not found`);
            } else {
                this.emitError(err);
            }
        });

        this.childProcess.stderr.on("data", (data) => {
            let msg = data.toString();
            if (!/\s(INF|WRN)\s/g.test(msg)) {
                this.emitError(msg);
            }
        });
    }

    stop() {
        this.emitChange("Stopping cloudflared");
        if (this.childProcess) {
            this.childProcess.kill("SIGINT");
            this.childProcess = null;
        }
    }
}

module.exports = {
    CloudflaredTunnel
};
