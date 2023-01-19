const fs = require("fs");
const Router = require("koa-router");
const axios = require("axios");
require("dotenv").config();

const router = new Router();

const configUrl =
  process.env.CONFIG_BACKEND_URL || "https://api.rudderstack.com";
const jsSdkCdnUrl =
  process.env.JS_SDK_CDN ||
  "https://cdn.rudderlabs.com/v1.1/rudder-analytics.min.js";
let deviceModeInit = fs.readFileSync("./deviceModeInit.js", {
  encoding: "utf-8",
});

router.get("/load", async (ctx) => {
  // only takes in writeKey and DataPlane Url
  let rudderJsCode;
  try {
    const resp = await axios.get(jsSdkCdnUrl);
    rudderJsCode = resp.data;
  } catch (err) {
    ctx.response.body = "failed to fetch rudder-js-sdk";
    ctx.status = 400;
    return ctx;
  }

  let d = fs.readFileSync("./loadingCode.js", {
    encoding: "utf-8",
  });

  const { writeKey, dataPlaneUrl } = ctx.request.query;
  if (!writeKey || !dataPlaneUrl) {
    ctx.response.body = {
      error: "writeKey or dataPlaneUrl is invalid or missing",
    };
    ctx.status = 400;
    return ctx;
  }
  console.log("writeKey", writeKey);
  console.log("dataplaneUrl", dataPlaneUrl);
  d = d.replace("writeKey", writeKey);
  d = d.replace("dataPlaneUrl", dataPlaneUrl);
  d = d.replace("configBackendUrl", configUrl);

  deviceModeInit = deviceModeInit.replace("dataplaneUrl", dataPlaneUrl);
  deviceModeInit = deviceModeInit.replace("writekey", writeKey);

  // console.log("d", d);
  ctx.response.body = d + rudderJsCode + deviceModeInit;
  ctx.set("Content-Type", "application/javascript");
  return ctx;
});

router.get("/health", (ctx) => {
  ctx.response.body = "Server is Up";
  ctx.status = 200;
  return ctx;
});

module.exports = router;
