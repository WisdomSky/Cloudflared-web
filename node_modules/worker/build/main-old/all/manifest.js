const {
	sharing,
} = require('./locals.js');

module.exports = class manifest {
	static from(z_other) {
		// manifest
		if(z_other instanceof manifest) {
			return z_other;
		}
		// any
		else {
			return new manifest(z_other, []);
		}
	}

	constructor(a_data=[], z_transfer_paths=true) {
		// not an array
		if(!Array.isArray(a_data)) {
			throw new Error('a manifest represents an array of arguments; pass the constructor an array');
		}

		// not a list; find transfers manually
		let a_transfer_paths = z_transfer_paths;
		if(!Array.isArray(a_transfer_paths)) {
			a_transfer_paths = this.extract(a_data);
		}
		// only check top level
		else {
			let a_transfers = [];
			for(let i_datum=0, nl_data=a_data.length; i_datum<nl_data; i_datum++) {
				let z_datum = a_data[i_datum];

				// shareable item
				if(sharing(z_datum)) a_transfers.push([i_datum]);
			}

			// solidify transfers
			if(a_transfers.length) {
				a_transfer_paths = a_transfers;
			}
		}

		Object.assign(this, {
			data: a_data,
			transfer_paths: a_transfer_paths,
		});
	}

	extract(z_data, a_path=[], zi_path_last=null) {
		// protect against [object] null
		if(!z_data) return [];

		// set of paths
		let a_paths = [];

		// object
		if('object' === typeof z_data) {
			// copy path
			a_path = a_path.slice();

			// commit to it
			if(null !== zi_path_last) a_path.push(zi_path_last);

			// plain object literal
			if(Object === z_data.constructor) {
				// scan over enumerable properties
				for(let s_property in z_data) {
					// extract data and transfers by recursing on property
					a_paths.push(...this.extract(z_data[s_property], a_path, s_property));
				}
			}
			// array
			else if(Array.isArray(z_data)) {
				// empty array
				if(!z_data.length) return [];

				// scan over each item
				z_data.forEach((z_item, i_item) => {
					// extract data and transfers by recursing on item
					a_paths.push(...this.extract(z_item, a_path, i_item));
				});
			}
			// shareable data
			else if(sharing(z_data)) {
				return [a_path];
			}
		}

		// return paths
		return a_paths;
	}

	prepend(z_arg) {
		// copy items
		let a_items = this.data.slice();

		// copy transfer paths
		let a_transfer_paths = this.transfer_paths.slice();

		// push a manifest to front
		if(z_arg instanceof manifest) {
			// add its contents as a single item
			a_items.unshift(z_arg.data);

			// how many paths to offset import by
			let nl_paths = a_transfer_paths.length;

			// update import paths (primary index needs update)
			let a_import_paths = z_arg.transfer_paths;
			a_import_paths.forEach((a_path) => {
				a_path[0] += nl_paths;
			});

			// append its transfer paths
			a_transfer_paths.push(a_import_paths);
		}
		// anything else
		else {
			// just add to front
			a_items.unshift(z_arg);
		}

		// create new manifest
		return new manifest(a_items, a_transfer_paths);
	}

	paths(...a_unshift) {
		return this.transfer_paths.map((a_path) => {
			return [...a_unshift, ...a_path];
		});
	}
};
