const crypto = require('crypto');
const X25519_SPKI_PREFIX = Buffer.from('302a300506032b656e032100', 'hex');
const X25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b656e04220420', 'hex');
const privateKeyRaw = crypto.randomBytes(32);
const publicKeyRaw = crypto.randomBytes(32);
try {
  const privateKey = crypto.createPrivateKey({ key: Buffer.concat([X25519_PKCS8_PREFIX, privateKeyRaw]), format: 'der', type: 'pkcs8' });
  console.log('privateKey ok', privateKey.type);
} catch (e) {
  console.error('privateKey ERR', e.message);
}
try {
  const publicKey = crypto.createPublicKey({ key: Buffer.concat([X25519_SPKI_PREFIX, publicKeyRaw]), format: 'der', type: 'spki' });
  console.log('publicKey ok', publicKey.type);
} catch (e) {
  console.error('publicKey ERR', e.message);
}