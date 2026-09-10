# 基于 imou-player vue3 版本

## 运行前准备

### 1. 安装依赖

```javascript
yarn  or  npm install
```

### 2. 将 WasmLib 文件夹放置在 public 目录下【重要且必须】

> 用于 imouPlayer 解码

### 3. 引入 imou-player

#### 3.1 将 imou-player.js、imou-player.css 放置在项目中，如 public 目录下

#### 3.2 在 index.html 中引入 imou-player.js、imou-player.css

```javascript
// demo中imou-player.js、imou-player.css放置在public下
<script type="module" src="/imou-player.js"></script>
<link rel="stylesheet" href="/imou-player.css">
```

### 4. 多线程配置支持需要设置 https 及跨域隔离配置

```javascript
// 参考 vite.config.ts
  server: {
    port: 3000,
    cors: true,
    host: "0.0.0.0",
    https: true,
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  }
```

## 运行

```javascript
yarn dev  or  npm run dev
```
