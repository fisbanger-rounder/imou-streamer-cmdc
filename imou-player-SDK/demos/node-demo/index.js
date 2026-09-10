const express = require("express");
const app = express();
const http = require("http");
const https = require("https");

const fs = require("fs");
const path = require("path");

// 读取SSL/TLS证书文件
const options = {
  key: fs.readFileSync("./certificate/private.key"), // 替换为您的私钥文件路径
  cert: fs.readFileSync("./certificate/certificate.crt"), // 替换为您的证书文件路径
};

// 创建HTTP服务器
const httpServer = http.createServer(app);
// 创建HTTPS服务器
const httpsServer = https.createServer(options, app);

// 设置跨域访问;
app.all("*", function (req, res, next) {
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  next();
});

app.use(express.static(path.join(__dirname, "dist")));

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/dist/" + "index.html");
});

httpServer.listen(8001, function () {
  console.log("HTTP Server is running on: http://localhost:8001");
});

httpsServer.listen(8002, () => {
  console.log(`HTTPS server is running on: https://localhost:8002`);
});
