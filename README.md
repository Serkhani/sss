# Somnia Stream Studio

A "Postman-like" GUI for the Somnia Data Streams SDK. Visually build schemas, publish data via dynamic forms, simulate high-frequency traffic, and monitor real-time streams without writing code.

This project also includes a **Chat App Demo** to showcase a real-world use case of the SDK.

## Features

### 🛠️ Schema Builder
- **Visual Editor**: Add fields (string, uint64, int32, bool, address, bytes32) dynamically.
- **Auto-Generation**: Instantly see the canonical schema string.
- **Registration**: One-click registration to the Somnia Testnet.

### 🚀 Dynamic Publisher
- **Form Generation**: Automatically renders input forms based on your schema.
- **Data Encoding**: Handles type conversion and encoding (e.g., dates to uint64 timestamps).
- **Flexible IDs**: Choose between Random IDs (for logs) or Fixed IDs (for state updates).

### ⚡ Traffic Simulator (Chaos Mode)
- **High-Frequency**: Auto-generates and publishes random data every 500ms.
- **Visual Feedback**: "Heartbeat" animation to visualize traffic flow.
- **Stress Testing**: Perfect for testing stream throughput and subscriber latency.

### 📡 Live Inspector
- **Real-Time Feed**: Subscribe to any Schema ID and watch events roll in.
- **JSON Viewer**: Inspect the raw decoded data payload.

### 💬 Chat App Demo (`/chat`)
- **Full Implementation**: A working on-chain chat application.
- **Real-Time**: Polls for new messages from the blockchain.
- **Secure**: Uses server-side wallet for publishing messages.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui concepts
- **Blockchain**: `viem` + `@somnia-chain/streams`

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   Create a `.env.local` file:
   ```env
   RPC_URL=https://dream-rpc.somnia.network
   PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
   CHAT_PUBLISHER=0xYOUR_WALLET_ADDRESS_HERE
   ```
   *Note: `PRIVATE_KEY` is required for the Chat App API to publish messages.*

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Open the App**
   - **Studio**: [http://localhost:3000](http://localhost:3000)
   - **Chat Demo**: [http://localhost:3000/chat](http://localhost:3000/chat)

## Project Structure

- `components/schema`: Schema Builder logic.
- `components/publish`: Dynamic Form and Traffic Simulator.
- `components/monitor`: Live Feed inspector.
- `components/providers`: Global StreamProvider (SDK & Wallet).
- `lib/utils`: Helpers for schema parsing and random data generation.
- `lib/chatService.ts`: Core logic for the Chat App.
- `app/api`: API routes for the Chat App.

## License
MIT
