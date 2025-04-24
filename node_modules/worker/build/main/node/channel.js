const os = require('os');
const crypto = require('crypto');
const uuidv5 = require('uuid/v5');

const P_TMP = os.tmpdir()+'/npm-worker';

let h_servers = {};

// prevent exceeding max listener binding
process.setMaxListeners(Infinity);

class half_channel {
	constructor(kw_host, kw_client) {
		// save channel
		kw_host.channels.set(kw_client, this);
		kw_client.channels.set(kw_host, this);

		Object.assign(this, {
			socket_file: kw_host.server,
			host: kw_host,
			client: kw_client,
		});
	}

	port_1() {
		return '*'+this.socket_file;
	}

	port_2() {
		return '*'+this.socket_file;
	}
}

module.exports = class channel {
	static kill(si_server) {
		h_servers[si_server].close();
	}

	static between(kw_sender, kw_receiver) {
		let k_channel_sender = kw_sender.channels.get(kw_receiver);
		if(k_channel_sender) return k_channel_sender;

		if(kw_sender.host) {
			return new half_channel(kw_sender, kw_receiver);
		}

		if(kw_receiver.host) {
			return new half_channel(kw_receiver, kw_sender);
		}

		return new channel(kw_sender, kw_receiver);
	}

	constructor(kw_sender, kw_receiver) {
		// socket file name
		let p_uuid = uuidv5(Math.random().toString(26).slice(2)+Date.now(), 'e7b8a225-b7e0-4e2c-8cfd-dd9bca5d2a84');
		let p_hash = crypto.createHash('sha256').update(p_uuid).digest('base64');
		let p_socket = P_TMP+'_'+p_hash.slice(0, 32).replace(/\//g, '_')+'.sock';

		// make receiver the host
		kw_receiver.server = p_socket;
		this.socket_file = p_socket;

		// save channel
		kw_sender.channels.set(kw_receiver, this);
		kw_receiver.channels.set(kw_sender, this);
	}

	port_1() {
		return '<'+this.socket_file;
	}

	port_2() {
		return '>'+this.socket_file;
	}
};
