## ImouPlayer - Component Description

### Product Introduction

The Light Application UIKit is a docking component launched by Imou Open Platform to facilitate developers in integrating web and mobile browsers. It has the characteristics of fast docking, instant streaming, and low latency. The light application supports video preview, two-way talk, video playback, PTZ control, screenshot and screen recording functions in H.264 and H.265 encoding formats, which can help developers integrate and quickly achieve business goals in a shorter time and at a lower cost.

### Applicable Browsers

| Browser | Version |
| ------- | ------- |
| Chrome  | >= 55   |
| Firefox | >= 55   |
| Edge    | >= 55   |

### Experience Products

**Online experience of product features, after which secondary development can be conducted based on the light application Demo. Experience address:**

- PC side: [Tap to experience the light application](https://open.imoulife.com/imou-player/indexEn.html)

**<font color=red>For versions accessed after December 31, 2024, please pay attention to</font> [1.2 Import the necessary dependency libraries.](#WasmLib)**

### 1. Basic Usage

#### 1.1 Introduction of imou-player.js

```html
// Need to synchronize the introduction of the CSS style file.
<link href="./imou-player.css" rel="stylesheet" />
<script src="./imou-player.js"></script>
```

```html
Example:
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>imouPlayer</title>
    <link href="./imou-player.css" rel="stylesheet" />
    <script src="./imou-player.js"></script>
  </head>
  <body>
    <!-- Provide an empty div Tag in the Page for the Generation of the lightweight application Play Element -->
    <div id="root"></div>
  </body>
</html>
```

<h3 id="WasmLib"></h3>
#### 1.2 Import the necessary dependency libraries. [Important and Mandatory] [See Multi-thread Mode Settings](#section1)

**Introduce WasmLib into the public directory of your own project.**
**imouPlayer initialization supports WasmLib access path configuration, parameter: WasmLibPath. The relative path (default) and absolute path can be configured according to your project.**

#### 1.3 Initialization of imouPlayer

```javascript
// Add DOM Container
const player = new imouPlayer({
  id: "root",
  width: 800,
  height: 400,
  // Device SN
  deviceId: "7H0B18XXXXXXXX",
  // Device channel number
  channelId: 0,
  // kitToken, obtain through the getKitToken API
  token: "Kt_hz00e4c3XXXXXXXXXXX",
  // 1-Live, 2-Playback
  type: 1,
  // Live 0-HD; 1-SD
  streamId: 0,
  // Note: if getEncryptKitStreamUrl returns resolutions (e.g. [{name:"1080P",imageSize:18,streamId:0},...]),
  // multi-resolution switching is enabled; pass both imageSize and streamId when selecting a specific level
  // Playback, cloud-Cloud Video; localRecord-Local Video; nvrDisk-NVR Video. Default Cloud Video
  recordType: "cloud",
  // Default Relative Path, Absolute Path can be configured as "/", specific path should be adjusted according to the project's public file path
  WasmLibPath: "",
  // If the device has set a custom audio and video encryption key, please input this key;
  // If the device is only set with a Device Password, then enter the Device Password; in other cases, use the Default device SN.
  code: "xxxxxx",
});
```

#### 1.4 imouPlayer Initialization Parameter Description

| Parameter Name      | Type     | Default Value                                                                                                                                                                 | Required | Description                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                  | String   | /                                                                                                                                                                             | Yes      | Container Mounting Dom's Id                                                                                                                                                                                                                                                                                                                   |
| Width               | Number   | /                                                                                                                                                                             | Yes      | Container Width                                                                                                                                                                                                                                                                                                                               |
| height              | Number   | /                                                                                                                                                                             | Yes      | Container Height                                                                                                                                                                                                                                                                                                                              |
| deviceId            | String   | /                                                                                                                                                                             | Yes      | Device SN                                                                                                                                                                                                                                                                                                                                     |
| channelId           | String   | /                                                                                                                                                                             | Yes      | Device Channel Number                                                                                                                                                                                                                                                                                                                         |
| token               | String   | /                                                                                                                                                                             | Yes      | KitToken for light applications, you can refer to the getKitToken API in Chapter 1.5 to obtain it                                                                                                                                                                                                                                             |
| type                | String   | /                                                                                                                                                                             | Yes      | Play Mode: 1: Live (Live View); 2: Video Playback;                                                                                                                                                                                                                                                                                            |
| recordType          | String   | /                                                                                                                                                                             | No       | cloud-Cloud Video; localRecord-Local Video；nvrDisk-NVR Video. Default Cloud Video;                                                                                                                                                                                                                                                           |
| beginTime           | String   | /                                                                                                                                                                             | No       | Playback start time YYYY-MM-DD HH:mm:ss                                                                                                                                                                                                                                                                                                       |
| endTime             | String   | /                                                                                                                                                                             | No       | Playback end time YYYY-MM-DD HH:mm:ss                                                                                                                                                                                                                                                                                                         |
| streamId            | String   | 0                                                                                                                                                                             | No       | Video clarity, 0: HD; 1: SD. In multi-resolution mode, `getEncryptKitStreamUrl` returns a `resolutions` array (e.g. `[{name:"1080P",imageSize:18,streamId:0},...]`). When switching to a specific level, `requestURL` must pass both `imageSize` and the corresponding `streamId`; HD/SD switching only passes `streamId` without `imageSize` |
| muted               | Boolean  | false                                                                                                                                                                         | No       | Mute                                                                                                                                                                                                                                                                                                                                          |
| code                | String   | /                                                                                                                                                                             | No       | The video decryption key for the device. If the device has enabled video encryption, this field is required.<br> If the device has set a custom audio and video encryption key, please enter this key;<br> If the device has only set a device password, please enter the device password;<br> In other cases, use the default Device SN.     |
| handleError         | Function | /                                                                                                                                                                             | No       | Play error callback, see [1.4.1 handleError Play error callback](#handleError)                                                                                                                                                                                                                                                                |
| handleCallBack      | Function | /                                                                                                                                                                             | No       | Play event callback, see [1.4.2 handleCallBack Event Play Callback](#handleCallBack)                                                                                                                                                                                                                                                          |
| videoTalk           | Boolean  | false                                                                                                                                                                         | No       | Video Talk                                                                                                                                                                                                                                                                                                                                    |
| controls            | Boolean  | true                                                                                                                                                                          | No       | Control display true/Hidden false                                                                                                                                                                                                                                                                                                             |
| controlsConfig      | Array    | ["play", "volume", "talk", "capture", "videoRecord", "ptz", "resolution", "fullPageScreen", "fullScreen", "speed", "recordChange", "recordTimeLine","calendar","digitalZoom"] | No       | Control configuration, configuration items refer to [1.4.3 controlsConfig Configuration](#controlsConfig)                                                                                                                                                                                                                                     |
| controlsSize        | Number   | PC Client: 35; Mobile Client: 32                                                                                                                                              | No       | Control Size Setting                                                                                                                                                                                                                                                                                                                          |
| controlsColor       | String   | #ffffff                                                                                                                                                                       | No       | Control color setting                                                                                                                                                                                                                                                                                                                         |
| controlsActiveColor | String   | #f18d00                                                                                                                                                                       | No       | Control Highlight Color Setting                                                                                                                                                                                                                                                                                                               |
| templateMode        | String   | pc                                                                                                                                                                            | No       | UI template configuration<br/> PC: pc, Mobile Client: mobile                                                                                                                                                                                                                                                                                  |
| title               | String   | SN-Channel Number                                                                                                                                                             | No       | Title Content                                                                                                                                                                                                                                                                                                                                 |
| titleColor          | String   | #ffffff                                                                                                                                                                       | No       | Title Color                                                                                                                                                                                                                                                                                                                                   |
| WasmLibPath         | String   | ""                                                                                                                                                                            | No       | Access path for WasmLib resources, default is Relative Path, Absolute Path can be configured: "/", specific path should be adjusted according to the project's public file path                                                                                                                                                               |
| dpr                 | Number   | 0                                                                                                                                                                             | No       | Supported in versions after V1.3.0, eliminates the sawtooth effect when the Definition of the monitoring screen exceeds the display resolution of the current End Device. Default is 0, rendering according to the Original Stream resolution.                                                                                                |

<h3 id="handleError"></h3>
##### 1.4.1 handleError Play error callback

| errCode | errMsg                                                                            |
| ------- | --------------------------------------------------------------------------------- |
| 1001    | Decryption failed, please re-enter the key                                        |
| 1002    | Device Response Exception, please check and try again                             |
| 2001    | Failed to obtain intercom address, please check the device                        |
| 2002    | Intercom connection establishment failed, Audio Talk stream source already exists |
| 2003    | Device does not support Video Talk                                                |
| 2004    | The microphone is occupied or unable to obtain microphone permissions             |
| 2005    | The client's camera is occupied or unable to obtain camera permissions            |
| 2006    | Intercom failure, please try again later                                          |
| 2007    | During a video call, the device side hangs up                                     |
| 2008    | Intercom Busy Line                                                                |
| 2009    | Intercom Shut Down                                                                |

<h3 id="handleCallBack"></h3>
##### 1.4.2 handleCallBack Event Play Callback

| type      | desc           |
| --------- | -------------- |
| playStart | Play           |
| talkStart | Start Intercom |
| talkEnd   | Intercom End   |

<h3 id="controlsConfig"></h3>
##### 1.4.3 controlsConfig Configuration
> It only takes effect when controls are set to true.

| type           | desc                                       |
| -------------- | ------------------------------------------ |
| play           | Play / Pause                               |
| volume         | Sound switch                               |
| talk           | Two-way intercom                           |
| resolution     | Clarity switching                          |
| capture        | Snapshot                                   |
| ptz            | Camera lens rotates                        |
| videoRecord    | Screen Recording                           |
| fullPageScreen | Webpage full screen                        |
| fullScreen     | Full Screen                                |
| speed          | multiple speed                             |
| recordChange   | Switch between Cloud Video and Local Video |
| recordTimeLine | Record Video Timeline                      |
| calendar       | Calendar                                   |
| digitalZoom    | Electron Vari-focal                        |

#### 1.5 getKitToken Interface Protocol Description

##### Detailed Description

Generate a device token with specified permissions for play in light applications. Different permissions can be assigned to different end users for management purposes.

> Note:
>
> 1.  For the domain name address and signature calculation instructions of the protocol for developers to call the Imou Open Platform API, please refer to: [Development Specifications](../http/develop.html)
> 2.  The validity period of the kitToken is 2 hours. It is recommended that developers cache the kitToken for one hour in their own services, rather than calling the Open Platform port to obtain it each time.

##### Request Address

https://openapi-[DataCenter].easy4ip.com/openapi/getKitToken

##### Input Parameter Description

| Parameter List | Description               | Parameter Type | Required | Default Value | Valid Values                                                                                                       |
| -------------- | ------------------------- | -------------- | -------- | ------------- | ------------------------------------------------------------------------------------------------------------------ |
| token          | Administrator accessToken | String         | Yes      |               | For the accessToken acquisition protocol, please refer to: [accessToken](../http/accessToken.html)                 |
| deviceId       | Device SN                 | String         | Yes      |               |                                                                                                                    |
| channelId      | Channel Number            | String         | Yes      |               |                                                                                                                    |
| type           | Permission Type           | String         | Yes      |               | 0: All Permissions; 1: Live View; 2: Video Playback (Cloud Video + Local Video); 6: PTZ Rotation.<br/>Default is 0 |

##### Sample Input

```json
{
  "system": {
    "ver": "1.0",
    "appId": "lcxxxxxxxxxxxxxx",
    "sign": "812e419af25bf773d8959d7dd82dc259",
    "time": 1626313677,
    "nonce": "1686f6f4-dec7-486e-93e3-6b2740577259"
  },
  "id": "0f935cb0XXX",
  "params": {
    "token": "At_000085fa18f0319046199b2138c04e54",
    "deviceId": "TEST1234567QWER",
    "channelId": "0",
    "type": "0"
  }
}
```

##### Sample output

```json
{
  "result": {
    "msg": "Operation is successful.",
    "code": "0",
    "data": {
      "expireTime": 7199, // KitToken remaining validity period, in seconds
      "kitToken": "Kt_xxxxxxxxxxxxxxxxxxxx" // KitToken value
    }
  },
  "id": "0f935cb0XXX"
}
```

### 2. imouPlayer Methods

| Method Name     | Feature Description                                                                              | Consume Example                                                               |
| --------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| play            | Start Play                                                                                       | player.play()                                                                 |
| pause           | Pause Play                                                                                       | player.pause()                                                                |
| start           | Start playing after pause                                                                        | player.start()                                                                |
| destroy         | End playback and simultaneously destroy the DOM                                                  | player.destroy()                                                              |
| capture         | Take Screenshot                                                                                  | player.capture()                                                              |
| startTalk       | Start Intercom                                                                                   | player.startTalk() // Audio Talk <br> player.startTalk("video") // Video Talk |
| stopTalk        | End Intercom                                                                                     | player.stopTalk()                                                             |
| volume          | Set Volume (0/1)                                                                                 | player.volume(0) // Shut Down Volume <br> player.volume(1) // Turn On Volume  |
| fullScreen      | Full Screen                                                                                      | player.fullScreen()                                                           |
| exitFullScreen  | Exit Full Screen                                                                                 | player.exitFullScreen()                                                       |
| startRecord     | Start screen recording                                                                           | player.startRecord()                                                          |
| stopRecord      | End screen recording                                                                             | player.stopRecord()                                                           |
| setSpeed        | Playback speed of the recorded video (0.5/1/2/4/8/16/32), local video does not support 32x speed | player.setSpeed(2)                                                            |
| answerVideoTalk | Received a Video Intercom initiated by the device, entering Answer/Reject state                  | player.answerVideoTalk()                                                      |
| zoomIn          | Electron Vari-focal - Magnification                                                              | player.zoomIn()                                                               |
| zoomOut         | Electron Vari-focal Zoom Out                                                                     | player.zoomOut()                                                              |
| resetZoom       | Electron Vari-focal - Reset                                                                      | player.resetZoom()                                                            |

#### 2.1 Relevant Example Code

```js
const text = e.target.innerText;
switch (text) {
  case "Play":
    player.play();
    break;
  case "Pause":
    player.pause();
    break;
  case "Pause and then Play":
    player.start();
    break;
  case "Take Screenshot":
    player.capture();
    break;
  case "Full Screen":
    player.fullScreen();
    break;
  case "Exit Full Screen":
    player.exitFullScreen();
    break;
  case "Sound - On":
    player.volume(1);
    break;
  case "Sound - Shut Down":
    player.volume(0);
    break;
  case "Audio Talk - Start Intercom":
    player.startTalk();
    break;
  case "Audio Talk - End Talk":
    player.stopTalk();
    break;
  case "2x speed":
    player.setSpeed(2);
    break;
  default:
    break;
}
```

<h3 id="section1"></h3>
### 3. Multi-thread Mode Settings

**The ImouPlayer JSSDK supports web-based plug-in free playback of live/recorded streams encoded in H264/H265. It defaults to using multi-thread decoding (for google chrome >= version 91; firefox >= version 97; edge >= version 91); if not met, it will use single thread.**

The multi-thread mode has better performance in the same environment, but requires cross-origin embed policy configuration for the service.

You can quickly get started by browsing the demo: demos within the Web Video SDK&Demo for Light App in [Resource Download](../readme/upload.html).

- **Introduce WasmLib under the public directory of your own project (important and mandatory)**

- Configure the front-end service to add Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy in the response headers:
  - node service

  ```javascript
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  ```

  - nginx service

  ```javascript
  add_header Cross-Origin-Opener-Policy "same-origin";
  add_header Cross-Origin-Embedder-Policy "require-corp";
  ```

### FAQ

1. When establishing a websocket connection for Live/Record Video playback, Intercom, and other situations, the returned information is 404?

> A 404 response may indicate that the stream source has timed out and is invalid. For real-time recording, talkback, live streaming, and video download, avoid making requests in advance. Trigger the interface to obtain the stream address only when needed to prevent stream source timeout and invalidity, and to avoid confusion caused by simultaneous requests to different stream sources.

2. Initiate the intercom, no sound from the device?

> It is possible that the channel audio format is ACC, but the RTSP signaling returns L16. Currently, intercom communication through the NVR and channel IPC does not support L16.

3. Multiple players are placed on the Page, resulting in Lag issues.

> Due to the need to decrypt the stream and the rendering layer using canvas, the performance requirements will be higher than that of pure video. However, when multiple players exist simultaneously, if the computer performance is poor or the browser version is too low, the multi-screen player will experience lag issues.

4. The lightweight application accessed via the Mobile Client still has no sound after the iOS volume is turned up.

> Due to iOS permission control, it is necessary to shut down the mobile phone system mute setting.

5. Mobile Client opens Intercom with no Response

> Please enable the browser Microphone (Mic) permissions first.

6. The lightweight application is accessed on the Mobile Client, with the Function Configuration for Take Screenshot and screen recording set, but the Feature Button is not displayed.

> The web-view of WeChat Applet on IOS and Android, as well as the built-in browser on Android, do not support Take Screenshot or screen recording, and the Feature Button is not displayed.

7. Lightweight applications accessed on the Mobile Client are subject to Memory restrictions, with a maximum limit of 100M for screen recording files.

8. The recorded files downloaded from screen recording cannot be played. How to resolve this?

> Insufficient recording data, it is recommended that the recording time exceeds 5 seconds.

9. After the screen recording ends, how to resolve the issue of not downloading the MP4 file to On-Premises?

> It may be due to insufficient browser memory, resulting in file storage failure; you can restart the browser to ensure a sufficient memory environment.

10. How to resolve the issue of the Mobile Client continuing to Play after exiting the browser?

> You can monitor changes in page visibility to perform operations such as Pause/Recovery of Play. Please refer to [Resource Download](../readme/upload.html) for the demos in the Live Kit located at demos/vue3-mobile-demo/src/views/Player.vue

```javascript
// When the Page is in Play state, monitor changes in Visibility.
if (player.status.playing) {
  // Monitor changes in page visibility (including home key, switching applications, etc.)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      // Page enters the background (including tapping the home key)
      if (player) {
        player.pause();
      }
    } else {
      // Page is now visible
      if (player) {
        player.start();
      }
    }
  });
}
```

11. During the access process, error messages such as Uncaught SyntaxError: Unexpected token '<' and WasmLib loading failure occurred.

> The error in importing the WasmLib path can be resolved by configuring the WasmLibPath resource path through parameters. If an absolute path is required, it can be configured as: "/". (The specific path should be adjusted according to the project's public file path.)

12. When the video clarity is high, jagged edges appear on the screen.

> Due to the screen resolution exceeding the rendering resolution of the client, some pixels are lost during the canvas rendering.
> Proposal: Obtain the device pixel ratio var pixelRatio = window.devicePixelRatio, and configure it during initialization as [dpr: pixelRatio]
