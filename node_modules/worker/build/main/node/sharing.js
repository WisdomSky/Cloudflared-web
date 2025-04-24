let shmmap = {
	read_write() {
		throw new Error('cannot use shared memory on this platform');
	},
};
try {
	shmmap = require('shmmap');
}
catch(e_require) {}

const stream = require('./stream.js');

const $_SHAREABLE = Symbol('shareable');

module.exports = Object.assign(function(z_object) {
	return 'object' === typeof z_object &&
		($_SHAREABLE in z_object
			|| stream.is_stream(z_object));
}, {
	$_SHAREABLE,

	extract(z_data, k_ipc) {
		// shareable data
		if($_SHAREABLE in z_data) {
			return {
				type: 'buffer',
				key: z_data.key,
				base: z_data.base(0),
				bytes: z_data.byteLength,
			};
		}
		// stream
		else if(stream.is_stream(z_data)) {
			// wrap stream, bind ipc and serialize
			return stream.serialize(z_data, k_ipc);
		}
		// something else
		else {
			throw new Error('cannot send special object over IPC: ', z_data);
		}
	},

	populate(h_data, a_transfers, k_ipc) {
		// walking start point
		let h_head = h_data;

		// each transferable item
		for(let h_transfer of a_transfers) {
			// path to object
			let a_path = h_transfer.path;

			// walk path
			let z_walk = h_head;
			for(let i_step=0, nl_path=a_path.length; i_step<nl_path; i_step++) {
				let s_step = a_path[i_step];

				// final step
				if(i_step === nl_path-1) {
					if(!h_transfer.type) {
						console.dir(h_transfer);
						throw new Error('transfer object has no "type"');
					}

					// buffer object
					if('buffer' === h_transfer.type) {
						// open array buffer
						let db_transfer = shmmap.read_write(h_transfer.key, h_transfer.bytes);

						// recreate typed array and assign instance to proper place in data
						z_walk[s_step] = new h_transfer.base.constructor(db_transfer);
					}
					// stream object
					else if(h_transfer.type.endsWith('_stream')) {
						// recreate stream
						z_walk[s_step] = stream.open(h_transfer, k_ipc);
					}
					// something else
					else {
						throw new Error('cannot deserialize object of unknown type: ', h_transfer);
					}

					// all done
					break;
				}

				// no such step
				if(!(s_step in z_walk)) {
					throw new Error(`no such key '${s_step}' found while walking path along .${a_path.join('.')}`);
				}

				// take step
				z_walk = z_walk[s_step];
			}
		}
	},
});
