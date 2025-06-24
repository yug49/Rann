-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "sessionData" TEXT NOT NULL,
    "lastActive" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "yodha_nfts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "traits" TEXT NOT NULL,
    "metadataUri" TEXT,
    "isTraining" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "training_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" REAL NOT NULL DEFAULT 0,
    "startedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "estimatedDuration" INTEGER NOT NULL,
    "rewards" TEXT NOT NULL DEFAULT '{}',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "battle_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attackerTokenId" TEXT NOT NULL,
    "defenderTokenId" TEXT NOT NULL,
    "winner" TEXT NOT NULL,
    "damageDealt" TEXT NOT NULL,
    "experienceGained" TEXT NOT NULL,
    "rewardsEarned" TEXT NOT NULL DEFAULT '{}',
    "battleType" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "metadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "api_usage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "userAddress" TEXT,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "requestSize" INTEGER,
    "responseSize" INTEGER,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "context" TEXT,
    "userAddress" TEXT,
    "endpoint" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_address_key" ON "user_sessions"("address");

-- CreateIndex
CREATE UNIQUE INDEX "yodha_nfts_tokenId_key" ON "yodha_nfts"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "metadata_type_entityId_key" ON "metadata"("type", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");
