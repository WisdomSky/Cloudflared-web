<template>
  <div>
    <div>
      <img src="./assets/cloudflare.png" class="cf-logo" alt="Cloudflare">
    </div>
    <form id="cf-form" method="post" @submit.prevent>
      <div>
        <div>
          <h4>Enter Cloudflared Tunnel Token</h4>
        </div>
        <input type="text" name="token" v-model="token" placeholder="cloudflared service install eyJhIjoiO34sdfsdf43wrwsefs43csefw3">
      </div>
      <div>
        <button v-if="changed || token.trim().length == 0" @click.prevent="save" style="margin-right:20px">Save</button>
        <button v-if="token.trim().length && !empty" @click.prevent="start">{{ config.start ? 'Stop' : 'Start' }}</button>
        <br>
        <small>💡 Tip: You can input the whole command (<code>cloudflared service install eyJhIjoiO...</code>). We will automatically extract the token from it.</small>
      </div>
      <div style="margin-top: 10px; text-align: center">
        ⭐ How to setup cloudflare tunnel?&nbsp;<a href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/install-and-setup/tunnel-guide/remote/#1-create-a-tunnel" target="_blank">Click here</a>
      </div>
    </form>
    <div class="credits">
        Developed by <a href="https://github.com/WisdomSky">WisdomSky</a>
    </div>
  </div>
</template>


<script setup lang="ts">
  import { ref, reactive, onBeforeMount, watch } from 'vue' 

  const endpoint = "";

  const config = reactive<{token: string,start:boolean}>({token: '', start: false});

  const token = ref<string>('');

  const changed = ref<boolean>(false);

  const empty = ref<boolean>(true);

  onBeforeMount(async() => await init());


  async function start() {

    config.start = !config.start;
    const res = await fetch(endpoint +'/start', {
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

    const res = await fetch(endpoint +'/token', {
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
    const res = await fetch(endpoint +'/config');

    const json = await res.json();

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

  .credits {
    margin-top: 20px;
    text-align: center;
  }

</style>
