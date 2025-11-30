/**
 * Event Signing System for Aether 4TSS
 * Provides cryptographic signing for critical events
 */

import * as crypto from 'crypto';

export interface SignedEvent {
  event: any;
  signature: string;
  timestamp: number;
  signingKey: string; // Key ID, not the actual key
}

export interface SigningConfig {
  algorithm: string;
  keySize: number;
  enableSigning: boolean;
  criticalEventTypes: string[];
}

export const DEFAULT_SIGNING_CONFIG: SigningConfig = {
  algorithm: 'RSA-SHA256',
  keySize: 2048,
  enableSigning: true,
  criticalEventTypes: [
    'product.deleted',
    'employee.deleted', 
    'stock.transaction.created',
    'payment.processed',
    'migration.applied',
    'migration.rollback',
    'system.backup.created'
  ]
};

export class EventSigner {
  private privateKey: string | null = null;
  private publicKey: string | null = null;
  private keyId: string;
  private config: SigningConfig;

  constructor(config?: Partial<SigningConfig>) {
    this.config = { ...DEFAULT_SIGNING_CONFIG, ...config };
    this.keyId = `key_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * Initialize with new key pair
   */
  async initialize(): Promise<void> {
    if (!this.config.enableSigning) return;

    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: this.config.keySize,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    this.publicKey = publicKey;
    this.privateKey = privateKey;
  }

  /**
   * Load existing key pair
   */
  loadKeys(publicKey: string, privateKey: string, keyId?: string): void {
    this.publicKey = publicKey;
    this.privateKey = privateKey;
    if (keyId) {
      this.keyId = keyId;
    }
  }

  /**
   * Check if event type requires signing
   */
  requiresSigning(eventType: string): boolean {
    if (!this.config.enableSigning) return false;
    return this.config.criticalEventTypes.includes(eventType);
  }

  /**
   * Sign an event
   */
  signEvent(event: any): SignedEvent {
    if (!this.config.enableSigning || !this.privateKey) {
      throw new Error('Event signing not configured or keys not loaded');
    }

    const eventData = JSON.stringify(event);
    const timestamp = Date.now();
    
    // Create signature payload
    const payload = `${eventData}:${timestamp}:${this.keyId}`;
    
    const sign = crypto.createSign(this.config.algorithm);
    sign.update(payload);
    const signature = sign.sign(this.privateKey, 'base64');

    return {
      event,
      signature,
      timestamp,
      signingKey: this.keyId
    };
  }

  /**
   * Verify a signed event
   */
  verifySignedEvent(signedEvent: SignedEvent, publicKey?: string): boolean {
    if (!this.config.enableSigning) return true; // If signing disabled, consider all valid

    const keyToUse = publicKey || this.publicKey;
    if (!keyToUse) {
      throw new Error('No public key available for verification');
    }

    try {
      const eventData = JSON.stringify(signedEvent.event);
      const payload = `${eventData}:${signedEvent.timestamp}:${signedEvent.signingKey}`;
      
      const verify = crypto.createVerify(this.config.algorithm);
      verify.update(payload);
      
      return verify.verify(keyToUse, signedEvent.signature, 'base64');
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Get public key for sharing
   */
  getPublicKey(): string | null {
    return this.publicKey;
  }

  /**
   * Get key ID
   */
  getKeyId(): string {
    return this.keyId;
  }

  /**
   * Export key pair for backup
   */
  exportKeys(): { publicKey: string; privateKey: string; keyId: string } | null {
    if (!this.publicKey || !this.privateKey) return null;
    
    return {
      publicKey: this.publicKey,
      privateKey: this.privateKey,
      keyId: this.keyId
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SigningConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): SigningConfig {
    return { ...this.config };
  }
}

/**
 * Enhanced EventBus with optional signing
 */
export class SignedEventBus {
  private eventBus: any; // Should be EventBus type
  private signer: EventSigner;
  private verificationEnabled: boolean;

  constructor(eventBus: any, signer?: EventSigner, verificationEnabled: boolean = true) {
    this.eventBus = eventBus;
    this.signer = signer || new EventSigner();
    this.verificationEnabled = verificationEnabled;
  }

  /**
   * Initialize the signing system
   */
  async initialize(): Promise<void> {
    await this.signer.initialize();
  }

  /**
   * Emit an event with optional signing
   */
  async emit(eventType: string, event: any): Promise<void> {
    let finalEvent = event;

    // Sign critical events
    if (this.signer.requiresSigning(eventType)) {
      const signedEvent = this.signer.signEvent(event);
      finalEvent = {
        ...event,
        _signature: signedEvent.signature,
        _signedAt: signedEvent.timestamp,
        _signingKey: signedEvent.signingKey,
        _signed: true
      };
    }

    return this.eventBus.emit(eventType, finalEvent);
  }

  /**
   * Verify an event's signature if present
   */
  verifyEvent(event: any): boolean {
    if (!this.verificationEnabled) return true;
    
    // Check if event is signed
    if (!event._signed || !event._signature) {
      return true; // Not signed, assume valid
    }

    const signedEvent = {
      event: { ...event },
      signature: event._signature,
      timestamp: event._signedAt,
      signingKey: event._signingKey
    };

    // Remove signature fields from event for verification
    delete signedEvent.event._signature;
    delete signedEvent.event._signedAt;
    delete signedEvent.event._signingKey;
    delete signedEvent.event._signed;

    return this.signer.verifySignedEvent(signedEvent);
  }

  /**
   * Get the underlying event bus
   */
  getEventBus(): any {
    return this.eventBus;
  }

  /**
   * Get the signer instance
   */
  getSigner(): EventSigner {
    return this.signer;
  }
}

// Singleton pattern for global access
let globalSigner: EventSigner | null = null;

export function getGlobalSigner(): EventSigner {
  if (!globalSigner) {
    globalSigner = new EventSigner();
  }
  return globalSigner;
}

export function initializeGlobalSigner(config?: Partial<SigningConfig>): Promise<EventSigner> {
  globalSigner = new EventSigner(config);
  return globalSigner.initialize().then(() => globalSigner!);
}
