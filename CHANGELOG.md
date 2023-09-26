# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.2.1](https://github.com/rudderlabs/rudder-shopify-tracker/compare/v1.2.0...v1.2.1) (2023-09-26)


### Bug Fixes

* prod deploy chronology ([#55](https://github.com/rudderlabs/rudder-shopify-tracker/issues/55)) ([894f038](https://github.com/rudderlabs/rudder-shopify-tracker/commit/894f038043addca9d7dd3e5f6f1ea1f9bb0d2336))

## 1.2.0 (2023-09-26)


### Features

* adding cartToken to rudderIdentifier payload ([1af7b1c](https://github.com/rudderlabs/rudder-shopify-tracker/commit/1af7b1c3672ea9a90bbab41793ef72ffd8d778a6))
* adding ci/cd to shopify tracker repository ([#43](https://github.com/rudderlabs/rudder-shopify-tracker/issues/43)) ([666f7e3](https://github.com/rudderlabs/rudder-shopify-tracker/commit/666f7e3288da7113b78e4141e05d0f475b97cc23))
* adding session Id stitching and upgrading node version to v18 ([#30](https://github.com/rudderlabs/rudder-shopify-tracker/issues/30)) ([dd8bc39](https://github.com/rudderlabs/rudder-shopify-tracker/commit/dd8bc39994da3f9c46c1b0d0cded1fc519b90454))
* address comment ([ff96b36](https://github.com/rudderlabs/rudder-shopify-tracker/commit/ff96b365f4c47d9c0dfacf27ec58d688009e68e6))
* fire Rudder Identifier Periodically ([f339eea](https://github.com/rudderlabs/rudder-shopify-tracker/commit/f339eea9cce2c3a14e282ad827ce4afc833946be))
* initial commit for identity stitching ([e536415](https://github.com/rudderlabs/rudder-shopify-tracker/commit/e5364156789ff3d7b014283a351a3bf3543884b1))
* refactor code ([56ce4a9](https://github.com/rudderlabs/rudder-shopify-tracker/commit/56ce4a92c967bbfdd3a2f55b5ee3234522159ecf))
* send whole cart payload for rudderIdentifier event ([8d2dabd](https://github.com/rudderlabs/rudder-shopify-tracker/commit/8d2dabd5556a832fe3d49ed4159d3dea26f57055))
* skip client side identify calls ([2e6cf0d](https://github.com/rudderlabs/rudder-shopify-tracker/commit/2e6cf0de98c50d348f1b346ed97b5dbe39c22445))
* storing cart attributes as cookie ([806d187](https://github.com/rudderlabs/rudder-shopify-tracker/commit/806d1875872c8a52947b5b011581525468f605c2))
* update product list viewed event call ([#28](https://github.com/rudderlabs/rudder-shopify-tracker/issues/28)) ([2b79208](https://github.com/rudderlabs/rudder-shopify-tracker/commit/2b792086ad8d89f33a812a19e290d1518ad27b04))


### Bug Fixes

* ci/cd file name ([#50](https://github.com/rudderlabs/rudder-shopify-tracker/issues/50)) ([a77fdf9](https://github.com/rudderlabs/rudder-shopify-tracker/commit/a77fdf9d40471239cce1f10e4cffe064d365191c))
* cookie update check timeInterval ([17ce9a8](https://github.com/rudderlabs/rudder-shopify-tracker/commit/17ce9a88bdb335075e04e09df6f97d95a2c93f48))
* docker file name ([#52](https://github.com/rudderlabs/rudder-shopify-tracker/issues/52)) ([b20c4b6](https://github.com/rudderlabs/rudder-shopify-tracker/commit/b20c4b617797683cd5281d19a85e13cb32f80be0))
* double product clicked events ([#37](https://github.com/rudderlabs/rudder-shopify-tracker/issues/37)) ([2b8fec3](https://github.com/rudderlabs/rudder-shopify-tracker/commit/2b8fec31f505ea12a98b9637c7c96b869ebcd8b5))
* Fire Product Added Event for multiple add to cart buttons ([48d3446](https://github.com/rudderlabs/rudder-shopify-tracker/commit/48d3446116454c32bbb3c8a9e6f5ceb896591563))
* make deviceModeInit variable as a scope variable ([da329e9](https://github.com/rudderlabs/rudder-shopify-tracker/commit/da329e95790dac3515a9de6ad5a2babdb8f69428))
* product list view and product clicked enhancement ([#38](https://github.com/rudderlabs/rudder-shopify-tracker/issues/38)) ([103620b](https://github.com/rudderlabs/rudder-shopify-tracker/commit/103620b775e2af119198101dc554595afba3bcda)), closes [#39](https://github.com/rudderlabs/rudder-shopify-tracker/issues/39)
* remove extra commit ([99cbeef](https://github.com/rudderlabs/rudder-shopify-tracker/commit/99cbeef4649b3e708053fcf169687d9b7b9a8b84))
* removing anonymousId from cookie ([126a7d8](https://github.com/rudderlabs/rudder-shopify-tracker/commit/126a7d85e857e4e70b50a358b30032f4ef01e2fa))
* replace replaceAll() with regex ([c99122e](https://github.com/rudderlabs/rudder-shopify-tracker/commit/c99122e46241b02f85eaaf156643296358ff119c))
* reset analytics when user logs out to reset cache  ([#35](https://github.com/rudderlabs/rudder-shopify-tracker/issues/35)) ([b241815](https://github.com/rudderlabs/rudder-shopify-tracker/commit/b2418156f844bab9005a5dad92082ee39488a809))
* sending cart object in identifier event ([6a55175](https://github.com/rudderlabs/rudder-shopify-tracker/commit/6a55175040b9e2d5f40ab2ac2ffb97dbf6e1e56a))
* sku value to be non amalgamated, depends on variant ([#24](https://github.com/rudderlabs/rudder-shopify-tracker/issues/24)) ([b3c051f](https://github.com/rudderlabs/rudder-shopify-tracker/commit/b3c051fc44d4a2a2c701e45801a8f69ed3d59ad5))
* stringify product_id before using in sku ([#27](https://github.com/rudderlabs/rudder-shopify-tracker/issues/27)) ([e9626d6](https://github.com/rudderlabs/rudder-shopify-tracker/commit/e9626d6ef602a23b9170cb0d260bae4882856f3e))
