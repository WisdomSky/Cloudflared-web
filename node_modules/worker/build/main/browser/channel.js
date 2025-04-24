const events = require('./events.js');

module.exports = class channel extends MessageChannel {
	static between(kw_sender, kw_receiver) {
		let d_channel = kw_sender.channels.get(kw_receiver);
		if(d_channel) return d_channel;
		return new channel(kw_sender, kw_receiver);
	}

	port_1() {
		return events(this.port1);
	}

	port_2() {
		return events(this.port2);
	}
};
