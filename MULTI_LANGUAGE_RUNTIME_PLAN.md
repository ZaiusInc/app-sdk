# OCP Multi-Language Runtime Architecture Plan

## Executive Summary

This document outlines a plan to extend OCP (Optimizely Connect Platform) to support apps built in multiple languages (.NET, Python, etc.) in addition to the current Node.js-only support. The core insight is to decouple the Anduin gRPC server (which handles communication with Edoras) from the app execution runtime, using HTTP/JSON as a universal protocol between Anduin and language-specific app processes.

---

## Current Architecture

### Component Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              External Caller (Edoras)                    │
│                                     │                                    │
│                              gRPC (anduin.proto)                         │
└─────────────────────────────────────┬────────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼────────────────────────────────────┐
│                           ANDUIN (Node.js Runtime)                       │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ AnduinServer (gRPC Server)                                         │  │
│  │   - Receives gRPC calls (Install, Webhook, Channel, Job, etc.)     │  │
│  │   - Translates gRPC → internal format                              │  │
│  │   - Dispatches to WorkerPool                                       │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                      │                                   │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Worker Pool (Node.js child_process.fork)                           │  │
│  │   - Workers communicate via process.send() / process.on('message') │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                      │                                   │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Worker Entry Point (entry.ts)                                      │  │
│  │   - Receives Init/Run messages                                     │  │
│  │   - Creates appropriate TaskWorker based on TaskType               │  │
│  │   - Lifecycle, Job, Webhook, Channel, Destination, Source, etc.    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                      │                                   │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ TaskWorker subclasses                                              │  │
│  │   - Uses Runtime.fromJson() to deserialize app manifest            │  │
│  │   - Uses dynamic import() to load app code:                        │  │
│  │       runtime.getLifecycleClass() → import('lifecycle/Lifecycle')  │  │
│  │       runtime.getJobClass(name) → import('jobs/{entry_point}')     │  │
│  │   - Instantiates app class with `new` operator                     │  │
│  │   - Calls methods (onInstall, perform, etc.)                       │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                              APP CODE (Developer's App)                  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Uses app-sdk:                                                      │  │
│  │   - Extends Job, Lifecycle, Function, Channel, Destination, etc.   │  │
│  │   - Uses storage.kvStore, storage.settings                         │  │
│  │   - Uses logger, jobs.trigger(), functions.invoke()                │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Uses node-sdk:                                                     │  │
│  │   - odp.event(), odp.customer(), odp.graphql()                     │  │
│  │   - Schema management, lists, identifiers                          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Node.js Tight Coupling Points

| Component | Coupling Point | Why it's Node-specific |
|-----------|----------------|------------------------|
| **Runtime.ts** | `import()` dynamic imports | Uses Node.js ES module resolution |
| **Runtime.ts** | `readFileSync`, `glob.sync` | Node.js fs APIs |
| **entry.ts** | `process.on('message')` | Node.js IPC mechanism |
| **TaskWorker.ts** | `process.send()` | Node.js IPC mechanism |
| **SarnGebir.ts** | `child_process.fork()` | Node.js process model |
| **All Workers** | Class instantiation with `new` | JavaScript class semantics |
| **app-sdk** | Class inheritance (`extends Job`) | JavaScript OOP |
| **app-sdk** | `Promise`, async/await | JavaScript async model |
| **node-sdk** | `fetch` API, `Headers` | Node.js HTTP primitives |

### Current app.yml Structure (Config-driven, framework-specific)

```yaml
meta:
  app_id: my_app
  display_name: My App
  version: 1.0.0
  runtime: node22

functions:
  my_webhook:
    entry_point: MyWebhook  # Must match exported class name exactly
    description: Handles incoming webhooks

jobs:
  sync_data:
    entry_point: SyncDataJob  # Coupled to file/class naming conventions
    description: Syncs data periodically
    cron: "0 * * * *"

lifecycle:
  # Implicitly expects lifecycle/Lifecycle.ts exporting Lifecycle class
```

**Problems with current approach:**
- Forces developers to know framework internals
- File and class naming conventions are rigid
- `entry_point` is framework-specific (JavaScript module/class names)
- Runtime uses `import()` which only works for JavaScript

---

## Proposed Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Edoras (Caller)                                │
│                                     │                                       │
│                         anduin.proto (UNCHANGED)                            │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ANDUIN gRPC Server (KEEP AS-IS in Node.js)               │
│                                                                             │
│   AnduinServer.ts - still implements IAnduinServer                          │
│   - performWebhook, install, submitForm, channelDeliver, etc.               │
│                                                                             │
│   RuntimeManager:                                                           │
│     - Reads manifest to determine runtime (node22, python312, dotnet8)      │
│     - Spawns appropriate app process                                        │
│     - Creates AppClient to communicate with app                             │
│                                                                             │
│   AppClient (HTTP client):                                                  │
│     - POST http://localhost:9000/lifecycle/onInstall                        │
│     - POST http://localhost:9000/function/my_webhook                        │
│     - POST http://localhost:9000/job/sync_data/prepare                      │
│                                                                             │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                        ┌─────────────┴───────────────┐
                        │   Based on manifest         │
                        │   runtime: node22|py|dotnet │
                        │─────────────────────────────│
                        ▼                             ▼
        ┌───────────────────────────┐   ┌───────────────────────────┐
        │  runtime: node22          │   │  runtime: python312       │
        │                           │   │                           │
        │  Node.js app process      │   │  Python app process       │
        │  - SDK starts HTTP server │   │  - SDK starts HTTP server │
        │  - Registers handlers     │   │  - Registers handlers     │
        │  - Handles requests       │   │  - Handles requests       │
        └───────────────────────────┘   └───────────────────────────┘
```

### Key Design Decisions

#### 1. Keep Anduin gRPC Server in Node.js

- `anduin.proto` interface to Edoras remains unchanged
- No disruption to infrastructure (Kubernetes, monitoring, etc.)
- Anduin becomes an orchestrator, not an executor

#### 2. HTTP/JSON for Anduin ↔ App Communication

Why HTTP/JSON over alternatives:
- **vs gRPC:** Every language has HTTP servers, no code generation needed
- **vs stdin/stdout:** HTTP handles concurrent requests naturally
- **vs Unix sockets:** HTTP is more debuggable and portable

#### 3. SDK-Driven Registration (No entry_point in config)

Instead of declaring entrypoints in `app.yml`, apps register handlers with the SDK at startup.

**New app.yml (simplified):**

```yaml
meta:
  app_id: my_app
  display_name: My App
  version: 1.0.0
  runtime: python312  # or node22, dotnet8

functions:
  my_webhook:
    description: Handles incoming webhooks
    # No entry_point!

jobs:
  sync_data:
    description: Syncs data periodically
    cron: "0 * * * *"
    # No entry_point!

channel:
  type: email

outbound_domains:
  - api.example.com
```

---

## HTTP Protocol Specification

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check, returns `{"status": "ready"}` |
| `/lifecycle/{method}` | POST | Invoke lifecycle method (onInstall, onUninstall, etc.) |
| `/function/{name}` | POST | Invoke a registered function |
| `/job/{name}/prepare` | POST | Call job's prepare method |
| `/job/{name}/perform` | POST | Call job's perform method |
| `/channel/{method}` | POST | Invoke channel method (ready, deliver, etc.) |
| `/destination/{name}/{method}` | POST | Invoke destination method |
| `/source/{name}/{method}` | POST | Invoke source method |

### Request Format

All POST requests include:

```json
{
  "payload": { ... },
  "context": {
    "tracker_id": "abc123",
    "install_id": "12345",
    "request_id": "req-uuid",
    "vault_token": "...",
    "aws_credentials": {
      "access_key_id": "...",
      "secret_access_key": "...",
      "session_token": "..."
    },
    "target_product": "ODP",
    "account": {
      "instance_id": "...",
      "organization_id": "..."
    }
  }
}
```

### Response Format

Responses are JSON matching the expected return types for each method.

**Lifecycle response:**
```json
{
  "success": true,
  "message": "optional message",
  "retryable": false
}
```

**Function response:**
```json
{
  "status": 200,
  "headers": [["Content-Type", "application/json"]],
  "body": "base64-encoded-body"
}
```

**Job status response:**
```json
{
  "state": { "cursor": 100 },
  "complete": false
}
```

---

## Implementation Details

### Anduin Changes

#### AppClient.ts

```typescript
class AppClient {
  constructor(private baseUrl: string) {}

  async invokeLifecycle(method: string, payload: any, context: SDKContext): Promise<LifecycleResult> {
    const response = await fetch(`${this.baseUrl}/lifecycle/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, context })
    });
    return response.json();
  }

  async invokeFunction(name: string, request: RequestPayload, context: SDKContext): Promise<ResponsePayload> {
    const response = await fetch(`${this.baseUrl}/function/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request, context })
    });
    return response.json();
  }

  async invokeJob(name: string, method: 'prepare' | 'perform', payload: any, context: SDKContext): Promise<JobStatus> {
    const response = await fetch(`${this.baseUrl}/job/${name}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, context })
    });
    return response.json();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

#### RuntimeManager.ts

```typescript
class RuntimeManager {
  private appClient: AppClient;
  private appProcess: ChildProcess;

  async start(manifest: AppManifest, appDir: string) {
    const port = 9000; // or find available port

    switch (manifest.runtime) {
      case 'node22':
        this.appProcess = spawn('node', [`${appDir}/dist/app.js`], {
          env: { ...process.env, OCP_PORT: String(port) }
        });
        break;
      case 'python312':
        this.appProcess = spawn('python', [`${appDir}/app.py`], {
          env: { ...process.env, OCP_PORT: String(port) }
        });
        break;
      case 'dotnet8':
        this.appProcess = spawn('dotnet', ['run', '--project', appDir], {
          env: { ...process.env, OCP_PORT: String(port) }
        });
        break;
    }

    this.appClient = new AppClient(`http://localhost:${port}`);
    await this.waitForHealth();
  }

  private async waitForHealth() {
    for (let i = 0; i < 30; i++) {
      if (await this.appClient.healthCheck()) return;
      await sleep(100);
    }
    throw new Error('App failed to start');
  }

  get client(): AppClient {
    return this.appClient;
  }
}
```

---

## SDK Implementations

### Node.js SDK (app-sdk v4)

```typescript
// @zaiusinc/app-sdk

import express from 'express';

type FunctionHandler = (request: Request) => Promise<Response>;
type JobHandler = {
  prepare: (params: any, previousStatus?: JobStatus, resuming?: boolean) => Promise<JobStatus>;
  perform: (status: JobStatus) => Promise<JobStatus>;
};
type LifecycleHandler = {
  onInstall?: () => Promise<LifecycleResult>;
  onUninstall?: () => Promise<LifecycleResult>;
  onUpgrade?: (fromVersion: string) => Promise<LifecycleResult>;
  onSettingsForm?: (section: string, action: string, formData: any) => Promise<LifecycleSettingsResult>;
  // ... other lifecycle methods
};

class OCPApp {
  private functions = new Map<string, FunctionHandler>();
  private jobs = new Map<string, JobHandler>();
  private lifecycleHandler: LifecycleHandler | null = null;

  function(name: string, handler: FunctionHandler) {
    this.functions.set(name, handler);
    return this;
  }

  job(name: string, handler: JobHandler) {
    this.jobs.set(name, handler);
    return this;
  }

  lifecycle(handler: LifecycleHandler) {
    this.lifecycleHandler = handler;
    return this;
  }

  async start() {
    const port = parseInt(process.env.OCP_PORT || '9000');

    const server = express();
    server.use(express.json({ limit: '50mb' }));

    server.get('/health', (req, res) => res.json({ status: 'ready' }));

    server.post('/lifecycle/:method', async (req, res) => {
      const { method } = req.params;
      const { payload, context } = req.body;

      configureSDKContext(context);

      const handler = this.lifecycleHandler?.[method as keyof LifecycleHandler];
      if (!handler) {
        return res.status(404).json({ error: `No handler for ${method}` });
      }

      try {
        const result = await handler(payload);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    server.post('/function/:name', async (req, res) => {
      const { name } = req.params;
      const { request, context } = req.body;

      configureSDKContext(context);

      const handler = this.functions.get(name);
      if (!handler) {
        return res.status(404).json({ error: `No function ${name}` });
      }

      try {
        const result = await handler(new Request(request));
        res.json(result.toPayload());
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    server.post('/job/:name/:method', async (req, res) => {
      const { name, method } = req.params;
      const { payload, context } = req.body;

      configureSDKContext(context);

      const handler = this.jobs.get(name);
      if (!handler) {
        return res.status(404).json({ error: `No job ${name}` });
      }

      try {
        const result = method === 'prepare'
          ? await handler.prepare(payload.params, payload.previousStatus, payload.resuming)
          : await handler.perform(payload.status);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    server.listen(port, () => {
      console.log(`OCP App listening on port ${port}`);
    });
  }
}

export const app = new OCPApp();
```

#### Developer's Node.js App

```typescript
// app.ts
import { app, Response, JobStatus } from '@zaiusinc/app-sdk';
import { odp } from '@zaiusinc/node-sdk';

// Register function handlers
app.function('my_webhook', async (request) => {
  const body = await request.json();

  await odp.event({
    type: 'webhook_received',
    identifiers: { email: body.email },
    data: { source: 'my_app' }
  });

  return Response.ok({ received: true });
});

// Register job handlers
app.job('sync_data', {
  async prepare(params, previousStatus, resuming) {
    if (resuming && previousStatus) {
      return previousStatus;
    }
    return { state: { cursor: 0, total: 0 }, complete: false };
  },

  async perform(status) {
    const cursor = status.state.cursor;

    // Fetch and process data...
    const processed = await processNextBatch(cursor);

    return {
      state: { cursor: cursor + processed, total: status.state.total + processed },
      complete: processed === 0
    };
  }
});

// Register lifecycle handlers
app.lifecycle({
  async onInstall() {
    // Set up initial schema, etc.
    return { success: true };
  },

  async onUninstall() {
    // Clean up resources
    return { success: true };
  },

  async onSettingsForm(section, action, formData) {
    // Handle settings form submission
    await storage.settings.put(section, formData);
    return LifecycleSettingsResult.ok();
  }
});

// Start the app
app.start();
```

---

### Python SDK (ocp-sdk-py)

```python
# ocp_sdk/app.py

from flask import Flask, request, jsonify
from functools import wraps
import os
from typing import Callable, Dict, Any, Optional
from dataclasses import dataclass, asdict

@dataclass
class JobStatus:
    state: Dict[str, Any]
    complete: bool

@dataclass
class LifecycleResult:
    success: bool
    message: Optional[str] = None
    retryable: bool = False

@dataclass
class Response:
    status: int
    headers: Dict[str, str]
    body: bytes

    @classmethod
    def ok(cls, data: Any) -> 'Response':
        import json
        return cls(
            status=200,
            headers={'Content-Type': 'application/json'},
            body=json.dumps(data).encode()
        )

    def to_dict(self) -> Dict:
        return {
            'status': self.status,
            'headers': list(self.headers.items()),
            'body': self.body.decode() if self.body else None
        }


class OCPApp:
    def __init__(self):
        self._functions: Dict[str, Callable] = {}
        self._jobs: Dict[str, Any] = {}
        self._lifecycle = None
        self._flask = Flask(__name__)
        self._setup_routes()

    def function(self, name: str):
        """Decorator to register a function handler"""
        def decorator(fn: Callable):
            self._functions[name] = fn
            return fn
        return decorator

    def job(self, name: str):
        """Decorator to register a job handler class"""
        def decorator(cls):
            self._jobs[name] = cls()
            return cls
        return decorator

    def lifecycle(self, cls):
        """Decorator to register lifecycle handler class"""
        self._lifecycle = cls()
        return cls

    def _setup_routes(self):
        @self._flask.get('/health')
        def health():
            return jsonify({'status': 'ready'})

        @self._flask.post('/lifecycle/<method>')
        def lifecycle_handler(method: str):
            data = request.json
            self._configure_context(data.get('context', {}))

            if not self._lifecycle:
                return jsonify({'error': 'No lifecycle handler registered'}), 404

            handler = getattr(self._lifecycle, method, None)
            if not handler:
                return jsonify({'error': f'No handler for {method}'}), 404

            try:
                result = handler(data.get('payload'))
                if isinstance(result, LifecycleResult):
                    return jsonify(asdict(result))
                return jsonify(result)
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self._flask.post('/function/<name>')
        def function_handler(name: str):
            data = request.json
            self._configure_context(data.get('context', {}))

            handler = self._functions.get(name)
            if not handler:
                return jsonify({'error': f'No function {name}'}), 404

            try:
                req = Request(data['request'])
                result = handler(req)
                return jsonify(result.to_dict())
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self._flask.post('/job/<name>/<method>')
        def job_handler(name: str, method: str):
            data = request.json
            self._configure_context(data.get('context', {}))

            job = self._jobs.get(name)
            if not job:
                return jsonify({'error': f'No job {name}'}), 404

            try:
                payload = data.get('payload', {})
                if method == 'prepare':
                    result = job.prepare(
                        payload.get('params', {}),
                        payload.get('previousStatus'),
                        payload.get('resuming', False)
                    )
                else:
                    result = job.perform(payload.get('status', {}))

                if isinstance(result, JobStatus):
                    return jsonify(asdict(result))
                return jsonify(result)
            except Exception as e:
                return jsonify({'error': str(e)}), 500

    def _configure_context(self, context: Dict[str, Any]):
        """Configure SDK globals with request context"""
        from . import storage, logger
        storage._configure(context)
        logger._configure(context)

    def start(self):
        """Start the HTTP server"""
        port = int(os.environ.get('OCP_PORT', '9000'))
        self._flask.run(host='0.0.0.0', port=port)


# Module-level app instance
app = OCPApp()
```

#### Developer's Python App

```python
# app.py
from ocp_sdk import app, Response, JobStatus, LifecycleResult
from ocp_sdk import odp, storage, logger

@app.function('my_webhook')
def handle_webhook(request):
    body = request.json()

    odp.event({
        'type': 'webhook_received',
        'identifiers': {'email': body['email']},
        'data': {'source': 'my_app'}
    })

    return Response.ok({'received': True})


@app.job('sync_data')
class SyncDataJob:
    def prepare(self, params, previous_status, resuming):
        if resuming and previous_status:
            return previous_status
        return JobStatus(state={'cursor': 0, 'total': 0}, complete=False)

    def perform(self, status):
        cursor = status['state']['cursor']

        # Fetch and process data...
        processed = self._process_next_batch(cursor)

        return JobStatus(
            state={'cursor': cursor + processed, 'total': status['state']['total'] + processed},
            complete=processed == 0
        )

    def _process_next_batch(self, cursor):
        # Implementation...
        return 100


@app.lifecycle
class Lifecycle:
    def on_install(self, payload):
        logger.info('Installing app...')
        return LifecycleResult(success=True)

    def on_uninstall(self, payload):
        logger.info('Uninstalling app...')
        return LifecycleResult(success=True)

    def on_settings_form(self, payload):
        section = payload['section']
        form_data = payload['formData']
        storage.settings.put(section, form_data)
        return {'errors': {}, 'toasts': []}


if __name__ == '__main__':
    app.start()
```

---

### .NET SDK (OCP.SDK)

```csharp
// OCP.SDK/OCPApp.cs

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;

namespace OCP.SDK
{
    public delegate Task<Response> FunctionHandler(Request request);

    public interface IJob
    {
        Task<JobStatus> PrepareAsync(Dictionary<string, object> parameters, JobStatus? previousStatus, bool resuming);
        Task<JobStatus> PerformAsync(JobStatus status);
    }

    public interface ILifecycle
    {
        Task<LifecycleResult> OnInstallAsync();
        Task<LifecycleResult> OnUninstallAsync();
        Task<LifecycleResult> OnUpgradeAsync(string fromVersion);
        Task<LifecycleSettingsResult> OnSettingsFormAsync(string section, string action, Dictionary<string, object> formData);
    }

    public class OCPApp
    {
        private readonly Dictionary<string, FunctionHandler> _functions = new();
        private readonly Dictionary<string, IJob> _jobs = new();
        private ILifecycle? _lifecycle;

        public OCPApp Function(string name, FunctionHandler handler)
        {
            _functions[name] = handler;
            return this;
        }

        public OCPApp Job(string name, IJob job)
        {
            _jobs[name] = job;
            return this;
        }

        public OCPApp Lifecycle(ILifecycle lifecycle)
        {
            _lifecycle = lifecycle;
            return this;
        }

        public async Task StartAsync()
        {
            var port = Environment.GetEnvironmentVariable("OCP_PORT") ?? "9000";
            var builder = WebApplication.CreateBuilder();
            var app = builder.Build();

            app.MapGet("/health", () => Results.Json(new { status = "ready" }));

            app.MapPost("/lifecycle/{method}", async (string method, HttpContext ctx) =>
            {
                var body = await JsonSerializer.DeserializeAsync<RequestBody>(ctx.Request.Body);
                ConfigureContext(body?.Context);

                if (_lifecycle == null)
                    return Results.NotFound(new { error = "No lifecycle handler" });

                var result = method switch
                {
                    "onInstall" => await _lifecycle.OnInstallAsync(),
                    "onUninstall" => await _lifecycle.OnUninstallAsync(),
                    _ => throw new NotImplementedException($"Method {method} not implemented")
                };

                return Results.Json(result);
            });

            app.MapPost("/function/{name}", async (string name, HttpContext ctx) =>
            {
                var body = await JsonSerializer.DeserializeAsync<RequestBody>(ctx.Request.Body);
                ConfigureContext(body?.Context);

                if (!_functions.TryGetValue(name, out var handler))
                    return Results.NotFound(new { error = $"No function {name}" });

                var request = new Request(body?.Request);
                var response = await handler(request);
                return Results.Json(response.ToPayload());
            });

            app.MapPost("/job/{name}/{method}", async (string name, string method, HttpContext ctx) =>
            {
                var body = await JsonSerializer.DeserializeAsync<RequestBody>(ctx.Request.Body);
                ConfigureContext(body?.Context);

                if (!_jobs.TryGetValue(name, out var job))
                    return Results.NotFound(new { error = $"No job {name}" });

                var payload = body?.Payload;
                var result = method == "prepare"
                    ? await job.PrepareAsync(payload?.Params, payload?.PreviousStatus, payload?.Resuming ?? false)
                    : await job.PerformAsync(payload?.Status);

                return Results.Json(result);
            });

            await app.RunAsync($"http://0.0.0.0:{port}");
        }

        private void ConfigureContext(SDKContext? context)
        {
            if (context != null)
            {
                Storage.Configure(context);
                Logger.Configure(context);
            }
        }
    }
}
```

#### Developer's .NET App

```csharp
// Program.cs
using OCP.SDK;

var app = new OCPApp();

app.Function("my_webhook", async (request) =>
{
    var body = await request.ReadJsonAsync<WebhookPayload>();

    await ODP.Event(new
    {
        type = "webhook_received",
        identifiers = new { email = body.Email },
        data = new { source = "my_app" }
    });

    return Response.Ok(new { received = true });
});

app.Job("sync_data", new SyncDataJob());

app.Lifecycle(new AppLifecycle());

await app.StartAsync();

// SyncDataJob.cs
public class SyncDataJob : IJob
{
    public Task<JobStatus> PrepareAsync(Dictionary<string, object> parameters, JobStatus? previousStatus, bool resuming)
    {
        if (resuming && previousStatus != null)
            return Task.FromResult(previousStatus);

        return Task.FromResult(new JobStatus
        {
            State = new Dictionary<string, object> { ["cursor"] = 0, ["total"] = 0 },
            Complete = false
        });
    }

    public async Task<JobStatus> PerformAsync(JobStatus status)
    {
        var cursor = (int)status.State["cursor"];
        var processed = await ProcessNextBatchAsync(cursor);

        return new JobStatus
        {
            State = new Dictionary<string, object>
            {
                ["cursor"] = cursor + processed,
                ["total"] = (int)status.State["total"] + processed
            },
            Complete = processed == 0
        };
    }

    private Task<int> ProcessNextBatchAsync(int cursor) => Task.FromResult(100);
}

// AppLifecycle.cs
public class AppLifecycle : ILifecycle
{
    public Task<LifecycleResult> OnInstallAsync()
    {
        Logger.Info("Installing app...");
        return Task.FromResult(new LifecycleResult { Success = true });
    }

    public Task<LifecycleResult> OnUninstallAsync()
    {
        Logger.Info("Uninstalling app...");
        return Task.FromResult(new LifecycleResult { Success = true });
    }

    // ... other lifecycle methods
}
```

---

## Migration Path

### For Existing Node.js Apps

**No changes required.** The new architecture is backward compatible:

1. Anduin detects `runtime: node22` in manifest
2. For existing apps without SDK registration, falls back to current behavior (fork + import)
3. New apps can adopt SDK registration pattern

### Gradual Migration

```yaml
# Phase 1: Existing app, no changes
runtime: node22
functions:
  webhook:
    entry_point: WebhookHandler  # Still works

# Phase 2: Migrated app, SDK registration
runtime: node22
functions:
  webhook:
    description: Handles webhooks
    # No entry_point - uses SDK registration

# Phase 3: New Python app
runtime: python312
functions:
  webhook:
    description: Handles webhooks
```

---

## Implementation Roadmap

### Phase 1: Define Contracts
- [ ] Finalize HTTP protocol specification
- [ ] Define JSON schemas for all request/response types
- [ ] Document SDK interface requirements

### Phase 2: Node.js SDK v4
- [ ] Implement new `OCPApp` class with registration pattern
- [ ] Add HTTP server infrastructure
- [ ] Maintain backward compatibility with existing apps
- [ ] Update documentation and examples

### Phase 3: Anduin Changes
- [ ] Implement `RuntimeManager`
- [ ] Implement `AppClient`
- [ ] Add runtime detection from manifest
- [ ] Keep existing worker pool for backward compatibility

### Phase 4: Python SDK
- [ ] Implement `ocp-sdk-py` package
- [ ] Port ODP client (`odp-sdk-py`)
- [ ] Create Python app template
- [ ] Write documentation and examples

### Phase 5: .NET SDK
- [ ] Implement `OCP.SDK` NuGet package
- [ ] Port ODP client
- [ ] Create .NET app template
- [ ] Write documentation and examples

---

## Open Questions

1. **Streaming responses:** Current webhook handler uses gRPC streaming for large responses. How to handle in HTTP?
   - Option A: Chunked transfer encoding
   - Option B: Temporary file + URL
   - Option C: Keep streaming via separate mechanism

2. **Job execution:** Jobs are currently run as separate processes. Should they:
   - Run in the same app process (simpler)
   - Spawn as separate processes (current behavior, better isolation)

3. **Local development:** How does `ocp test` work with new architecture?
   - SDK includes built-in test server
   - Same HTTP interface, mock context

4. **Secrets/credentials:** How are AWS credentials and vault tokens passed?
   - Currently via worker config
   - New: Passed in request context, SDK configures internally

---

## Appendix: File Structure Examples

### Node.js App (New Pattern)

```
my-app/
├── app.yml
├── package.json
├── tsconfig.json
├── src/
│   ├── app.ts              # Main entry, registers handlers
│   ├── handlers/
│   │   ├── webhook.ts      # Function handlers
│   │   └── sync-job.ts     # Job handlers
│   └── lifecycle.ts        # Lifecycle handlers
└── dist/
    └── app.js              # Compiled entry point
```

### Python App

```
my-app/
├── app.yml
├── requirements.txt
├── app.py                  # Main entry, registers handlers
├── handlers/
│   ├── webhook.py
│   └── sync_job.py
└── lifecycle.py
```

### .NET App

```
my-app/
├── app.yml
├── MyApp.csproj
├── Program.cs              # Main entry, registers handlers
├── Handlers/
│   ├── WebhookHandler.cs
│   └── SyncDataJob.cs
└── AppLifecycle.cs
```
