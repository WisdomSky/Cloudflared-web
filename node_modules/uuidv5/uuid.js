'use strict';

const crypto = require('crypto');


const NAMESPACE_DNS = uuidFromString('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
const NAMESPACE_URL = uuidFromString('6ba7b811-9dad-11d1-80b4-00c04fd430c8');
const NAMESPACE_OID = uuidFromString('6ba7b812-9dad-11d1-80b4-00c04fd430c8');
const NAMESPACE_X500 = uuidFromString('6ba7b814-9dad-11d1-80b4-00c04fd430c8');
const NAMESPACE_NULL = uuidFromString('00000000-0000-0000-0000-000000000000');


function createUUIDv5Binary(namespace, name) {
	const c = Buffer.concat([namespace, name], namespace.length + name.length);

	const digest = crypto.createHash('sha1').update(c).digest();
	const uuid = new Buffer(16);

	// bbbb - bb - bb - bb - bbbbbb
	digest.copy(uuid, 0, 0, 4); // time_low
	digest.copy(uuid, 4, 4, 6); // time_mid
	digest.copy(uuid, 6, 6, 8); // time_hi_and_version
	uuid[6] = (uuid[6] & 0x0f) | 0x50; // version, 4 most significant bits are set to version 5 (0101)
	uuid[8] = (digest[8] & 0x3f) | 0x80; // clock_seq_hi_and_reserved, 2msb are set to 10
	uuid[9] = digest[9];
	digest.copy(uuid, 10, 10, 16);

	return uuid;
}

function uuidToString(uuid) {
	if(!Buffer.isBuffer(uuid)) {
		throw new Error('uuid must be a Buffer');
	}

	if(uuid.length !== 16) {
		throw new Error('uuid buffer length must be 16');
	}

	let raw = '';

	for(let i = 0; i < 16; i++) {
		raw += byteToHex(uuid[i]).toString(16);
	}

	return formatUUIDString(raw);
}

function byteToHex(n) {
	const str = n.toString(16);

	if(str.length === 1) {
		return '0' + str;
	}

	return str;
}

function formatUUIDString(uuidStr) {
	const segments = [
		uuidStr.substr(0, 8),
		uuidStr.substr(8, 4),
		uuidStr.substr(12, 4),
		uuidStr.substr(16, 4),
		uuidStr.substr(20)
	];

	return segments.join('-').toLowerCase();
}

function uuidFromString(uuid) {
	if(typeof uuid !== 'string') {
		throw new Error('uuid must be a string');
	}

	const raw = uuid.replace(/-/g, '');
	if(raw.length !== 32) {
		throw new Error('uuid string length must be 32 with -\'s removed');
	}

	const octets = [];

	for(let i = 0; i < 16; i++) {
		octets[i] = parseInt(raw.substr(i * 2, 2), 16);
	}

	return new Buffer(octets);
}

function getNamespace(namespace) {
	if(!Buffer.isBuffer(namespace)) {
		switch(namespace.toLowerCase()) { // Default namespaces
		case 'dns':
			return NAMESPACE_DNS;

		case 'url':
			return NAMESPACE_URL;

		case 'oid':
			return NAMESPACE_OID;

		case 'x500':
			return NAMESPACE_X500;

		case 'null':
		case null:
			return NAMESPACE_NULL;

		default:
			return uuidFromString(namespace);
		}
	}

	return namespace;
}

function createUUIDv5(namespace, name, binary) {
	namespace = getNamespace(namespace);

	if(!Buffer.isBuffer(name)) {
		name = new Buffer(name, 'utf8');
	}

	let uuid = createUUIDv5Binary(namespace, name);
	if(!binary) {
		uuid = uuidToString(uuid);
	}

	return uuid;
}

createUUIDv5.uuidToString = uuidToString;
createUUIDv5.uuidFromString = uuidFromString;


module.exports = createUUIDv5;
