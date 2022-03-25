var rudderTracking = (function () {
  const pages = {
    "/products/": "Product Viewed",
    "/cart": "Cart Viewed",
    "/collections/": "Product List Viewed",
    "/account/register": "Registration Viewed",
    "/thank_you": "Checkout Step Completed",
    "/account": __st.cid || ShopifyAnalytics.lib.user().traits().uniqToken,
  };
  const htmlSelector = {};
  const pageURL = window.location.href;
  let pageCurrency = "";

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
    "item_count"
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
    htmlSelector.buttonAddToCart =
      rs$('form[action="/cart/add"] [type="submit"]').length === 1
        ? rs$('form[action="/cart/add"] [type="submit"]')
        : "";
    trackPageEvent();
    trackNamedPageView();

    rs$("button[data-search-form-submit]").on("click", trackProductSearch);

    // buy now :: data-testid="Checkout-button" $('form[action="/cart/add"] [type="button"]')
  }

  // doesn't seem to work
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
      val = "";
    Object.keys(pages).forEach((p) => {
      if (isPage(p)) {
        name = p;
        val = pages[p];
      }
    });

    switch (name) {
      /**
       * We are actually not tracking collections but rather products
       * /collections/{collectionName}/products --> This is the actual product list 
       * that we intend to track
       */
      case "/products":
      case "/collections/":
        // TODO: check if something is there after collections/ in the URL
        // otherwise it a collections page and we dont track that
        if (isProductListPage()) {
          productListPage(val);
        }

      case "/products/":
        // TODO: check if something is there after products/ in the URL
        // if not, then it is products page and not a single product, and we should 
        // fire calls accordingly.
        productPage(val);
        break;

      case "/cart":
        cartPage(val);
        break;

      // to be removed
      // sdk is not allowed to be loaded on payment pages
      // case "/thank_you":
      //   checkoutStepCompleted(val);
      //   break;

      // not implemented
      // case "/account/register":
      //   registerPage();
      //   break;

      // // flagging this. implementation is incorrect
      // case "/account":
      //   rudderanalytics.identify(val);
      //   break;

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

  // fire a track call only when both /collections and /products are present
  // i.e at URL /collections/{collectionName}/products

  function isProductListPage() {
    let pathArray = window.location.pathname.split('/');
    let pathArrayLength = pathArray.length();
    if(pathArray[pathArrayLength-1] == "products") {
      return true;
    }
    return false;
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
    const category = url.split(`${pageName}`)[1].split("/")[0];
    const properties = {
      path: path,
      referrer: document.referrer,
      search: loc.search,
      title: document.title,
      url: url,
    };
    if (pages[path] === "Registration Viewed") {
      rudderanalytics.track(pages[path], properties);
      // rs$('form[action="/account"] [type="submit"]').on(
      //   "click",
      //   userRegistered
      // );
    } else {
      rudderanalytics.page(category, pageName, properties);
    }
  }

  // mapping udpated
  // but form action name is hardcoded. need to see on this
  // has potential to break
  /**
   * Note: action defaults to this. These cant be changed. But new action can be added
   * by a user in .liquid file
   */
  // removing identify from device mode. Cloud mode has support and has much more information
  // in traits
  // function userRegistered() {
  //   const userEmail = rs$('form[action="/account"] [type="email"]').val();
  //   const firstName = rs$('form[action="/account"] [name="customer[first_name]"]').val();
  //   const lastName = rs$('form[action="/account"] [name="customer[last_name]"]').val();
  //   rudderanalytics.identify({ 
  //     email: userEmail || "",
  //     firstName,
  //     lastName
  //   });
  // }

  // mapping is fixed
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

        Object.keys(data).forEach(key => {
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

        rudderanalytics.track(event, payload);
      })
      .fail(function (error) {
        console.log(error);
      });
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
          p.sku = p.variant
            .map((item) => item.sku)
            .reduce((prev, next) => prev + next);
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
        payload.sku = payload.variant
          .map((item) => item.sku)
          .reduce((prev, next) => prev + next);

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

  // sdk is not allowed to load in checkout page
  // to be removed
  // function checkoutStepCompleted(val) {
  //   const payload = {
  //     checkout_id: Shopify.Checkout.token,
  //     step: 4,
  //     shipping_method: Shopify.checkout.shipping_rate.title,
  //     payment_method:
  //       Shopify.checkout.credit_card instanceof Object ? "card" : "others",
  //   };
  //   rudderanalytics.track(val, payload);
  // }

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

// Trigger OnLoad for Scripts
// var rs$;
// var script = document.createElement("script");
// script.setAttribute(
//   "src",
//   "//ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"
// );
// script.addEventListener("load", function () {
//   rs$ = $.noConflict(true);
//   rudderTracking.init();
// });
// document.head.appendChild(script);
