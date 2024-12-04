<template>
  <div class="cf-container h-[100vh] flex items-center justify-center">
    <form id="cf-form" method="post" @submit.prevent>
      <Card class="w-[550px]">
        <CardHeader>
          <CardTitle class="flex">
            <img src="https://raw.githubusercontent.com/rdimascio/icons/master/icons/cloudflare.svg" class="h-[25px]" alt="Cloudflare Logo">
            <span class="ml-3">Cloudflared-web</span>
          </CardTitle>
          <CardDescription>{{ $t('A simple UI to run Cloudflare Tunnel') }}</CardDescription>
        </CardHeader>
        <CardContent>

          <Alert v-if="updateInfo.update" variant="default" class="mb-4" style="background-color: #fff; color: #777; border-color: #aa0">
            <AlertTitle>💡 {{ $t('A new version is available!') }}</AlertTitle>
            <AlertDescription class="ml-2 mt-2" v-html="$t('updateDockerImage', { version: updateInfo.latest_version })">
            </AlertDescription>
          </Alert>

          <form id="cf-form" method="post" @submit.prevent>
            <div class="grid items-center w-full gap-4">
              <div class="flex flex-col space-y-1.5">
                <Label>{{ $t('Enter Tunnel Connector Token:') }}</Label>
                <div class="flex w-full items-center gap-1.5">
                  <HoverCard :open-delay="100" :close-delay="100" v-if="!tipDontShowAgain && token.trim().length === 0">
                    <HoverCardTrigger as-child>
                      <Input id="name" placeholder="cloudflared service install eyJhIjoiO34sdfsdf43wrwsefs43csefw3" v-model="token" />
                    </HoverCardTrigger>
                    <HoverCardContent class="w-[400px] p-2" style="background-color: #fff">
                      <h5>💡 {{ $t('Tip') }}</h5>
                      <hr class="mt-2">
                      <div class="p-2">
                        <small>{{ $t('You can also enter the entire command into the input like:') }}
                          <br>
                          <code style="border:1px solid hsl(var(--input));border-radius: 5px;padding: 5px;">cloudflared service install eyJhIjoiO...</code>
                          <br>
                          {{ $t('The token will be automatically extracted from it.') }}
                        </small>
                      </div>
                      <div class="flex w-full justify-end mt-2">
                        <Button @click="tipDontShowAgain = true" size="xs" variant="outline">{{ $t('Do not show again') }}</Button>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                  <Input id="name" placeholder="cloudflared service install eyJhIjoiO34sdfsdf43wrwsefs43csefw3" v-model="token" :disabled="config.start" v-else/>
                  <Button v-if="changed || token.trim().length == 0" @click.prevent="save" class="start-btn">{{ $t('Save') }}</Button>
                  <Button v-else-if="token.trim().length && !empty" @click.prevent="start" class="start-btn" :class="{running: config.start}" :title="config.start ? $t('Cloudflared is currently running') : $t('Cloudflared is not running')">
                    {{ config.start ? $t('Stop') : $t('Start') }}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter class="flex justify-center px-6 pb-6">
          <!--          <Dialog>-->
          <!--            <DialogTrigger as-child>-->
          <!--              <Button variant="link" size="xs">-->
          <!--                {{ $t('Local Configuration') }}-->
          <!--              </Button>-->
          <!--            </DialogTrigger>-->
          <!--            <DialogContent class="sm:max-w-[800px] grid-rows-[auto_minmax(0,1fr)_auto] p-0 h-[90vh]">-->
          <!--              <DialogHeader class="p-6 pb-0">-->
          <!--                <DialogTitle>{{ $t('Advanced Configuration') }}</DialogTitle>-->
          <!--                <DialogDescription>-->
          <!--                  {{ $t('For advanced Cloudflare Tunnel configuration. See the') }}-->
          <!--                  <a href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/configure-tunnels/local-management/configuration-file/" style="color: #f70" target="_blank">{{ $t('documentation') }}</a>-->
          <!--                  {{ $t('for more information.') }}-->
          <!--                </DialogDescription>-->
          <!--              </DialogHeader>-->
          <!--              <div class="grid gap-4 py-4 overflow-y-auto px-6">-->
          <!--                <div class="flex flex-col">-->
          <!--                  <prism-editor :readonly="config.start" v-model="yaml" :highlight="highlighter" line-numbers :tab-size="4"-->
          <!--                    placeholder="ingress:"-->
          <!--                  ></prism-editor>-->
          <!--                </div>-->
          <!--              </div>-->
          <!--              <DialogFooter class="p-6 pt-0 flex justify-between" v-if="!config.start">-->
          <!--                <Button variant="link" @click="yaml = ''">{{ $t('Clear') }}</Button>-->
          <!--                <Button type="submit" @click="saveConfig">-->
          <!--                  {{ $t('Save Config') }}-->
          <!--                </Button>-->
          <!--              </DialogFooter>-->
          <!--            </DialogContent>-->
          <!--          </Dialog>-->

        </CardFooter>
        <div class="flex items-center justify-center" style="font-size: 0.65em">
          <a href="https://one.dash.cloudflare.com" target="_blank" class="inline-flex items-center">
            <img src="https://raw.githubusercontent.com/rdimascio/icons/master/icons/cloudflare.svg" class="w-[20px] mr-1" alt="Cloudflare Logo">
            {{ $t('ZeroTrust Dashboard') }}
          </a>
          <div class="inline mx-3" style="color: #777">|</div>
          <a href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/install-and-setup/tunnel-guide/remote/#1-create-a-tunnel" target="_blank" class="inline-flex">
            {{ $t('Create a Cloudflare Tunnel') }}
          </a>
          <div class="inline mx-3" style="color: #777">|</div>
          <a href="https://github.com/WisdomSky/Cloudflared-web" target="_blank" class="inline-flex items-center">
            <img src="https://raw.githubusercontent.com/rdimascio/icons/master/icons/github.svg" class="w-[15px] mr-1" alt="Github Logo" style="filter: invert(1)">
            {{ $t('Github') }}
          </a>
        </div>
        <Separator class="my-2" />
        <div class="flex justify-center mb-2" style="color: #777; font-size: 0.6em" v-if="version.trim().length">
          <code>{{ version }}</code>
        </div>
      </Card>
      <div class="mt-10 text-center">{{ $t('Help and support this project by sponsoring us on') }} <a href="https://github.com/sponsors/WisdomSky" target="_blank" class="text-yellow-400 font-bold underline">Github</a>. 💖</div>
      <div class="text-center text-xs text-gray-600">{{ $t('All sponsors will be listed and featured here in the future.') }}</div>
    </form>

    <Toaster class="pointer-events-auto" />
    <div class="locale">
      <Select style="border: 0" v-model="locale">
        <SelectTrigger>
          <SelectValue placeholder="Select a Language" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English (EN)</SelectItem>
          <SelectItem value="zh-CN">中文 (zh-CN)</SelectItem>
          <SelectItem value="de">Deutsch (DE)</SelectItem>
          <SelectItem value="es-BR">Español (es-BR)</SelectItem>
          <SelectItem value="ru">русский (RU)</SelectItem>
          <SelectItem value="ja">日本語 (JA)</SelectItem>
          <SelectItem value="fr">Français (FR)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
</template>



<script setup lang="ts">

  import {ref, reactive, onBeforeMount, watch} from 'vue'
  import Button from "@/components/ui/button/Button.vue";
  import { useColorMode } from '@vueuse/core'
  import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
  import { Alert, AlertTitle, AlertDescription} from "@/components/ui/alert";
  import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
  import Separator from "@/components/ui/separator/Separator.vue";
  import Input from "@/components/ui/input/Input.vue";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
  import {Label} from "radix-vue";
  import { Toaster } from '@/components/ui/sonner'
  import $i18n from './i18n.ts'
  // import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
  // import {PrismEditor} from "vue-prism-editor";
  // import 'vue-prism-editor/dist/prismeditor.min.css'; // import the styles somewhere
  // import { highlight, languages } from 'prismjs';
  // import 'prismjs/components/prism-yaml';
  // import 'prismjs/themes/prism-tomorrow.css'; // import syntax highlighting styles
  // import { toast } from 'vue-sonner'


  useColorMode();


  const yaml = ref<string>("");


  const locale = ref<any>(localStorage.getItem('locale') || "en");


  watch(locale, (val) => {
    $i18n.global.locale = val;
    localStorage.setItem('locale', val);
  })

  // const highlighter = (code: string) => highlight(code, languages.yaml, 'yaml');



  const endpoint = "";

  const config = reactive<{ config: string, token: string, start: boolean }>({config: '', token: '', start: false});

  const token = ref<string>('');

  const tipDontShowAgain = ref<boolean>(localStorage.getItem('tip_dont_show_again') === "true" || false);

  watch(tipDontShowAgain, () => {
    localStorage.setItem('tip_dont_show_again', tipDontShowAgain.value ? 'true' : 'false');
  });

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

  onBeforeMount(async () => await init());


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


  // async function saveConfig() {
  //   const res = await fetch(endpoint + '/advanced/config/local', {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({
  //       yaml: yaml.value
  //     })
  //   })
  //
  //   toast(res.status === 200 ? 'Save Successful' : 'Save Failed', {
  //     description: await res.text()
  //   })
  // }

  async function init() {

    version.value = await (await fetch(endpoint + '/version')).text();
    yaml.value = await (await fetch(endpoint + '/advanced/config/local')).text();

    const json = await (await fetch(endpoint + '/config')).json();
    config.token = json.token;
    empty.value = config.token === undefined || config.token.trim().length === 0;
    token.value = config.token;

    config.start = json.start;

    watch(token, () => {

      let extractToken = token.value.split(' ');
      if (extractToken[extractToken.length - 1] !== token.value) {
        token.value = extractToken[extractToken.length - 1];
      }

      changed.value = true
    });

    const info = await (await fetch(endpoint + '/new-version')).json();

    updateInfo.current_version = info.current_version;
    updateInfo.latest_version = info.latest_version;
    updateInfo.update = info.update;

  }

</script>


<style scoped lang="scss">

.cf-container {

  button.start-btn {
    background-color: #c98816;
    color: #fff;


    &.running {
      background-color: #a33;
    }

    &:hover {
      opacity: 0.75;
    }

    &:active {
      opacity: 1 !important;
      box-shadow: 0 0 15px 0 #dbb378a0;

    }

  }


  a:hover {
    text-decoration: underline;
  }

  .locale {
    position: absolute;
    top: 5px;
    right: 5px;

    & ::v-deep(button[role="combobox"]) {
      border: 0;
      outline: none;
    }

  }

}

</style>
