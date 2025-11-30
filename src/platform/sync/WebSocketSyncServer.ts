/**
 * WebSocket Sync Server
 * Enables real-time event synchronization across multiple Electron clients
 * 
 * Master laptop runs this server, client tablets connect via WebSocket
 */

import { EventBus } from '../../events/core/EventBus';
import { EVENTS } from '../../events/EventTypes';
import { EventEnvelope } from '../../events/schemas/EventEnvelope';
import { PlatformStorage } from '../../storage/core/PlatformStorage';
import { StockRepository } from '../../domain/repositories/StockRepository';
import type { ProjectionEngine } from '../../events/projections/ProjectionEngine';

export interface SyncClientInfo {
  id: string;
  deviceName: string;
  connectedAt: number;
  lastPing: number;
  employeeId?: string;
  clientId?: string;
}

export class WebSocketSyncServer {
  private wss: any = null; // WebSocketServer from 'ws' package
  private clients: Map<any, SyncClientInfo> = new Map();
  private eventBus: EventBus | null = null;
  private storage: PlatformStorage | null = null;
  private projectionEngine: ProjectionEngine | null = null;
  private port: number;
  private isRunning = false;

  constructor(port: number = 3001) {
    this.port = port;
  }

  /**
   * Set ProjectionEngine for RPC data access
   */
  setProjectionEngine(projectionEngine: ProjectionEngine): void {
    this.projectionEngine = projectionEngine;
    console.log('[WebSocketSyncServer] � ProjectionEngine registered for RPC');
  }

  /**
   * Start WebSocket server and attach to EventBus and PlatformStorage
   */
  async start(eventBus: EventBus, storage?: PlatformStorage): Promise<void> {
    if (this.isRunning) {
      console.warn('[WebSocketSyncServer] Already running');
      return;
    }

    this.eventBus = eventBus;
    this.storage = storage || null;

    try {
      // Dynamic import to avoid bundling issues
      const { WebSocketServer } = await import('ws');
      
      this.wss = new WebSocketServer({ 
        port: this.port,
        perMessageDeflate: false // Faster for local network
      });

      // Handle server errors (e.g., port already in use)
      this.wss.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`[WebSocketSyncServer] ❌ Port ${this.port} is already in use!`);
          console.error('[WebSocketSyncServer] 💡 Solutions:');
          console.error(`[WebSocketSyncServer]    1. Kill process using port: netstat -ano | findstr :${this.port}`);
          console.error(`[WebSocketSyncServer]    2. Set custom port: set AETHER_SYNC_PORT=5001 && npm run pos`);
          console.error('[WebSocketSyncServer]    3. Disable sync server: set AETHER_SYNC_SERVER=false && npm run pos');
          throw new Error(`Port ${this.port} already in use. Cannot start sync server.`);
        } else {
          console.error('[WebSocketSyncServer] Server error:', error);
          throw error;
        }
      });

      this.wss.on('connection', (ws: any, req: any) => {
        const clientIp = req.socket.remoteAddress;
        console.log(`[WebSocketSyncServer] 📱 Client connected from ${clientIp}`);

        // Register client
        const clientInfo: SyncClientInfo = {
          id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          deviceName: 'Unknown', // Will be updated in handshake
          connectedAt: Date.now(),
          lastPing: Date.now(),
          clientId: undefined, // Will be set from connect message
          employeeId: undefined // Will be set when employee selects
        };
        this.clients.set(ws, clientInfo);

        // Send welcome message
        this.sendToClient(ws, {
          type: 'server.welcome',
          payload: {
            clientId: clientInfo.id,
            serverTime: Date.now(),
            message: 'Connected to Aether 4TSS Master'
          }
        });

        // Handle messages from client
        ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleClientMessage(ws, message);
          } catch (error) {
            console.error('[WebSocketSyncServer] Failed to parse message:', error);
          }
        });

        // Handle client disconnect
        ws.on('close', () => {
          const info = this.clients.get(ws);
          console.log(`[WebSocketSyncServer] 📴 Client disconnected: ${info?.deviceName || 'Unknown'}`);
          this.clients.delete(ws);
        });

        // Handle errors
        ws.on('error', (error: Error) => {
          console.error('[WebSocketSyncServer] Client error:', error);
          this.clients.delete(ws);
        });

        // Send current state (latest projection snapshots)
        this.sendInitialState(ws);
      });

      // Subscribe to EventBus - broadcast ALL events to clients
      await eventBus.subscribe(async (event: EventEnvelope) => {
        this.broadcastEvent(event);
      }, { consumerId: 'sync-server' });

      this.isRunning = true;
      console.log(`[WebSocketSyncServer] 🚀 Server started on port ${this.port}`);
      console.log(`[WebSocketSyncServer] 📡 Tablets can connect to: ws://[LAPTOP-IP]:${this.port}`);

    } catch (error) {
      console.error('[WebSocketSyncServer] Failed to start:', error);
      throw error;
    }
  }

  /**
   * Handle messages from clients
   */
  private async handleClientMessage(ws: any, message: any): Promise<void> {
    const clientInfo = this.clients.get(ws);
    
    switch (message.type) {
      case 'connect':
        // Initial connection message from client
        if (clientInfo && message.clientId) {
          clientInfo.clientId = message.clientId;
          clientInfo.deviceName = message.clientName || message.clientId;
          console.log(`[WebSocketSyncServer] 🤝 Client identified: ${clientInfo.deviceName} (${clientInfo.clientId})`);
        }
        break;

      case 'heartbeat':
        // Client keepalive ping
        if (clientInfo) {
          clientInfo.lastPing = Date.now();
        }
        // No need to respond, client just keeping connection alive
        break;

      case 'client.handshake':
        // Update client info
        if (clientInfo) {
          clientInfo.deviceName = message.payload?.deviceName || 'Unknown Device';
          clientInfo.clientId = message.payload?.clientId || clientInfo.id;
          console.log(`[WebSocketSyncServer] 🤝 Handshake from ${clientInfo.deviceName} (${clientInfo.clientId})`);
        }
        break;

      case 'client.ping':
        // Respond with pong
        if (clientInfo) {
          clientInfo.lastPing = Date.now();
        }
        this.sendToClient(ws, {
          type: 'server.pong',
          payload: { serverTime: Date.now() }
        });
        break;

      case 'event.emit':
        // Client wants to emit an event (e.g., Ben adds beers on tablet)
        if (this.eventBus && message.payload) {
          try {
            const { type, payload, meta, aggregateId } = message.payload;
            console.log(`[WebSocketSyncServer] 📨 Event from ${clientInfo?.deviceName}: ${type}`);
            
            // Emit to local EventBus (will persist to SQLite)
            await this.eventBus.accept({ type, payload, meta, aggregateId });
            
            // EventBus subscription will broadcast to all clients automatically
          } catch (error) {
            console.error('[WebSocketSyncServer] Failed to accept event from client:', error);
            this.sendToClient(ws, {
              type: 'error',
              payload: { message: 'Failed to process event', error: String(error) }
            });
          }
        }
        break;

      case 'storage.query':
        // Client wants to query storage (optional - for reads)
        // TODO: Implement storage proxy if needed
        break;

      case 'storage.save':
        await this.handleStorageOperation(ws, message, async () => {
          if (!this.storage) throw new Error('Storage not available');
          const { key, value, tier } = message.payload;
          await this.storage.save(key, value, tier);
          return { success: true };
        });
        break;

      case 'storage.load':
        await this.handleStorageOperation(ws, message, async () => {
          if (!this.storage) throw new Error('Storage not available');
          const { key, tier } = message.payload;
          const value = await this.storage.load(key, tier);
          return { value };
        });
        break;

      case 'storage.remove':
        await this.handleStorageOperation(ws, message, async () => {
          if (!this.storage) throw new Error('Storage not available');
          const { key, tier } = message.payload;
          await this.storage.remove(key, tier);
          return { success: true };
        });
        break;

      case 'storage.listKeys':
        await this.handleStorageOperation(ws, message, async () => {
          if (!this.storage) throw new Error('Storage not available');
          const { tier, prefix } = message.payload;
          const keys = await this.storage.listKeys(tier, prefix);
          return { keys };
        });
        break;

      case 'storage.clearTier':
        await this.handleStorageOperation(ws, message, async () => {
          if (!this.storage) throw new Error('Storage not available');
          const { tier } = message.payload;
          await this.storage.clearTier(tier);
          return { success: true };
        });
        break;

      case 'storage.getStats':
        await this.handleStorageOperation(ws, message, async () => {
          if (!this.storage) throw new Error('Storage not available');
          const stats = await this.storage.getStats();
          return { stats };
        });
        break;

      case 'rpc':
        // Handle RPC calls from clients
        await this.handleRPC(ws, message);
        break;

      default:
        console.warn(`[WebSocketSyncServer] Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle RPC calls from clients
   */
  private async handleRPC(ws: any, message: any): Promise<void> {
    const { id, method, params } = message;
    const clientInfo = this.clients.get(ws);

    console.log(`[WebSocketSyncServer] 📞 RPC call from ${clientInfo?.deviceName || 'Unknown'}: ${method}`);

    try {
      let result: any;

      switch (method) {
        case 'table.getAll':
          // Fetch tables with their current state
          if (!this.storage) {
            throw new Error('Storage not available');
          }
          
          // Try both cold and hot storage for table definitions
          const coldKeys = await this.storage.listKeys('cold');
          const hotKeys = await this.storage.listKeys('hot');
          const tableMap = new Map();
          
          // First load table definitions from cold storage
          for (const key of coldKeys) {
            if (key.startsWith('table:')) {
              try {
                const table = await this.storage.load(key, 'cold');
                if (table) {
                  tableMap.set(table.id, table);
                }
              } catch (err) {
                console.warn(`[WebSocketSyncServer] Failed to load table ${key} from cold:`, err);
              }
            }
          }
          
          // If no tables in cold, try hot storage (MS POS stores in hot)
          if (tableMap.size === 0) {
            for (const key of hotKeys) {
              if (key.startsWith('table:')) {
                try {
                  const table = await this.storage.load(key, 'hot');
                  if (table) {
                    tableMap.set(table.id, table);
                  }
                } catch (err) {
                  console.warn(`[WebSocketSyncServer] Failed to load table ${key} from hot:`, err);
                }
              }
            }
          }
          
          const tables = [];
          
          // Enrich tables with current state
          for (const [tableId, table] of tableMap.entries()) {
            // Try to get current state from hot storage
            const stateKey = `table_state:${tableId}`;
            let tableState = null;
            try {
              tableState = await this.storage.load(stateKey, 'hot');
            } catch (err) {
              // No state means table is available
            }
            
            // Merge definition with state
            tables.push({
              id: table.id,
              number: table.number,
              capacity: table.capacity,
              location: table.location,
              status: tableState?.status || 'available',
              // Include orders if table has state
              orders: tableState?.orders || [],
              saleTicketId: tableState?.saleTicketId
            });
          }
          
          result = tables;
          console.log(`[WebSocketSyncServer] ✅ Returning ${tables.length} tables with current states`);
          break;

        case 'table.getById':
          if (!this.storage) {
            throw new Error('Storage not available');
          }
          
          const tableId = params?.tableId || params?.id;
          if (!tableId) {
            throw new Error('tableId parameter required');
          }
          
          result = await this.storage.load(`table:${tableId}`, 'hot');
          if (!result) {
            throw new Error(`Table not found: ${tableId}`);
          }
          break;

        case 'tab.getForTable':
          // Fetch open tab/ticket for table with items
          if (!this.storage) {
            throw new Error('Storage not available');
          }
          
          const tId = params?.tableId;
          if (!tId) {
            throw new Error('tableId parameter required');
          }
          
          // Try to load table data from hot storage
          try {
            const tableKey = `table_state:${tId}`;
            const tableState = await this.storage.load(tableKey, 'hot');
            
            if (tableState) {
              // Return table with items
              result = {
                tableId: tId,
                status: tableState.status || 'available',
                currentTicket: tableState.saleTicketId ? {
                  id: tableState.saleTicketId,
                  items: tableState.orders || [],
                  subtotal: tableState.orders?.reduce((sum: number, item: any) => 
                    sum + (item.price * item.quantity), 0) || 0
                } : null
              };
            } else {
              result = null;
            }
          } catch (err) {
            console.warn(`[WebSocketSyncServer] Failed to load table ${tId}:`, err);
            result = null;
          }
          break;

        case 'product.getAll':
          // Fetch all products from cold storage with real-time stock levels
          if (!this.storage) {
            throw new Error('Storage not available');
          }
          
          // Get stock levels from hot storage (includes reservations)
          const stockLevelKeys = await this.storage.listKeys('hot');
          const stockLevels = new Map();
          
          for (const key of stockLevelKeys) {
            if (key.startsWith('stock_level:')) {
              try {
                const stockLevel = await this.storage.load(key, 'hot');
                if (stockLevel) {
                  stockLevels.set(stockLevel.productId, stockLevel);
                }
              } catch (err) {
                console.warn(`[WebSocketSyncServer] Failed to load stock level ${key}:`, err);
              }
            }
          }
          
          const productKeys = await this.storage.listKeys('cold');
          const products = [];
          
          for (const key of productKeys) {
            if (key.startsWith('product:')) {
              try {
                const product = await this.storage.load(key, 'cold');
                if (product && product.isActive !== false) {
                  // Get stock level with reservations
                  const stockLevel = stockLevels.get(product.id);
                  const currentStock = stockLevel?.currentStock || 0;
                  const reservedStock = stockLevel?.reservedStock || 0;
                  const availableStock = currentStock - reservedStock;
                  
                  // Unified product data for menu display
                  let productData: any = {
                    id: product.id,
                    name: product.name,
                    type: product.type,
                    brewery: product.brewery || product.brand || '',
                    categoryIds: Array.isArray(product.categoryIds) ? product.categoryIds : [product.categoryId].filter(Boolean),
                    available: availableStock > 0,
                    stockLevel: currentStock,
                    availableStock: availableStock,
                    reservedStock: reservedStock,
                    isActive: product.isActive !== false,
                    imageUrl: product.imageUrl || null
                  };

                  // Add pricing and volume details for menu
                  if (product.type === 'case') {
                    productData.pricePerItem = product.price; // Price per bottle
                    productData.volumeInCl = product.volumeCL;
                    productData.alcoholPercentage = product.alcoholPercentage;
                  } else if (product.type === 'barrel') {
                    // For barrels, use the first available volume pricing
                    const pricing = product.volumePricing || {};
                    productData.pricePerItem = pricing.volume25cl || pricing.volume33cl || pricing.customVolume?.price || 0;
                    productData.volumeInCl = 25; // Default serving size
                    productData.alcoholPercentage = product.alcoholPercentage;
                    productData.volumePricing = pricing;
                  } else if (product.type === 'snack') {
                    productData.pricePerItem = product.price;
                    productData.volumeInCl = null; // No volume for snacks
                    productData.alcoholPercentage = null;
                  } else {
                    // Generic product
                    productData.pricePerItem = product.sellingPrice || product.price || 0;
                    productData.volumeInCl = product.volumeInCl || product.volume;
                    productData.alcoholPercentage = product.alcoholPercentage || product.abv;
                  }
                  
                  products.push(productData);
                }
              } catch (err) {
                console.warn(`[WebSocketSyncServer] Failed to load product ${key}:`, err);
              }
            }
          }
          
          result = products;
          console.log(`[WebSocketSyncServer] ✅ Returning ${products.length} products (with reservation data)`);
          break;

        case 'product.getByCategory':
          // Fetch products filtered by category with full menu details
          if (!this.storage) {
            throw new Error('Storage not available');
          }
          
          const categoryId = params?.categoryId;
          if (!categoryId) {
            throw new Error('categoryId parameter required');
          }
          
          const allProductKeys = await this.storage.listKeys('cold');
          const categoryProducts = [];
          
          for (const key of allProductKeys) {
            if (key.startsWith('product:')) {
              try {
                const product = await this.storage.load(key, 'cold');
                if (product && product.isActive !== false) {
                  // Check if product matches category (handle both singular and array)
                  const matchesCategory = categoryId === 'all' || 
                    product.categoryId === categoryId || 
                    (Array.isArray(product.categoryIds) && product.categoryIds.includes(categoryId));
                  
                  if (matchesCategory) {
                    categoryProducts.push({
                      id: product.id,
                      name: product.name,
                      brewery: product.brewery || product.brand || product.supplier,
                      volumeInCl: product.volumeInCl || product.volume,
                      alcoholPercentage: product.alcoholPercentage || product.abv,
                      pricePerItem: product.sellingPrice || product.price || 0,
                      stockLevel: product.stockLevel || 0,
                      categoryIds: Array.isArray(product.categoryIds) ? product.categoryIds : [product.categoryId].filter(Boolean),
                      imageUrl: product.imageUrl || null,
                      isActive: product.isActive !== false
                    });
                  }
                }
              } catch (err) {
                console.warn(`[WebSocketSyncServer] Failed to load product ${key}:`, err);
              }
            }
          }
          
          result = categoryProducts;
          console.log(`[WebSocketSyncServer] ✅ Returning ${categoryProducts.length} products for category ${categoryId}`);
          break;

        case 'employee.getClockedIn':
          // Get list of currently clocked-in employees
          if (!this.projectionEngine) {
            throw new Error('ProjectionEngine not available');
          }
          
          const staffSessionsState: any = await this.projectionEngine.getState('staffSessions');
          const activeStaff = staffSessionsState?.active || {};
          
          // Load employee details for each active staff
          const employees = [];
          for (const [staffId, sessionInfo] of Object.entries(activeStaff)) {
            try {
              // Try hot tier first, then cold
              let employee = null;
              try {
                employee = await this.storage!.load(`employee:${staffId}`, 'hot');
              } catch {
                employee = await this.storage!.load(`employee:${staffId}`, 'cold');
              }
              
              if (employee) {
                employees.push({
                  id: employee.id,
                  name: `${employee.firstName} ${employee.lastName}`,
                  role: employee.role,
                  sessionInfo: sessionInfo
                });
              }
            } catch (err) {
              console.warn(`[WebSocketSyncServer] Failed to load employee ${staffId}:`, err);
            }
          }
          
          result = employees;
          console.log(`[WebSocketSyncServer] ✅ Returning ${employees.length} clocked-in employees`);
          break;

        case 'employee.selectForClient':
          // Assign employee to this POS client
          const employeeId = params?.employeeId;
          const clientIdForEmployee = clientInfo?.clientId;
          
          if (!employeeId) {
            throw new Error('employeeId parameter required');
          }
          
          if (!clientIdForEmployee) {
            throw new Error('Client ID not available');
          }
          
          // Store the assignment in hot storage
          const assignmentKey = `pos_client_assignment:${clientIdForEmployee}`;
          const assignment = {
            clientId: clientIdForEmployee,
            employeeId: employeeId,
            assignedAt: Date.now()
          };
          
          await this.storage!.save(assignmentKey, assignment, 'hot');
          
          // Update client info
          if (clientInfo) {
            clientInfo.employeeId = employeeId;
          }
          
          result = { success: true, assignment };
          console.log(`[WebSocketSyncServer] ✅ Employee ${employeeId} assigned to client ${clientIdForEmployee}`);
          break;

        case 'order.confirm':
          // Confirm order: reserve stock for items
          const { tableId: orderTableId, items, staffId: orderStaffId } = params;
          
          if (!orderTableId || !items || !Array.isArray(items)) {
            throw new Error('tableId and items[] required');
          }
          
          console.log(`[WebSocketSyncServer] 📋 Confirming order for ${orderTableId}: ${items.length} items`);
          
          // Create StockRepository instance
          if (!this.storage || !this.eventBus) {
            throw new Error('Storage and EventBus required for order confirmation');
          }
          const stockRepo = new StockRepository(this.storage, this.eventBus);
          
          // Reserve stock for each item
          const reservations = [];
          for (const item of items) {
            if (item.productId && item.quantity > 0) {
              try {
                const reservation = await stockRepo.reserveStock({
                  productId: item.productId,
                  quantity: item.quantity,
                  sourceType: orderTableId.startsWith('tab:') ? 'tab' : 'table',
                  sourceId: orderTableId,
                  reservedBy: orderStaffId || 'Unknown',
                  ticketId: `ticket_${Date.now()}`
                });
                reservations.push(reservation);
                console.log(`  🔒 Reserved: ${item.productName} x${item.quantity}`);
              } catch (error) {
                console.error(`  ❌ Failed to reserve ${item.productName}:`, error);
                // If insufficient stock, throw immediately
                if (error instanceof Error && error.message.includes('Insufficient stock')) {
                  throw new Error(`Cannot confirm order: ${error.message}`);
                }
                throw error;
              }
            }
          }
          
          // Emit order confirmed event
          await this.eventBus.emit(EVENTS.ORDER_CREATED, {
            tableId: orderTableId,
            items: items,
            confirmedBy: orderStaffId || 'Unknown',
            timestamp: Date.now(),
            reservationCount: reservations.length
          });
          
          result = { 
            success: true, 
            reservations: reservations.length,
            message: `Order confirmed: ${reservations.length} items reserved`
          };
          console.log(`[WebSocketSyncServer] ✅ Order confirmed for ${orderTableId}`);
          break;

        case 'category.getAll':
          // Fetch all active categories sorted by displayOrder
          if (!this.storage) {
            throw new Error('Storage not available');
          }
          
          const categoryKeys = await this.storage.listKeys('cold');
          const categories = [];
          
          for (const key of categoryKeys) {
            if (key.startsWith('bo_products:categories') || key.startsWith('category:')) {
              try {
                const data = await this.storage.load(key, 'cold');
                // Handle both array and single category formats
                if (Array.isArray(data)) {
                  categories.push(...data.filter((c: any) => c.isActive !== false));
                } else if (data && typeof data === 'object') {
                  if (data.isActive !== false) {
                    categories.push(data);
                  }
                }
              } catch (err) {
                console.warn(`[WebSocketSyncServer] Failed to load category ${key}:`, err);
              }
            }
          }
          
          // Sort by displayOrder
          categories.sort((a: any, b: any) => (a.displayOrder || 999) - (b.displayOrder || 999));
          
          result = { categories };
          console.log(`[WebSocketSyncServer] ✅ Returning ${categories.length} categories`);
          break;

        default:
          throw new Error(`Unknown RPC method: ${method}`);
      }

      // Send success response
      this.sendToClient(ws, {
        type: 'rpc_response',
        id,
        success: true,
        result
      });

    } catch (error: any) {
      console.error(`[WebSocketSyncServer] RPC error (${method}):`, error);
      
      // Send error response
      this.sendToClient(ws, {
        type: 'rpc_response',
        id,
        success: false,
        error: error.message || String(error)
      });
    }
  }

  /**
   * Send initial state to newly connected client
   */
  private async sendInitialState(ws: any): Promise<void> {
    // TODO: Send projection snapshots for fast initial sync
    // For now, clients will replay from EventBus
    this.sendToClient(ws, {
      type: 'server.ready',
      payload: { message: 'Server ready, subscribe to events' }
    });
  }

  /**
   * Helper to handle storage operations with error handling
   */
  private async handleStorageOperation(
    ws: any,
    message: any,
    operation: () => Promise<any>
  ): Promise<void> {
    try {
      const result = await operation();
      this.sendToClient(ws, {
        type: 'response',
        requestId: message.requestId,
        payload: result
      });
    } catch (error) {
      console.error('[WebSocketSyncServer] Storage operation failed:', error);
      this.sendToClient(ws, {
        type: 'error',
        requestId: message.requestId,
        payload: {
          message: 'Storage operation failed',
          error: String(error)
        }
      });
    }
  }

  /**
   * Broadcast event to all connected clients
   */
  private broadcastEvent(event: EventEnvelope): void {
    if (!this.wss) return;

    const message = {
      type: 'event.broadcast',
      payload: event
    };

    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    this.clients.forEach((clientInfo, ws) => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        try {
          ws.send(messageStr);
          sentCount++;
        } catch (error) {
          console.error(`[WebSocketSyncServer] Failed to send to ${clientInfo.deviceName}:`, error);
        }
      }
    });

    if (sentCount > 0) {
      console.log(`[WebSocketSyncServer] 📢 Broadcasted ${event.type} to ${sentCount} client(s)`);
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(ws: any, message: any): void {
    if (ws.readyState === 1) { // WebSocket.OPEN
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('[WebSocketSyncServer] Failed to send message:', error);
      }
    }
  }

  /**
   * Get connected clients info
   */
  getConnectedClients(): SyncClientInfo[] {
    return Array.from(this.clients.values());
  }

  /**
   * Stop server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    // Close all client connections
    this.clients.forEach((_, ws) => {
      try {
        ws.close(1000, 'Server shutting down');
      } catch (error) {
        // Ignore
      }
    });

    // Close server
    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss.close(() => {
          console.log('[WebSocketSyncServer] Server stopped');
          resolve();
        });
      });
    }

    this.isRunning = false;
    this.clients.clear();
  }
}
