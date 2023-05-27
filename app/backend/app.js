const express = require('express')
const app = express()
const port = 14333
const path = require('path');
const bodyParser = require('body-parser')
const cors = require('cors');
const fs = require('fs');
const { spawn } = require("child_process");

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
    if (config.start) {
      spawn("cloudflared", ["service", "install", config.token], {
        stdio: 'ignore',
        detached: true
      }).unref();
      res.status(200).send('Started');
    } else {
      spawn("cloudflared", ["service", "uninstall"]);
      res.status(200).send('Stopped');
    }
    
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

  res.status(200).send(`OK!`);
})


app.listen(port, () => {
  console.log(`Listening on port ${port}`)
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
  }
  return config;
}


function saveConfig(config) {
  fs.writeFileSync(configpath, JSON.stringify(config, null, 2) + "\n");
}