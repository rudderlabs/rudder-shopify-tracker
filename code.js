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
  rudderanalytics.load("1psCRd30BvCtqwBwZVnPR2emyBL", "https://hosted-dev-dataplane.dev-rudder.rudderlabs.com", {
    configUrl: "https://api.dev.rudderlabs.com",
    logLevel: "DEBUG",
  });
  console.log("end of loader script");
})();
