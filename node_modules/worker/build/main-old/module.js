/* @flow */
const path = require('path');

const colors = require('colors');
colors.enabled = true;

// local classes / globals
const {
	K_SELF,
	DC_WORKER,
	DC_CHANNEL,
	H_TYPED_ARRAYS,
	B_BROWSER,
	B_BROWSERIFY,
	HP_WORKER_NOTIFICATION,
	stream,
	webworkerify,
} = require('./all/locals.js');

const dedicated = require('./all/dedicated.js');
const manifest = require('./all/manifest.js');
const result = require('./all/result.js');

// Worker is supported
const B_WORKER_SUPPORTED = ('undefined' !== typeof DC_WORKER);

// context bitmasks
const XM_CONTEXT_PROCESS_PARENT = 1 << 0;
const XM_CONTEXT_PROCESS_CHILD = 1 << 1;
const XM_CONTEXT_WINDOW = 1 << 2;
const XM_CONTEXT_WORKER_DEDICATED = 1 << 3;
const XM_CONTEXT_WORKER_SERVICE = 1 << 4;
const XM_CONTEXT_WORKER_SHARED = 1 << 5;

const XM_CONTEXT_WORKER = XM_CONTEXT_WORKER_DEDICATED | XM_CONTEXT_WORKER_SERVICE | XM_CONTEXT_WORKER_SHARED;

// set the current context
const X_CONTEXT_TYPE = !B_BROWSER
	? (process.env.WORKER_DEPTH? XM_CONTEXT_PROCESS_CHILD: XM_CONTEXT_PROCESS_PARENT)
	: ('undefined' !== typeof document
		? XM_CONTEXT_WINDOW
		: ('DedicatedWorkerGlobalScope' in self
			? XM_CONTEXT_WORKER_DEDICATED
			: ('SharedWorkerGlobalScope' in self
				? XM_CONTEXT_WORKER_SHARED
				: ('ServiceWorkerGlobalScope' in self
					? XM_CONTEXT_WORKER_SERVICE
					: 0))));

// unrecognized context
if(!X_CONTEXT_TYPE) {
	throw new Error('failed to determine what is the current environment/context');
}

// spawns a Worker
let spawn_worker = B_WORKER_SUPPORTED
	? (!B_BROWSERIFY
		? (p_source, h_options) => new DC_WORKER(p_source, h_options)
		: (p_source, h_options) => {
			console.error(`Fatal error: since you are using browserify, you need to include explicit 'require()' statements for any scripts you intend to spawn as workers from this thread`);
			console.warn(`try using the following instead:\n\nconst worker = require('worker').scopify(require, () => {\n`
				+`\trequire('${p_source}');\n\t// ... and any other scripts you will spawn from this thread\n`
				+`}, 'undefined' !== typeof arguments && arguments);`);

			throw new Error(`Cannot spawn worker '${p_source}'`);
		})
	: (p_source, h_options) => {
		// we're inside a worker
		if(X_CONTEXT_TYPE & XM_CONTEXT_WORKER) {
			console.error(`Fatal error: browser does not support subworkers; failed to spawn '${p_source}'\n`
				+'Fortunately worker.js has a solution  ;)');
			console.warn(`try using the following in your worker script to support subworkers:\n\n`
				+`const worker = require('worker').scopify(require, () => {\n`
				+`\trequire('${p_source}');\n`
				+`\t// ... and any other scripts you will spawn from this thread\n`
				+`}, 'undefined' !== typeof arguments && arguments);`);
		}

		throw new Error(`Cannot spawn worker ${p_source}; 'Worker' is undefined`);
	};


let i_guid = 0;

class worker extends stream.handler {
	static from_source(p_source, h_options={}) {
		return new worker({
			source: p_source,
			options: h_options,
		});
	}

	constructor(h_config) {
		super();

		let {
			source: p_source,
			id: i_id=-1,
			master: k_master=null,
			options: h_options={},
		} = h_config;

		// resolve source relative to master
		let pa_source = B_BROWSER
			? p_source
			: path.resolve(path.dirname(module.parent.filename), p_source);

		// make worker
		let d_worker;
		try {
			d_worker = spawn_worker(pa_source, h_options);
		}
		catch(e_spawn) {
			let e_msg = new Error('An uncaught error was thrown by the worker, possibly due to a bug in the worker.js library. That error was:\n'+e_spawn.stack.split('\n')[0]);
			e_msg.stack = e_spawn.stack;
			throw e_msg;
		}

		d_worker.on({
			error: (e_worker) => {
				if(e_worker instanceof ErrorEvent) {
					if('lineno' in e_worker && 'source' in d_worker) {
						let a_lines = d_worker.source.split('\n');
						let i_line_err = e_worker.lineno;
						let a_debug = a_lines.slice(Math.max(0, i_line_err-2), Math.min(a_lines.length-1, i_line_err+2))
							.map((s_line, i_line) => (1 === i_line? '*': ' ')+((i_line_err+i_line-1)+'').padStart(5)+': '+s_line);

						// recreate error message
						e_worker = new Error(e_worker.message+`Error thrown in worker:\n${a_debug.join('\n')}`);
					}

					if(this.task_error) {
						this.task_error(e_worker);
					}
					else {
						throw e_worker;
					}
				}
				else if(this.task_error) {
					this.task_error(e_worker);
				}
				else {
					throw new Error(`an error occured on worker... but the 'error' event callback did not receive an ErrorEvent object! try inspecting console`);
				}
			},

			// when there is an error creating/communicating with worker
			messageerror: (e_action) => {
				throw new Error(e_action);
			},

			// when a worker responds
			message: (d_msg) => {
				let h_msg = d_msg.data;

				// handle message
				let s_handle = 'handle_'+h_msg.type;
				if(s_handle in this) {
					this[s_handle](h_msg);
				}
				else {
					throw new Error(`worker sent a message that has no defined handler: '${h_msg.type}'`);
				}
			},
		});

		Object.assign(this, {
			source: p_source,
			id: i_id,
			master: k_master,
			port: d_worker,
			busy: false,
			available: true,
			tasks_assigned: 0,
			callbacks: {},
			events: {},
			subworkers: [],
			task_error: null,
			channels: new Map(),
			server: null,
		});
	}

	debug(s_tag, s_type, ...a_info) {
		console.warn(`[${s_tag}] `.white+`M${String.fromCharCode(65+this.id)}`.blue+` ${s_type} ${a_info.length? '('+a_info.join(', ')+')': '-'}`);
	}

	handle_close_server(h_msg) {
		DC_CHANNEL.kill(h_msg.server);
	}

	handle_respond(h_msg) {
		let h_callbacks = this.callbacks;

		// no longer busy
		this.busy = false;

		// grab task id
		let i_task = h_msg.id;

		if(h_msg.debug) this.debug(h_msg.debug, '<< respond'.red, i_task);

		// execute callback
		h_callbacks[i_task](h_msg.data, i_task, this);

		// free callback
		delete h_callbacks[i_task];
	}

	handle_notify(h_msg) {
		h_msg.data = HP_WORKER_NOTIFICATION;

		// no longer busy
		this.busy = false;

		if(h_msg.debug) this.debug(h_msg.debug, '<< notify'.red);

		this.handle_respond(h_msg);
	}

	handle_event(h_msg) {
		// event is guaranteed to be here; just callback with data
		this.events[h_msg.id][h_msg.event](...h_msg.args);
	}

	handle_error(h_msg) {
		let h_error = h_msg.error;
		let e_msg = new Error(h_error.message);
		e_msg.stack = h_error.stack;

		if(this.task_error) {
			this.task_error(e_msg);
		}
		else {
			throw e_msg;
		}
	}

	handle_spawn(h_msg) {
		let p_source = path.join(path.dirname(this.source), h_msg.source);
		if('/' !== p_source[0]) p_source = './'+p_source;

		p_source = h_msg.source;
		let d_subworker = spawn_worker(p_source);
		let i_subworker = this.subworkers.push(d_subworker)-1;

		d_subworker.on('error', (e_worker) => {
			this.port.postMessage({
				type: 'subworker_error',
				error: {
					message: e_worker.message,
					filename: e_worker.filename,
					lineno: e_worker.lineno,
				},
			});
		});

		let k_channel = new DC_CHANNEL();

		k_channel.port_1((d_port) => {
			this.port.postPort(d_port, {
				type: 'subworker',
				id: h_msg.id,
				master_key: i_subworker,
			});
		});

		k_channel.port_2((d_port) => {
			d_subworker.postPort(d_port, {
				type: 'owner',
			});
		});
	}

	handle_ping() {
		K_SELF.postMessage({
			type: 'pong',
		});
	}

	handle_terminate(h_msg) {
		this.subworkers[h_msg.master_key].terminate();
	}

	prepare(h_task, fk_task, a_roots=[]) {
		let i_task = ++i_guid;

		let {
			task: s_task,
			manifest: k_manifest,
			receive: i_receive=0,
			inherit: i_inherit=0,
			hold: b_hold=false,
			events: h_events=null,
		} = h_task;

		// save callback
		this.callbacks[i_task] = fk_task;

		// save events
		if(h_events) {
			this.events[i_task] = h_events;

			// what to send
			let h_events_send ={};
			for(let s_key in h_events) {
				h_events_send[s_key] = 1;
			}
			h_events = h_events_send;
		}

		// send task
		return {
			msg: {
				type: 'task',
				id: i_task,
				task: s_task,
				args: k_manifest.data,
				receive: i_receive,
				inherit: i_inherit,
				hold: b_hold,
				events: h_events,
			},
			paths: k_manifest.paths(...a_roots, 'args'),
		};
	}

	exec(h_task_exec, fk_task) {
		// mark worker as busy
		this.busy = true;

		// prepare final task descriptor
		let h_task = this.prepare(h_task_exec, fk_task);

		// this.debug('exec:'+h_task.msg.id);

		// post to worker
		this.port.postMessage(h_task.msg, h_task.paths);
	}

	// assign a task to the worker
	run(s_task, z_args, h_events, fk_run) {
		// prepare final task descriptor
		let h_exec = {
			task: s_task,
			manifest: manifest.from(z_args),
			events: h_events,
		};

		// previous run task
		if(this.prev_run_task) {
			h_exec.inherit = this.prev_run_task;
		}

		// execute task
		let dp_exec = new Promise((f_resolve, f_reject) => {
			this.task_error = f_reject;
			this.exec(h_exec, (z_result, i_task) => {
				this.prev_run_task = i_task;
				this.task_error = null;
				f_resolve(z_result);
			});
		});

		// embedded resolve/reject
		if('function' === typeof fk_run) {
			dp_exec.then((z_result) => {
				fk_run(null, z_result);
			}).catch((e_exec) => {
				fk_run(e_exec);
			});
		}
		// promise
		else {
			return dp_exec;
		}
	}

	receive(d_port, h_receive, fk_task, s_debug=null) {
		let h_task = this.prepare(h_receive.task_ready, fk_task, ['task_ready']);

		if(s_debug) this.debug(s_debug, '>> receive:'.green+h_receive.import, h_task.msg.id, d_port.name || d_port);

		this.port.postPort(d_port, {
			type: 'receive',
			import: h_receive.import,
			sender: h_receive.sender,
			primary: h_receive.primary,
			task_ready: Object.assign(h_task.msg, {debug:s_debug}),
			debug: s_debug,
		}, [...(h_task.paths || [])]);
	}

	relay(i_task_sender, d_port, s_receiver, s_debug=null) {
		if(s_debug) this.debug(s_debug, '>> relay', i_task_sender, d_port.name || d_port);

		this.port.postPort(d_port, {
			type: 'relay',
			id: i_task_sender,
			debug: s_debug,
		});
	}

	kill(s_kill) {
		if(B_BROWSER) {
			return new Promise((f_resolve) => {
				this.port.terminate();
				f_resolve();
			});
		}
		else {
			return this.port.terminate(s_kill);
		}
	}
}


const mk_new = (dc) => function(...a_args) {
	return new dc(...a_args);
};

// now import anyhing that depends on worker
const group = require('./all/group.js')(worker);
const pool = require('./all/pool.js')(worker);

const H_EXPORTS = {
	spawn(...a_args) {
		return worker.from_source(...a_args);
	},

	new: (...a_args) => new worker(...a_args),
	group: mk_new(group),
	pool: mk_new(pool),
	dedicated: mk_new(dedicated),
	manifest: mk_new(manifest),
	result: mk_new(result),

	stream,
	// stream: mk_new(writable_stream),
	// get stream() {
	// 	delete this.stream;
	// 	return this.stream = require('./stream.js');
	// },

	// states
	browser: B_BROWSER,
	browserify: B_BROWSERIFY,
	// depth: WORKER_DEPTH

	// import typed arrays into the given scope
	globals: (h_scope={}) => Object.assign(h_scope, H_TYPED_ARRAYS.exports),

	// for compatibility with browserify
	scopify(f_require, a_sources, d_arguments) {
		// browserify arguments
		let a_browserify = d_arguments? [d_arguments[3], d_arguments[4], d_arguments[5]]: null;

		// running in browserify
		if(B_BROWSERIFY) {
			const latent_subworker = require('./browser/latent-subworker.js');

			// change how a worker is spawned
			spawn_worker = (p_source, h_options) => {
				// workaround for chromium bug that cannot spawn subworkers
				if(!B_WORKER_SUPPORTED) {
					let k_subworker = new latent_subworker();

					// send message to master requesting spawn of new worker
					K_SELF.postMessage({
						type: 'spawn',
						id: k_subworker.id,
						source: p_source,
						options: h_options,
					});

					return k_subworker;
				}
				// worker is defined
				else {
					let z_import = f_require(p_source);
					return webworkerify(z_import, {
						browserify: a_browserify,
					});
				}
			};
		}

		// normal exports
		return H_EXPORTS;
	},

	merge_sorted(a_a, a_b, f_cmp) {
		// output list
		let a_out = [];

		// index of next item from each list
		let i_a = 0;
		let i_b = 0;

		// current item from each list
		let z_a = a_a[0];
		let z_b = a_b[0];

		// final index of each list
		let ih_a = a_a.length - 1;
		let ih_b = a_b.length - 1;

		// merge
		for(;;) {
			// a wins
			if(f_cmp(z_a, z_b) < 0) {
				// add to output list
				a_out.push(z_a);

				// reached end of a
				if(i_a === ih_a) break;

				// next item from a
				z_a = a_a[++i_a];
			}
			// b wins
			else {
				// add to output list
				a_out.push(z_b);

				// reached end of b
				if(i_b === ih_b) break;

				// next item from b
				z_b = a_b[++i_b];
			}
		}

		// a finished first
		if(i_a === ih_a) {
			// append remainder of b
			a_out.push(a_b.slice(i_b));
		}
		// b finished first
		else {
			// append remainder of a
			a_out.push(a_a.slice(i_a));
		}

		// result
		return a_out;
	},
};


module.exports = Object.assign(function(...a_args) {
	// called from worker
	if(XM_CONTEXT_WORKER & X_CONTEXT_TYPE) {
		// dedicated worker
		if(XM_CONTEXT_WORKER_DEDICATED === X_CONTEXT_TYPE) {
			return new dedicated(...a_args);
		}
		// shared worker
		else if(XM_CONTEXT_WORKER_SHARED === X_CONTEXT_TYPE) {
			// return new shared(...a_args);
		}
		// service worker
		else if(XM_CONTEXT_WORKER_SERVICE === X_CONTEXT_TYPE) {
			// return new service(...a_args);
		}
	}
	// child process; dedicated worker
	else if(XM_CONTEXT_PROCESS_CHILD === X_CONTEXT_TYPE) {
		return new dedicated(...a_args);
	}
	// master
	else {
		return worker.from_source(...a_args);
	}
}, H_EXPORTS);

