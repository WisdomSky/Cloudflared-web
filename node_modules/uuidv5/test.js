const assert = require('assert');
const uuidv5 = require('./uuid');


describe('UUIDv5', () => {
	it('converts strings to uuids', () => {
		const bin = uuidv5.uuidFromString('74738ff5-5367-5958-9aee-98fffdcd1876');

		assert(bin.equals(Buffer.from('74738ff5536759589aee98fffdcd1876', 'hex')));
	});

	it('converts uuids to strings', () => {
		const str = uuidv5.uuidToString(uuidv5.uuidFromString('74738ff5-5367-5958-9aee-98fffdcd1876'));

		assert.equal(str, '74738ff5-5367-5958-9aee-98fffdcd1876');
	});

	it('makes DNS uuids', () => {
		const r = uuidv5('dns', 'www.example.org');

		assert.equal(r, '74738ff5-5367-5958-9aee-98fffdcd1876');
	});

	it('makes URL uuids', () => {
		const r = uuidv5('url', 'http://example.org/page');

		assert.equal(r, '6b19973b-8154-5782-bca0-15e6b730ca00');
	});

	it('makes OID uuids', () => {
		const r = uuidv5('oid', '1.3.6.1.2.1');

		assert.equal(r, '2a7086de-bbf9-5cb9-9a66-a9e928c26504');
	});

	it('makes X.500 uuids', () => {
		const r = uuidv5('oid', 'uid=user,ou=people,dc=example,dc=com');

		assert.equal(r, '075749ab-61eb-54ec-807d-863ebd6f271a');
	});

	it('can return a Buffer', () => {
		const r = uuidv5('url', 'http://example.org/page', true);
		const compare = uuidv5.uuidFromString('6b19973b-8154-5782-bca0-15e6b730ca00');

		assert.deepEqual(r.toJSON(), compare.toJSON());
	});
});
