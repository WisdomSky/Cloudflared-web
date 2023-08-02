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
        <div>⚠ CasaOS Cloudflared 1.0 is replaced by a newer version which fixed some serious issues. Please use a newer version of CasaOS Cloudflared.</div>
        <div style="margin-top:10px">
            <h3>Instructions for CasaOS Users:</h3>
            <p>
              Install <a href="https://github.com/WisdomSky/CasaOS-Coolstore" target="_blank">CasaOS Coolstore</a> Appstore and use the version of CasaOS Cloudflared included in it.
            </p>
            <ol>
              <li>Open CasaOS dashboard then click the Appstore.</li>
              <li>On the right side, above the apps list, you can find an <strong>Add Source</strong> button. Click it and paste the following link: <code>https://casaos-appstore.paodayag.dev/coolstore.zip</code></li>
              <li>Click <strong>Add</strong> and wait until the apps inside the Coolstore Appstore is downloaded into your CasaOS.</li>
              <li>After finished installing the appstore, find the <strong>Cloudflared</strong> app from Coolstore in your appstore list.</li>
              <li>Then install.</li>
            </ol>
        </div>
        <div style="margin-top:10px">
          <h3>Instructions for for Non-CasaOS Users:</h3>
          <ul>
            <li>Head over to the CasaOS Cloudflared docker page and follow the instructions: <a href="https://hub.docker.com/r/wisdomsky/casaos-cloudflared">https://hub.docker.com/r/wisdomsky/casaos-cloudflared</a></li>
          </ul>
        </div>
      </div>
    </form>
    <div class="credits">
        Developed by <a href="https://github.com/WisdomSky">WisdomSky</a>
    </div>
  </div>
</template>


<script setup lang="ts">



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
