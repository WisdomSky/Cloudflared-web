
const native_stream = require('stream');
const events = require('events');

let c_acks = 0;

class thru_stream_proxy extends events {
	constructor() {
		super();


	}
}

class thru_stream extends native_stream.Writable {
	constructor() {
		super();

		Object.assign(this, {
			ipc: null,
			wait: [],
			proxy: new thru_stream_proxy(),
		});
	}

	_write(z_chunk, s_encoding, fk_write) {
		// return this._writev([z_chunk, s_encoding], fk_write);

		this.proxy.emit('data', z_chunk);
	}

	// _writev(a_chunks, fk_write) {
	// 	let f_write = () => {
	// 		// post chunk to ipc
	// 		try {
	// 			this.proxy.emit('data', )
	// 			// this.ipc.postMessage({
	// 			// 	type: 'chunks',
	// 			// 	id: this.id,
	// 			// 	chunks: a_chunks,
	// 			// });
	// 		}
	// 		// catch ipc error
	// 		catch(e_post) {
	// 			fk_write(e_post);
	// 		}

	// 		// chunk written
	// 		fk_write();
	// 	};

	// 	// ipc not bound yet
	// 	if(!this.ipc) {
	// 		this.wait.push(f_write);
	// 	}
	// 	// ipc bound
	// 	else {
	// 		f_write();
	// 	}
	// }

	// bind(k_ipc, i_stream) {
	// 	if(this.ipc) throw new Error('worker stream is already bound to an IPC');

	// 	// save fields
	// 	this.ipc = k_ipc;
	// 	this.id = i_stream;

	// 	// steam events that propagate to other side
	// 	this.once('close', () => {
	// 		k_ipc.postMessage({
	// 			type: 'stream_event',
	// 			id: this.id,
	// 			event: 'close',
	// 		});
	// 	});

	// 	this.once('finish', () => {
	// 		k_ipc.postMessage({
	// 			type: 'stream_event',
	// 			id: this.id,
	// 			event: 'finish',
	// 		});
	// 	});

	// 	// empty wait queue
	// 	let a_wait = this.wait;
	// 	while(a_wait.length) {
	// 		a_wait.shift()();
	// 	}
	// }
}

class readable_stream_rx extends events {
	constructor(h_serial, k_ipc) {
		super();

		let i_stream = h_serial.id;

		Object.assign(this, {
			id: i_stream,
			ipc: k_ipc,
		});

		k_ipc.streams[i_stream] = this;
	}

	on(s_event, f_event) {
		// forward to other thread
		this.ipc.postMessage({
			type: 'stream_on',
			id: this.id,
			event: s_event,
		});

		// call event bind on super
		super.on(s_event, f_event);
	}

	once(s_event, f_event) {
		// forward to other thread
		this.ipc.postMessage({
			type: 'stream_once',
			id: this.id,
			event: s_event,
		});

		// call event bind on super
		super.once(s_event, f_event);
	}

	pipe() {
		throw new Error('not yet implemented');
	}
}

class writable_stream_rx extends native_stream.Writable {
	constructor(h_serial, k_ipc) {
		super(h_serial.options);

		let i_stream = h_serial.id;

		Object.assign(this, {
			id: i_stream,
			ipc: k_ipc,
		});

		k_ipc.streams[i_stream] = this;
	}

	on(s_event, f_event) {
		// forward to other thread
		this.ipc.postMessage({
			type: 'stream_on',
			id: this.id,
			event: s_event,
		});

		// call event bind on super
		super.on(s_event, f_event);
	}

	once(s_event, f_event) {
		// forward to other thread
		this.ipc.postMessage({
			type: 'stream_once',
			id: this.id,
			event: s_event,
		});

		// call event bind on super
		super.once(s_event, f_event);
	}

	write(z_chunk, s_encoding=null, fk_write=null) {
		// wait for acknowledge
		let i_ack = 0;
		if(fk_write) {
			i_ack = ++c_acks;
			this.ipc.acks[i_ack] = fk_write;
		}

		// forward to other thread
		this.ipc.postMessage({
			type: 'stream_write',
			id: this.id,
			ack: i_ack,
			data: {
				chunk: z_chunk,
				encoding: s_encoding,
			},
		});
	}
}


class handler {
	constructor() {
		// Object.assign(this, {
		// 	streams: {},
		// });
	}

	handle_stream_on(h_msg) {
		let s_event = h_msg.event;

		let ds_stream = this.port.streams[h_msg.id];

		// bind event
		ds_stream.on(s_event, (z_data) => {
			// transmit
			let b_clean = this.port.postMessage({
				type: 'stream_emit',
				id: h_msg.id,
				event: s_event,
				data: z_data,
			});

			// socket is busy from data event
			if(!b_clean && 'data' === s_event) {
				// try pausing stream
				ds_stream.pause();

				// wait for socket to drain
				this.port.drain(() => {
					// resume reading
					ds_stream.resume();
				});
			}
		});
	}

	handle_stream_once(h_msg) {
		let s_event = h_msg.event;

		// bind event
		this.port.streams[h_msg.id].once(s_event, (z_data) => {
			// transmit
			this.port.postMessage({
				type: 'stream_emit',
				id: h_msg.id,
				event: s_event,
				data: z_data,
			});
		});
	}

	handle_stream_emit(h_msg) {
		// emit event
		this.port.streams[h_msg.id].emit(h_msg.event, h_msg.data);
	}

	handle_stream_write(h_msg) {
		let h_data = h_msg.data;
		this.port.streams[h_msg.id].write(h_data.chunk, h_data.encoding, () => {
			// thread wants acknowledge
			if(h_msg.ack) {
				this.port.postMessage({
					type: 'stream_ack',
					id: h_msg.id,
					ack: h_msg.ack,
				});
			}
		});
	}

	handle_stream_ack(h_msg) {
		// call ack handler
		this.port.acks[h_msg.ack]();
	}

	handle_chunks(h_msg) {
		let ds_stream = this.port.streams[h_msg.id];

		// back-pressure sensitivity
		let b_clean = false;

		// process chunks by writing to stream
		let a_chunks = h_msg.chunks;
		for(let w_chunk of a_chunks) {
			// emit data event on stream
			b_clean = ds_stream.emit('data', w_chunk);
		}

		// pipe is clean
		if(b_clean) {
			this.port.postMessage({
				type: 'chunks_ack',
			});
		}
		// backoff
		else {
			// until writable drains
			ds_stream.once('drain', () => {
				this.port.postMessage({
					type: 'chunks_ack',
				});
			});
		}
	}

}


let c_streams = 0;

module.exports = Object.assign(function stream(z_input=null) {
	if(z_input) {
		return stream.transfer(z_input);
	}
	else {
		return new thru_stream();
	}
}, {
	is_stream(z_stream) {
		return z_stream instanceof thru_stream
			|| z_stream instanceof native_stream.Readable
			|| z_stream instanceof native_stream.Writable;
	},

	open(h_serial, k_ipc) {
		switch(h_serial.type) {
			// case 'thru_stream': {

			// } break;

			// other thread is going to be source of stream data
			case 'readable_stream': return new readable_stream_rx(h_serial, k_ipc);

			// other thread is going to be sink of stream data
			case 'writable_stream': return new writable_stream_rx(h_serial, k_ipc);

			default: {
				throw new Error('invalid serialized stream object');
			}
		}
	},

	// transfer(z_input=null) {
	// 	if(z_input instanceof stream.Readable) {
	// 		return new readable_stream_tx(z_input);
	// 	}
	// 	else if(z_input instanceof stream.Writable) {
	// 		return new writable_stream_tx(z_input);
	// 	}
	// 	else if(z_input instanceof thru_stream) {
	// 		return z_input;
	// 	}
	// 	else {
	// 		throw new Error('cannot create transfer stream from ', z_input);
	// 	}
	// }

	serialize(z_stream, k_ipc) {
		// create new stream id
		let i_stream = ++c_streams;

		// prep stream type
		let s_type;

		// readable stream
		if(z_stream instanceof native_stream.Readable) {
			s_type = 'readable_stream';
		}
		// writable stream
		else if(z_stream instanceof native_stream.Writable) {
			s_type = 'writable_stream';
		}
		// thru stream
		else if(z_stream instanceof thru_stream) {
			s_type = 'readable_stream';
			z_stream = z_stream.proxy();
		}
		// invalid type
		else {
			throw new TypeError('cannot create transfer stream from: '+z_stream);
		}

		// save stream
		k_ipc.streams[i_stream] = z_stream;

		// serialize stream
		return {
			type: s_type,
			id: i_stream,
		};
	},

	handler,
});

