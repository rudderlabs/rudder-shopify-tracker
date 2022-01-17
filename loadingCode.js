(function () {
  console.log("start of loader script");
  rudderanalytics = window.rudderanalytics = [];
  for (
    var methods = [
        "load",
        "page",
        "group",
        "track",
        "identify",
        "reset",
        "alias",
        "reset",
      ],
      i = 0;
    i < methods.length;
    i++
  ) {
    var method = methods[i];
    rudderanalytics[method] = (function (a) {
      return function () {
        rudderanalytics.push([a].concat(Array.prototype.slice.call(arguments)));
      };
    })(method);
  }
  rudderanalytics.load("writeKey", "https://dataPlaneUrl", {
    configUrl: "https://configBackendUrl",
    logLevel: "DEBUG",
  });
  console.log("end of loader script");
})();
