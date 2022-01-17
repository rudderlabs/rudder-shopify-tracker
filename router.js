const fs = require("fs");
const Router = require("koa-router");

const router = new Router();

const initCode = fs.readFileSync("./deviceModeInit.js", {
  encoding: "utf-8",
});

router.get('/load', ctx => {
  // TODO: always set prod config-be url when app is in production
  // only take in writeKey and DataPlane Url

  let d = fs.readFileSync("./loadingCode.js", {
    encoding: "utf-8",
  });

  const rudderJsCode = fs.readFileSync("./rudder-js-code.js", {
    encoding: "utf-8",
  });

  const deviceModeInit = fs.readFileSync("./deviceModeInit.js", {
    encoding: "utf-8",
  });
  
  const { writeKey, dataPlaneUrl, configBackendUrl } = ctx.request.query;
  if (!writeKey || !dataPlaneUrl) {
    ctx.response.body = {
      error: 'writeKey or dataPlaneUrl is invalid or missing'
    };
    ctx.status = 400;
    return ctx;
  }
  console.log("writeKey", writeKey);
  console.log("dataplaneUrl", dataPlaneUrl);
  const configUrl = configBackendUrl || "api.dev.rudderlabs.com";
  d = d.replace("writeKey", writeKey);
  d = d.replace("dataPlaneUrl", dataPlaneUrl);
  d = d.replace("configBackendUrl", configUrl);
  console.log("d", d);
  ctx.response.body = d + rudderJsCode + deviceModeInit;
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