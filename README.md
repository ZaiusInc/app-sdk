# App SDK
The App SDK includes helpers and interfaces for apps running on the Optimizely Connect Platform (OCP).

## Documentation
Developer documentation can be found in the [OCP Developer Docs](https://optimizely-parent.readme.io/optimizely-connect-platform/docs).

See the generated [Technical Documentation](https://optimizely-parent.readme.io/optimizely-connect-platform/docs/app-sdk-api-reference-overview) for details on every method and interface.

## Getting Started

From the Opti CLI, generate a new app with `opti app init`. This will
scaffold your app and install the dependencies, including this SDK.

## The Basics

OCP Apps are built on the Node platform supporting the modern conveniences of Node 18 and Typescript. Following the best practices with Typescript will ensure more stable integrations with fewer bugs.

OCP Apps are required to follow conventions outlined in the developer docs. They are composed of:
* .env - environment secrets that are published securely with an app
* app.yml - A description of an app and it's abilities and requirements
* forms/ - Yaml based forms that generate UIs for customer interactions
* src/channel - Chanel-based app implementation
* src/functions/ - Webhooks for receiving data and serving content
* src/jobs/ - Scheduled and triggered jobs to handle long running/recurring tasks
* src/lifecycle/ - Handler for lifecycle actions (install/uninstall/oauth/submitting settings updates)
* src/liquid-extension - Extensions for dynamic campaign content (powered by Shopify Liquid)
* src/schema - Custom fields and relations required to be installed with an app

Apps are run in an isolated environment and to avoid data leaking/polution across accounts, each process of an App will only handle a single request at a time. However 10s to 100s of processes could be running simultaneously so you must take care to avoid race conditions when interacting with external storage and APIs.

See the [OCP Developer Docs](https://optimizely-parent.readme.io/optimizely-connect-platform/docs) for code examples and other details.
