const express = require('express')
const app = express()
const port = process.env.WEBUI_PORT;
const path = require('path');
const bodyParser = require('body-parser')
const cors = require('cors');
const fs = require('node:fs');
const basicAuth = require('express-basic-auth')
const tmp = require('tmp');
const { execSync } = require("node:child_process");

const { CloudflaredTunnel } = require('./cloudflare-tunnel.js');
const tunnel = new CloudflaredTunnel();

const configpath = "/config/config.json";

const cloudflaredconfigdir = "/root/.cloudflared";
const cloudflaredconfigpath = `${cloudflaredconfigdir}/config.yml`;

const viewpath = path.normalize(__dirname + '/../frontend/dist');

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cors());

app.use(express.static(viewpath));

if (!!process.env.BASIC_AUTH_PASS) {
  let users = {};

  let user = process.env.BASIC_AUTH_USER || 'admin';

  users[user] = process.env.BASIC_AUTH_PASS;

  app.use(basicAuth({
    users: users,
    challenge: true
  }))

}



app.get('/', (req, res) => {
  res.sendFile(viewpath + "index.html");
})

app.get('/config', (req, res) => {
  let config = getConfig();
  res.status(200).set('Content-Type', 'application/json').send(JSON.stringify(config));
})

app.get('/version', (req, res) => {
  let version = execSync('cloudflared -v');
  res.status(200).set('Content-Type', 'text/plain').send(version);
})

app.get('/new-version', async (req, res) => {
  const current_version = process.env.VERSION;

  let latest_version = current_version;
  try {
    const resp = await fetch('https://registry.hub.docker.com/v2/repositories/wisdomsky/cloudflared-web/tags/?page_size=100&page=1');

    const image_info = await resp.json();

    const tags = image_info.results.filter(tag => tag.name !== 'latest')

    latest_version = tags[0].name;
  } catch (e) {}

  res.status(200).set('Content-Type', 'application/json').send({
    current_version,
    latest_version,
    update: current_version !== latest_version
  });
})

app.post('/start', (req, res) => {

  let config = getConfig();

  const start = req.body.start; 

  try {
    if (start !== undefined && typeof start === 'boolean') {
      config.start = start;
      saveConfig(config);
    }
    
    init(config, res);
    
  } catch(e) {}
  res.status(500).send();
})


app.post('/token', (req, res) => {

  let config = getConfig();

  const token = req.body.token; 

  if (String(token).trim().length === 0) {
    res.status(400).send("FAIL: TOKEN REQUIRED!");
  }

  config.token = token;

  saveConfig(config);
  try {
    res.status(200).send(`OK!`);
  } catch(e) {}
  console.log(`Token updated: ${token}`);
})


app.get('/advanced/config/local', (req, res) => {

  res.status(200).set('Content-Type', 'text/plain').send(fs.existsSync(cloudflaredconfigpath) ? fs.readFileSync(cloudflaredconfigpath) : '');

})
app.post('/advanced/config/local', (req, res) => {

  const tmpobj = tmp.fileSync();

  fs.writeFileSync(tmpobj.name, req.body.yaml);

  try {

    if (req.body.yaml.trim().length) {
      execSync(`cloudflared --config ${tmpobj.name} tunnel ingress validate`);
    }

    if (!fs.existsSync(cloudflaredconfigdir)) {
      fs.mkdirSync(cloudflaredconfigdir)
    }

    fs.writeFileSync(cloudflaredconfigpath, req.body.yaml);

    tmpobj.removeCallback();
    res.status(200).send('Changes saved into the config file.');

  } catch (e) {
    tmpobj.removeCallback();
    res.status(400).send(e.message.split("\n").splice(1).join("\n"));
  }


})


app.listen(port, () => {
  console.log('STATUS: Init');
  console.log('ENVIRONMENT: ', JSON.stringify(process.env));
  let config = getConfig();
  if (config.start) {
    init({start: false});
    setTimeout(() => {
      init(config);
    }, 2000);
  }
  console.log(`WEBUI PORT: ${port}`);
})


function getConfig() {
  let config = {
    token: '',
    start: false
  };
  try {
    const json = JSON.parse(fs.readFileSync(configpath));
    config = json;
  } catch(e) {
    console.log('CONFIG: No pre-existing config file found.');
  }
  return config;
}

function init(config, res) {

  tunnel.token = config.token;
  try {
    if (config.start) {

      let additionalArgs = { }

      if (process.env.METRICS_ENABLE === 'true') {
        additionalArgs.metrics = process.env.METRICS_PORT;
      }

      if ('EDGE_BIND_ADDRESS' in process.env) {
        additionalArgs.edgeBindAddress = process.env.EDGE_BIND_ADDRESS;
      }

      if ('GRACE_PERIOD' in process.env) {
        additionalArgs.gracePeriod = process.env.GRACE_PERIOD;
      }

      if ('REGION' in process.env) {
        additionalArgs.region = process.env.REGION;
      }

      if ('RETRIES' in process.env) {
        additionalArgs.retries = process.env.RETRIES;
      }

      if (['4','6'].indexOf(process.env.EDGE_IP_VERSION) !== -1) {
        additionalArgs.edgeIpVersion = process.env.EDGE_IP_VERSION;
      }

      if (['http2','quic'].indexOf(process.env.PROTOCOL) !== -1) {
        additionalArgs.protocol = process.env.PROTOCOL;
      }

      if (fs.existsSync(cloudflaredconfigpath)) {
        additionalArgs.configPath = cloudflaredconfigpath;
      }

      console.log('ADDITIONAL ARGS: ', additionalArgs);

      tunnel.start(additionalArgs);
      if (res !== undefined) {
        res.status(200).send('Started');
      }
      console.log(`STATUS: Started`);
      console.log('-------------------------- CLOUDFLARE TUNNEL LOGS START --------------------------')
      // console.log(`Using token: ${config.token}`);
    } else {
      tunnel.stop();
      if (res !== undefined) {
        res.status(200).send('Stopped');
      }
      console.log("STATUS: Stopped");
    }
  } catch (e) {
    console.log(e);
  }
}


function saveConfig(config) {
  fs.writeFileSync(configpath, JSON.stringify(config, null, 2) + "\n");
}