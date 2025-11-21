const { SDK } = require('@somnia-chain/streams');

const sdk = new SDK({});
console.log('streams keys:', Object.keys(sdk.streams));
console.log('streams.set length:', sdk.streams.set.length);
console.log('streams.subscribe length:', sdk.streams.subscribe.length);

// Mocking set
try {
    // sdk.streams.set(1, '0x'); // Try 2 args
} catch (e) {
    console.log('set 2 args error:', e.message);
}
