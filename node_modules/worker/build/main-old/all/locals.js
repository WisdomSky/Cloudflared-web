/* eslint-disable no-new-func */

// deduce the runtime environment
const [B_BROWSER, B_BROWSERIFY] = (() => 'undefined' === typeof process
	? [true, false]
	: (process.browser
		? [true, true]
		: ('undefined' === process.versions || 'undefined' === process.versions.node
			? [true, false]
			: [false, false])))();

const locals = module.exports = Object.assign({
	B_BROWSER,
	B_BROWSERIFY,

	HP_WORKER_NOTIFICATION: Symbol('worker notification'),
}, B_BROWSER? require('../browser/locals.js'): require('../node/locals.js'), {

	webworkerify(z_import, h_config={}) {
		const [F_FUNCTION_BUNDLE, H_SOURCES, H_CACHE] = h_config.browserify;
		let s_worker_key = '';
		for(let s_cache_key in H_CACHE) {
			let z_exports = H_CACHE[s_cache_key].exports;
			if(z_import === z_exports || z_import === z_exports.default) {
				s_worker_key = s_cache_key;
				break;
			}
		}

		if(!s_worker_key) {
			s_worker_key = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);
			let h_cache_worker = {};
			for(let s_key_cache in H_SOURCES) {
				h_cache_worker[s_key_cache] = s_key_cache;
			}
			H_SOURCES[s_worker_key] = [
				new Function(['require', 'module', 'exports'], `(${z_import})(self);`),
				h_cache_worker,
			];
		}

		let s_source_key = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);
		H_SOURCES[s_source_key] = [
			new Function(['require'], `
				let f = require(${JSON.stringify(s_worker_key)});
				// debugger;
				// (f.default? f.default: f)(self);
			`),
			{[s_worker_key]:s_worker_key},
		];

		let h_worker_sources = {};
		function resolve_sources(s_key) {
			h_worker_sources[s_key] = true;
			let h_source = H_SOURCES[s_key][1];
			for(let p_dependency in h_source) {
				let s_dependency_key = h_source[p_dependency];
				if(!h_worker_sources[s_dependency_key]) {
					resolve_sources(s_dependency_key);
				}
			}
		}
		resolve_sources(s_source_key);

		let s_source = `(${F_FUNCTION_BUNDLE})({
			${Object.keys(h_worker_sources).map((s_key) => {
				let a_source = H_SOURCES[s_key];
				return JSON.stringify(s_key)
					+`:[${a_source[0]},${JSON.stringify(a_source[1])}]`;
			})}
		}, {}, [${JSON.stringify(s_source_key)}])`;

		let d_blob = new Blob([s_source], {type:'text/javascript'});
		if(h_config.bare) {
			return d_blob;
		}
		let p_worker_url = URL.createObjectURL(d_blob);
		let d_worker = new locals.DC_WORKER(p_worker_url, h_config.worker_options);
		// d_worker.objectURL = p_worker_url;
		// d_worker.source = d_blob;
		d_worker.source = s_source;
		return d_worker;
	},
});

