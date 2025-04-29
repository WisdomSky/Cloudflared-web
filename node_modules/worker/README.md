# worker.js 🔧
[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] 

A library most strongly suited for facilitating [data parallelism](https://en.wikipedia.org/wiki/Data_parallelism) within a series of orchestrated tasks that run in worker threads. Works with both node.js and the browser (including w/ browserify and webpack) in an abstraction that unifies Worker and Child Process.

### Features
 - Enables the use of *pseudo-Transferable* objects in node.js between threads by using shared memory when available (meaning faster messaging with less overhead when passing large objects).
 - Serializes messages in node.js using the [Structured Clone Algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm), meaning you can pass actual JavaScript objects (not just JSON as is with process.send) between threads.
 - Allows subworkers (i.e., the ability for a worker to spawn its own nested worker) in all enviornments, including a workaround for browsers that do not support it natively.
 - Supports transmitting/receiving *streams* across threads (including special treatment for [File](https://developer.mozilla.org/en-US/docs/Web/API/File) and [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob) in the browser).
 - Compatible with [Browserify](http://browserify.org/) and [webpack](https://webpack.js.org/)

> If running on node.js, requires v8.0.0 or higher (for v8 serializer)


## Contents
-----------
 - [Example](#example)
 - [Intro](#intro)
 - [Documentation](#api-documentation)
 - [Building with browserify or webpack for the browser](#browser)

## Example
----------
Let's take a long list of words, reverse the letters in each word, and then sort that list. Pretty straightforward. Here's a single-threaded way to do it:

*serial.js*:
```js
const fs = require('fs');

// load a few hundred thousand words into an array
let a_words = fs.readFileSync('/usr/share/dict/words', 'utf8').split('\n');

// start the timer
console.time('serially');

// reverse each word, then sort that list
let a_sorted_words_reversed = a_words
    .map(s => s.split('').reverse().join(''))
    .sort((s_a, s_b) => s_a.localeCompare(s_b));

// write to disk
fs.writeFile('out', a_sorted_words_reversed.join('\n'), (e_write) => {
  if(e_write) throw new Error(e_write);

    // stop the timer
    console.timeEnd('serially');
});
```


#### Parallelize
In this scenario, we can save a bit of time by breaking down the transformation into multiple units, and then dividing the workload among multiple cores.

First, we define tasks in *the-worker.js*:
```js
const worker = require('worker');

const F_SORT_ALPHABETICAL = (s_a, s_b) => s_a.localeCompare(s_b);

worker.dedicated({
    // take a list of words and reverse the letters in each word
    reverse_letters(a_list) {
        return a_list.map(s => s.split('').reverse().join(''));
    },

    // take a list of words and sort them alphabetically
    sort(a_list) {
        return a_list.sort(F_SORT_ALPHABETICAL);
    },

    // take two sorted lists of words and merge them in sorted order
    merge(a_list_a, a_list_b) {
        return worker.merge_sorted(a_list_a, a_list_b, F_SORT_ALPHABETICAL);
    },
});
```

Then, we define how to use those tasks in *the-master.js*:
```js
const fs = require('fs');
const worker = require('worker');

// load a few hundred thousand words into an array
let a_words = fs.readFileSync('/usr/share/dict/words', 'utf8').split('\n');

// start the timer
console.time('parallel');

// create a group of workers (size defaults to os.cpus().length)
let k_group = worker.group('./the-worker.js');

// processing pipeline
k_group
    // bind data from our list, dividing array evenly among workers
    .data(a_words)

    // send data to workers and push them thru the first transform
    .map('reverse_letters')

    // as soon as each worker finishes its previous task, forward each result
    //   to a new task in the same thread (keeping data in the same thread)
    .thru('sort')

    // reduce multiple results into a single one
    .reduce('merge').then((a_sorted_words_reversed) => {
        fs.writeFile('out', a_sorted_words_reversed.join('\n'), (e_write) => {
            if(e_write) throw new Error(e_write);

            // stop the timer
            console.timeEnd('parallel');
        });
    });
```

#### Results
This is just a demonstration to show how to use this library, and the results from my machine here shows the potential benefit of dividing such a task:
```
serially: 2328.937ms
parallel: 1355.964ms
```

## Intro
--------

### Data Parallelism
One form of parallelization is to divide a large set of data across multiple processors by spawning workers that run identical code but are assigned different *subsets* of the data.

### Task Parallelism
Another form of parallelization is to assign a different *task* to each processor. An effective approach to parallelism can combine both forms together. With `worker`, you can use [Group](#group) to emply both forms cooperatively (i.e., cores perform data parallelism while individually advancing to the next serial task), in order to maximize use of all available processing power.

### Pseudo-Datatypes:
Throughout this API document, the following datatypes are used to represent expectations imposed on primitive-datatyped parameters to functions, uses of primitives in class methods, and so forth:
 - `key` - a string used for accessing an arbitrary value in a plain object
 - `path` - a string that conforms to an expected syntax (e.g., URL, file path, etc.)
 - `struct` - an interface for a plain object (i.e., one that has expected key names)
 - `hash` - a plain object whose keys are arbitrary (i.e., defined by you, the user)
 - `list` - a one-dimensional array containing only elments of the same type/class
 - `uint` - a non-negative integer
 - `any` - any object or primitive data type **that are serializable via the [Structured Clone Algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)**

## API Documentation
------
 - [Factory](#worker-factory)
 - [Worker](#worker)
 - [Pool](#pool)
 - [Group](#group)
   - [ArmedGroup](#armed-group)
   - [ActiveGroup](#active-group)
   - [TaskResultCallback](#task-result-callback)
 - [WorkerOptions](#worker-options)
 - [EventHash](#event-hash) 
 - [Manifest](#manifest)
 - [Streams](#streams)
 - [TaskHandler](#task-handler)
 - [SharedMemory](#shared-memory)
 - [DivisionStrategies](#division-strategies)
   - [EqualDivisionStrategy](#equal-division-strategy)

<a name="worker-factory" />

### **Factory**
The module's main export is the **Factory**.
`const worker = require('worker');`

**Constructors:**
 - `worker.spawn(source: path[, options: `[`WorkerOptions`](#worker-options)`)` -- spawn a single worker at the given `path`. Additional options can be specified in `options`.
   - **returns** a [new Worker](#worker)
   - *example:*
     ```js
     let k_worker = worker.spawn('./eg.js');
     ```
 - `worker.pool(source: path[, limit: int][, options: `[`WorkerOptions`](#worker-options)`)` -- create a pool that will spawn up to `limit` workers (defaults to number of cores, i.e., `navigator.hardwareConcurrency` or `os.cpus().length`). If `limit` is negative, it indicates how many cores to attempt to reserve (such as `os.cpus().length -1`), but if there are not enough cores, then the final number of workers in the pool will always end up greater than or equal to `1`. Each worker will be spawned from the same source. Additional options for spawning the workers can be specified in `options`.
   - **returns** a [new Pool](#pool)
   - *example:*
     ```js
     let k_pool = worker.pool('./eg.js');
     ```
 - `worker.group(source: path[, count: int][, options: `[`WorkerOptions`](#worker-options)`)` -- create a group (i.e., a cooperative pool) that will spawn up to `count` workers (defaults to number of cores, i.e., `navigator.hardwareConcurrency` or `os.cpus().length`). If `count` is negative, it indicates how many cores to attempt to reserve (such as `os.cpus().length -1`), but if there are not enough cores, then the final number of workers in the group will always end up greater than or equal to `1`. Each worker will be spawned from the same source. Additional options for spawning the workers can be specified in `options`.
   - **returns** a [new Group](#group)
   - *example:*
     ```js
     let k_group = worker.group('./eg.js');
     ```
 - `worker.manifest(args: Array<any>[, transfers: list<Paths>])` -- create an object that encapsulates the serializable objects in `args`, optionally declaring a list of those objects that are (a) instances of stream or (b) [Transferable](#https://developer.mozilla.org/en-US/docs/Web/API/Transferable) (for the browser) or [SharedMemory](#shared-memory) (for node.js). If `transfers` is omitted or `true`, then each item in `args` will be exhaustively searched to find all streams/Transferable/SharedMemory objects. Providing a list of `transfers` spares the extra computation.
   - **returns** a [new Manifest](#manifest)
   - *example:*
     ```js
     let h_album = {
        name: 'pics',
        images: [
            new Uint32Array(800*600),
            new Uint32Array(1024*768),
        ],
     };
     let km_args = worker.manifest([h_album], [
        [0, 'images', 0],  // paths to transferable items
        [0, 'images', 1],
          /* OR */
        [0, 'images'],  // path to container of all transferable items
     ]);
     worker.spawn('./eg.js').run('collage', km_args);
     ```

**Methods:**
 - `worker.dedicated(tasks: hash{name => `[`TaskHandler`](#task-handler)`})` -- declare the current thread as a dedicated worker while passing a *hash* of tasks that associates a task's `name` to its corresponding [TaskHandler](#task-handler).
   - **returns** `undefined`
   - *example:*
     ```js
     // i-am-a-worker.js
     worker.dedicated({
        namedTask1(a_subset) {...},
        namedTask2(a_subset) {...},
        ...
     });
     ```
 - `worker.globals([scope: Object])` -- get and optionally set the identifiers for [SharedMemory](#shared-memory), such as `Uint8ArrayS`.
   - **returns** `scope`, or a new *struct*
   - *example:*
     ```js
     worker.globals(global);  // or `window`, e.g.
     let at_test = new Uint8ArrayS();
     ```
 - `worker.merge_sorted(left: list<any>, right: list<any>[, sort: callback])` -- helper function for merging two sorted lists; useful on the *worker* side.
   - **returns** a `list<any>` that is the sorted combination of `left` and `right`
   - *example:*
     - See [the main example](#example).

<a name="worker" />

### class **Worker**
An abstraction of a [WebWorker](https://developer.mozilla.org/en-US/docs/Web/API/Worker) or [ChildProcess](https://nodejs.org/api/child_process.html#child_process_class_childprocess). Create an instance by using the [Factory](#factory) method `worker.spawn()`.

**Methods:**
 - `.run(taskName: string[, args: Array<any> |`[`Manifest`](#manifest)`[, events: `[`EventHash`](#event-hash)`])` -- run the task given by `taskName` on the worker, optionally passing `args` and `events`. For understanding whether or not you need to create a Manifest object, see the [Manifest](#manifest) documentation.
   - **returns** a [new Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
   - *example:*
     ```js
     async function example() {
        let k_worker = worker.spawn('./eg.js');
        
        // example of a simple call with an arg, using await to get return value
        let x_result_1 = await k_worker.run('factorial', [170]);
        
        // example with event callbacks
        await k_worker.run('examine', [s_latex_doc], {
           paragraph() { ... },
           figure() { ... },
        });
     }
     ```
 - `.kill([signal='SIGTERM': string | uint])` -- terminate the worker, optionally sending a kill `signal` to the child process if running on node.js
   - **returns** a [new Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
   - *example:*
     ```js
     k_worker.kill().then(() => {
        // worker is gone
     });
     ```


<a name="pool" />

### class **Pool**
A pool of [Workers](#worker) for simple task parallelism. Create an instance by using the [Factory](#factory) method `worker.pool()`.

**Methods:**
- `.run(taskName: string[, args: Array<any> |`[`Manifest`](#manifest)`[, events: `[`EventHash`](#event-hash)`])` -- pull a single [Worker](#worker) out of the pool and assign it this task, or queue this task if all workers in the pool are busy.
   - **returns** a [new Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- `.start()` -- starts a new point in the queue from which to wait until all further queued tasks will complete
   - **returns** `undefined`
- `.stop()` -- wait until all previously queued tasks (starting at the *start* point and ending here) have completed. This also implicitly calls `.start()`, resetting the start point to here.
   - **returns** a [new Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
 - `.kill([signal='SIGTERM': string | uint])` -- terminate all workers in the pool, optionally sending a kill `signal` to the child process if running on node.js.
   - **returns** a [new Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
 
*Example:*
```js
let k_pool = worker.pool('./eg.js', 3);

// start a task on one worker
k_pool.run('render');

// a series of tasks is about to be queued
k_pool.start();

// start several more tasks as workers become available
a_downloads.forEach(async (p_url) => {
    let d_blob = await k_pool.run('download', [p_url]);
    download_complete(p_url, d_blob);
});

// as soon as the last download is done, start uploading
k_pool.stop().then(() => {
    k_pool.run('upload');
});
```


<a name="group" />

### class **Group**
A group is a cooperative pool of [Workers](#worker) that are spawned from the same source. Create an instance of this class by using the [Factory](#factory) method `worker.group()`.

**Methods:**
 - `.data(items: Array[, strategy: DivisionStrategy])` -- divide `items` into multiple *subsets* using the [EqualDivisionStrategy](#equal-division-strategy) by default, or by specifying a different `strategy`.
   - **returns** a [new ArmedGroup](#armed-group)
 - `.use(subsets: list<any>)` -- assign each item in `subsets` to a worker. The length of `subsets` must be less than or equal to the number of workers in this group.
   - **returns** a [new ArmedGroup](#armed-group)
 - `.wait` -- declare an event listener, or a list of events that should be triggered consequently, for the given event(s)
   - *...*`(lock|s: string|list<string>, unlocked: callback)` -- calls `unlocked` once the event named `lock`, or each and every event listed in `locks`, is triggered.
   - *...*`(lock|s: string|list<string>, dependency|ies: string|list<string>)` -- triggers the event named `dependency`, or each and every event listed in `dependencies`, once the event named `lock`, or each and every event listed in `locks`, is triggered.
   - **returns** `this`
 - `.unlock` -- triggers any callbacks that are currently waiting for the given event(s), or as soon as they attach a listener. In other words, event binding via `.wait()` can occur before or after `.unlock()` and the results will be the same.
   - *...*`(lock: string)` -- triggers the event named `lock`.
   - *...*`(locks: list<string>)` -- triggers each event listed in `locks`.
   - **returns** `this`


<a name="armed-group" />

### class **ArmedGroup**
A  [Group](#group) that has data attached but has not yet been assigned any tasks.

**Methods:**
 - `.map(taskName: string[, args: Array<any> | `[`Manifest`](#manifest)`[, events: `[`EventHash`](#event-hash)`]])` -- dispatch workers to run the task given by `taskName`, on the currently binded data, in parallel. The first argument to each task's call will be its corresponding *subset*, followed by `args`. For understanding whether or not you need to create a Manifest object, see the [Manifest](#manifest) documentation.
   - **returns** a [new ActiveGroup](#active-group)
   - *example:*
     ```js
     let a_sequence = [1, 2, 3, 4];
     worker.group('./eg.js').data(a_sequence)
        .map('multiply', [2])
        .reduce('sum', (x_actual) => {
            let x_expect = a_sequence.map(x => x*2).reduce((c, x) => c + x, 0);
            assert.equal(x_actual, x_expect);
        });
     ```


<a name="active-group" />

### class **ActiveGroup**
A  [Group](#group) that has data attached and has been assigned at least one task.

**Methods:**
 - `.thru(taskName: string[, args: Array<any> | `[`Manifest`](#manifest)`[, events: `[`EventHash`](#event-hash)`]])` -- rather than passing the result back to the master thread, keep each worker's result data in their own thread and simply forward it to another task. For understanding whether or not you need to create a Manifest object, see the [Manifest](#manifest) documentation.
   - **returns** a [new ActiveGroup](#active-group)
 - `.each(each: `[`TaskResultCallback`](#task-result-callback)`[, then: callback(error=null)])` -- handle each task result as soon as it completes, calling `each` for each subset of data whether or not they happen to be ready in order. If an error is thrown by one of the workers, or once all tasks complete, `then` will be called.
   - **returns** a [new ArmedGroup](#armed-group)
 - `.series(each: `[`TaskResultCallback`](#task-result-callback)`[, then: callback(error=nul)])` -- handle each task result in order, calling `each` for each subset of data once it has been processed by the preceeding task. If an error is thrown by one of the workers, or once all tasks complete, `then` will be called.
   - **returns** a [new ArmedGroup](#armed-group)
 - `.end([then: callback(error)])` -- once all the previous tasks end, call `then` if it is given. This essentially ignores the results returned by the workers. The returned Promise resolves after the last worker has finished *and* after `await then()` if it is given.
   - **returns** a [new Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
 - `.reduce(taskName: string[, args: Array<any> | `[`Manifest`](#manifest)`[, events: `[`EventHash`](#event-hash)`]])` -- merge adjacent task results until there is one single result remaining.  For understanding whether or not you need to create a Manifest object, see the [Manifest](#manifest) documentation.
   - **returns** a [new Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)


<a name="task-result-callback" />

### callback **TaskResultCallback**
A function to implement on the 'master' side that gets called when a task successfully completes along with the `result` it returned. As indicated by the signature, this can optionally be an async function which returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).

**Signature:** `[async] function(result: any, subsetIndex: uint)`

**Parameters:**
 0. `result: any` -- what the worker returned
 1. `subsetIndex: uint` -- the index (from 0 to # workers - 1) of the subset that this result derives from

**Returning** one of the following will carry the result *downstream*:
 - An `instanceof` a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that resolves with something that is not an `instanceof` Error and is not `undefined`.
 - Anything that is not `undefined`

**Returning** one of the following will take whatever action is defined by the task stream for handling errors:
 - An `instanceof` an [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)
 - An `instanceof` a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that rejects with some reason.
 - `undefined`

<a name="worker-options" />

### interface **WorkerOptions**
A *struct* that specifies options for spawning a worker.

**Keys for Worker:**
 - [*Those given by the specification*](https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker)

**Keys for ChildProcess:**
 - `args: Array<string>` -- Arguments to append to the `ChildProcess#spawn` args list for the script.
 - `env: hash` -- Extend/overwrite a clone of the current `process.env` object before sending it to the worker.
 - `exec: string` -- Defaults to `process.execPath`.
 - `cwd: string` -- Defaults to `process.cwd()`.
 - `node_args: Array<string>` -- Arguments to inject in the `ChildProcess#spawn` args list for the executable (e.g., `'--max-old-space-size=8192'`)
 - `inspect: struct` -- Enables debugger on the spawned worker(s)
   - **keys:**
     - `brk: boolean` -- Whether or not to break on the first line of execution
     - `port: number` -- Specifies a single port to attach the debugger (only useful for single worker)
     - `range: Array[low, high]` -- Specifies a range of ports to use for attaching debuggers (useful for [`Pool`](#pool) and [`Group`](#group)


<a name="event-hash" />

### interface **EventHash**
A *hash* that binds callback listener functions to arbitrary event names, which can be emitted by the worker.

**Signature:** `[eventName] => callback([subsetIndex: uint, ]...arguments: any)`

**Arguments:**
 0. `subsetIndex: uint` -- the index (from 0 to # workers - 1) of the subset that this event was emitted from (only present for instances of [Group](#group)).
 *rest*. `arguments: any` -- argument data emitted by the worker.

**Example:**
```js
worker.spawn('./eg.js').run('scan', [fs.createReadStream('./input.txt')], {
    line() {
        // newline encountered
    },
});
```

<a name="manifest" />

### class **Manifest**
An array of objects to transmit/receive between master and worker threads such that *special* objects are handled properly, i.e., such that streams can be transmitted across threads, [Transferable](#https://developer.mozilla.org/en-US/docs/Web/API/Transferable) objects can be handled by the browser, or that [SharedMemory](#shared-memory) objects can be exchanged over IPC. Create an instance by using [Factory's](#worker-factory) `worker.manifest()`.

For convenience, any method that accepts a Manifest argument can also accept an `Array<any>`. In this context, the Array **must not contain any *special* objects below one traversable depth**. In other words, so long as you are passing *special* objects at the top level of the Array, or no *special* objects at all, then you do not need to create a Manifest.

**Example:**
```js
// without explicitly creating a Manifest:
worker.spawn('./eg.js').run('parse', [
    // OK: just some serializable objects
    'hello', 42, /structured_clone(_algorithm)?/i,

    // OK: stream is at top level in array
    fs.createReadStream('./package.json'),
    
    // OK: shareable object is at top level in array
    new Uint8ArrayS(1024),
    
    // NOT OK: shareable object is nested; need to use Manifest instead
    {
        type: 'img',
        data: new Uint8ArrayS(1024),
    },
]);

// with Manifest, we can nest special objects
worker.spawn('./eg.js').run('parse', worker.manifest([
    {
        type: 'img',
        data: new Uint8ArrayS(1024),
    },
], [
    // optional: tell Manifest where to find special objects
    [0, 'data'],
]))...
```


<a name="streams" />

### Streams

When working in node.js, instances of [ReadableStream and WritableStream](https://nodejs.org/api/stream.html) can be passed between threads thru worker's standard messaging interface. Each event and method call on such streams are transmitted across threads, so keep in mind the additional overhead costs this may incur when streaming data. See [Manifest](#manifest) for an example.

When deploying in the browser, the same rules apply to streams as with node.js since a reliable stream module can be used by both parties.



<a name="task-handler" />

### function **TaskHandler**
A function to implement on the 'worker' side that accepts an input *subset* as its first argument and any user-defined values for the rest of its arguments.

**Signature:** `[async] function(subset: Array[, ...args])`

**Must return** one of the following:
  - An `instanceof` a [Response](#response).
  - An `instanceof` a `Promise`, which itself resolves to one of these options.
  - Anything supported by the [Structured Clone Algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm).

*Example:*
```js
worker.dedicated({
    // simple synchronous task returning serializable object
    add(a_nums, x_value) {
        return a_nums.map(x => x + x_value);
    },
    // synchronous task returning transferable data
    encode(a_strings) {
        let a_encoded = a_strings.map(s_string => (new TextEncoder()).encode(s_string));
        return worker.response(a_encoded, true);  // auto-find transferable objects
    },
    // asynchronous task returning promise that resolves to serializable object
    async info(s_wikipedia_page) {
        let s_html = await fetch('http://en.wikipedia.org/wiki/'+x);
        return extract_infobox(s_html);
    },
});
```

Each time a task handler function is called, its `this` will have the following fields:
 - **Properties:**
   - `.events`: `hash{name => 1}` -- a 'simple set' of events that the user requests to be notified about. Useful for determining if a certain event even needs to be emitted.

 - **Methods:**
   - `.put(key: string, data: any)`
     - stores `data` under the given `key` to a hash store that will be available for future tasks in the current pipeline running on the same thread.
     - > Note: this hash store is safe to use even if the current thread is reassigned to repeat the same task on a different *subset*; i.e., it protects against task-level collisions.
   - `.get(key: string)`
     - retrieves data from the previous task(s) in the current *thread pipeline*.
     - **returns** `data` set by the user during a call to `.put`
   - `.emit(eventName: string[, ...args])`
     - emits the event given by `eventName` along with the given `args` by sending a message to the current worker's *master* thread.
     > Note: each of the `args` must be serializable by the [Structured Clone Algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm).

     - *example:*
       ```js
       // worker.js
       worker.dedicated({
           parse(at_code) {
               ds_stream.on('data', (s_data) => {
                   if(s_data.startsWith('warn:')) this.emit('warn', s_data);
               });
           },
       });

       // master.js (using single worker)
       k_worker.run('parse', [at_code], {
           warn(s_warning) {
               console.warn(s_warning);
           },
       });

       // -- or --

       // master.js (using worker group)
       k_group.data(a_codes)
           .map('parse', [at_code], {
               warn(i_subset, s_warning) {
                   console.warn('['+i_subset+'] '+s_warning);
               },
           });
       ```


<a name="shared-memory" />

### SharedMemory
----------------
In node.js, this library spawns a new process for each worker. Communication between processes (IPC) is normally done via pipes, which is a copy-on-write operation requiring outgoing data to be duplicated in memory. To alleviate the overhead when transferring larger objects between processes, you can allocate ArrayBuffers and TypedArrays in shared memory space before filling them with data.

The following classes are provided to ease the process of creating shared memory. They behave the same as their corresponding [TypedArray](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray) constructors:
```
ArrayBufferS
Int8ArrayS
Uint8ArrayS
Uint8ClampedArrayS
Int16ArrayS
Uint16ArrayS
Int32ArrayS
Uint32ArrayS
Float32ArrayS
Float64ArrayS
```

In the browser, each of these classes will invoke the [SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer) constructor to create shared memory.

In node.js, each of these classes will attempt to create shared memory on the operating system (right now only support for systems that support POSIX shm and mmap).


Alternatively, you may wish to *transfer* objects in the browser rather than creating shared memory. In node.js however, IPC still requires shared memory. For this scenario, you can use the *transfer-if-able* TypedArray constructors:
```
ArrayBufferT
Int8ArrayT
Uint8ArrayT
Uint8ClampedArrayT
Int16ArrayT
Uint16ArrayT
Int32ArrayT
Uint32ArrayT
Float32ArrayT
Float64ArrayT
```


<a name="division-strategies" />

## DivisionStrategies
---------------------
A division strategy is an algorithm that divides a list of elements into multiple subsets, so as to share the load among workers in a data parallelism paradigm.


<a name="equal-division-strategy" />

### EqualDivisionStrategy
A default division strategy that will attempt to divide the input data into equal *subsets* over the number of workers in the current [Group](#group). Inputs that are not evenly divisible by the number of workers in their [Group](#group) will result in slightly larger *subsets* nearer the end, increasing the liklihood that the workers assigned the first *subsets* finish before those assigned the last *subsets*; an outcome intended to favor responses that process results based on their order within the original input data.



<a name="browser" />

## Building with browserify or webpack for the browser

This module ships ready-to-go with browserify. Just `npm install worker` in your project and require normally.

For webpack however, you will need to add the following to your `webpack.config.js`:
```js
module.exports = {
  resolve: {
    aliasFields: ['browser'],
  },
};
```

This will let webpack know to use the `browser` key/value pair of worker's `package.json` file.


[npm-image]: https://badge.fury.io/js/worker.svg
[npm-url]: https://npmjs.org/package/worker
[travis-image]: https://travis-ci.org/blake-regalia/worker.js.svg?branch=master
[travis-url]: https://travis-ci.org/blake-regalia/worker.js
[daviddm-image]: https://david-dm.org/blake-regalia/worker.js.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/blake-regalia/worker.js
