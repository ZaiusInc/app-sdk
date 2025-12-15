# OCP Multi-Language Runtime Architecture Plan

## Executive Summary

This document outlines a plan to extend OCP (Optimizely Connect Platform) to support apps built in multiple languages (.NET, Python, etc.) in addition to the current Node.js-only support. The core approach is to decouple the Anduin gRPC server from the app execution runtime, using a Lambda-style executor model with stdin/stdout communication.

### Hackday Scope

**In Scope:**
- Multi-language runtime support (Node.js, Python, .NET)
- Lambda-style executor model (spawn process, keep warm, handle multiple requests)
- stdin/stdout or HTTP communication between Anduin and app processes
- Process pooling for warm starts

**Out of Scope (Future Work):**
- Removing `entry_point` from app.yml
- SDK registration pattern changes
- Changing how developers structure their apps

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
| **node-sdk** | `fetch` API, `Headers` | Node.js HTTP primitives |

---

## Proposed Architecture

### High-Level Design (Lambda-Style Executor Model)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              Edoras (Caller)                             │
│                                     │                                    │
│                         anduin.proto (UNCHANGED)                         │
└─────────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    ANDUIN gRPC Server (Node.js - unchanged)              │
│                                                                          │
│   AnduinServer.ts - still implements IAnduinServer                       │
│   - performWebhook, install, submitForm, channelDeliver, etc.            │
│                                                                          │
│   ┌────────────────────────────────────────────────────────────────────┐ │
│   │ RuntimeManager (NEW)                                               │ │
│   │   - Reads manifest to determine runtime (node22, python312, etc.)  │ │
│   │   - Manages process pool per app+version+runtime                   │ │
│   │   - Handles warm starts and cold starts                            │ │
│   └────────────────────────────────────────────────────────────────────┘ │
│                                      │                                   │
│   ┌────────────────────────────────────────────────────────────────────┐ │
│   │ Executor Pool                                                      │ │
│   │                                                                    │ │
│   │   my_app@1.0.0:node22     → [proc1, proc2] (warm, waiting)         │ │
│   │   my_app@1.0.0:python312  → [proc1] (warm, waiting)                │ │
│   │   other_app@2.0.0:dotnet8 → [proc1, proc2] (warm, waiting)         │ │
│   │                                                                    │ │
│   └────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────┬───────────────────────────────────┘
                                       │
                         stdin/stdout (JSON messages)
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│ Node.js Process │         │ Python Process  │         │ .NET Process    │
│                 │         │                 │         │                 │
│ INIT (once):    │         │ INIT (once):    │         │ INIT (once):    │
│ - Load app code │         │ - Load app code │         │ - Load app code │
│ - Signal ready  │         │ - Signal ready  │         │ - Signal ready  │
│                 │         │                 │         │                 │
│ EXECUTE (loop): │         │ EXECUTE (loop): │         │ EXECUTE (loop): │
│ - Read request  │         │ - Read request  │         │ - Read request  │
│ - Set context   │         │ - Set context   │         │ - Set context   │
│ - Route/execute │         │ - Route/execute │         │ - Route/execute │
│ - Write response│         │ - Write response│         │ - Write response│
│ - Wait for next │         │ - Wait for next │         │ - Wait for next │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

### Key Design Decisions

#### 1. Keep Anduin gRPC Server in Node.js (Unchanged)

- `anduin.proto` interface to Edoras remains unchanged
- No disruption to infrastructure (Kubernetes, monitoring, etc.)
- Anduin becomes an orchestrator, not an executor for non-Node runtimes

#### 2. Lambda-Style Process Model

Like AWS Lambda:
- **Cold start**: Spawn process → Load app → Initialize → Ready
- **Warm invocation**: Reuse existing process → Execute → Return
- **Idle timeout**: Kill process after N minutes of inactivity

This provides:
- Fast warm invocations (~1-10ms)
- Process isolation between apps
- Request-scoped context isolation (same process can serve different install_ids)

#### 3. Stdin/Stdout Communication (Simple & Universal)

Every language can read stdin and write stdout. No special dependencies required.

```
Anduin                              App Process
   │                                     │
   │──── {"type":"init",...} ──────────▶│
   │                                     │ Load code, initialize SDK
   │◀─── {"status":"ready"} ────────────│
   │                                     │
   │──── {"type":"request",...} ───────▶│
   │                                     │ Execute handler
   │◀─── {"type":"response",...} ───────│
   │                                     │
   │──── {"type":"request",...} ───────▶│ (another request, same process)
   │◀─── {"type":"response",...} ───────│
   │                                     │
   │──── {"type":"shutdown"} ──────────▶│ (idle timeout)
   │                                     │ Exit gracefully
```

---

## Communication Protocol

### Message Format (JSON Lines - one JSON object per line)

#### Init Message (Anduin → App)

```json
{
  "type": "init",
  "appDir": "/path/to/app",
  "manifest": { /* parsed app.yml */ }
}
```

#### Ready Message (App → Anduin)

```json
{
  "type": "ready",
  "status": "ok"
}
```

#### Request Message (Anduin → App)

```json
{
  "type": "request",
  "id": "req-uuid-123",
  "taskType": "lifecycle",
  "task": "onInstall",
  "payload": { /* task-specific payload */ },
  "context": {
    "trackerId": "abc123",
    "installId": "12345",
    "requestId": "req-uuid",
    "vaultToken": "...",
    "awsCredentials": {
      "accessKeyId": "...",
      "secretAccessKey": "...",
      "sessionToken": "..."
    },
    "targetProduct": "ODP"
  }
}
```

#### Response Message (App → Anduin)

```json
{
  "type": "response",
  "id": "req-uuid-123",
  "success": true,
  "result": { /* task-specific result */ }
}
```

Or on error:

```json
{
  "type": "response",
  "id": "req-uuid-123",
  "success": false,
  "error": "Error message here"
}
```

#### Shutdown Message (Anduin → App)

```json
{
  "type": "shutdown"
}
```

---

## Implementation Details

### Anduin Changes

#### RuntimeManager.ts (New)

```typescript
import { spawn, ChildProcess } from 'child_process';
import { AppManifest } from '@zaiusinc/app-sdk';

interface Executor {
  process: ChildProcess;
  busy: boolean;
  lastUsed: number;
}

interface ExecutorPool {
  [key: string]: Executor[]; // key: "appId@version:runtime"
}

class RuntimeManager {
  private pools: ExecutorPool = {};
  private readonly idleTimeoutMs = 5 * 60 * 1000; // 5 minutes

  async execute(
    manifest: AppManifest,
    appDir: string,
    taskType: string,
    task: string,
    payload: any,
    context: SDKContext
  ): Promise<any> {
    const poolKey = `${manifest.meta.app_id}@${manifest.meta.version}:${manifest.runtime}`;

    // Get or create executor
    const executor = await this.getExecutor(poolKey, manifest, appDir);

    try {
      executor.busy = true;
      const result = await this.sendRequest(executor, {
        type: 'request',
        id: crypto.randomUUID(),
        taskType,
        task,
        payload,
        context
      });
      return result;
    } finally {
      executor.busy = false;
      executor.lastUsed = Date.now();
    }
  }

  private async getExecutor(poolKey: string, manifest: AppManifest, appDir: string): Promise<Executor> {
    // Try to find an available warm executor
    const pool = this.pools[poolKey] || [];
    const available = pool.find(e => !e.busy);

    if (available) {
      return available;
    }

    // Cold start: spawn new process
    const executor = await this.spawnExecutor(manifest, appDir);

    if (!this.pools[poolKey]) {
      this.pools[poolKey] = [];
    }
    this.pools[poolKey].push(executor);

    return executor;
  }

  private async spawnExecutor(manifest: AppManifest, appDir: string): Promise<Executor> {
    const cmd = this.getCommand(manifest.runtime, appDir);

    const proc = spawn(cmd.command, cmd.args, {
      cwd: appDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    const executor: Executor = {
      process: proc,
      busy: false,
      lastUsed: Date.now()
    };

    // Send init message
    await this.sendMessage(executor, {
      type: 'init',
      appDir,
      manifest
    });

    // Wait for ready
    const ready = await this.readMessage(executor);
    if (ready.type !== 'ready' || ready.status !== 'ok') {
      throw new Error('Executor failed to initialize');
    }

    return executor;
  }

  private getCommand(runtime: string, appDir: string): { command: string, args: string[] } {
    switch (runtime) {
      case 'node22':
        return { command: 'node', args: [`${appDir}/dist/executor.js`] };
      case 'python312':
        return { command: 'python', args: [`${appDir}/executor.py`] };
      case 'dotnet8':
        return { command: 'dotnet', args: ['run', '--project', appDir, '--', 'executor'] };
      default:
        throw new Error(`Unknown runtime: ${runtime}`);
    }
  }

  private sendMessage(executor: Executor, message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const line = JSON.stringify(message) + '\n';
      executor.process.stdin!.write(line, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private readMessage(executor: Executor): Promise<any> {
    return new Promise((resolve, reject) => {
      let buffer = '';

      const onData = (chunk: Buffer) => {
        buffer += chunk.toString();
        const newlineIndex = buffer.indexOf('\n');
        if (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          executor.process.stdout!.off('data', onData);
          try {
            resolve(JSON.parse(line));
          } catch (e) {
            reject(new Error(`Invalid JSON: ${line}`));
          }
        }
      };

      executor.process.stdout!.on('data', onData);
    });
  }

  private async sendRequest(executor: Executor, request: any): Promise<any> {
    await this.sendMessage(executor, request);
    const response = await this.readMessage(executor);

    if (!response.success) {
      throw new Error(response.error);
    }

    return response.result;
  }

  // Clean up idle executors periodically
  startIdleCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, pool] of Object.entries(this.pools)) {
        this.pools[key] = pool.filter(executor => {
          if (!executor.busy && (now - executor.lastUsed) > this.idleTimeoutMs) {
            this.sendMessage(executor, { type: 'shutdown' }).catch(() => {});
            executor.process.kill();
            return false;
          }
          return true;
        });
      }
    }, 60 * 1000); // Check every minute
  }
}

export const runtimeManager = new RuntimeManager();
```

### Python Executor Example

```python
#!/usr/bin/env python3
# executor.py - Entry point for Python OCP apps

import sys
import json
import importlib.util
from typing import Any, Dict

class Executor:
    def __init__(self):
        self.app_module = None
        self.manifest = None
        self.lifecycle_class = None
        self.function_classes = {}
        self.job_classes = {}

    def initialize(self, app_dir: str, manifest: Dict[str, Any]):
        self.manifest = manifest

        # Load lifecycle class
        lifecycle_path = f"{app_dir}/lifecycle/Lifecycle.py"
        self.lifecycle_class = self._load_class(lifecycle_path, "Lifecycle")

        # Load function classes
        if 'functions' in manifest:
            for name, config in manifest['functions'].items():
                entry_point = config['entry_point']
                path = f"{app_dir}/functions/{entry_point}.py"
                self.function_classes[name] = self._load_class(path, entry_point)

        # Load job classes
        if 'jobs' in manifest:
            for name, config in manifest['jobs'].items():
                entry_point = config['entry_point']
                path = f"{app_dir}/jobs/{entry_point}.py"
                self.job_classes[name] = self._load_class(path, entry_point)

    def _load_class(self, path: str, class_name: str):
        spec = importlib.util.spec_from_file_location(class_name, path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return getattr(module, class_name)

    def execute(self, task_type: str, task: str, payload: Any, context: Dict[str, Any]) -> Any:
        # Configure SDK context
        from ocp_sdk import _configure_context
        _configure_context(context)

        if task_type == 'lifecycle':
            instance = self.lifecycle_class()
            method = getattr(instance, task)
            return method(payload) if payload else method()

        elif task_type == 'function':
            cls = self.function_classes[task]
            from ocp_sdk import Request
            request = Request(payload)
            instance = cls(request)
            response = instance.perform()
            return response.to_dict()

        elif task_type == 'job':
            cls = self.job_classes[task]
            # Handle prepare vs perform
            if payload.get('method') == 'prepare':
                instance = cls(payload['invocation'])
                return instance.prepare(
                    payload.get('params', {}),
                    payload.get('previousStatus'),
                    payload.get('resuming', False)
                )
            else:
                instance = cls(payload['invocation'])
                return instance.perform(payload['status'])

        else:
            raise ValueError(f"Unknown task type: {task_type}")


def main():
    executor = Executor()

    for line in sys.stdin:
        try:
            message = json.loads(line.strip())

            if message['type'] == 'init':
                executor.initialize(message['appDir'], message['manifest'])
                print(json.dumps({'type': 'ready', 'status': 'ok'}))
                sys.stdout.flush()

            elif message['type'] == 'request':
                try:
                    result = executor.execute(
                        message['taskType'],
                        message['task'],
                        message.get('payload'),
                        message['context']
                    )
                    print(json.dumps({
                        'type': 'response',
                        'id': message['id'],
                        'success': True,
                        'result': result
                    }))
                except Exception as e:
                    print(json.dumps({
                        'type': 'response',
                        'id': message['id'],
                        'success': False,
                        'error': str(e)
                    }))
                sys.stdout.flush()

            elif message['type'] == 'shutdown':
                break

        except Exception as e:
            print(json.dumps({'type': 'error', 'error': str(e)}), file=sys.stderr)
            sys.stderr.flush()


if __name__ == '__main__':
    main()
```

### .NET Executor Example

```csharp
// Executor.cs - Entry point for .NET OCP apps
using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;

namespace OCP.Runtime
{
    public class Executor
    {
        private Dictionary<string, Type> _lifecycleTypes = new();
        private Dictionary<string, Type> _functionTypes = new();
        private Dictionary<string, Type> _jobTypes = new();
        private Assembly _appAssembly;

        public void Initialize(string appDir, JsonElement manifest)
        {
            // Load the app assembly
            var dllPath = Path.Combine(appDir, "bin", "Debug", "net8.0", "App.dll");
            _appAssembly = Assembly.LoadFrom(dllPath);

            // Find Lifecycle class
            _lifecycleTypes["Lifecycle"] = _appAssembly.GetType("Lifecycle")!;

            // Find function classes
            if (manifest.TryGetProperty("functions", out var functions))
            {
                foreach (var func in functions.EnumerateObject())
                {
                    var entryPoint = func.Value.GetProperty("entry_point").GetString()!;
                    _functionTypes[func.Name] = _appAssembly.GetType(entryPoint)!;
                }
            }

            // Find job classes
            if (manifest.TryGetProperty("jobs", out var jobs))
            {
                foreach (var job in jobs.EnumerateObject())
                {
                    var entryPoint = job.Value.GetProperty("entry_point").GetString()!;
                    _jobTypes[job.Name] = _appAssembly.GetType(entryPoint)!;
                }
            }
        }

        public async Task<object> ExecuteAsync(string taskType, string task, JsonElement? payload, JsonElement context)
        {
            // Configure SDK context
            SDK.Context.Configure(context);

            return taskType switch
            {
                "lifecycle" => await ExecuteLifecycleAsync(task, payload),
                "function" => await ExecuteFunctionAsync(task, payload),
                "job" => await ExecuteJobAsync(task, payload),
                _ => throw new ArgumentException($"Unknown task type: {taskType}")
            };
        }

        private async Task<object> ExecuteLifecycleAsync(string method, JsonElement? payload)
        {
            var type = _lifecycleTypes["Lifecycle"];
            var instance = Activator.CreateInstance(type)!;
            var methodInfo = type.GetMethod(method)!;

            var result = methodInfo.Invoke(instance, payload.HasValue ? new object[] { payload } : null);
            if (result is Task task)
            {
                await task;
                return ((dynamic)task).Result;
            }
            return result!;
        }

        private async Task<object> ExecuteFunctionAsync(string name, JsonElement? payload)
        {
            var type = _functionTypes[name];
            var request = new SDK.Request(payload!.Value);
            var instance = Activator.CreateInstance(type, request)!;
            var method = type.GetMethod("Perform")!;

            var result = method.Invoke(instance, null);
            if (result is Task<SDK.Response> task)
            {
                var response = await task;
                return response.ToDict();
            }
            return ((SDK.Response)result!).ToDict();
        }

        private async Task<object> ExecuteJobAsync(string name, JsonElement? payload)
        {
            var type = _jobTypes[name];
            var invocation = payload!.Value.GetProperty("invocation");
            var instance = Activator.CreateInstance(type, new SDK.JobInvocation(invocation))!;

            if (payload.Value.GetProperty("method").GetString() == "prepare")
            {
                var method = type.GetMethod("Prepare")!;
                var result = method.Invoke(instance, new object[] {
                    payload.Value.GetProperty("params"),
                    payload.Value.TryGetProperty("previousStatus", out var ps) ? ps : null,
                    payload.Value.TryGetProperty("resuming", out var r) && r.GetBoolean()
                });
                if (result is Task task)
                {
                    await task;
                    return ((dynamic)task).Result;
                }
                return result!;
            }
            else
            {
                var method = type.GetMethod("Perform")!;
                var result = method.Invoke(instance, new object[] { payload.Value.GetProperty("status") });
                if (result is Task task)
                {
                    await task;
                    return ((dynamic)task).Result;
                }
                return result!;
            }
        }
    }

    public class Program
    {
        public static async Task Main(string[] args)
        {
            var executor = new Executor();

            using var reader = new StreamReader(Console.OpenStandardInput());
            using var writer = new StreamWriter(Console.OpenStandardOutput()) { AutoFlush = true };

            string? line;
            while ((line = await reader.ReadLineAsync()) != null)
            {
                try
                {
                    var message = JsonSerializer.Deserialize<JsonElement>(line);
                    var type = message.GetProperty("type").GetString();

                    if (type == "init")
                    {
                        var appDir = message.GetProperty("appDir").GetString()!;
                        var manifest = message.GetProperty("manifest");
                        executor.Initialize(appDir, manifest);
                        await writer.WriteLineAsync(JsonSerializer.Serialize(new { type = "ready", status = "ok" }));
                    }
                    else if (type == "request")
                    {
                        var id = message.GetProperty("id").GetString();
                        try
                        {
                            var result = await executor.ExecuteAsync(
                                message.GetProperty("taskType").GetString()!,
                                message.GetProperty("task").GetString()!,
                                message.TryGetProperty("payload", out var p) ? p : null,
                                message.GetProperty("context")
                            );
                            await writer.WriteLineAsync(JsonSerializer.Serialize(new {
                                type = "response",
                                id,
                                success = true,
                                result
                            }));
                        }
                        catch (Exception e)
                        {
                            await writer.WriteLineAsync(JsonSerializer.Serialize(new {
                                type = "response",
                                id,
                                success = false,
                                error = e.Message
                            }));
                        }
                    }
                    else if (type == "shutdown")
                    {
                        break;
                    }
                }
                catch (Exception e)
                {
                    Console.Error.WriteLine(JsonSerializer.Serialize(new { type = "error", error = e.Message }));
                }
            }
        }
    }
}
```

---

## SDK Requirements for Each Language

Each language SDK needs to provide:

### 1. Base Classes (matching current app-sdk patterns)

| Node.js (current) | Python | .NET |
|-------------------|--------|------|
| `class Lifecycle` | `class Lifecycle` | `class Lifecycle` |
| `class Function` | `class Function` | `class Function` |
| `class Job` | `class Job` | `class Job` |
| `class Channel` | `class Channel` | `class Channel` |
| `class Destination` | `class Destination` | `class Destination` |

### 2. Request/Response Types

- `Request` - HTTP request wrapper
- `Response` - HTTP response builder
- `JobStatus`, `JobInvocation`
- `LifecycleResult`, `LifecycleSettingsResult`

### 3. SDK Services (context-aware)

- `storage.kvStore` - Key-value storage
- `storage.settings` - Settings storage
- `logger` - Logging
- `jobs.trigger()` - Trigger jobs
- `functions.invoke()` - Invoke functions

### 4. ODP Client (node-sdk equivalent)

- `odp.event()` - Send events
- `odp.customer()` - Update customers
- `odp.graphql()` - GraphQL queries
- Schema, identifiers, lists APIs

---

## App Structure (Unchanged)

The developer experience remains the same. App structure is identical:

```
my-python-app/
├── app.yml                    # runtime: python312
├── requirements.txt
├── lifecycle/
│   └── Lifecycle.py           # class Lifecycle
├── functions/
│   └── MyWebhook.py           # class MyWebhook(Function)
├── jobs/
│   └── SyncJob.py             # class SyncJob(Job)
└── executor.py                # Entry point (provided by SDK)
```

```yaml
# app.yml
meta:
  app_id: my_python_app
  version: 1.0.0
  runtime: python312          # <-- Only change: new runtime value

functions:
  my_webhook:
    entry_point: MyWebhook    # Still uses entry_point
    description: Handles webhooks

jobs:
  sync_job:
    entry_point: SyncJob      # Still uses entry_point
    description: Syncs data
```

---

## Build-Time Optimization Strategy

The key to achieving fast cold starts is performing heavy compilation and optimization at **build time** rather than runtime. The OCP builder should automatically apply runtime-specific optimizations.

### Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BUILD TIME (Slow is OK)                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  • Compile to native code (AOT)                                     │    │
│  │  • Tree-shake unused dependencies                                   │    │
│  │  • Pre-compile bytecode                                             │    │
│  │  • Bundle into single executable                                    │    │
│  │  • Optimize for target architecture                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RUNTIME (Must be fast)                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  • Spawn process (~5-10ms)                                          │    │
│  │  • Load pre-compiled binary (~10-50ms)                              │    │
│  │  • Initialize SDK context (~1-5ms)                                  │    │
│  │  • Ready to serve requests                                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### .NET Build Optimizations

#### Native AOT (Ahead-of-Time Compilation) - Recommended

The builder should publish .NET apps with Native AOT for fastest cold starts:

```bash
# Builder executes this during app packaging
dotnet publish -c Release -r linux-x64 \
  --self-contained true \
  -p:PublishAot=true \
  -p:StripSymbols=true
```

**Required .csproj settings** (SDK template should include):

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <PublishAot>true</PublishAot>
    <StripSymbols>true</StripSymbols>
    <OptimizationPreference>Speed</OptimizationPreference>
    <IlcOptimizationPreference>Speed</IlcOptimizationPreference>
  </PropertyGroup>
</Project>
```

**Cold start comparison:**

| Build Mode | Binary Size | Cold Start |
|------------|-------------|------------|
| Default (JIT) | ~80MB (with runtime) | 500ms - 2s |
| ReadyToRun | ~100MB | 100-300ms |
| Native AOT | ~15-30MB | **10-50ms** |

#### Fallback: ReadyToRun (R2R)

For apps that can't use AOT (reflection-heavy, dynamic code):

```bash
dotnet publish -c Release -r linux-x64 \
  --self-contained true \
  -p:PublishReadyToRun=true \
  -p:PublishSingleFile=true \
  -p:PublishTrimmed=true
```

### Python Build Optimizations

#### Option 1: Bytecode Pre-compilation (Simple, Dev-friendly)

```bash
# Builder compiles all .py files to .pyc
python -OO -m compileall -b app/

# Results in:
# app/
# ├── app.pyc          # Optimized bytecode
# ├── handlers/
# │   ├── webhook.pyc
# │   └── sync_job.pyc
```

**Flags:**
- `-O`: Basic optimization (removes assert statements)
- `-OO`: Aggressive optimization (also removes docstrings)
- `-b`: Write .pyc files alongside .py files

#### Option 2: Nuitka Compilation (Recommended for Production)

Compiles Python to C, then to native binary:

```bash
# Builder uses Nuitka to create native executable
python -m nuitka \
  --standalone \
  --onefile \
  --python-flag=no_site \
  --python-flag=no_warnings \
  --remove-output \
  executor.py
```

**Cold start comparison:**

| Build Mode | Size | Cold Start |
|------------|------|------------|
| Default interpreter | Source + deps | 300ms - 1s |
| Bytecode (.pyc) | ~Same | 200-500ms |
| Nuitka (native) | ~30-50MB | **50-150ms** |

#### Option 3: PyInstaller (Alternative)

```bash
pyinstaller --onefile --clean executor.py
```

Less optimized than Nuitka but simpler to set up.

### Node.js Build Optimizations

Node.js is already reasonably fast, but we can still optimize:

```bash
# Bundle with esbuild for single-file output
npx esbuild src/executor.ts \
  --bundle \
  --platform=node \
  --target=node22 \
  --minify \
  --outfile=dist/executor.js

# Or use pkg to create native executable (optional)
npx pkg dist/executor.js --target node22-linux-x64 --output executor
```

**Cold start comparison:**

| Build Mode | Cold Start |
|------------|------------|
| Default (node dist/executor.js) | 100-300ms |
| Bundled (esbuild) | 50-150ms |
| Native (pkg) | 30-100ms |

### Builder Integration (zap-build)

The OCP builder uses Dockerfiles per runtime. New runtimes need their own directories in `zap-build/`:

```
zap-build/
├── build.rb              # Main build orchestrator
├── Dockerfile            # Builder image
├── node22/               # Existing Node.js runtime
│   ├── Dockerfile
│   ├── dependencies.json
│   └── runtime/
│       └── app/src/      # Anduin entry point (current pattern)
│
├── python312/            # NEW: Python runtime
│   ├── Dockerfile
│   ├── dependencies.json
│   └── runtime/
│       └── executor.py   # Stdin/stdout executor (injected at build)
│
└── dotnet8/              # NEW: .NET runtime
    ├── Dockerfile
    ├── dependencies.json
    └── runtime/
        └── Executor.cs   # Stdin/stdout executor (injected at build)
```

The executor files are **internal implementation details** - app developers never see or interact with them. They're injected into the app container during the build process, similar to how `anduin` is injected into Node.js apps today.

**Future consideration:** These executors could be extracted into separate runtime repos (e.g., `ocp-runtime-python`, `ocp-runtime-dotnet`) if they grow in complexity or need independent versioning.

#### build.rb Changes

Update `SUPPORTED_RUNTIMES` in `build.rb`:

```ruby
SUPPORTED_RUNTIMES = %w[node12 node18 node18_rt node22 python312 dotnet8].freeze
```

#### Python 3.12 Dockerfile (`python312/Dockerfile`)

```dockerfile
#==============================================================================
# Build stage - compile and optimize
#==============================================================================
FROM python:3.12-alpine as builder

ARG zaiusinc_ocp_sdk
ARG zaiusinc_odp_sdk

WORKDIR /app
COPY app .

# Install build dependencies
RUN apk add --no-cache gcc musl-dev python3-dev

# Install app dependencies
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir \
  ocp-sdk==${zaiusinc_ocp_sdk} \
  odp-sdk==${zaiusinc_odp_sdk}

# Copy runtime executor (provided by SDK)
COPY runtime/executor.py /app/executor.py

# Pre-compile bytecode for faster startup
RUN python -OO -m compileall -b /app

# Run tests
RUN python -m pytest tests/ || true

#==============================================================================
# Production stage - minimal runtime
#==============================================================================
FROM python:3.12-alpine

WORKDIR /app

# Copy compiled bytecode and dependencies
COPY --from=builder /app /app
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages

RUN addgroup -g 1001 app && \
  adduser -u 1001 -G app -s /bin/sh -H -D app && \
  chown -R app:app /app

USER app

# Apps started via stdin/stdout executor
ENTRYPOINT ["python", "-OO", "/app/executor.pyc"]
```

#### .NET 8 Dockerfile (`dotnet8/Dockerfile`)

```dockerfile
#==============================================================================
# Build stage - Native AOT compilation
#==============================================================================
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine as builder

ARG zaiusinc_ocp_sdk
ARG zaiusinc_odp_sdk

WORKDIR /app
COPY app .

# Install AOT prerequisites
RUN apk add --no-cache clang build-base zlib-dev

# Add OCP SDK packages
RUN dotnet add package OCP.SDK --version ${zaiusinc_ocp_sdk}
RUN dotnet add package ODP.SDK --version ${zaiusinc_odp_sdk}

# Copy runtime executor (provided by SDK)
COPY runtime/Executor.cs /app/Executor.cs

# Build with Native AOT for fastest cold start
RUN dotnet publish -c Release -r linux-musl-x64 \
  --self-contained true \
  -p:PublishAot=true \
  -p:StripSymbols=true \
  -p:OptimizationPreference=Speed \
  -o /app/publish

# Run tests before final build
RUN dotnet test --configuration Release || true

#==============================================================================
# Production stage - minimal runtime (no .NET runtime needed!)
#==============================================================================
FROM alpine:3.20

WORKDIR /app

# Native AOT binary has no runtime dependencies except libc
RUN apk add --no-cache libstdc++ libgcc

COPY --from=builder /app/publish/App /app/executor

RUN addgroup -g 1001 app && \
  adduser -u 1001 -G app -s /bin/sh -H -D app && \
  chown -R app:app /app

USER app

# Native executable - no runtime needed!
ENTRYPOINT ["/app/executor"]
```

#### Dependencies Configuration

**python312/dependencies.json:**
```json
{
  "ocp-sdk": {
    "1": { "stable": "1.0.0", "rc": "1.0.0" }
  },
  "odp-sdk": {
    "1": { "stable": "1.0.0", "rc": "1.0.0" }
  }
}
```

**dotnet8/dependencies.json:**
```json
{
  "OCP.SDK": {
    "1": { "stable": "1.0.0", "rc": "1.0.0" }
  },
  "ODP.SDK": {
    "1": { "stable": "1.0.0", "rc": "1.0.0" }
  }
}
```

#### Key Differences from Node.js Builder

| Aspect | Node.js | Python | .NET |
|--------|---------|--------|------|
| Base image | node:22-alpine | python:3.12-alpine | dotnet/sdk:8.0 → alpine |
| Dependencies | yarn add | pip install | dotnet add package |
| Build step | yarn build (TS→JS) | compileall (py→pyc) | dotnet publish (AOT) |
| Final image | node:22-alpine | python:3.12-alpine | alpine (no runtime!) |
| Entrypoint | node dist/index.js | python executor.pyc | ./executor |
| Cold start | 100-300ms | 100-200ms | **10-50ms** |

### Updated RuntimeManager Spawn Commands

After build-time optimization, RuntimeManager spawns pre-compiled binaries:

```typescript
private getCommand(runtime: string, appDir: string): { command: string, args: string[] } {
  switch (runtime) {
    case 'node22':
      // Bundled JS file
      return { command: 'node', args: [`${appDir}/executor.js`] };

    case 'python312':
      // Native executable from Nuitka (or bytecode fallback)
      if (existsSync(`${appDir}/executor`)) {
        return { command: `${appDir}/executor`, args: [] };  // Native executable
      }
      return { command: 'python', args: [`${appDir}/executor.pyc`] };

    case 'dotnet8':
      // Native AOT executable (no dotnet runtime needed!)
      return { command: `${appDir}/executor`, args: [] };

    default:
      throw new Error(`Unknown runtime: ${runtime}`);
  }
}
```

### Expected Cold Start Performance

After build-time optimization:

| Runtime | Default Cold Start | After Optimization | Improvement |
|---------|-------------------|-------------------|-------------|
| Node.js | 100-300ms | 50-150ms | ~2x |
| Python | 300ms-1s | 50-150ms | ~5x |
| .NET | 500ms-2s | 10-50ms | **~20x** |

Combined with process pooling and warm starts:
- **Warm start:** <5ms (reuse existing process)
- **Cold start:** 50-150ms (spawn optimized binary)

### SDK Templates

Each SDK should provide optimized project templates:

**.NET Template (`dotnet new ocp-app`):**
```xml
<PropertyGroup>
  <PublishAot>true</PublishAot>
  <StripSymbols>true</StripSymbols>
  <InvariantGlobalization>true</InvariantGlobalization>
</PropertyGroup>
```

**Python Template (`pyproject.toml`):**
```toml
[tool.nuitka]
standalone = true
onefile = true
python-flag = ["no_site", "no_warnings"]
```

**Node.js Template (`package.json`):**
```json
{
  "scripts": {
    "build": "esbuild src/executor.ts --bundle --platform=node --target=node22 --minify --outfile=dist/executor.js"
  }
}
```

### Runtime Optimization Strategies (Complementary)

In addition to build-time optimizations:

1. **Process Pooling**: Keep warm processes per app+version
2. **Pre-warming**: Spawn processes proactively based on traffic patterns
3. **Init/Execute Separation**: Heavy loading happens once at init, subsequent requests are fast
4. **Idle Timeout Tuning**: Balance memory usage vs cold start frequency

---

## Implementation Roadmap (Hackday)

### Day 1: Core Infrastructure

- [ ] Implement `RuntimeManager` in Anduin
- [ ] Define message protocol (JSON lines over stdin/stdout)
- [ ] Create basic Python executor skeleton
- [ ] Test with simple lifecycle call

### Day 2: Python SDK

- [ ] Implement Python base classes (Lifecycle, Function, Job)
- [ ] Implement context management
- [ ] Implement storage SDK
- [ ] Create sample Python app

### Day 3: Integration & Demo

- [ ] Integrate with Anduin handlers
- [ ] End-to-end test: install, function call, job
- [ ] (Stretch) Basic .NET executor

---

## Open Questions

1. **Stderr handling**: Should app stderr go to Anduin logs or be captured separately?

2. **Large payloads**: For large request/response bodies, should we use temp files instead of stdin/stdout?

3. **Timeouts**: How long to wait for app response before considering it stuck?

4. **Pool sizing**: How many warm processes to keep per app? Configurable?

5. **Existing Node.js apps**: Should they also use this new executor model, or keep current fork+import?
   - Recommendation: Keep current model for Node.js for backward compatibility

---

## Appendix: Comparison with Alternatives

| Approach | Pros | Cons |
|----------|------|------|
| **stdin/stdout (chosen)** | Simple, universal, no ports | Sequential per process |
| **HTTP server per app** | Concurrent, debuggable | Loses isolation, port management |
| **gRPC** | Efficient, typed | Code generation complexity |
| **Unix sockets** | Fast, no ports | Less portable, more complex |
| **Spawn per request** | Full isolation | Cold start every time |
