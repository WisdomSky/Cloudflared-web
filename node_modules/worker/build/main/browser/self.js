const events = require('./events.js');

events(self);

self.args = [
	(Math.random()+'').slice(2, 8),
];

module.exports = self;
