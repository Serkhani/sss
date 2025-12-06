# Changelog - Initial Release v0.1.0

## New Features

### 🚦 Traffic Simulator
- **Selective Simulation**: Added toggles to independently simulate Data Streams, Event Emissions, or both.
- **Real-Time Visualization**: Added a "Last Sent Data" JSON display to visualize the exact payload being broadcast to the network.
- **Documentation Access**: Integrated direct links to Somnia Quickstart documentation.

### 📝 Dynamic Publisher
- **Advanced Control**: Added manual configuration for Data Stream IDs and Schema IDs.
- **Flexible Modes**: Support for "Set Data", "Emit Event", or "Set & Emit" modes.
- **Documentation Access**: Integrated direct links to Writing Data documentation.

### 🔍 Live Inspector
- **Real-Time Events**: Implemented WebSocket subscription support for instant event monitoring.
- **Data Polling**: Added polling mechanism for viewing persisted Data Stream updates.
- **Documentation Access**: Integrated direct links to Reading Data documentation.

### 🛠️ Developer Tools
- **Standalone Script**: Added `npm run publish-random` to publish random data from the CLI.
- **TypeScript Support**: Converted scripts to TypeScript for better type safety and developer experience.
- **Environment config**: centralized configuration using .env file.

## Bug Fixes & Improvements
- **Dependency Resolution**: Fixed `npm install` failure by aligning `viem` version (2.37.13) with `@somnia-chain/streams` requirements.
- **Simulator Logic**: Resolved `NoCalldata` error when simulating single stream types.
- **Subscription Logic**: Fixed conflicting subscription/polling logic in Live Inspector to ensure reliable data updates.
