module.exports = (dz_thing) => {
	Object.assign(dz_thing, {
		on(...a_args) {
			// single event
			if(2 === a_args.length) {
				this['on'+a_args[0]] = a_args[1];
			}
			// multiple events
			else if(1 === a_args.length && 'object' === typeof a_args[0]) {
				let h_events = a_args[0];
				for(let s_event in h_events) {
					this['on'+s_event] = h_events[s_event];
				}
			}
			// nope
			else {
				throw new Error('misuse of on binding');
			}
		},

		removeListener(s_event) {
			this.removeEventListener(s_event, this['on'+s_event]);
		},
	});

	return dz_thing;
};
