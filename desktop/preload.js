const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("flowlyraDesktop", {
  platform: process.platform,
});
