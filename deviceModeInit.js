var rudderTracking = (function () {
  const pages = {
    "/products/": "Product Viewed",
    "/cart": "Cart Viewed",
    "/collections/": "Product List Viewed",
    "/account/register": "Registration Viewed",
    "/thank_you": "Checkout Step Completed",
    "/account/login": "Login Viewed",
  };
  const htmlSelector = {};
  const pageURL = window.location.href;
  let pageCurrency = "";
  let userId;

  const cartItemMapping = [
    { dest: "product_id", src: "product_id" },
    { dest: "sku", src: "sku" },
    { dest: "quantity", src: "quantity" },
    { dest: "name", src: "product_title" },
    { dest: "price", src: "price" },
    { dest: "category", src: "product_type" },
    { dest: "variant", src: "variant_title" },
    { dest: "brand", src: "vendor" },
    { dest: "url", src: "url" },
    { dest: "image_url", src: "image" },
  ];

  const cartPropertyKeys = new Set([
    "note",
    "original_total_price",
    "requires_shipping",
    "token",
    "total_discount",
    "total_price",
    "total_weight",
    "item_count",
  ]);

  const cartPropertyKeysToFormat = new Set([
    "original_total_price",
    "total_price",
    "total_discount",
  ]);
  const cartItemPropertyKeysToFormat = new Set([
    "price",
    "original_price",
    "discounted_price",
    "line_price",
    "original_line_price",
    "total_discount",
    "final_price",
    "final_line_price",
    "line_level_total_discount",
  ]);

  const productMapping = [
    { dest: "product_id", src: "id" },
    { dest: "sku", src: "sku" },
    { dest: "name", src: "title" },
    { dest: "category", src: "product_type" },
    { dest: "variant", src: "variants" },
    { dest: "url", src: "url" },
  ];

  function init() {
    pageCurrency = Shopify.currency.active;
    userId = ShopifyAnalytics.meta.page.customerId || __st.cid;

    // fetching heap Cookie object
    // TODO: for adding dynamic support from source config
    heapCookieObject = cookie_action({
      action: "get",
      name: "_hp2_id.1200528076",
    });

    if (heapCookieObject) {
      heapCookieObject = JSON.parse(decodeURIComponent(heapCookieObject));
    } else {
      console.log("No heap cookie found.");
    }

    htmlSelector.buttonAddToCart =
      rs$('form[action="/cart/add"] [type="submit"]').length === 1
        ? rs$('form[action="/cart/add"] [type="submit"]')
        : "";
    fetchCart()
      .then((cart) => {
        const needToUpdateCart = checkCartNeedsToBeUpdated(cart);
        if (needToUpdateCart) {
          updateCartAttribute().then((cart) => {
            sendIdentifierToRudderWebhook(cart); // sending rudderIdentifier periodically after this
          });
          console.log("Successfully updated cart");
        }
      })
      .catch((error) => {
        console.log("Error occurred while updating cart:", error);
      });

    checkAndSendRudderIdentifier();
    identifyUser();

    trackPageEvent();
    trackNamedPageView();

    rs$("button[data-search-form-submit]").on("click", trackProductSearch);
  }
  function checkAndSendRudderIdentifier() {
    const timeForCookieUpdate = getTimeForCookieUpdate();
    setTimeout(sendRudderIdentifierPeriodically, timeForCookieUpdate);
  }
  function identifyUser() {
    if (
      userId &&
      cookie_action({ action: "get", name: "rudder_user_id" }) !== "captured"
    ) {
      if (
        heapCookieObject &&
        cookie_action({ action: "get", name: "rudder_heap_identities" }) !==
        "captured"
      ) {
        rudderanalytics.identify(userId, {
          heapUserID: heapCookieObject.userId,
          heapSessionId: heapCookieObject.sessionId,
        });
        cookie_action({
          action: "set",
          name: "rudder_heap_identities",
          value: "captured",
        });
      } else {
        rudderanalytics.identify(userId);
      }
      cookie_action({
        action: "set",
        name: "rudder_user_id",
        value: "captured",
      });
    }

    if (
      heapCookieObject &&
      cookie_action({ action: "get", name: "rudder_heap_identities" }) !==
      "captured"
    ) {
      rudderanalytics.identify(rudderanalytics.getUserId(), {
        heapUserID: heapCookieObject.userId,
        heapSessionId: heapCookieObject.sessionId,
      });

      cookie_action({
        action: "set",
        name: "rudder_heap_identities",
        value: "captured",
      });
    }
  }

  // TODO: add support for product search

  function checkCartNeedsToBeUpdated(cart) {
    const { attributes } = cart;
    return !(attributes?.rudderAnonymousId);
  }
  function sendRudderIdentifierPeriodically() {
    getAndSendIdentifierToRudderWebhook();
    const cookieUpdateFixedInterval = 50 * 60 * 1000; // 50 mins
    setInterval(getAndSendIdentifierToRudderWebhook
      , cookieUpdateFixedInterval);
  }
  function getAndSendIdentifierToRudderWebhook() {
    fetchCart().then((cart) => {
      sendIdentifierToRudderWebhook(cart);
    })
  }
  function updateCartAttribute() {
    const anonymousId = rudderanalytics.getAnonymousId();
    return rs$.post(
      window.Shopify.routes.root + "cart/update.json",
      {
        attributes: {
          rudderAnonymousId: anonymousId,
        },
      },
      undefined,
      "json"
    );
  }
  function getTimeForCookieUpdate() {
    const thresholdTime = 50 * 60 * 1000; // 50 mins
    const currentTime = Date.now();
    const last_updated_at = Number(cookie_action({
      action: "get",
      name: "rs_shopify_cart_identified_at",
    }));
    const timeToUpdate = thresholdTime - (  currentTime - last_updated_at );
    return timeToUpdate
  }

  function sendIdentifierToRudderWebhook(cart) {
    const webhookUrl =
      "https://dataplaneUrl/v1/webhook?writeKey=writeKey_placeHolder";
    const data = {
      event: "rudderIdentifier",
      anonymousId: rudderanalytics.getAnonymousId(),
      cartToken: cart.token,
      cart:cart
    };
    rs$
      .ajax({
        url: webhookUrl,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(data),
      })
      .then(() => {
        updateTimeStampForIdentifierEvent();
        console.log("Successfully sent identifier event to rudderstack");
      })
      .catch(() => {
        console.log("Failed to sent identifier event to rudderstack");
      });
  }
  function updateTimeStampForIdentifierEvent() {
    const cookieOptions = {
      action: "set",
      expire_hr: 2,
      name: "rs_shopify_cart_identified_at",
      value: `${Date.now()}`
    }
    cookie_action(cookieOptions);
  }
  function fetchCart() {
    return rs$.get(
      window.Shopify.routes.root + "cart.js",
      undefined,
      undefined,
      "JSON"
    );
  }
  function trackProductSearch() {
    const query =
      rs$("button[data-search-form-submit]")
        .closest("form")
        .find('input[type="button"]')
        .val() ||
      rs$("button[data-search-form-submit]")
        .closest("form")
        .find('input[type="search"]')
        .val();
    if (query) {
      rudderanalytics.track("Products Searched", query);
    }
  }

  function trackNamedPageView() {
    let name = "",
      mappedPageName = "";
    for (const p of Object.keys(pages)) {
      if (isPage(p)) {
        name = p;
        mappedPageName = pages[p];
        break;
      }
    }

    switch (name) {
      case "/products":
      case "/collections/":
      case "/products/":
        trackProductPages(mappedPageName);
        break;

      case "/cart":
        cartPage(mappedPageName);
        break;

      default:
        console.log("RudderStack does not track this page");
    }
  }

  function propertyMapping(payload, mappingJsonObject) {
    const destinationPayload = {};
    mappingJsonObject.forEach((j) => {
      if (j.src.indexOf(".") > -1) {
        const firstProp = j.src.split(".")[0];
        const secondProp = j.src.split(".")[1];
        if (payload[firstProp]) {
          destinationPayload[j.dest] = payload[firstProp][secondProp];
          delete payload[firstProp][secondProp];
        } else {
          if (payload[firstProp + "s"]) {
            destinationPayload[j.dest] =
              payload[firstProp + "s"][0][secondProp];
            delete payload[firstProp + "s"][0][secondProp];
          }
        }
      } else {
        if (payload[j.src]) {
          destinationPayload[j.dest] = payload[j.src];
          delete payload[j.src];
        }
      }
    });
    return destinationPayload;
  }

  function isPage(name) {
    return pageURL.indexOf(name) > -1 ? true : false;
  }

  function trackProductPages(mappedPageName) {
    const pagePath = window.location.pathname;
    if (pagePath === "/collections" || pagePath === "/products") {
      console.log("RudderStack does not track this page");
    } else {
      const pagePathArr = pagePath.split("/");
      // If the url is = /products or /collections/{collectionId}
      if (
        pagePathArr[pagePathArr.length - 1] == "products" ||
        pagePathArr[pagePathArr.length - 2] == "collections"
      ) {
        productListPage(mappedPageName);
      }
      // If the url is = /products/{productId}
      else if (pagePathArr[pagePathArr.length - 2] == "products") {
        productPage(mappedPageName);
      }
    }
  }

  function getUrl() {
    return (
      (pageURL.indexOf("?") > -1 ? pageURL.split("?")[0] : pageURL) + ".json"
    );
  }

  function trackPageEvent() {
    const loc = window.location;
    const path = loc.pathname;
    const pageName = path.split("/").pop();
    const url = loc.href;
    let category;
    try {
      category = path.split("/")[path.split("/").length - 2];
    } catch (err) {
      category = "";
    }
    const properties = {
      path: path,
      referrer: document.referrer,
      search: loc.search,
      title: document.title,
      url: url,
    };
    if (pages[path] === "Registration Viewed") {
      rudderanalytics.track(pages[path], properties);
      rs$("#create_customer").submit(userRegistered);
    } else if (pages[path] === "Login Viewed") {
      rudderanalytics.track(pages[path], properties);
      rs$("#customer_login").submit(userLoggedIn);
    } else {
      rudderanalytics.page(category, pageName, properties);
    }
  }

  function userRegistered() {
    const email = rs$('#create_customer [type="email"]').val();
    const firstName = rs$(
      '#create_customer [name="customer[first_name]"]'
    ).val();
    const lastName = rs$('#create_customer [name="customer[last_name]"]').val();
    rudderanalytics.identify({
      email,
      firstName,
      lastName,
    });
  }

  function userLoggedIn() {
    const email = rs$('#customer_login [type="email"]').val();
    const firstName = rs$(
      '#customer_login [name="customer[first_name]"]'
    ).val();
    const lastName = rs$('#customer_login [name="customer[last_name]"]').val();
    rudderanalytics.identify({
      email,
      firstName,
      lastName,
    });
  }

  // function to format value to fload to to fixed places
  function formatPrice(value) {
    return (parseFloat(value) / 100).toFixed(2);
  }

  function cartPage(event) {
    // mapping a single cart item object to rudder format
    function cartItemMapper(payload, mappingObject) {
      const mappedPayload = {};
      const mappedKeys = new Set();
      mappingObject.forEach((mapping, index) => {
        const { dest, src } = mapping;
        mappedKeys.add(src);
        mappedPayload[dest] = payload[src];
      });

      // adding other free flowing keys
      Object.keys(payload).forEach((key) => {
        if (!mappedKeys.has(key)) {
          mappedPayload[key] = payload[key];
        }
      });

      // format each product properties where we have price
      Object.keys(mappedPayload).forEach((key) => {
        if (cartItemPropertyKeysToFormat.has(key)) {
          mappedPayload[key] = formatPrice(mappedPayload[key]);
        }
      });

      if (mappedPayload.discounts && mappedPayload.discounts.length > 0) {
        for (let i = 0; i < mappedPayload.discounts.length; i++) {
          mappedPayload.discounts[i].amount = formatPrice(
            mappedPayload.discounts[i].amount
          );
        }
      }
      if (
        mappedPayload.line_level_discount_allocations &&
        mappedPayload.line_level_discount_allocations.length > 0
      ) {
        for (
          let i = 0;
          i < mappedPayload.line_level_discount_allocations.length;
          i++
        ) {
          mappedPayload.line_level_discount_allocations[i].amount = formatPrice(
            mappedPayload.line_level_discount_allocations[i].amount
          );
          if (
            mappedPayload.line_level_discount_allocations[i]
              .discount_application?.total_allocated_amount
          ) {
            mappedPayload.line_level_discount_allocations[
              i
            ].discount_application.total_allocated_amount = formatPrice(
              mappedPayload.line_level_discount_allocations[i]
                .discount_application.total_allocated_amount
            );
          }
        }
      }

      return mappedPayload;
    }

    const url = getUrl();
    _getJsonData(url)
      .done(function (data) {
        console.log(data);
        const { items } = data;
        const { currency } = data;
        const payload = {
          products: [],
        };

        Object.keys(data).forEach((key) => {
          if (cartPropertyKeys.has(key)) {
            payload[key] = data[key];
          }
        });

        items.forEach((item, pos) => {
          const product = cartItemMapper(item, cartItemMapping);
          product.position = pos + 1;
          product.currency = currency;
          payload.products.push(product);
        });

        // format the cart properties
        Object.keys(payload).forEach((key) => {
          if (cartPropertyKeysToFormat.has(key)) {
            payload[key] = formatPrice(payload[key]);
          }
        });

        rudderanalytics.track(event, payload);
      })
      .fail(function (error) {
        console.log(error);
      });
  }

  /**
   * Checks whether the url for the product contains the variant id
   * @returns {string} variant id or null
   */
  function findVariantIdInURL() {
    const matches = window.location.href.match(/\d{8,20}/);
    if (matches) {
      return matches[0]
    }
    return null;
  };

  /**
   * Returns the sku value for the variant matching the id in url 
   * @param {*} payload product payload generated using product mapping
   * @returns {string} matching variant's sku or undefined
   */
  function getVariantSku(payload) {
    const variantId = findVariantIdInURL();
    const variant = payload.variant;
    if (variantId) {
      for (let i = 0; i < variant.length; i++) {
        if (String(variant[i].id) === variantId) {
          return variant[i].sku;
        }
      }
    }
    return undefined;
  }

  // mapping seems fine
  function handleProductClicked() {
    const url = `${this.href}.json`;

    _getJsonData(url)
      .done(function (data) {
        console.log("[Product Clicked] data.product", data.product);
        const payload = propertyMapping(data.product, productMapping);
        payload.currency = pageCurrency;
        // payload.sku = payload.variant
        //   .map((item) => item.sku)
        //   .reduce((prev, next) => prev + next);

        rs$(htmlSelector.buttonAddToCart).on("click", addToCart.bind(payload));
        rs$("a")
          .filter((a, b) => b.href.indexOf(".facebook.com") > -1)
          .each((a, b) => {
            rs$(b).on("click", handleProductClicked);
          });
        rudderanalytics.track("Product Clicked", payload);
      })
      .fail(function (error) {
        console.log(error);
      });
  }

  // mapping seems fine
  function productListPage(event) {
    rs$("a")
      .filter((a, b) => b.href.indexOf("/products") > -1)
      .each((a, b) => {
        rs$(b).on("click", handleProductClicked);
      });
    let url = getUrl();
    const [referrer, all] = url.split("collections");
    if (all.indexOf("all") > -1) {
      url = `${referrer}products.json`;
    }
    _getJsonData(url)
      .done(function (data) {
        const payload = {
          products: [],
        };
        if (data.products) {
          data.products.forEach((product) => {
            const p = propertyMapping(product, productMapping);
            p.currency = pageCurrency;
            p.sku = String(p.variant[0].sku || p.product_id);
            p.price = p.variant[0].price;
            payload.products.push(p);
          });

          rudderanalytics.track(event, payload);
        }
      })
      .fail(function (error) {
        console.log(error);
      });
  }

  function productPage(event, url = null) {
    if (url === null) {
      url = getUrl();
    }
    _getJsonData(url)
      .done(function (data) {
        const payload = propertyMapping(data.product, productMapping);
        payload.currency = pageCurrency;
        payload.sku = String(getVariantSku(payload) || payload.variant[0].sku || payload.product_id);
        // we set root-level price property to be equal to first variant's price, if it is not available
        if (payload.variant && !payload.price) {
          payload.price = payload.variant[0].price;
        }

        rs$(htmlSelector.buttonAddToCart).on("click", addToCart.bind(payload));
        rs$('form[action="/cart/add"] [type="button"]').each((i, ele) => {
          const val = rs$(ele).html().toLowerCase();
          if (val.indexOf("buy") > -1 || val.indexOf("checkout") > -1) {
            rs$(ele).on("click", trackCheckoutStarted.bind(payload));
          }
        });
        rudderanalytics.track(event, payload);
      })
      .fail(function (error) {
        console.log(error);
      });
  }

  // mapping seems fine
  function addToCart() {
    rudderanalytics.track("Product Added", this);
  }

  // triggered on clicking buy now
  function trackCheckoutStarted() {
    rudderanalytics.track("Checkout Started", this);
  }

  function _getJsonData(url) {
    var defer = rs$.Deferred();
    rs$.ajax({
      url,
      dataType: "jsonp",
      header: {
        "Access-Control-Allow-Origin": "*",
      },
      success: function (responseData) {
        return defer.resolve(responseData);
      },
      fail: function () {
        return defer.reject();
      },
    });
    return defer.promise();
  }

  // utility function to get cookie value
  function cookie_parse() {
    var obj = {};
    var pairs = document.cookie.split(/ *; */);
    var pair;
    if ("" == pairs[0]) return obj;
    for (var i = 0; i < pairs.length; ++i) {
      pair = pairs[i].split("=");
      obj[pair[0]] = pair[1];
    }
    return obj;
  }

  function cookie_action(agr = {}) {
    let output;
    const {
      name,
      value,
      expire_hr,
      path = "/",
      samesite = "Lax",
      action = "get",
    } = agr;
    switch (action) {
      case "set":
        let expires = "";
        if (expire_hr) {
          const date = new Date();
          date.setTime(date.getTime() + expire_hr * 60 * 60 * 1000);
          expires = "; expires=" + date.toUTCString();
        }
        document.cookie =
          name +
          "=" +
          value +
          expires +
          ";path=" +
          path +
          ";SameSite=" +
          samesite;
        output = "Cookie Successfully Set";
        break;
      case "get":
        let cookieObj = cookie_parse();
        output = cookieObj[name];
        break;
      default:
        output = "Invalid Action";
        break;
    }
    return output;
  }

  // return {
  //   init: init,
  // };

  var rs$;
  var script = document.createElement("script");
  script.setAttribute(
    "src",
    "//ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"
  );
  document.head.appendChild(script);
  // rs$ = $.noConflict(true);
  // init();
  script.addEventListener("load", function () {
    rs$ = $.noConflict(true);
    init();
  });
})();
