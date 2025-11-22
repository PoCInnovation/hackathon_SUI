import { SealClient, SessionKey } from '@mysten/seal';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { fromHex } from '@mysten/sui/utils';

const PACKAGE_ID = '0x62d5d773ee18880e3ec80a8f6beaee30e1cd961cbbf4c712959ce63f9893fd88';
const WHITELIST_ID = '0x63090ed01c52e4963a31a6b27e91f5608bd297b1b3a5b3e63e4d8191540251be';
const PUBLISHER = 'https://publisher.walrus-testnet.walrus.space';
const AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space';

export interface EncryptResult {
  metadataBlobId: string;
  dataBlobId: string;
  nonce: string;
  originalSize: number;
}

export interface Metadata {
  packageId: string;
  whitelistId: string;
  nonce: string;
  dataBlobId: string;
  timestamp: number;
  originalSize: number;
  originalFilename?: string;
}

export class SealWalrusService {
  private suiClient: SuiClient;
  private sealClient: SealClient;

  constructor(suiClient: SuiClient) {
    this.suiClient = suiClient;
    this.sealClient = new SealClient({
      suiClient,
      serverConfigs: [
        { objectId: '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75', weight: 1 }
      ],
      verifyKeyServers: false,
    });
  }

  /**
   * Encrypt data and store on Walrus
   */
  async encryptAndStore(data: Buffer, filename?: string): Promise<EncryptResult> {
    // Generate nonce
    const nonce = 'file-' + Date.now();

    // Build ID: [whitelistObjectId][nonce]
    const cleanWhitelistId = WHITELIST_ID.startsWith('0x') ? WHITELIST_ID.slice(2) : WHITELIST_ID;
    const whitelistIdBytes = fromHex(cleanWhitelistId);
    const nonceBytes = new TextEncoder().encode(nonce);
    const idBytes = new Uint8Array([...whitelistIdBytes, ...nonceBytes]);
    const hexId = Array.from(idBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    // Encrypt with Seal
    const result = await this.sealClient.encrypt({
      threshold: 1,
      packageId: PACKAGE_ID,
      id: hexId,
      data: new Uint8Array(data),
    });

    // Upload encrypted data to Walrus
    const dataResponse = await fetch(`${PUBLISHER}/v1/blobs?epochs=5`, {
      method: 'PUT',
      body: result.encryptedObject,
    });

    const dataWalrusResult = await dataResponse.json();
    const dataBlobId = dataWalrusResult.newlyCreated 
      ? dataWalrusResult.newlyCreated.blobObject.blobId 
      : dataWalrusResult.alreadyCertified.blobId;

    // Create metadata (without backupKey for security)
    const metadata: Metadata = {
      packageId: PACKAGE_ID,
      whitelistId: WHITELIST_ID,
      nonce,
      dataBlobId,
      timestamp: Date.now(),
      originalSize: data.length,
      originalFilename: filename,
    };

    // Upload metadata to Walrus
    const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
    const metadataResponse = await fetch(`${PUBLISHER}/v1/blobs?epochs=5`, {
      method: 'PUT',
      body: metadataBytes,
    });

    const metadataWalrusResult = await metadataResponse.json();
    const metadataBlobId = metadataWalrusResult.newlyCreated 
      ? metadataWalrusResult.newlyCreated.blobObject.blobId 
      : metadataWalrusResult.alreadyCertified.blobId;

    return {
      metadataBlobId,
      dataBlobId,
      nonce,
      originalSize: data.length,
    };
  }

  /**
   * Decrypt data from Walrus
   */
  async decryptFromWalrus(
    metadataBlobId: string,
    address: string,
    signPersonalMessage: (message: Uint8Array) => Promise<string>
  ): Promise<Buffer> {
    // Fetch metadata from Walrus
    const metadataResponse = await fetch(`${AGGREGATOR}/v1/blobs/${metadataBlobId}`);
    if (!metadataResponse.ok) {
      throw new Error(`Failed to fetch metadata: ${metadataResponse.status}`);
    }

    const metadataBytes = await metadataResponse.arrayBuffer();
    const metadata: Metadata = JSON.parse(new TextDecoder().decode(metadataBytes));

    // Fetch encrypted data from Walrus
    const dataResponse = await fetch(`${AGGREGATOR}/v1/blobs/${metadata.dataBlobId}`);
    if (!dataResponse.ok) {
      throw new Error(`Failed to fetch encrypted data: ${dataResponse.status}`);
    }

    const encryptedObject = new Uint8Array(await dataResponse.arrayBuffer());

    // Create session key
    const sessionKey = await SessionKey.create({
      address,
      packageId: metadata.packageId,
      ttlMin: 10,
      suiClient: this.suiClient,
    });

    const personalMessage = sessionKey.getPersonalMessage();
    const signature = await signPersonalMessage(personalMessage);
    sessionKey.setPersonalMessageSignature(signature);

    // Build ID for policy
    const cleanWhitelistId = metadata.whitelistId.startsWith('0x') 
      ? metadata.whitelistId.slice(2) 
      : metadata.whitelistId;
    const whitelistIdBytes = fromHex(cleanWhitelistId);
    const nonceBytes = new TextEncoder().encode(metadata.nonce);
    const idBytes = new Uint8Array([...whitelistIdBytes, ...nonceBytes]);

    // Create seal_approve transaction
    const tx = new Transaction();
    tx.moveCall({
      target: `${metadata.packageId}::whitelist::seal_approve`,
      arguments: [
        tx.pure.vector('u8', Array.from(idBytes)),
        tx.object(metadata.whitelistId),
      ],
    });

    const txBytes = await tx.build({
      client: this.suiClient,
      onlyTransactionKind: true,
    });

    // Decrypt
    const decrypted = await this.sealClient.decrypt({
      data: encryptedObject,
      sessionKey,
      txBytes,
    });

    return Buffer.from(decrypted);
  }

  /**
   * Get metadata from Walrus
   */
  async getMetadata(metadataBlobId: string): Promise<Metadata> {
    const response = await fetch(`${AGGREGATOR}/v1/blobs/${metadataBlobId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status}`);
    }

    const metadataBytes = await response.arrayBuffer();
    return JSON.parse(new TextDecoder().decode(metadataBytes));
  }
}
