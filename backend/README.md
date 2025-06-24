# Rann Backend Service - Technical Implementation Flow

## 🏗️ Architecture Overview

The Rann backend is a production-ready TypeScript/Node.js service that acts as a secure bridge between NEAR AI agents and Flow blockchain smart contracts. It handles AI-generated content, cryptographic signing, and decentralized data storage for the Rann gaming ecosystem.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │───▶│  Backend API    │───▶│  Blockchain     │
│   (Web/Mobile)  │    │  (Express.js)   │    │  (Flow/NEAR)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  AI Services    │
                       │  (NEAR Agents)  │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  IPFS Storage   │
                       │  (Metadata)     │
                       └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ with npm/yarn
- PostgreSQL or SQLite database
- NEAR Protocol testnet account
- Flow blockchain testnet account
- IPFS/Pinata API keys (optional)

### Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run migrate

# Start production server
npm start

# Or for development with TypeScript compilation
npm run dev
```

## 📁 Project Structure

```
Rann Backend/
├── src/                      # TypeScript source code (development)
│   ├── middleware/           # Express middleware layer
│   │   ├── auth.ts          # JWT authentication & wallet verification
│   │   ├── errorHandler.ts  # Centralized error handling
│   │   ├── requestLogger.ts # Request/response logging
│   │   └── serviceInjector.ts # Dependency injection
│   ├── routes/              # API route handlers
│   │   ├── auth.ts         # Authentication endpoints
│   │   ├── traits.ts       # Yodha trait generation & management
│   │   ├── training.ts     # Training system endpoints
│   │   ├── battle.ts       # Battle simulation endpoints
│   │   ├── metadata.ts     # NFT metadata & IPFS operations
│   │   └── health.ts       # Health monitoring endpoints
│   ├── services/           # Business logic layer
│   │   ├── DatabaseService.ts # Prisma ORM database operations
│   │   ├── NearAIService.ts   # NEAR AI agent integration
│   │   ├── FlowService.ts     # Flow blockchain integration
│   │   ├── CryptoService.ts   # Cryptographic operations
│   │   └── FilecoinService.ts # IPFS/Filecoin storage
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts       # Global type exports
│   └── server.ts          # Main application entry point
├── prisma/                # Database schema & migrations
│   ├── schema.prisma     # Database model definitions
│   └── migrations/       # Database migration files
├── dist/                 # Build output directory (auto-generated)
├── server-production.js  # Production-ready compiled server
├── package.json         # Node.js dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── .env.example         # Environment variables template
├── .gitignore          # Git ignore patterns
├── deploy.sh           # Deployment script
├── final-test.sh       # API testing script
├── DEPLOYMENT-GUIDE.md # Deployment instructions
└── README.md           # This file
```

### Clean Architecture Notes

- **Development**: Work in `src/` with TypeScript files only
- **Production**: Use `server-production.js` for deployment
- **Build Output**: Compiled files go to `dist/` (gitignored)
- **No Compiled JS**: Source directory kept clean of `.js` files
- **Essential Only**: Removed test files, duplicate scripts, and unused code

## 🔄 Implementation Flow

### 1. Server Initialization (`src/server.ts`)

```typescript
┌─────────────────────────────────────────────────────────────┐
│                    Server Startup Flow                     │
├─────────────────────────────────────────────────────────────┤
│  1. Load Environment Variables                             │
│  2. Initialize Service Registry (Dependency Injection)     │
│  3. Connect to Database (Prisma)                          │
│  4. Initialize External Services:                         │
│     • NEAR AI Service                                     │
│     • Flow Blockchain Service                             │
│     • IPFS/Filecoin Service                              │
│     • Crypto Service                                      │
│  5. Setup Express Middleware Stack                        │
│  6. Mount API Routes                                       │
│  7. Start HTTP Server                                      │
│  8. Setup Graceful Shutdown Handlers                      │
└─────────────────────────────────────────────────────────────┘
```

**Key Components:**
- **Service Registry Pattern**: Centralized dependency injection container
- **Health Monitoring**: Periodic service health checks
- **Graceful Shutdown**: Proper cleanup of resources and connections
- **Security Stack**: CORS, Helmet, Rate limiting, Request validation

### 2. Authentication Flow (`src/routes/auth.ts`)

```typescript
┌─────────────────────────────────────────────────────────────┐
│                 Wallet-Based Authentication                 │
├─────────────────────────────────────────────────────────────┤
│  POST /api/auth/nonce                                      │
│  ├─ Generate cryptographic nonce                          │
│  ├─ Store in session (5min expiry)                        │
│  └─ Return message for wallet signing                     │
│                                                            │
│  POST /api/auth/login                                      │
│  ├─ Verify wallet signature                               │
│  ├─ Validate nonce authenticity                           │
│  ├─ Generate JWT token                                     │
│  ├─ Store user session                                     │
│  └─ Set secure HTTP-only cookie                           │
│                                                            │
│  Protected Routes                                          │
│  ├─ Extract JWT from cookie/header                        │
│  ├─ Verify token signature                                │
│  ├─ Load user session data                                │
│  └─ Inject user context into request                      │
└─────────────────────────────────────────────────────────────┘
```

**Security Features:**
- **Wallet Signature Verification**: ECDSA signature validation
- **Nonce-based Authentication**: Prevents replay attacks
- **JWT with Secure Cookies**: HTTP-only, SameSite protection
- **Session Management**: Database-backed session storage

### 3. AI-Powered Trait Generation (`src/routes/traits.ts`)

```typescript
┌─────────────────────────────────────────────────────────────┐
│                 Yodha Trait Generation Flow                │
├─────────────────────────────────────────────────────────────┤
│  POST /api/traits/generate                                 │
│  ├─ 1. Validate user authentication                       │
│  ├─ 2. Parse generation parameters:                       │
│  │    • Rarity level (common → legendary)                │
│  │    • User preferences                                  │
│  │    • Generation constraints                            │
│  │    • Random seed (optional)                           │
│  ├─ 3. Call NEAR AI Service:                             │
│  │    • Send request to AI trait generator               │
│  │    • Apply rarity-based stat multipliers             │
│  │    • Generate balanced attribute distribution         │
│  ├─ 4. Process AI Response:                              │
│  │    • Validate generated traits                        │
│  │    • Apply game balance rules                         │
│  │    • Generate unique name & description               │
│  ├─ 5. Store to Database:                                │
│  │    • Save traits with tokenId                         │
│  │    • Link to user's wallet address                    │
│  ├─ 6. Upload to IPFS:                                   │
│  │    • Create metadata JSON                             │
│  │    • Store on decentralized storage                   │
│  │    • Get IPFS hash & gateway URLs                     │
│  └─ 7. Return complete trait object                       │
└─────────────────────────────────────────────────────────────┘
```

**AI Integration Points:**
- **NEAR AI Agents**: Specialized trait generation algorithms
- **Fallback System**: Mock generation if AI services unavailable
- **Quality Assurance**: Trait validation and balance checks

### 4. Training System (`src/routes/training.ts`)

```typescript
┌─────────────────────────────────────────────────────────────┐
│                    Training System Flow                    │
├─────────────────────────────────────────────────────────────┤
│  POST /api/training/start                                  │
│  ├─ 1. Verify Yodha ownership                            │
│  ├─ 2. Check training availability                        │
│  ├─ 3. Get AI training recommendations                    │
│  ├─ 4. Create training session                            │
│  ├─ 5. Register on Flow blockchain (optional)             │
│  └─ 6. Start progress tracking                            │
│                                                            │
│  GET /api/training/:sessionId                              │
│  ├─ 1. Calculate current progress                         │
│  ├─ 2. Update progress in database                        │
│  ├─ 3. Check completion status                            │
│  └─ 4. Auto-complete if 100% progress                     │
│                                                            │
│  POST /api/training/:sessionId/complete                    │
│  ├─ 1. Validate training completion                       │
│  ├─ 2. Apply stat improvements                            │
│  ├─ 3. Award experience points                            │
│  ├─ 4. Check for level upgrades                           │
│  ├─ 5. Add new skills (if applicable)                     │
│  └─ 6. Update blockchain state                            │
└─────────────────────────────────────────────────────────────┘
```

**Training Types:**
- **Stat Training**: Improve base attributes (strength, defense, etc.)
- **Skill Training**: Learn new combat abilities
- **Experience Training**: General level progression
- **Combat Training**: Battle-specific improvements

### 5. Battle System (`src/routes/battle.ts`)

```typescript
┌─────────────────────────────────────────────────────────────┐
│                    Battle Simulation Flow                  │
├─────────────────────────────────────────────────────────────┤
│  POST /api/battle/challenge                                │
│  ├─ 1. Validate participants:                             │
│  │    • Check Yodha ownership                             │
│  │    • Verify training availability                      │
│  │    • Ensure different opponents                        │
│  ├─ 2. Register battle on Flow blockchain                 │
│  ├─ 3. AI Battle Simulation:                             │
│  │    • Calculate battle power scores                     │
│  │    • Determine win probabilities                       │
│  │    • Simulate round-by-round combat                   │
│  │    • Generate battle narrative                         │
│  ├─ 4. Process Battle Results:                           │
│  │    • Award experience to participants                  │
│  │    • Update battle statistics                          │
│  │    • Check for level upgrades                         │
│  │    • Update battle history                            │
│  ├─ 5. Store Results:                                    │
│  │    • Save to database                                 │
│  │    • Update blockchain state                          │
│  └─ 6. Return detailed battle report                      │
└─────────────────────────────────────────────────────────────┘
```

**Battle Types:**
- **PvP**: Player vs Player battles
- **PvE**: Player vs Environment/AI
- **Tournament**: Structured competition
- **Training**: Practice battles

### 6. Metadata Management (`src/routes/metadata.ts`)

```typescript
┌─────────────────────────────────────────────────────────────┐
│                 NFT Metadata & IPFS Flow                  │
├─────────────────────────────────────────────────────────────┤
│  POST /api/metadata/upload                                 │
│  ├─ 1. Validate file type & size                          │
│  ├─ 2. Upload to IPFS network                            │
│  ├─ 3. Pin to multiple providers                          │
│  ├─ 4. Store metadata in database                         │
│  └─ 5. Return IPFS hash & gateway URLs                    │
│                                                            │
│  POST /api/metadata/yodha/:tokenId                         │
│  ├─ 1. Generate comprehensive metadata:                   │
│  │    • OpenSea-compatible format                        │
│  │    • Trait attributes                                  │
│  │    • Battle statistics                                 │
│  │    • Rarity information                               │
│  ├─ 2. Upload metadata JSON to IPFS                       │
│  ├─ 3. Update Yodha traits with metadata URI              │
│  └─ 4. Return metadata & IPFS links                       │
└─────────────────────────────────────────────────────────────┘
```

**IPFS Integration:**
- **Multi-Provider**: Pinata, Lighthouse, Web3.Storage
- **Redundancy**: Multiple pinning services for reliability
- **Gateway URLs**: Multiple access points for metadata

## 🔧 Service Layer Architecture

### Database Service (`src/services/DatabaseService.ts`)
```typescript
┌─────────────────────────────────────────────────────────────┐
│                    Database Operations                      │
├─────────────────────────────────────────────────────────────┤
│  • User Session Management                                 │
│  • Yodha NFT Storage (JSON traits)                        │
│  • Training Session Tracking                              │
│  • Battle Result Recording                                 │
│  • Metadata Storage & Retrieval                           │
│  • System Configuration                                    │
│  • API Usage Analytics                                     │
│  • Error Logging                                          │
└─────────────────────────────────────────────────────────────┘
```

### NEAR AI Service (`src/services/NearAIService.ts`)
```typescript
┌─────────────────────────────────────────────────────────────┐
│                    AI Service Integration                   │
├─────────────────────────────────────────────────────────────┤
│  • Trait Generation via NEAR Agents                       │
│  • Battle Simulation & Outcome Prediction                 │
│  • Training Recommendations                               │
│  • Performance Analysis                                    │
│  • Mock Fallback Systems                                  │
│  • AI Model Configuration                                 │
└─────────────────────────────────────────────────────────────┘
```

### Flow Blockchain Service (`src/services/FlowService.ts`)
```typescript
┌─────────────────────────────────────────────────────────────┐
│                   Flow Blockchain Integration               │
├─────────────────────────────────────────────────────────────┤
│  • NFT Minting & Metadata Updates                         │
│  • Battle Registration & Results                          │
│  • Training Session Management                            │
│  • Smart Contract Interactions                            │
│  • Transaction Monitoring                                 │
│  • Event Listening & Processing                           │
└─────────────────────────────────────────────────────────────┘
```

### Crypto Service (`src/services/CryptoService.ts`)
```typescript
┌─────────────────────────────────────────────────────────────┐
│                 Cryptographic Operations                   │
├─────────────────────────────────────────────────────────────┤
│  • Wallet Signature Verification                          │
│  • Message Signing & Validation                           │
│  • Key Generation & Management                            │
│  • Data Encryption/Decryption                            │
│  • Hash Generation & Verification                         │
│  • Address Validation                                     │
└─────────────────────────────────────────────────────────────┘
```

### Filecoin/IPFS Service (`src/services/FilecoinService.ts`)
```typescript
┌─────────────────────────────────────────────────────────────┐
│                 Decentralized Storage                      │
├─────────────────────────────────────────────────────────────┤
│  • IPFS Upload & Pinning                                  │
│  • Multi-Provider Redundancy                              │
│  • Metadata JSON Storage                                  │
│  • Image & Asset Management                               │
│  • Content Retrieval & Caching                           │
│  • Gateway URL Generation                                 │
└─────────────────────────────────────────────────────────────┘
```

## 🛡️ Security & Production Features

### Authentication & Authorization
- **Wallet-based Authentication**: No passwords, crypto-native security
- **JWT Token Management**: Secure, stateless authentication
- **Role-based Access Control**: Admin vs user permissions
- **Session Management**: Database-backed session storage

### Data Security
- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Prisma ORM parameterized queries
- **XSS Protection**: Helmet security headers
- **CORS Configuration**: Strict origin controls

### Monitoring & Observability
- **Health Checks**: Service availability monitoring
- **Request Logging**: Detailed request/response tracking
- **Error Tracking**: Centralized error collection
- **API Analytics**: Usage metrics and rate limiting

### Production Deployment
- **Environment Configuration**: Flexible config management
- **Database Migrations**: Version-controlled schema changes
- **Graceful Shutdown**: Proper resource cleanup
- **Error Recovery**: Automatic service restart capabilities

## 📊 Database Schema

```sql
-- User Sessions (JWT & wallet auth)
user_sessions {
  id: UUID
  address: String (wallet address)
  sessionData: JSON (session info)
  lastActive: DateTime
}

-- Yodha NFT Data (JSON storage for flexibility)
yodha_nfts {
  id: UUID
  tokenId: String (unique)
  owner: String (wallet address)
  traits: JSON (complete trait data)
  metadataUri: String (IPFS link)
  isTraining: Boolean
}

-- Training Sessions
training_sessions {
  id: String
  tokenId: String
  type: String (stat_training, skill_training, etc.)
  status: String (active, completed, cancelled)
  progress: Float (0-100%)
  rewards: JSON (stat improvements, exp, etc.)
  metadata: JSON (AI recommendations, etc.)
}

-- Battle Results
battle_results {
  id: String
  attackerTokenId: String
  defenderTokenId: String
  winner: String
  damageDealt: JSON
  experienceGained: JSON
  battleType: String
  duration: Integer (milliseconds)
}

-- Metadata Storage (IPFS tracking)
metadata {
  id: UUID
  type: String (yodha, battle, ipfs_upload, etc.)
  entityId: String (tokenId, hash, etc.)
  data: JSON (metadata content)
}
```

## 🔄 API Endpoints Summary

### Authentication
- `POST /api/auth/nonce` - Generate authentication nonce
- `POST /api/auth/login` - Wallet signature login
- `POST /api/auth/logout` - Session termination
- `GET /api/auth/profile` - User profile & stats

### Trait Management
- `POST /api/traits/generate` - AI-powered trait generation
- `GET /api/traits/:tokenId` - Get Yodha traits
- `PUT /api/traits/:tokenId` - Update Yodha traits
- `POST /api/traits/:tokenId/mint` - Mint NFT on Flow
- `GET /api/traits/:tokenId/analysis` - AI performance analysis

### Training System
- `POST /api/training/start` - Start training session
- `GET /api/training/:sessionId` - Get training progress
- `POST /api/training/:sessionId/complete` - Complete training
- `GET /api/training/recommendations/:tokenId` - AI training advice

### Battle System
- `POST /api/battle/challenge` - Create battle challenge
- `GET /api/battle/:battleId` - Get battle details
- `GET /api/battle/history/:tokenId` - Battle history
- `GET /api/battle/leaderboard` - Global leaderboard
- `POST /api/battle/simulate` - Battle simulation (no execution)

### Metadata & IPFS
- `POST /api/metadata/upload` - Upload files to IPFS
- `POST /api/metadata/json` - Store JSON metadata
- `GET /api/metadata/ipfs/:hash` - Retrieve IPFS content
- `POST /api/metadata/yodha/:tokenId` - Generate Yodha metadata

### System Health
- `GET /api/health` - Overall system health
- `GET /api/health/services` - Individual service status
- `GET /api/health/database` - Database connectivity

## 🚀 Deployment & Development

### Development Commands
```bash
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm run start        # Start production server
npm run test         # Run test suite
npm run lint         # ESLint code checking
npm run migrate      # Run database migrations
npm run db:studio    # Open Prisma Studio (DB GUI)
```

### Environment Variables
```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="file:./dev.db"  # SQLite for development
# DATABASE_URL="postgresql://..." # PostgreSQL for production

# Authentication
JWT_SECRET="your-secret-key"
JWT_EXPIRY="7d"

# NEAR Protocol
NEAR_ACCOUNT_ID="your-account.testnet"
NEAR_PRIVATE_KEY="ed25519:..."
NEAR_NETWORK_ID="testnet"

# Flow Blockchain
FLOW_NETWORK="testnet"
FLOW_PRIVATE_KEY="..."
FLOW_ACCOUNT_ADDRESS="0x..."

# AI Services (Optional)
NEAR_AI_API_KEY="your-api-key"
TRAITS_GENERATOR_URL="https://your-ai-service.com"

# IPFS Storage (Optional)
PINATA_API_KEY="your-pinata-key"
LIGHTHOUSE_API_KEY="your-lighthouse-key"
```

## 🎯 Next Steps

1. **Production Deployment**: Deploy to cloud provider (AWS, GCP, etc.)
2. **AI Model Training**: Train custom models for better trait generation
3. **Scaling**: Implement Redis caching and load balancing
4. **Monitoring**: Add comprehensive logging and metrics
5. **Testing**: Expand test coverage for all endpoints
6. **Documentation**: Generate API documentation with Swagger

---

This backend service provides a robust foundation for the Rann gaming ecosystem, combining AI-powered content generation with blockchain security and decentralized storage. The modular architecture ensures easy maintenance and feature expansion.
   npm run dev
   
   # Production mode
   npm start
   ```

The service will be available at `http://localhost:3001`

## 📁 Project Structure

```
backend/
├── src/
│   ├── services/          # Core service implementations
│   │   ├── filecoin.js    # Filecoin storage service
│   │   ├── crypto.js      # Cryptographic operations
│   │   ├── nearai.js      # NEAR AI orchestration
│   │   ├── flow.js        # Flow blockchain integration
│   │   └── database.js    # PostgreSQL operations
│   ├── routes/            # API route handlers
│   │   ├── traits.js      # Trait generation endpoints
│   │   ├── training.js    # Training system endpoints
│   │   ├── metadata.js    # NFT metadata endpoints
│   │   └── health.js      # Health monitoring
│   ├── middleware/        # Express middleware
│   │   ├── auth.js        # Authentication
│   │   ├── validation.js  # Input validation
│   │   └── errorHandler.js # Error handling
│   └── index.js           # Main application entry
├── prisma/
│   └── schema.prisma      # Database schema
├── package.json
└── .env.example           # Environment template
```

## 🔧 Configuration

### Required Environment Variables

```bash
# Server
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/rann_db"

# Filecoin Storage
LIGHTHOUSE_API_KEY=your_lighthouse_api_key
WEB3_STORAGE_TOKEN=your_web3_storage_token
IPFS_GATEWAY=https://gateway.lighthouse.storage

# Cryptographic
NEAR_AI_PRIVATE_KEY=your_private_key
JWT_SECRET=your_jwt_secret

# NEAR AI
TRAIT_GENERATOR_ENDPOINT=http://localhost:8001
TRAINING_EVALUATOR_ENDPOINT=http://localhost:8002
BATTLE_MOVE_ENDPOINT=http://localhost:8003

# Flow Blockchain
FLOW_RPC_URL=http://localhost:8545
FLOW_PRIVATE_KEY=your_flow_private_key
```

## 🔗 API Endpoints

### Health & Monitoring
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed service status
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/metrics` - Performance metrics

### Trait Management
- `POST /api/traits/generate` - Generate traits for new Yodha
- `POST /api/traits/assign` - Assign traits on blockchain
- `GET /api/traits/:tokenId` - Get Yodha traits
- `POST /api/traits/special-moves` - Generate special moves

### Training System
- `POST /api/training/start` - Start training session
- `POST /api/training/submit` - Submit training answers
- `POST /api/training/complete` - Complete training on blockchain
- `GET /api/training/history/:tokenId` - Get training history

### NFT Metadata
- `GET /api/metadata/:tokenId` - OpenSea-compatible metadata
- `GET /api/metadata/:tokenId/raw` - Raw Filecoin metadata
- `GET /api/metadata/collection` - Collection metadata
- `GET /api/images/yodha/:tokenId` - Serve Yodha images

## 🔄 Workflow Examples

### 1. Generating a New Yodha

```javascript
// 1. Generate traits and moves
const response = await fetch('/api/traits/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokenId: 1,
    personalityPrompt: "A fierce warrior with noble heart",
    ownerAddress: "0x..."
  })
});

// 2. Assign traits on blockchain
await fetch('/api/traits/assign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokenId: 1,
    signature: response.data.signature
  })
});
```

### 2. Training a Yodha

```javascript
// 1. Start training session
const session = await fetch('/api/training/start', {
  method: 'POST',
  body: JSON.stringify({
    tokenId: 1,
    ownerAddress: "0x..."
  })
});

// 2. Submit answers
const evaluation = await fetch('/api/training/submit', {
  method: 'POST',
  body: JSON.stringify({
    sessionId: session.data.sessionId,
    tokenId: 1,
    questions: session.data.questions,
    answers: ["A", "B", "C", "A", "B"]
  })
});

// 3. Complete training on blockchain
await fetch('/api/training/complete', {
  method: 'POST',
  body: JSON.stringify({
    sessionId: session.data.sessionId,
    tokenId: 1,
    signature: evaluation.data.signature
  })
});
```

## 🔐 Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Configurable origin whitelist
- **Input Validation**: Comprehensive request validation
- **ECDSA Signatures**: All AI data cryptographically signed
- **JWT Authentication**: Secure session management
- **Helmet.js**: Security headers protection

## 📊 Monitoring

The service provides comprehensive health monitoring:

- **Service Health**: Database, Filecoin, AI agents, blockchain
- **Performance Metrics**: Response times, memory usage, event loop delay
- **Real-time Status**: Live service availability checking
- **Error Tracking**: Detailed error logging and reporting

## 🧪 Development

### Available Scripts
```bash
npm start              # Start production server
npm run start:production # Alternative production start
npm run dev           # Development with TypeScript watch mode
npm run build         # Compile TypeScript to JavaScript
npm run test:api      # Run API tests using final-test.sh
npm run deploy        # Deploy using deploy.sh script
```

### Database Operations
```bash
npm run migrate       # Run database migrations
npm run db:studio     # Open Prisma Studio
npm run db:generate   # Generate Prisma client
```

## 🚀 Deployment

### Clean Project Structure Benefits

This backend has been optimized for production with a clean file structure:

- **No Build Artifacts**: All compiled `.js` files are gitignored except the production server
- **Clear Separation**: TypeScript source in `src/`, production build in `server-production.js`
- **Minimal Dependencies**: Only essential files and folders remain
- **Automated Cleanup**: `.gitignore` prevents future accumulation of temporary files
- **Production Ready**: Pre-compiled server for immediate deployment

### Production Setup

1. **Environment Configuration:**
   ```bash
   NODE_ENV=production
   PORT=3001
   # Set all production environment variables in .env
   ```

2. **Database Migration:**
   ```bash
   npm run migrate
   ```

3. **Start Production Service:**
   ```bash
   npm start
   # This runs the pre-compiled server-production.js
   ```

4. **Alternative Deployment:**
   ```bash
   ./deploy.sh  # Use the automated deployment script
   ```

### Health Checks

The service provides multiple health check endpoints for load balancers and monitoring:

- `/api/health/live` - Liveness probe
- `/api/health/ready` - Readiness probe  
- `/api/health/detailed` - Full service status

## 🤝 Integration

### Smart Contract Integration

The service integrates with these Flow smart contracts:

- **YodhaNFT**: NFT minting and trait assignment
- **Gurukul**: Training system and trait updates  
- **Kurukshetra**: Battle mechanics and outcomes
- **RannToken**: Token economics and rewards
- **Bazaar**: NFT marketplace integration

### AI Agent Integration

Connects to NEAR AI agents for:

- **Trait Generation**: Personality-based attribute generation
- **Training Evaluation**: Q&A assessment and improvement calculation
- **Battle Moves**: Strategic move selection and damage calculation

## 📜 License

MIT License - see LICENSE file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the health endpoints for service status
- Review logs for detailed error information

---

**Rann Gaming Ecosystem** - Bringing AI-powered blockchain gaming to life! 🎮⚔️
