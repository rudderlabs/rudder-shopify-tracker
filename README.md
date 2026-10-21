<p align="center">
  <a href="https://rudderstack.com/">
    <img src="https://user-images.githubusercontent.com/59817155/121357083-1c571300-c94f-11eb-8cc7-ce6df13855c9.png">
  </a>
</p>

<p align="center"><b>The Customer Data Platform for Developers</b></p>

<p align="center">
  <b>
    <a href="https://rudderstack.com">Website</a>
    ·
    <a href="https://www.rudderstack.com/docs/stream-sources/shopify/">Documentation</a>
    ·
    <a href="https://rudderstack.com/join-rudderstack-slack-community">Community Slack</a>
  </b>
</p>

---

# Rudder Tracking Script for RudderStack app on Shopify

This application lets you connect your Shopify store with RudderStack. Use it to track event-level data from Shopify and send it to your preferred tooling platforms via RudderStack.

## Overview

This repo is a component of RudderStack Shopify App (https://github.com/rudderlabs/rudderstack-shopify-app). The shoppify-app node server makes a request to this server with dataplane url and writekey. This server returns a wrapper on top of our js-sdk for client-side tracking for the shopify stores.

### Get Started

This is simple node server with koa router. Steps to run locally:

1. `npm install`
2. `npm run start`

## How to bump the runtime

`.nvmrc` holds the one Node version. CI installs Node from it. To move to a new Node patch:

1. Set the version in `.nvmrc`.
2. Set the same version in the `FROM node:` line of `Dockerfile`, with the new tag and its index digest. Resolve the digest with `docker buildx imagetools inspect node:<version>-alpine<alpine-version>`.
3. Set `engines.node` in `package.json` and in the root package entry of `package-lock.json`.
4. Run `npm run check:node-version`. It fails when one of these places differs from `.nvmrc`.

Dependabot bumps the `FROM` line, but not `.nvmrc` or `engines.node`. Its Node PR fails the check until you update both. The image build also fails when the Node binary in the image differs from `.nvmrc`. `scripts/image-smoke.sh <image>` runs a built image and checks the Node version, the user and the trust store.

## Features

It is a smart tracking script which inserts into the Shopify store pages, and allows client-side tracking. Please note, this works in conjunction to the above-mentioned RudderStack Shopify App.

<!-- ## Getting started
### Pre-requisites
1. shopify-cli installed in local <br>
2. Login to shopify account using `shopify login` <br>

To run the app locally, following are the steps:<br>
1. npm install <br>
2. Add .env with the `DB` credentials, `SHOPIFY_API_SECRET`, `SHOPIFY_API_KEY`, `BUGSNAG_KEY` and set `MODE=local`
3. shopify app serve<br> -->

<!-- ## Contribute -->

<!-- We would love to see you contribute to RudderStack Shopify app. Get more information on how to contribute [**here**](CONTRIBUTING.md). -->

<!-- ## License -->

<!-- The RudderStack Shopify app is released under the [**MIT License**](https://opensource.org/licenses/MIT). -->
