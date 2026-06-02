const nacl = require("tweetnacl");

function hexToUint8(hex) {
  const cleaned = hex.replace(/^0x/i, "");
  const arr = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) arr[i / 2] = parseInt(cleaned.substr(i, 2), 16);
  return arr;
}

function verifyEd25519Signature(messageBuf, signatureHex, pubKeyHex) {
  try {
    const sig = hexToUint8(signatureHex);
    const pk = hexToUint8(pubKeyHex);
    return nacl.sign.detached.verify(new Uint8Array(messageBuf), sig, pk);
  } catch (e) {
    return false;
  }
}

module.exports = { verifyEd25519Signature };
