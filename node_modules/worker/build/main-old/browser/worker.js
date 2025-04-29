const events = require('./events.js');
const sharing = require('./sharing.js');

class worker extends Worker {

	postPort(d_port, h_msg, a_transfer_paths=[]) {
		// append port to transfer paths
		a_transfer_paths.push(['port']);

		// send
		this.postMessage(Object.assign({
			port: d_port,
		}, h_msg), a_transfer_paths);
	}

	postMessage(h_msg, a_transfer_paths) {
		let a_transfers = [];
		for(let a_path of a_transfer_paths) {
			let z_head = h_msg;
			let nl_path = a_path.length;
			for(let i_step=0; i_step<nl_path-1; i_step++) {
				z_head = z_head[a_path[i_step]];
			}

			// final step
			let s_key = a_path[nl_path-1];

			// extract transfer item(s)
			let [h_serialization, a_transfer_items] = sharing.extract(z_head[s_key]);

			// add transfer items
			a_transfers.push(...a_transfer_items);

			// replace object
			z_head[s_key] = h_serialization;
		}

		try {
			super.postMessage(h_msg, a_transfers);
		}
		catch(e_post) {
			// data clone error
			if('DataCloneError' === e_post.name) {
				console.warn('Did you forget to declare an object that needs to be transferred? Make sure you know when to use worker.manifest()');
				debugger;
			}

			throw e_post;
		}
	}
}

events(worker.prototype);

module.exports = worker;
