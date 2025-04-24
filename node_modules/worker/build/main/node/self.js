const net = require('net');

const ipc = require('./ipc.js');

// open socket
let d_socket = new net.Socket({fd:4});

// create ipc
module.exports = new ipc(d_socket, {
	origin: module.parent.parent.parent.filename,
	args: process.argv.slice(2),
});
