# <picture><source media="(prefers-color-scheme: dark)" srcset="https://github.com/prose-im/prose-app-web/assets/1451907/8e6c83c6-26a0-4505-9561-50a9c97bf236" /><img src="https://github.com/prose-im/prose-app-web/assets/1451907/dd3f7cb4-b156-4ecc-a15f-744dea259e27" alt="prose-app-web" width="150" height="60" /></picture>

[![Test and Lint](https://github.com/prose-im/prose-app-web/actions/workflows/test.yml/badge.svg?branch=master)](https://github.com/prose-im/prose-app-web/actions/workflows/test.yml) [![Build and Release](https://github.com/prose-im/prose-app-web/actions/workflows/build.yml/badge.svg)](https://github.com/prose-im/prose-app-web/actions/workflows/build.yml) [![Bundle and Publish](https://github.com/prose-im/prose-app-web/actions/workflows/bundle.yml/badge.svg)](https://github.com/prose-im/prose-app-web/actions/workflows/bundle.yml) [![GitHub Release](https://img.shields.io/github/v/release/prose-im/prose-app-web.svg)](https://github.com/prose-im/prose-app-web/releases)

**Prose Web application. Built in TypeScript / VueJS / WebAssembly.**

The Prose project was originally announced in a blog post: [Introducing Prose, Decentralized Team Messaging in an Era of Centralized SaaS](https://prose.org/blog/introducing-prose/). This project is the Web implementation of the Prose app.

Copyright 2025, Prose Foundation - Released under the [Mozilla Public License 2.0](./LICENSE.md).

_Tested at NodeJS version: `v20.18.2`_

## Quick Setup

### Docker image

A Docker image containing a production build of the Prose Web app is available on Docker Hub as [proseim/prose-app-web](https://hub.docker.com/r/proseim/prose-app-web/). It contains all required assets and listens as a HTTP server serving those assets with the proper rules.

**First, pull the `proseim/prose-app-web` image:**

```bash
docker pull proseim/prose-app-web:latest
```

**Then, run it:**

```bash
docker run --rm -p 8080:8080 proseim/prose-app-web
```

That's it, your Prose Web app should now be available at: [http://localhost:8080](http://localhost:8080/)

### Manual build

If you prefer to make your own build, first make sure your build environment has NodeJS version `12` and above.

Then, execute those commands:

```bash
npm install
npm run build
```

The built files will be available in the `dist/` directory. The content of this directory need to be copied to your Web server and served from a root URL.

## Architecture

The Prose Web app consists mostly of VueJS views, bound to core libraries, namely the [client](https://github.com/prose-im/prose-core-client) and [views](https://github.com/prose-im/prose-core-views) cores, that are common to all platforms Prose runs on.

The app uses the core client library to connect to XMPP. It calls programmatic methods in order to interact with its internal database and the network. It binds as well to an event bus to receive network events, or update events from the store. Messages are shown in their own view, which is provided by the core views library.

This decoupling makes things extremely clean, and enables common code sharing between platforms (eg. Web, macOS, iOS, etc.).

## Build

_👉 This builds Prose for use in a Web browser._

Building the Prose Web app is done per-target environment. Please check below for build instructions based on your target environment.

### Production target

To build Prose for a production environment (with all optimizations, meaning the build will be slower), hit:

```bash
npm run build
```

The production build expects the XMPP domain you will connect to through Prose to expose its alternative connection endpoints (ie. WebSocket or/and BOSH) through [XEP-0156: Discovering Alternative XMPP Connection Methods](https://xmpp.org/extensions/xep-0156.html), so make sure the `host-meta` file is properly added to your domain (served over HTTPS).

### Development target

_👉 Before you start, please make sure that a local `prose-pod-server` ([repository](https://github.com/prose-im/prose-pod-server)) is running on your development machine. Configurations for your local server can be sourced from `prose-pod-system` ([repository](https://github.com/prose-im/prose-pod-system))._

> [!TIP]
> You may follow our usage guide on [how to start a local Prose Pod](https://github.com/prose-im/prose-pod-system/blob/master/USAGE.md) setup. This will start a self-contained Prose Pod with all required components (the XMPP server and the Prose API).

#### 📦 Develop with a release core (default)

To build Prose for a development environment (that is, a live development server streaming changes live), hit:

```bash
npm run dev
```

#### 🔬 Develop with a local core (advanced)

##### ⚙️ Client core

If it is desired to build against a local `prose-core-client` ([repository](https://github.com/prose-im/prose-core-client)) containing a built `prose-sdk-js` package, you may pass a `PROSE_CORE_CLIENT_PATH` environment variable with the relative path to the core client library:

```bash
PROSE_CORE_CLIENT_PATH="../prose-core-client" npm run dev
```

On a second terminal, you may also watch for changes in the `prose-core-client` repository:

```bash
find crates bindings/prose-sdk-js/src Cargo.toml | entr -r cargo xtask wasm-pack build --dev
```

Any change happening in the core will trigger a compilation run, which itself will trigger a HMR event in the Web app (this may reload the whole app).

##### 💬 Views core

If you would like to source a local `prose-core-views` ([repository](https://github.com/prose-im/prose-core-views)) build, you may pass a `PROSE_CORE_VIEWS_PATH` environment variable with the relative path to the core views library:

```bash
PROSE_CORE_VIEWS_PATH="../prose-core-views" npm run dev
```

## Bundle

_👉 This bundles Prose for use as a standalone application (macOS, Windows, etc.)._

Prose can be bundled into a native-like application using [Tauri](https://tauri.app/), which uses the target system default Web renderer. The benefit of Tauri over eg. Electron, is that the resulting bundled application size is kept small (Tauri's overhead is about 600KB).

### Production bundle

To bundle Prose as a final production application, run:

```bash
npm run bundle build
```

### Development bundle

To bundle Prose as a development application (with Hot Module Replacement), run:

```bash
npm run bundle dev
```

### Bundle cross-compilation

When you run a Prose bundle job, it will produce a binary for your current platform only. That is, if you bundle from macOS then you will get a macOS binary.

Fortunately, it is possible to build binaries for other platforms from macOS and Linux systems: eg. you can build a Windows binary from macOS.

#### 🏹 Bundle for Windows (from macOS)

To bundle Prose for Windows targets from macOS, first, make sure to install the following:

```bash
# Install Homebrew dependencies
brew install llvm cmake ninja nasm

# Add Rust compiler target and install Rust dependencies
rustup target add x86_64-pc-windows-msvc
cargo install --locked cargo-xwin
```

Then, build the application bundle:

```bash
npm run bundle build -- --runner cargo-xwin --target x86_64-pc-windows-msvc
```

## Design

![Prose main view](https://github.com/prose-im/prose-app-web/assets/1451907/624bcf38-7406-4194-9aba-924144b6a675)
![Prose profile modal](https://github.com/prose-im/prose-app-web/assets/1451907/e930929b-2fee-4566-86b5-a1b104b39c03)
![Prose login screen](https://github.com/prose-im/prose-app-web/assets/1451907/92af0399-b74a-4321-b66a-a9a64d56b783)

_👉 The Prose Web app reference design [can be found there](https://github.com/prose-im/prose-medley/blob/master/designs/app/prose-app-web.sketch)._

## Updates

As Prose is still being developed, update videos can be found on the Prose blog, month by month:

- 🎥 [Prose Development Update: November 2023](https://prose.org/blog/prose-development-update-november-2023/)

## License

Licensing information can be found in the [LICENSE.md](./LICENSE.md) document.

## :fire: Report A Vulnerability

If you find a vulnerability in any Prose system, you are more than welcome to report it directly to Prose Security by sending an encrypted email to [security@prose.org](mailto:security@prose.org). Do not report vulnerabilities in public GitHub issues, as they may be exploited by malicious people to target production systems running an unpatched version.

**:warning: You must encrypt your email using Prose Security GPG public key: [:key:57A5B260.pub.asc](https://files.prose.org/public/keys/gpg/57A5B260.pub.asc).**
