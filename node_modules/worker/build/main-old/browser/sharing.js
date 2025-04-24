const stream = require('./stream.js');

const $_SHAREABLE = Symbol('shareable');

module.exports = Object.assign(function(z_object) {
	return 'object' === typeof z_object &&
		(ArrayBuffer.isView(z_object)
			|| z_object instanceof ArrayBuffer
			|| z_object instanceof MessagePort
			|| z_object instanceof ImageBitmap
			|| $_SHAREABLE in z_object);
}, {
	$_SHAREABLE,

	extract: function extract(z_data, as_transfers=null) {
		// protect against [object] null
		if(!z_data) return [z_data, []];

		// set of transfer objects
		if(!as_transfers) as_transfers = new Set();

		// object
		if('object' === typeof z_data) {
			// plain object literal
			if(Object === z_data.constructor) {
				// scan over enumerable properties
				for(let s_property in z_data) {
					// add each transferable from recursion to own set
					extract(z_data[s_property], as_transfers);
				}
			}
			// array
			else if(Array.isArray(z_data)) {
				// scan over each item
				z_data.forEach((z_item) => {
					// add each transferable from recursion to own set
					extract(z_item, as_transfers);
				});
			}
			// typed array, data view or array buffer
			else if(ArrayBuffer.isView(z_data)) {
				as_transfers.add(z_data.buffer);
			}
			// array buffer
			else if(z_data instanceof ArrayBuffer) {
				as_transfers.add(z_data);
			}
			// message port
			else if(z_data instanceof MessagePort) {
				as_transfers.add(z_data);
			}
			// image bitmap
			else if(z_data instanceof ImageBitmap) {
				as_transfers.add(z_data);
			}
			// stream
			else if(stream.is_stream(z_data)) {
				let a_transfers = [];
				[z_data, a_transfers] = stream.serialize(z_data);
				as_transfers.add(a_transfers);
			}
			// shareable
			else if($_SHAREABLE in z_data) {
				let a_transfers = [];
				[z_data, a_transfers] = z_data[$_SHAREABLE]();
				as_transfers.add(a_transfers);
			}
		}
		// function
		else if('function' === typeof z_data) {
			// scan over enumerable properties
			for(let s_property in z_data) {
				// add each transferable from recursion to own set
				extract(z_data[s_property], as_transfers);
			}
		}
		// nothing
		else {
			return [z_data, []];
		}

		// convert set to array
		return [z_data, Array.from(as_transfers)];
	},

	populate(h_msg) {
		let {
			data: h_data,
			transfers: a_transfers,
		} = h_msg;

		// each transfer
		a_transfers.forEach((h_transfer) => {
			// path to object
			let a_path = h_transfer.path;

			// walk path
			let z_walk = h_head;
			let nl_path = a_path.length;
			a_path.forEach((s_step, i_step) => {
				// final step
				if(i_step === nl_path-1) {
				}

				// no such step
				if(!(s_step in z_walk)) {
					throw new Error(`no such key '${s_step}' found while walking path along .${a_path.join('.')}`);
				}

				// take step
				z_walk = z_walk[s_step];
			});
		});

		// stream object
	},
});
