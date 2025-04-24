const {
	K_SELF,
	webworkerify,
} = require('../all/locals.js');

const events = require('./events.js');

let i_subworker_spawn = 1;
let h_subworkers = {};

class latent_subworker {
	static connect(h_msg) {
		h_subworkers[h_msg.id].connect(h_msg);
	}

	constructor() {
		Object.assign(this, {
			id: i_subworker_spawn,
			messages: [],
			master_key: 0,
			port: null,
		});

		h_subworkers[i_subworker_spawn++] = this;
	}

	connect(h_msg) {
		let {
			master_key: i_master,
			port: d_port,
		} = h_msg;

		Object.assign(this, {
			master_key: i_master,
			port: d_port,
		});

		// bind events
		d_port.onmessage = (...a_args) => {
			this.onmessage(...a_args);
		};
		d_port.onmessageerror = (...a_args) => {
			this.onmessageerror(...a_args);
		};

		// process message queue
		while(this.messages.length) {
			d_port.postMessage(...this.messages.shift());
		}
	}

	postMessage(...a_args) {
		if(this.port) {
			this.port.postMessage(...a_args);
		}
		else {
			this.messages.push(a_args);
		}
	}

	onmessage() {
		throw new Error('received message from subworker before its port was connected');
	}

	onmessageerror() {
		throw new Error('received message error from subworker before its port was connected');
	}

	terminate() {
		this.port.close();
		K_SELF.postMessage({
			type: 'terminate',
			master_key: this.master_key,
		});
	}

	webworkerify(z_import, a_browserify, h_options={}) {
		let s_source = webworkerify(z_import, a_browserify, h_options);

		K_SELF.postMessage({
			type: 'spawn',
			source: s_source,
			options: h_options,
		});
	}
}

events(latent_subworker.prototype);

module.exports = latent_subworker;
