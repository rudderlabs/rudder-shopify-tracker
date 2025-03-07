let _rudderTracking = (function () {
  const pages = {
    '/products/': 'Product Viewed',
    '/cart': 'Cart Viewed',
    '/account/register': 'Registration Viewed',
    '/account/login': 'Login Viewed',
  };
  const htmlSelector = {};
  const pageURL = window.location.href;
  let pageCurrency = '';
  let pagePathArr = '';
  let userId;
  let enableClientIdentifierEvents;
  let heapCookieObject;

  const cartItemMapping = [
    { dest: 'product_id', src: 'product_id' },
    { dest: 'sku', src: 'sku' },
    { dest: 'quantity', src: 'quantity' },
    { dest: 'name', src: 'product_title' },
    { dest: 'price', src: 'price' },
    { dest: 'category', src: 'product_type' },
    { dest: 'variant', src: 'variant_title' },
    { dest: 'brand', src: 'vendor' },
    { dest: 'url', src: 'url' },
    { dest: 'image_url', src: 'image' },
  ];

  const cartPropertyKeys = new Set([
    'note',
    'original_total_price',
    'requires_shipping',
    'token',
    'total_discount',
    'total_price',
    'total_weight',
    'item_count',
  ]);

  const cartPropertyKeysToFormat = new Set([
    'original_total_price',
    'total_price',
    'total_discount',
  ]);
  const cartItemPropertyKeysToFormat = new Set([
    'price',
    'original_price',
    'discounted_price',
    'line_price',
    'original_line_price',
    'total_discount',
    'final_price',
    'final_line_price',
    'line_level_total_discount',
  ]);

  const productMapping = [
    { dest: 'product_id', src: 'id' },
    { dest: 'sku', src: 'sku' },
    { dest: 'name', src: 'title' },
    { dest: 'category', src: 'product_type' },
    { dest: 'variant', src: 'variants' },
    { dest: 'url', src: 'url' },
  ];
  /**
   * This function checks if Customer wants us to send Identify Event
   */
  function isClientSideIdentifierEventsEnabled() {
    const authKey = btoa('writeKey_placeHolder' + ':');
    const sourceConfigUrl = 'configUrl_placeholder/sourceConfig';
    return new Promise(function (resolve, _reject) {
      rs$.ajax({
        url: sourceConfigUrl,
        method: 'GET',
        timeout: 2000, // 2 seconds timeout
        beforeSend: function (xhr) {
          // Set the Authorization header
          xhr.setRequestHeader('Authorization', 'Basic ' + authKey);
        },
        success: function (response) {
          if (response.source?.config?.disableClientSideIdentifier === true) {
            resolve(false);
          } else {
            resolve(true);
          }
        },
        error: function (xhr, _status, _error) {
          console.warn(
            "Couldn't fetch Source Config due to error: " +
              xhr.responseJSON.message +
              ' Client-side event tracking will be enabled.',
          );
          resolve(true);
        },
      });
    });
  }

  /* checking if user logged out after logging in once
   when user logs in for first time we make the identify call and set `rudder_user_id`
   cookie as `captured` and hence we are leveraging the same 
  */
  const checkIfUserLoggedOut = (userId) => {
    if (!userId) {
      const wasUserIdentifiedPreviously =
        cookie_action({ action: 'get', name: 'rudder_user_id' }) === 'captured';
      if (wasUserIdentifiedPreviously) {
        rudderanalytics.reset(true);
        cookie_action({
          action: 'set',
          name: 'rudder_user_id',
          value: 'Not Captured',
        });
        return true;
      }
    }
    return false;
  };
  function init() {
    pageCurrency = Shopify.currency.active;
    pagePathArr = window.location.pathname.split('/');
    userId = ShopifyAnalytics.meta.page.customerId || __st.cid;
    const userLoggedOut = checkIfUserLoggedOut(userId);

    // fetching heap Cookie object
    // TODO: for adding dynamic support from source config
    heapCookieObject = cookie_action({
      action: 'get',
      name: '_hp2_id.1200528076',
    });

    if (heapCookieObject) {
      heapCookieObject = JSON.parse(decodeURIComponent(heapCookieObject));
    } else {
      console.debug('No heap cookie found.');
    }
    htmlSelector.buttonAddToCart = rs$('form[action="/cart/add"] [type="submit"]');
    fetchCart().then((cart) => {
      const needToUpdateCart = checkCartNeedsToBeUpdated(cart);
      if (userLoggedOut || needToUpdateCart) {
        updateCartAttribute()
          .then((cart) => {
            sendIdentifierToRudderWebhook(cart); // sending rudderIdentifier periodically after this
            sendSessionIdentifierToRudderWebhook(cart); // sending sessionIdentifier
            console.log('Successfully updated cart');
            checkAndSendSessionRudderIdentifierPeriodically();
            checkAndSendRudderIdentifier(cart, 10000);
          })
          .catch((error) => {
            console.debug('Error occurred while updating cart:', error);
          });
      } else {
        checkAndSendSessionRudderIdentifierPeriodically(true);
        checkAndSendRudderIdentifier(cart);
      }
    });
    isClientSideIdentifierEventsEnabled().then((response) => {
      if (response) {
        enableClientIdentifierEvents = true;
        identifyUser();
      } else {
        enableClientIdentifierEvents = false;
      }
    });
    productListViews();
    trackPageEvent();
    trackNamedPageView();
    productListPage();

    rs$('button[data-search-form-submit]').on('click', trackProductSearch);
  }
  const productIsVisible = (window, element) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const { top, bottom, left, right, height } = element.getBoundingClientRect();

    if (top < viewportHeight && bottom > 0 && left < viewportWidth && right > 0) {
      let pixelsVisible = height;

      if (top < 0) {
        pixelsVisible += top;
      }
      if (bottom > viewportHeight) {
        pixelsVisible += viewportHeight - bottom;
      }
      const percentVisible = pixelsVisible / height;

      if (percentVisible > 0.8) {
        return true;
      }
    }
    return false;
  };
  function getAllProductsOnPage() {
    const allAnchorTags = document.getElementsByTagName('a');
    const productUrlRegex = /^(?!\/\/cdn)[-.:/,a-z,A-Z,0-9]*\/products\//;
    const allAnchorTagsWithProducts = Array.prototype.slice
      .call(allAnchorTags)
      .filter((anchorTag) => {
        return productUrlRegex.test(anchorTag.href);
      });
    let allProductsOnPageWithImg = allAnchorTagsWithProducts.filter((anchorTag) => {
      anchorTag.querySelector('img');
    });
    if (allProductsOnPageWithImg.length === 0) {
      allProductsOnPageWithImg = allAnchorTagsWithProducts.filter((anchorTag) => {
        const parentNode = anchorTag.parentNode.parentNode.parentNode;
        return (
          parentNode.nextElementSibling?.querySelector('img') ||
          parentNode.previousElementSibling?.querySelector('img')
        );
      });
    }
    return allProductsOnPageWithImg;
  }
  function callProductListViewedEvent(productsOnThePage, productConsidered) {
    const elementsToSend = [];
    const productsToSend = [];
    let excludeCurrentPage = false;
    if (pagePathArr[pagePathArr.length - 2] == 'products') {
      excludeCurrentPage = true;
    }
    productsOnThePage.forEach((element) => {
      const isProductVisible = productIsVisible(window, element);
      const isProductAlreadyConsidered = productConsidered.includes(element.href);
      if (
        isProductVisible &&
        !isProductAlreadyConsidered &&
        (!excludeCurrentPage || !element.href.includes(pageURL))
      ) {
        elementsToSend.push(element);
        productConsidered.push(element.href);
      }
    });
    if (elementsToSend.length > 0) {
      elementsToSend.forEach((product) => {
        const handle = product.href.match(/(\/products\/)((\w|-)*)(\?|\$?)/)[2];
        rs$
          .get(`/products/${handle}.json`, undefined, undefined, 'JSON')
          .then((data) => {
            const rudderstackProduct = propertyMapping(data.product, productMapping); // here as well
            rudderstackProduct.currency = pageCurrency;
            rudderstackProduct.sku = String(
              rudderstackProduct.variant[0]?.sku || rudderstackProduct.product_id,
            );
            rudderstackProduct.price = rudderstackProduct.variant[0]?.price;
            productsToSend.push(rudderstackProduct);
          })
          .catch((error) => {
            console.debug('Rudderstack unable to fetch', handle, error);
          });
      });
      window.setTimeout(() => {
        if (productsToSend.length > 0) {
          rudderanalytics.track('Product List Viewed', {
            products: productsToSend,
          });
        }
      }, 2500);
    }
  }
  function productListViews() {
    const productsOnThePage = getAllProductsOnPage();
    if (productsOnThePage.length > 0) {
      const productConsidered = [];
      let waitForScroll = window.setTimeout(() => {
        callProductListViewedEvent(productsOnThePage, productConsidered);
      }, 200);
      document.addEventListener('scroll', () => {
        //assumes that people need 200ms after scrolling stops to register an impression
        clearTimeout(waitForScroll);
        waitForScroll = window.setTimeout(() => {
          callProductListViewedEvent(productsOnThePage, productConsidered);
        }, 200);
      });
    } else {
      handleProductListViewFallback('Product List Viewed');
    }
  }

  function identifyUser() {
    if (userId && cookie_action({ action: 'get', name: 'rudder_user_id' }) !== 'captured') {
      if (
        heapCookieObject &&
        cookie_action({ action: 'get', name: 'rudder_heap_identities' }) !== 'captured'
      ) {
        rudderanalytics.identify(userId, {
          heapUserID: heapCookieObject.userId,
          heapSessionId: heapCookieObject.sessionId,
        });
        cookie_action({
          action: 'set',
          name: 'rudder_heap_identities',
          value: 'captured',
        });
      } else {
        rudderanalytics.identify(userId);
      }
      cookie_action({
        action: 'set',
        name: 'rudder_user_id',
        value: 'captured',
      });
    }

    if (
      heapCookieObject &&
      cookie_action({ action: 'get', name: 'rudder_heap_identities' }) !== 'captured'
    ) {
      rudderanalytics.identify(rudderanalytics.getUserId(), {
        heapUserID: heapCookieObject.userId,
        heapSessionId: heapCookieObject.sessionId,
      });

      cookie_action({
        action: 'set',
        name: 'rudder_heap_identities',
        value: 'captured',
      });
    }
  }

  // Shopify Cart Check and Updating of cart attributes
  function checkCartNeedsToBeUpdated(cart) {
    const { attributes } = cart;
    return !attributes?.rudderAnonymousId;
  }
  function updateCartAttribute() {
    const anonymousId = rudderanalytics.getAnonymousId();
    const sessionId = rudderanalytics.getSessionId();
    return rs$.post(
      window.Shopify.routes.root + 'cart/update.json',
      {
        attributes: {
          rudderAnonymousId: anonymousId,
          rudderSessionId: sessionId,
        },
      },
      undefined,
      'json',
    );
  }

  // common function for sending anonymousId and sessionId Identifier
  function sendToRudderWebhook(data, type, updateTypeCookieFunction, retryAttempt = 0) {
    const webhookUrl = 'https://dataplaneUrl_placeHolder/v1/webhook?writeKey=writeKey_placeHolder';
    const timeToRetry = 1000; // 1 second
    const maxRetries = 3;
    if (maxRetries > retryAttempt) {
      rs$
        .ajax({
          url: webhookUrl,
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify(data),
        })
        .then(() => {
          updateTypeCookieFunction();
          console.log(`Successfully sent ${type} event to rudderstack`);
        })
        .catch(() => {
          setTimeout(() => {
            sendToRudderWebhook(data, type, updateTypeCookieFunction, retryAttempt + 1);
          }, timeToRetry * retryAttempt);
        });
    } else {
      console.log(`Failed to sent ${type} event to rudderstack`);
    }
  }

  //functions to send sessionId Identifier
  function sendSessionIdentifierToRudderWebhook(cart) {
    const data = {
      event: 'rudderSessionIdentifier',
      sessionId: rudderanalytics.getSessionId(),
      cartToken: cart.token,
    };
    const type = 'sessionIdentifier';
    sendToRudderWebhook(data, type, updateSessionCookie);
  }
  function checkSessionCookieNeedsToBeUpdated() {
    const current_session_id = rudderanalytics.getSessionId();
    const prev_rs_session_id = cookie_action({
      action: 'get',
      name: 'rs_shopify_session_id',
    });
    return current_session_id != prev_rs_session_id;
  }
  function checkAndSendSessionRudderIdentifier() {
    const needToUpdateSessionCookie = checkSessionCookieNeedsToBeUpdated();
    if (needToUpdateSessionCookie) {
      updateCartAttribute().then((cart) => {
        // updating the sessionId in cart object
        sendSessionIdentifierToRudderWebhook(cart); // sending sessionIdentifier
      });
    }
  }
  function updateSessionCookie() {
    const cookieOptions = {
      action: 'set',
      expire_hr: 1,
      name: 'rs_shopify_session_id',
      value: rudderanalytics.getSessionId(),
    };
    cookie_action(cookieOptions);
  }
  function checkAndSendSessionRudderIdentifierPeriodically(checkNow = false) {
    const pollTimeToCheckAndSendSessionIdentifier = 'sessionIdentifierPollTime_placeHolder';
    if (checkNow) {
      checkAndSendSessionRudderIdentifier();
    }
    setInterval(() => {
      checkAndSendSessionRudderIdentifier();
    }, pollTimeToCheckAndSendSessionIdentifier);
  }

  // functions for sending anonymousId Identifier
  function checkAndSendRudderIdentifier(cart, delay = 0) {
    setTimeout(() => {
      const timeForCookieUpdate = getTimeForCookieUpdate();
      setTimeout(() => {
        sendRudderIdentifierPeriodically(cart);
      }, timeForCookieUpdate);
    }, delay);
  }
  function sendRudderIdentifierPeriodically(cart) {
    sendIdentifierToRudderWebhook(cart);
    const cookieUpdateFixedInterval = 50 * 60 * 1000; // 50 mins
    setInterval(() => {
      sendIdentifierToRudderWebhook(cart);
    }, cookieUpdateFixedInterval);
  }
  function sendIdentifierToRudderWebhook(cart) {
    const data = {
      event: 'rudderIdentifier',
      anonymousId: rudderanalytics.getAnonymousId(),
      cartToken: cart.token,
      cart: cart,
    };
    sendToRudderWebhook(data, 'anonymousIdentifier', updateTimeStampForIdentifierEvent);
  }

  function getTimeForCookieUpdate() {
    const thresholdTime = 50 * 60 * 1000; // 50 mins
    const currentTime = Date.now();
    const last_updated_at = Number(
      cookie_action({
        action: 'get',
        name: 'rs_shopify_cart_identified_at',
      }),
    );
    const timeToUpdate = thresholdTime - (currentTime - last_updated_at);
    return timeToUpdate;
  }

  function updateTimeStampForIdentifierEvent() {
    const cookieOptions = {
      action: 'set',
      expire_hr: 1,
      name: 'rs_shopify_cart_identified_at',
      value: `${Date.now()}`,
    };
    cookie_action(cookieOptions);
  }
  function fetchCart() {
    return rs$.get(window.Shopify.routes.root + 'cart.js', undefined, undefined, 'JSON');
  }

  function trackProductSearch() {
    const query =
      rs$('button[data-search-form-submit]').closest('form').find('input[type="button"]').val() ||
      rs$('button[data-search-form-submit]').closest('form').find('input[type="search"]').val();
    if (query) {
      rudderanalytics.track('Products Searched', query);
    }
  }

  function trackNamedPageView() {
    let name = '',
      mappedPageName = '';
    for (const p of Object.keys(pages)) {
      if (isPage(p)) {
        name = p;
        mappedPageName = pages[p];
        break;
      }
    }
    switch (name) {
      case '/products/':
        trackProductPages(mappedPageName); // Ex: Product Viewed
        break;

      case '/cart':
        cartPage(mappedPageName);
        break;

      default:
        console.info('RudderStack does not track this page');
    }
  }

  function propertyMapping(payload, mappingJsonObject, variantId = null) {
    const destinationPayload = {};
    mappingJsonObject.forEach((j) => {
      if (j.src.indexOf('.') > -1) {
        const firstProp = j.src.split('.')[0];
        const secondProp = j.src.split('.')[1];
        if (payload[firstProp]) {
          destinationPayload[j.dest] = payload[firstProp][secondProp];
          delete payload[firstProp][secondProp];
        } else {
          if (payload[firstProp + 's']) {
            destinationPayload[j.dest] = payload[firstProp + 's'][0][secondProp];
            delete payload[firstProp + 's'][0][secondProp];
          }
        }
      } else {
        if (payload[j.src]) {
          // If there are many variants for a product then we will be sending data for the one currently visible
          if (j.src === 'variants' && Array.isArray(payload[j.src])) {
            if (variantId || variantId != null) {
              const variant = payload[j.src].find((i) => String(i.id) === variantId);
              if (variant) {
                destinationPayload[j.dest] = [variant];
              }
            }
            if (!destinationPayload[j.dest]) {
              // if we could not get variantId then by default will send the first variant object of array
              destinationPayload[j.dest] = [payload[j.src][0]];
            }
          } else {
            destinationPayload[j.dest] = payload[j.src];
          }
          delete payload[j.src];
        }
      }
    });
    return destinationPayload;
  }

  function isPage(name) {
    return pageURL.indexOf(name) > -1;
  }

  function trackProductPages(mappedPageName) {
    const pagePath = window.location.pathname;
    if (pagePath === '/collections' || pagePath === '/products') {
      console.info('RudderStack does not track this page');
    } else {
      const pagePathArr = pagePath.split('/');
      if (pagePathArr[pagePathArr.length - 2] == 'products') {
        // If the url is = /products/{productId} -> Product Page
        let alreadyViewedVariants = [];
        let replaceState = history.replaceState;
        history.replaceState = function () {
          replaceState.apply(history, arguments);
          const currentVariant = getCurrentVariantId();
          if (currentVariant != null && !alreadyViewedVariants.includes(currentVariant)) {
            alreadyViewedVariants.push(currentVariant);
            productPage(mappedPageName, currentVariant);
          }
        };
        const variantId = getCurrentVariantId();
        productPage(mappedPageName, variantId);
      }
    }
  }

  function getUrl() {
    return (pageURL.indexOf('?') > -1 ? pageURL.split('?')[0] : pageURL) + '.json';
  }

  function trackPageEvent() {
    const loc = window.location;
    const path = loc.pathname;
    const pageName = path.split('/').pop();
    const url = loc.href;
    let category;
    try {
      category = path.split('/')[path.split('/').length - 2];
    } catch (err) {
      category = '';
    }
    const properties = {
      path: path,
      referrer: document.referrer,
      search: loc.search,
      title: document.title,
      url: url,
    };
    if (pages[path] === 'Registration Viewed') {
      rudderanalytics.track(pages[path], properties);
      if (enableClientIdentifierEvents) {
        rs$('#create_customer').submit(userRegistered);
      }
    } else if (pages[path] === 'Login Viewed') {
      rudderanalytics.track(pages[path], properties);
      if (enableClientIdentifierEvents) {
        rs$('#customer_login').submit(userLoggedIn);
      }
    } else {
      rudderanalytics.page(category, pageName, properties);
    }
  }

  function userRegistered() {
    const email = rs$('#create_customer [type="email"]').val();
    const firstName = rs$('#create_customer [name="customer[first_name]"]').val();
    const lastName = rs$('#create_customer [name="customer[last_name]"]').val();
    rudderanalytics.identify({
      email,
      firstName,
      lastName,
    });
  }

  function userLoggedIn() {
    const email = rs$('#customer_login [type="email"]').val();
    const firstName = rs$('#customer_login [name="customer[first_name]"]').val();
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
      mappingObject.forEach((mapping) => {
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
          mappedPayload.discounts[i].amount = formatPrice(mappedPayload.discounts[i].amount);
        }
      }
      if (
        mappedPayload.line_level_discount_allocations &&
        mappedPayload.line_level_discount_allocations.length > 0
      ) {
        for (let i = 0; i < mappedPayload.line_level_discount_allocations.length; i++) {
          mappedPayload.line_level_discount_allocations[i].amount = formatPrice(
            mappedPayload.line_level_discount_allocations[i].amount,
          );
          if (
            mappedPayload.line_level_discount_allocations[i].discount_application
              ?.total_allocated_amount
          ) {
            mappedPayload.line_level_discount_allocations[
              i
            ].discount_application.total_allocated_amount = formatPrice(
              mappedPayload.line_level_discount_allocations[i].discount_application
                .total_allocated_amount,
            );
          }
        }
      }

      return mappedPayload;
    }

    const url = getUrl();
    _getJsonData(url)
      .done(function (data) {
        console.debug(data);
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

  /* We changed `Product List View Event` flow by fetching the image tags and adding listners to them but due to much manipulation in HTML CSS of Store its hard to generalize it. 
  So this acts as a fallback so that nothing breaks. 
  To be deprecated soon
  */
  const handleProductListViewFallback = (event) => {
    let url = getUrl();
    if (pageURL.indexOf('/collections/') > -1) {
      const [referrer, all] = url.split('collections');
      if (all.indexOf('all') > -1) {
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
  };

  // mapping seems fine
  function handleProductClicked() {
    const url = `${this.href}.json`;

    _getJsonData(url)
      .done(function (data) {
        console.log('[Product Clicked] data.product', data.product);
        const variantId = getCurrentVariantId();
        const payload = propertyMapping(data.product, productMapping, variantId);
        payload.currency = pageCurrency;

        rs$(htmlSelector.buttonAddToCart).on('click', addToCart.bind(payload));
        rs$('a')
          .filter((a, b) => b.href.indexOf('.facebook.com') > -1)
          .each((a, b) => {
            rs$(b).on('click', handleProductClicked);
          });
        rudderanalytics.track('Product Clicked', payload);
      })
      .fail(function (error) {
        console.debug(error);
      });
  }
  function getCurrentVariantId() {
    const parameters = window.location.search;
    let params = new URLSearchParams(parameters);
    const variantId = params.get('variant');
    if (variantId) {
      return variantId;
    }
    return null;
  }
  // Adding listners on products for Product Clicked Events
  function productListPage() {
    rs$('a')
      .filter((a, b) => b.href.indexOf('/products') > -1)
      .each((a, b) => {
        rs$(b).on('click', handleProductClicked);
      });
  }

  function productPage(event, variantId, url = null) {
    if (url === null) {
      url = getUrl();
    }
    _getJsonData(url)
      .done(function (data) {
        const payload = propertyMapping(data.product, productMapping, variantId);
        payload.currency = pageCurrency;
        payload.sku = String(payload.variant[0].sku || payload.product_id);
        if (payload.variant && !payload.price) {
          payload.price = payload.variant[0].price;
        }
        rs$(htmlSelector.buttonAddToCart).on('click', addToCart.bind(payload));
        rs$('form[action="/cart/add"] [type="button"]').each((i, ele) => {
          const val = rs$(ele).html().toLowerCase();
          if (val.indexOf('buy') > -1 || val.indexOf('checkout') > -1) {
            rs$(ele).on('click', trackCheckoutStarted.bind(payload));
          }
        });
        rudderanalytics.track(event, payload);
      })
      .fail(function (error) {
        console.debug(error);
      });
  }

  // mapping seems fine
  function addToCart() {
    rudderanalytics.track('Product Added', this);
  }

  // triggered on clicking buy now
  function trackCheckoutStarted() {
    rudderanalytics.track('Checkout Started', this);
  }

  function _getJsonData(url) {
    let defer = rs$.Deferred();
    rs$.ajax({
      url,
      dataType: 'jsonp',
      header: {
        'Access-Control-Allow-Origin': '*',
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
    let obj = {};
    let pairs = document.cookie.split(/ *; */);
    let pair;
    if ('' == pairs[0]) return obj;
    for (let i = 0; i < pairs.length; ++i) {
      pair = pairs[i].split('=');
      obj[pair[0]] = pair[1];
    }
    return obj;
  }

  function cookie_action(agr = {}) {
    let output;
    const { name, value, expire_hr, path = '/', samesite = 'Lax', action = 'get' } = agr;
    switch (action) {
      case 'set':
        let expires = '';
        if (expire_hr) {
          const date = new Date();
          date.setTime(date.getTime() + expire_hr * 60 * 60 * 1000);
          expires = '; expires=' + date.toUTCString();
        }
        document.cookie = name + '=' + value + expires + ';path=' + path + ';SameSite=' + samesite;
        output = 'Cookie Successfully Set';
        break;
      case 'get':
        let cookieObj = cookie_parse();
        output = cookieObj[name];
        break;
      default:
        output = 'Invalid Action';
        break;
    }
    return output;
  }

  // return {
  //   init: init,
  // };

  let rs$;
  let script = document.createElement('script');
  script.setAttribute('src', '//ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js');
  document.head.appendChild(script);
  // rs$ = $.noConflict(true);
  // init();
  script.addEventListener('load', function () {
    rs$ = $.noConflict(true);
    init();
  });
})();
