module.exports = {
	K_SELF: process.env.WORKER_DEPTH? require('./self.js'): null,
	DC_WORKER: require('./worker.js'),
	DC_CHANNEL: require('./channel.js'),
	H_TYPED_ARRAYS: require('./typed-arrays.js'),
	N_CORES: require('os').cpus().length,
	sharing: require('./sharing.js'),
	stream: require('./stream.js'),
	ports: d => d,
};
