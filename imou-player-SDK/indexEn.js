//    获取 url 中的值 进行赋值
const queryString = decodeURI(location.search);
const params = new URLSearchParams(queryString);
const domain = params.get("domain");
const deviceId = params.get("deviceId");
const channelId = params.get("channelId");
const kitToken = params.get("kitToken");
const code = params.get("code");
const streamId = params.get("streamId");
const type = params.get("type");
const recordType = params.get("recordType");
const setInputs = (inputsData) => {
  const { deviceId = "", channelId = "", kitToken = "", code = "", streamId = 1, type = 1, recordType = "cloud", domain = "" } = inputsData;
  document.getElementById("domain").value = domain;
  document.getElementById("deviceId").value = deviceId;
  document.getElementById("channelId").value = channelId;
  document.getElementById("kitToken").value = kitToken;
  document.getElementById("code").value = code;
  if (streamId == 1) {
    document.getElementById("streamId1").checked = true;
  } else {
    document.getElementById("streamId0").checked = true;
  }
  if (type == 2) {
    document.getElementById("type2").checked = true;
  } else {
    document.getElementById("type1").checked = true;
  }
  if (recordType === "localRecord") {
    document.getElementById("recordType1").checked = true;
  } else {
    document.getElementById("recordType0").checked = true;
  }
};
setInputs({ deviceId, channelId, kitToken, code, streamId, type, recordType, domain });

const start = document.getElementById("start");
const form = document.getElementById("playerForm");
const newPlayer = document.getElementById("new");
// 默认播放器
let currentPlayer = 0;
function init(id, data) {
  const { kitToken } = data;
  const player = new imouPlayer({
    id,
    domain,
    // width: 600,
    // height: 300,
    // 设备序列号
    deviceId,
    token: kitToken,
    channelId: channelId || 0,
    // 直播 0 高清  1 标清  默认
    streamId: streamId || 0,
    // 录播 云录像 1 本地录像 localRecord 默认 云录像
    recordType: recordType || "cloud",
    // 分屏对讲切换使用
    handleStartTalk,
    ...data,
  });
  return player;
}

const divs = [];

const newInput = (data) => {
  const { name } = data;
  // 创建一个  webCompents
  const tempFragment = new DocumentFragment();
  // 创建一个input，且存在输入，右侧一个 修改分屏，一个删除分屏
  const tempDiv = document.createElement("div");
  tempDiv.setAttribute("id", `input-${name}`);
  const spanName = document.createElement("span");
  const tempInput = document.createElement("input");
  tempDiv.appendChild(spanName);
  tempDiv.appendChild(tempInput);
  tempInput.style.width = "600px";
  tempInput.value = dataChangeUrl(data);
  spanName.innerText = `Screen${name + 1}：`;
  const changeButton = document.createElement("button");
  changeButton.innerText = "Modify";
  changeButton.addEventListener("click", () => {
    currentPlayer = name;
    const data = urlChangeData(tempInput.value);
    setInputs(data);
  });
  tempDiv.appendChild(changeButton);
  if (name) {
    const inputs = document.getElementById("inputs");
    const deleteButton = document.createElement("button");
    deleteButton.setAttribute("id", `input-button-${name}`);
    deleteButton.innerText = "Delete";
    tempDiv.appendChild(deleteButton);
    deleteButton.addEventListener("click", () => {
      divs[name].destroy();
      divs.splice(name, 1, null);
      while (!divs[divs.length - 1]) {
        divs.pop();
      }
      tempInput.value = "";
      if (divs.length === 1) {
        const root = document.getElementById("root");
        root.style.gridTemplateColumns = "1fr";
        root.style.gridTemplateRows = "1fr";
        const root0 = document.getElementById("root-0");
        root0.style.width = "100%";
        root0.style.height = "100%";
        for (let i = 1; i < 4; i++) {
          const temRoot = document.getElementById(`root-${i}`);
          const input0 = document.getElementById(`input-${i}`);
          root.removeChild(temRoot);
          input0 && inputs.removeChild(input0);
        }
      }
      // 6  - 4
      if (divs.length === 4) {
        const root = document.getElementById("root");
        root.style.gridTemplateColumns = "1fr 1fr";
        root.style.gridTemplateRows = "1fr 1fr";
        const root0 = document.getElementById("root-0");
        root0.style.width = "100%";
        root0.style.height = "100%";
        root0.style.gridColumnStart = "1";
        root0.style.gridColumnEnd = "1";
        root0.style.gridRowStart = "1";
        root0.style.gridRowEnd = "1";
        for (let i = 1; i < 4; i++) {
          const input0 = document.getElementById(`input-button-${i}`);
          input0 && (input0.disabled = false);
          const tempRoot = document.getElementById(`root-${i}`);
          tempRoot.style.width = "100%";
          tempRoot.style.height = "100%";
        }
        for (let i = 4; i < 6; i++) {
          const temRoot = document.getElementById(`root-${i}`);
          const input0 = document.getElementById(`input-${i}`);
          root.removeChild(temRoot);
          input0 && inputs.removeChild(input0);
        }
      }
      // 9  - 6
      if (divs.length === 6) {
        const root0 = document.getElementById("root-0");
        root0.style.gridColumnStart = "1";
        root0.style.gridColumnEnd = "3";
        root0.style.gridRowStart = "1";
        root0.style.gridRowEnd = "3";
        root0.style.width = "100%";
        root0.style.height = "100%";
        const root = document.getElementById("root");
        for (let i = 4; i < 6; i++) {
          const input0 = document.getElementById(`input-button-${i}`);
          input0.disabled = false;
          const tempRoot = document.getElementById(`root-${i}`);
          tempRoot.style.width = "100%";
          tempRoot.style.height = "100%";
        }
        for (let i = 6; i < 9; i++) {
          const temRoot = document.getElementById(`root-${i}`);
          const input0 = document.getElementById(`input-${i}`);
          root.removeChild(temRoot);
          input0 && inputs.removeChild(input0);
        }
      }
    });
  }
  const inputs = document.getElementById("inputs");
  tempFragment.appendChild(tempDiv);
  inputs.appendChild(tempFragment);
};

const changeInput = (data) => {
  const { name } = data;
  const tempDiv = document.getElementById(`input-${name}`);
  if (!tempDiv) {
    newInput(data);
  } else {
    const tempInput = tempDiv.getElementsByTagName("input");
    tempInput[0] && (tempInput[0].value = dataChangeUrl(data));
  }
};

// 1分屏模板
const onePage = () => {
  const tempFragment = new DocumentFragment();
  const tempDiv = document.createElement("div");
  tempDiv.setAttribute("id", "root-0");
  tempDiv.style.width = "100%";
  tempDiv.style.height = "100%";
  tempDiv.style.backgroundColor = "black";
  tempFragment.appendChild(tempDiv);
  const root = document.getElementById("root");
  root.style.gridTemplateColumns = "1fr";
  root.appendChild(tempFragment);
};
// 四分屏模板
const fourPage = () => {
  const tempFragment = new DocumentFragment();
  const root0 = document.getElementById("root-0");
  root0.style.width = "100%";
  root0.style.height = "100%";
  for (let i = 1; i < 4; i++) {
    const tempDiv = document.createElement("div");
    tempDiv.setAttribute("id", `root-${i}`);
    tempDiv.style.backgroundColor = "black";
    tempFragment.appendChild(tempDiv);
  }
  const root = document.getElementById("root");
  root.style.gridTemplateColumns = "1fr 1fr";
  root.style.gridTemplateRows = "1fr 1fr";
  root.appendChild(tempFragment);
};

// 六分屏模板
const sixPage = () => {
  const tempFragment = new DocumentFragment();
  const root = document.getElementById("root");
  root.style.gridTemplateColumns = "1fr 1fr 1fr";
  root.style.gridTemplateRows = "1fr 1fr 1fr";
  const root0 = document.getElementById("root-0");
  root0.style.gridColumnStart = "1";
  root0.style.gridColumnEnd = "3";
  root0.style.gridRowStart = "1";
  root0.style.gridRowEnd = "3";
  root0.style.width = "100%";
  root0.style.height = "100%";
  for (let i = 1; i < 4; i++) {
    const tempButton = document.getElementById(`input-button-${i}`);
    const tempRoot = document.getElementById(`root-${i}`);
    tempButton.disabled = true;
    tempRoot.style.width = "100%";
    tempRoot.style.height = "100%";
  }
  for (let i = 4; i < 6; i++) {
    const tempDiv = document.createElement("div");
    tempDiv.setAttribute("id", `root-${i}`);
    tempDiv.style.backgroundColor = "black";
    tempFragment.appendChild(tempDiv);
  }
  root.appendChild(tempFragment);
};

// 九分屏模板
const ninePage = () => {
  const tempFragment = new DocumentFragment();
  const root0 = document.getElementById("root-0");
  root0.style.gridColumnStart = "1";
  root0.style.gridColumnEnd = "2";
  root0.style.gridRowStart = "1";
  root0.style.gridRowEnd = "2";
  root0.style.width = "100%";
  root0.style.height = "100%";
  for (let i = 1; i < 6; i++) {
    // 输入框 置为 disabled
    const tempButton = document.getElementById(`input-button-${i}`);
    tempButton && (tempButton.disabled = true);
  }
  for (let i = 6; i < 9; i++) {
    const tempDiv = document.createElement("div");
    tempDiv.setAttribute("id", `root-${i}`);
    tempDiv.style.backgroundColor = "black";
    tempFragment.appendChild(tempDiv);
  }
  const root = document.getElementById("root");
  root.appendChild(tempFragment);
};
onePage();
start.addEventListener("click", (event) => {
  // 开始播放
  event.preventDefault();
  // 获取数据
  const formData = new FormData(form);
  const data = {};
  for (const [name, value] of formData.entries()) {
    data[name] = value;
  }
  data.name = currentPlayer;
  divs[currentPlayer] && divs[currentPlayer].destroy();
  // 获取元素的宽高
  divs[currentPlayer] = init(`root-${currentPlayer}`, data);
  // 存在 input 数据修改
  changeInput(data);
});

const dataChangeUrl = (data) => {
  const { deviceId, kitToken, channelId, streamId, recordType, type, code, domain } = data;
  return `/${deviceId}/${channelId}/${type}?streamId=${streamId}&code=${code}&recordType=${recordType}&kitToken=${kitToken}&domain=${domain}`;
};
const urlChangeData = (url) => {
  try {
    const [tempUrl1, tempUrl2] = url.split("?");
    const [, deviceId, channelId, type] = tempUrl1.split("/");
    const data = { deviceId, channelId, type };
    const tempData = tempUrl2.split("&");
    tempData.forEach((item) => {
      const [name, value] = item.split("=");
      data[name] = value;
    });
    return data;
  } catch (e) {
    return {};
  }
};
newPlayer.addEventListener("click", (res) => {
  res.preventDefault();
  // 新增分屏 会导致 前面输入框删除按钮可用
  divs.length === 1 && fourPage();
  divs.length === 4 && sixPage();
  divs.length === 6 && ninePage();
  if (divs.length === 9) return;
  const formData = new FormData(form);
  const data = {};
  for (const [name, value] of formData.entries()) {
    data[name] = value;
  }
  data.name = divs.length;
  const player = init(`root-${divs.length}`, data);
  divs.push(player);
  changeInput(data);
  setInputs({});
});

const fullPage = document.getElementById("fullPage");
fullPage.addEventListener("click", (res) => {
  const root = document.getElementById("root");
  for (let i = 0; i < 10; i++) {
    const tempRoot = document.getElementById(`root-${i}`);
    if (tempRoot) {
      tempRoot.style.width = "100%";
      tempRoot.style.height = "100%";
    } else {
      break;
    }
  }
  res.preventDefault();
  const fullScreenMethod =
    root.requestFullScreen || // w3c
    root.webkitRequestFullScreen || // Chrome
    root.mozRequestFullScreen || // Firefox
    root.msRequestFullscreen; // IE11
  fullScreenMethod.call(root);
});

// 分屏对讲切换
const handleStartTalk = () => {
  divs.forEach((item) => {
    if (item?.status.talk) {
      item.stopTalk();
    }
  });
};
