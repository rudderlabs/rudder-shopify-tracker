const fs = require("fs");
const Router = require("koa-router");

let d = fs.readFileSync("./loadingCode.js", {
  encoding: "utf-8",
});
let initCode = fs.readFileSync("./deviceModeInit.js", {
  encoding: "utf-8",
});
const router = new Router();

router.get('/load', ctx => {
  // TODO: always set prod config-be url when app is in production
  // only take in writeKey and DataPlane Url
  
  const { writeKey, dataPlaneUrl, configBackendUrl } = ctx.request.query;
  if (!writeKey || !dataPlaneUrl) {
    ctx.response.body = {
      error: 'writeKey or dataPlaneUrl is invalid or missing'
    };
    ctx.status = 400;
    return ctx;
  }
  const configUrl = configBackendUrl || "https://api.rudderstack.com";
  d = d.replace("writeKey", writeKey);
  d = d.replace("dataPlaneUrl", dataPlaneUrl);
  d = d.replace("configBackendUrl", configUrl);
  ctx.response.body = d;
  ctx.set("Content-Type", "application/javascript");
  return ctx;
});

router.get('/init', ctx => {
  // returns the device mode init code for the store
  ctx.response.body = initCode;
  ctx.set("Content-Type", "application/javascript");
  return ctx;
});

module.exports = router;