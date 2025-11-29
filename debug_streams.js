const { SDK } = require('@somnia-chain/streams');

const sdk = new SDK({});
const proto = Object.getPrototypeOf(sdk.streams);
console.log('Prototype methods:', Object.getOwnPropertyNames(proto));

console.log('Has setAndEmitEvents:', typeof sdk.streams.setAndEmitEvents);
console.log('Has publish:', typeof sdk.streams.publish);
console.log('Has emit:', typeof sdk.streams.emit);
console.log('Has emitEvents:', typeof sdk.streams.emitEvents);
console.log('Has setData:', typeof sdk.streams.setData);

