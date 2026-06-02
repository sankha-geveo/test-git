# Sankha's Assets — Evernode Smart Contract

This project implements an on-chain asset lifecycle registry with role-based access control using Evernode's HotPocket framework.

## Roles
- ADMIN: full control, manage roles, pause/unpause, freeze/unfreeze any asset.
- USER: can create assets and manage only assets they own.
- AUDITOR: read-only access.

## Statuses
- ACTIVE | IN_TRANSIT | LOST | RETIRED | FROZEN

## Events
- AssetCreated, AssetUpdated, AssetTransferred, StatusChanged, TagAdded, TagRemoved, CustomEventRecorded,
  RoleGranted, RoleRevoked, ContractPaused, ContractUnpaused, AssetFrozen, AssetUnfrozen

## API (Service, Action, Data)
All messages are JSON with fields { Service, Action, data }.

### Access (Service: "Access")
- registerUser(userPubKey, role)
- grantRole(userPubKey, role)
- revokeRole(userPubKey, role)
- pauseContract()
- unpauseContract()

### Asset (Service: "Asset")
- createAsset(assetId, name, description, metadataUri, location, tags[])
- updateAsset(assetId, name?, description?, metadataUri?, location?)
- transferAsset(assetId, newOwner, note)
- setStatus(assetId, newStatus)
- addTag(assetId, tag)
- removeTag(assetId, tag)
- recordCustomEvent(assetId, customType, dataJson)
- freezeAsset(assetId)
- unfreezeAsset(assetId)

### Query (Service: "Query")
- getAsset(assetId)
- listAssets(owner?, status?, tag?, search?, cursor?, limit?, sortBy? (createdAt|updatedAt|name), sortDir? (asc|desc))
- getAssetHistory(assetId, cursor?, limit?)
- getStats()

### Response Format
Success: { success: <payload>, events?: [<event objects>] }
Error: { error: { code, message } }

### Example
```js
// Create asset
{
  Service: "Asset",
  Action: "createAsset",
  data: {
    assetId: "asset-001",
    name: "Laptop",
    description: "Dell XPS",
    metadataUri: "ipfs://...",
    location: "Colombo",
    tags: ["it", "device"]
  }
}
```

## Upgrade System
- Only the maintainer (env MAINTAINER_PUBKEY) can upgrade
- The client signs the zip bytes (Ed25519 detached) and the server verifies
- Version must be strictly greater than current
- Contract writes new zip to disk and creates post_exec.sh to unzip/replace

### Client CLI
```bash
cd upgrade-client
node index.js wss://localhost:8081 ./contract.zip <privateKeyHex> 1.1 "Update desc"
```

## Build & Deploy
```bash
# Build bundle
npm run build

# Deploy with hpdevkit (ensure HP_INSTANCE_IMAGE is set)
npm run start
```

## Tests
- Tests connect to ws://localhost:8081 by default
- IMPORTANT: Set your .env MAINTAINER_PUBKEY to the public key of your test client before running tests so ADMIN operations succeed.
```bash
cd src/Test
npm install
npm test
```
