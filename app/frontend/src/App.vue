<template>
  <div>
    <div>
      <img src="https://raw.githubusercontent.com/rdimascio/icons/master/icons/cloudflare.svg" class="cf-logo" alt="Cloudflare">
    </div>
    <form id="cf-form" method="post" @submit.prevent>
      <div>
        <div>
          <h4>Enter Cloudflare Tunnel Connector Token</h4>
        </div>
        <input type="text" name="token" v-model="token" placeholder="cloudflared service install eyJhIjoiO34sdfsdf43wrwsefs43csefw3">
      </div>
      <div>
        <button v-if="changed || token.trim().length == 0" @click.prevent="save" style="margin-right:20px">Save</button>
        <button v-if="token.trim().length && !empty" @click.prevent="start">{{ config.start ? 'Stop' : 'Start' }}</button>
      </div>
      <div class="new-version" v-if="updateInfo.update">
        💡 [{{ updateInfo.latest_version }}] A new update is available. Update the docker image in order to update the version.
      </div>
      <div style="margin-top: 20px; text-align: center">
        How to create a Cloudflare Tunnel?&nbsp;<a href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/install-and-setup/tunnel-guide/remote/#1-create-a-tunnel" target="_blank">Read here</a>
      </div>
    </form>
    <div class="credits">
        <a href="https://github.com/WisdomSky/Cloudflared-web" title="github.com/WisdomSky/Cloudflared-web">
          <img src="https://raw.githubusercontent.com/rdimascio/icons/master/icons/github.svg" style="height: 20px;">
        </a>
    </div>
    <div class="version" v-if="version.trim().length">
      <small>
        <code>{{ version }}</code>
      </small>
    </div>
    <div class="tip" v-if="!hideTip">
      <h5>💡 Quick Tip</h5>
      <hr>
      <small>You can input the whole command like:<br>
        <code>cloudflared service install eyJhIjoiO...</code><br>
        and we will take care of extracting the token from it.</small>
      <div>
        <button @click="doHideTip">Hide</button>&nbsp;
        <label>
          <input type="checkbox" v-model="tipDontShowAgain"> Do not show again
        </label>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
  import { ref, reactive, onBeforeMount, watch } from 'vue' 

  const endpoint = "";

  const config = reactive<{token: string,start:boolean}>({token: '', start: false});

  const token = ref<string>('');

  const tipDontShowAgain = ref<boolean>(localStorage.getItem('tip_dont_show_again') === "true" || false);

  watch(tipDontShowAgain, () => {
    localStorage.setItem('tip_dont_show_again', tipDontShowAgain.value ? 'true' : 'false');
  });

  const hideTip = ref<boolean>(tipDontShowAgain.value);

  const version = ref<string>('');

  const updateInfo = reactive<{
                        current_version: string,
                        latest_version: string,
                        update: boolean
                      }>({
                        current_version: '',
                        latest_version: '',
                        update: false
                      });

  const changed = ref<boolean>(false);

  const empty = ref<boolean>(true);

  onBeforeMount(async() => await init());


  async function start() {

    config.start = !config.start;
    const res = await fetch(endpoint + '/start', {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    start: config.start
                  })
                })


    if (res.status === 200) {
      
    } else {
      alert('Failed to Start!');
    }

  }

  async function save() {

    const res = await fetch(endpoint + '/token', {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  token: token.value
                })
              })

    if (res.status === 200) {
      changed.value = false;
    }

    empty.value = token.value.trim().length === 0;

  }

  async function init() {

    version.value = await (await fetch(endpoint + '/version')).text();

    const info = await (await fetch(endpoint + '/new-version')).json();

    updateInfo.current_version = info.current_version;
    updateInfo.latest_version = info.latest_version;
    updateInfo.update = info.update;

    const json = await (await fetch(endpoint + '/config')).json();
    config.token = json.token;
    empty.value = config.token === undefined || config.token.trim().length === 0;
    token.value = config.token;

    config.start = json.start;

    watch(token, () => {
      
      let extractToken = token.value.split(' ');
      if (extractToken[extractToken.length-1] !== token.value) {
        token.value = extractToken[extractToken.length-1];
      }

      changed.value = true
    });
  }


  function doHideTip() {
    hideTip.value = true;
  }


</script>


<style scoped lang="scss">
  .cf-logo {
    height: 15vh;
  }

  input[type=text] {
    width: 50vw;
    max-width: 500px;
    min-width: 300px;
    outline: none;
    padding: 10px;
    border-radius: 10px;
    border: 1px solid #ccc;
    font-size: 1.25em;
  }

  button {
    margin-top: 20px;
    background-color: #c98816;
    outline: none;
    border: 2px solid #f1c577;
    padding: 10px 50px;
    font-size: 1.25em;
    color: #fff;

    &:hover {
      opacity: 0.75;
    }

    &:active {
      opacity: 1 !important;
      box-shadow: 0 0 15px 0 #dbb378a0;
      
    }

  }

  .new-version {
    max-width: 500px;
    margin-top: 10px;
    background: rgba(255,255,0,0.1);
    border: 1px solid #ccc;
    border-radius: 10px;
    padding: 10px;
    box-sizing: border-box;
  }

  .credits {
    margin-top: 20px;
    text-align: center;
  }

  .tip {
    position: absolute;
    top: 10px;
    left: 10px;
    max-width: 500px;
    border: 1px solid #ccc;
    border-radius: 10px;
    padding: 10px;
    box-sizing: border-box;
    text-align: left;
    box-shadow: 0 5px 10px 5px rgba(0,0,0,0.2);

    h5 {
      margin: 0;
      color: #FF8B00;
    }

    button {
      padding: 5px 10px;
      font-size: 0.65em;
    }

    label {
      vertical-align: center;
      font-size: 0.65em;
      input {
        vertical-align: middle;
      }
    }

  }

  .version {
    position: absolute;
    top: 0;
    right: 10px;
  }

</style>
