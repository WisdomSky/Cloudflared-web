const cp = require('child_process');

const ipc = require('./ipc.js');

let i_worker = 0;

// Worker abstraction
module.exports = class node_worker extends ipc {
	constructor(p_source, h_options={}) {
		// prep args
		let a_args = h_options.args || [];

		// push source to front of args
		a_args.unshift(p_source);

		// node inspect
		let z_inspect = h_options.inspect;
		if(z_inspect) {
			let a_node_args = h_options.node_args = h_options.node_args? h_options.node_args.slice(0): [];
			a_node_args.push('--inspect'+(z_inspect.brk || z_inspect.break? '-brk': '')+(z_inspect.port? '='+(z_inspect.port++): ''));
		}

		// push node args to front
		if(h_options.node_args) a_args.unshift(...h_options.node_args);

		// spawn child process
		let u_proc = cp.spawn(h_options.exec || process.execPath, a_args, {
			// extend process.env
			env: Object.assign({}, process.env, {
				WORKER_DEPTH: 1,
				WORKER_INDEX: i_worker++,
				MASTER_ORIGIN: module.parent.parent.parent.filename,
			}, h_options.env || {}),
			cwd: h_options.cwd || process.cwd(),
			stdio: ['ignore', 'inherit', 'inherit', 'ipc', 'pipe'],
		});

		// create ipc
		super(u_proc.stdio[4], module.parent.parent.filename);

		// save process
		Object.assign(this, {
			proc: u_proc,
		});
	}

	send_port(d_port, h_msg) {
		// set a link to process
		this.proc.on('exit', () => {
			require('./channel.js').kill(d_port.ipc.server);
		});

		// send port and message over ipc message
		this.proc.send(h_msg, d_port);
	}

	terminate(s_kill='SIGTERM') {
		// set disconnect flag: its okay if socket throws ECONNRESET
		this.disconnect = true;

		let u_proc = this.proc;
		return new Promise((f_resolve, f_reject) => {
			u_proc.on('exit', (x_code, s_signal) => {
				// remove all socket listeners
				this.socket.removeAllListeners();

				f_resolve(x_code, s_signal);
			});

			u_proc.on('error', (e_kill) => {
				f_reject(e_kill);
			});

			u_proc.kill(s_kill);
		});
	}
};
