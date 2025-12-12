# Changelog

## v0.2.0 - Multi-Publisher & Mobile Update

### 🚀 New Features

- **Multi-Publisher Aggregator**:
  - **Stream Aggregator**: New component to fetch, merge, and visualize data from multiple publishers for a specific schema.
  - **Multi-Wallet Simulation**: `TrafficSimulator` now supports managing multiple private keys to simulate diverse network traffic.
  
- **Mobile Experience**:
  - **Mobile Navigation**: Added a slide-out drawer menu for better mobile accessibility.
  - **Responsive Layouts**: Optimized `SchemaBuilder`, `TrafficSimulator`, `LiveFeed`, and `StreamExplorer` for small screens.

### 🛠️ SDK & Core Updates

- **SDK v0.11.0 Compliance**: Updated `registerDataSchemas` and `registerEventSchemas` usage to match new breaking API changes (`schemaName` and nested `schema` objects).
- **Schema Composition**: Added support for extending schemas (Parent Schema ID) in `SchemaBuilder`.

### 🐛 Bug Fixes

- **Schema IDs**: Fixed computation logic for extended schemas.
- **UI Constraints**: Added real-time validation to prevent duplicate schema names.
