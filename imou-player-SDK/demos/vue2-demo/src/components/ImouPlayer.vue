<template>
  <div class="imou-player">
    <div
      id="imou-player"
      style="width: 1200px; height: 700px; background-color: #000"
    ></div>
    <div class="btns">
      <button @click="init">Init imouPlayer</button>
      <button @click="play">Play</button>
      <button @click="pause">Pause</button>
      <button @click="stop">Stop</button>
      <button @click="capture">Capture</button>
      <button @click="startTalk">Start Talk</button>
      <button @click="stopTalk">Stop Talk</button>
      <button @click="() => volume(1)">Open Volume</button>
      <button @click="() => volume(0)">Close Volume</button>
      <button @click="fullScreen">FullScreen</button>
      <button @click="exitFullScreen">Exit FullScreen</button>
      <button @click="startRecord">Start Screen Recording</button>
      <button @click="stopRecord">Stop Screen Recording</button>
    </div>
  </div>
</template>

<script>
var player = null;

export default {
  name: "ImouPlayer",
  mounted: () => {
    console.log("mounted success===============》");
  },
  methods: {
    init() {
      if (player) {
        this.destroy();
      }

      player = new imouPlayer({
        id: "imou-player",
        width: 1200,
        height: 700,
        deviceId: "***********",
        channelId: "0",
        token: "Kt_************",
        // 1-Live 直播; 2-Playback 录播
        type: 1,
        // Live 0-HD 高清; 1-SD 标清
        streamId: 0,
        // 录播 云录像 cloud 本地录像 localRecord 默认 云录像
        // Playback, cloud-Cloud Video; localRecord-Local Video. Default Cloud Video
        recordType: "cloud",
        muted: false,
        handleError: (err) => {
          console.error("handleError", err);
        },
      });
      window.player = player;
    },
    play() {
      player.play();
    },
    pause() {
      player.pause();
    },
    stop() {
      player.stop();
    },
    capture() {
      player.capture();
    },
    startTalk() {
      player.startTalk();
    },
    stopTalk() {
      player.stopTalk();
    },
    volume(value) {
      player.volume(value);
    },
    fullScreen() {
      player.fullScreen();
    },
    exitFullScreen() {
      player.exitFullScreen();
    },
    startRecord() {
      player.startRecord();
    },
    stopRecord() {
      player.stopRecord();
    },
    destroy() {
      player.destroy();
      player = null;
    },
  },
};
</script>
<style scoped>
.imou-player {
  width: 1200px;
  margin: 0 auto;
}
.btns {
  margin: 20px auto;
  display: flex;
  justify-content: center;
}
button {
  margin: 0 10px;
}
</style>