## App SDK
The App SDK includes helpers and interfaces for apps running on the Optimizely Connect Platform (OCP).

### Get started

The following OCP command-line interface (CLI) command scaffolds your app and installs the dependencies, including this SDK.
```shell
opti app init
```

### The basics

OCP apps are built on the Node platform with support for Node 18 and Typescript. Follow Typescript best practices to ensure more stable integrations with fewer bugs.

OCP apps are required to follow conventions outlined in the developer docs. They are composed of:
* _.env_ – Environment secrets that are published securely with an app.
* _app.yml_ – A description of an app, including its abilities and requirements.
* _forms/_ – YAML-based forms that generate UIs for customer interactions.
* _src/channel_ – Channel-based app implementation.
* _src/functions/_ – Webhooks for receiving data and serving content.
* _src/jobs/_ – Scheduled and triggered jobs to handle long running/recurring tasks.
* _src/lifecycle/_ – Handler for lifecycle actions (install/uninstall/OAuth/submit settings updates).
* _src/liquid-extension_ – Extensions for dynamic campaign content (powered by Shopify Liquid).
* _src/schema_ – Custom fields and relations users are required to install with an app.

Apps are run in an isolated environment and to avoid data leaking/pollution across accounts, each process of an app only handles a single request at a time. However, there can be hundreds of processes running simultaneously, so avoid race conditions when interacting with external storage and APIs.

## Version history

0.x.x - node12 runtime (legacy)

1.0.x - modernization of dependencies and supporting node18

1.1.x - node18 as the default runtime

1.2.x - WARN as the default log level in production and support for overriding default log level

1.3.x - OCP queues (discontinued)

1.4.x - OCP queues related code removed
