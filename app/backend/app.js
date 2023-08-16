const express = require('express')
const app = express()
const port = process.env.WEBUI_PORT;
const path = require('path');
const bodyParser = require('body-parser')
const cors = require('cors');
const fs = require('fs');
const { CloudflaredTunnel } = require('node-cloudflared-tunnel');
const tunnel = new CloudflaredTunnel();

const configpath = "/config/config.json";

const viewpath = path.normalize(__dirname + '/../frontend/dist');

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cors());

app.use(express.static(viewpath));

app.get('/', (req, res) => {
  res.sendFile(viewpath + "index.html");
})

app.get('/config', (req, res) => {
  let config = getConfig();
  res.status(200).set('Content-Type', 'application/json').send(JSON.stringify(config));
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


app.listen(port, () => {
  console.log(`WebUI running on port ${port}`);
  let config = getConfig();
  if (config.start) {
    console.log('Restarting cloudflare tunnel.');
    init({start: false});
    setTimeout(() => {
      init(config);
    }, 2000);
  }
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
    console.log('No pre-existing config file found.');
  }
  return config;
}

function init(config, res) {
  tunnel.token = config.token;
  try {
    if (config.start) {
      tunnel.start();
      if (res !== undefined) {
        res.status(200).send('Started');
      }
      console.log(`Cloudflare tunnel started. `);
      console.log(`Using token: ${config.token}`);
    } else {
      tunnel.stop();
      if (res !== undefined) {
        res.status(200).send('Stopped');
      }
      console.log("Cloudflare tunnel stopped");
    }
  } catch (e) {
    console.log(e);
  }
}


function saveConfig(config) {
  fs.writeFileSync(configpath, JSON.stringify(config, null, 2) + "\n");
}