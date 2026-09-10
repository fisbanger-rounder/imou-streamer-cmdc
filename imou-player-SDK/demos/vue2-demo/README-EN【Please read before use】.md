# Based on imou-player Vue2 Version

## Preparation before operation

### 1. Install dependencies

```javascript
npm install
```

### 2. Place the WasmLib folder in the public directory [Important and required]

> This is necessary for imouPlayer decoding.

### 3. Import imou-player

#### 3.1 Place imou-player.js and imou-player.css in the project, for example, in the public directory.

#### 3.2 Import imou-player.js and imou-player.css in index.html

```html
// The imou-player.js and imou-player.css in the demo are located under public.
<script type="module" src="/imou-player.js"></script>
<link rel="stylesheet" href="/imou-player.css" />
```

### 4. Multi-thread configuration support requires HTTPS and cross-origin quarantine configuration

```javascript
// Reference vue.config.js
const { defineConfig } = require("@vue/cli-service");

module.exports = defineConfig({
  devServer: {
    port: "8083",
    https: true,
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
});
```

## Run

```javascript
npm run dev
```
