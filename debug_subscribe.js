const { SDK } = require('@somnia-chain/streams');

// Mock SDK setup - we can't easily mock the websocket connection in this environment
// but we can check if the method throws immediately with bad args.

async function test() {
    const sdk = new SDK({});
    console.log('Testing subscribe...');
    try {
        // Try to subscribe with a dummy handler
        await sdk.streams.subscribe({
            somniaStreamsEventId: 'ChaosEvent',
            onData: (data) => console.log('Data:', data),
            ethCalls: []
        });
        console.log('Subscribe call successful (no error thrown)');
    } catch (e) {
        console.log('Subscribe failed:', e.message);
    }
}

test();
