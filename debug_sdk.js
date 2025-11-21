const { SDK, SchemaEncoder } = require('@somnia-chain/streams');

console.log('--- SDK ---');
console.log('SDK constructor length:', SDK.length);
try {
    // Try with empty object
    const sdk = new SDK({});
    console.log('SDK instance keys:', Object.keys(sdk));
} catch (e) {
    console.log('SDK init error ({}):', e.message);
}

console.log('\n--- SchemaEncoder ---');
try {
    const encoder = new SchemaEncoder('uint64 timestamp, string name');
    console.log('encodeData length:', encoder.encodeData.length);

    try {
        console.log('Attempting object encode...');
        encoder.encodeData({ timestamp: 123n, name: 'test' });
        console.log('Object encode success');
    } catch (e) {
        console.log('Object encode error:', e.message);
    }

    try {
        console.log('Attempting array encode...');
        encoder.encodeData([
            { name: 'timestamp', type: 'uint64', value: 123n },
            { name: 'name', type: 'string', value: 'test' }
        ]);
        console.log('Array encode success');
    } catch (e) {
        console.log('Array encode error:', e.message);
    }

} catch (e) {
    console.log('SchemaEncoder init error:', e.message);
}
