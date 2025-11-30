/**
 * Live Snapshot Watcher - Crash Failsafe System
 * 
 * Continuously writes current system state to disk for manual recovery
 * in case of system crash during busy service.
 * 
 * CRITICAL SCENARIOS:
 * - Friday night, full house, 15 tables open, €2,450 in pending orders
 * - System crashes (power outage, hardware failure, software bug)
 * - Bartender needs to know: What does each table owe?
 * 
 * SOLUTION:
 * - Always-updated JSON file in Documents folder
 * - Human-readable format for manual recovery
 * - Includes: open tables, tabs, items, totals, staff sessions
 * 
 * FILE LOCATION:
 * - Windows: C:\Users\[username]\Documents\Aether-POS\crash-recovery\
 * - Filename: live-snapshot-[DATE].json (e.g., live-snapshot-2025-11-05.json)
 * 
 * @example
 * ```typescript
 * const watcher = new LiveSnapshotWatcher(eventBus, projectionEngine, storage);
 * await watcher.start();
 * 
 * // System crashes... bartender opens:
 * // C:\Users\Ron\Documents\Aether-POS\crash-recovery\live-snapshot-2025-11-05.json
 * // Sees: Table 5: 6x Heineken + 3x Corona = €45.50
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import type { EventBus } from '../../events/core/EventBus';
import type { ProjectionEngine } from '../../events/projections/ProjectionEngine';
import type { PlatformStorage } from '../../storage/core/PlatformStorage';

export interface LiveSnapshot {
  // Metadata
  timestamp: number;
  timestampISO: string;
  businessDay: {
    id: string | null;
    isOpen: boolean;
    openedBy: string | null;
    openedAt: number | null;
    openingFloat: number;
  };

  // Open Tables/Tabs
  openTables: Array<{
    tableId: string;
    tableName: string;
    openedAt: number;
    openedAtReadable: string;
    items: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    subtotal: number;
    tax: number;
    total: number;
    customerCount?: number;
  }>;

  // Staff Sessions (who's working)
  activeStaff: Array<{
    employeeId: string;
    employeeName: string;
    clockedInAt: number;
    clockedInAtReadable: string;
    hoursWorked: number;
  }>;

  // Summary
  summary: {
    totalOpenTables: number;
    totalPendingRevenue: number;
    totalActiveStaff: number;
    systemUptime: number;
  };
}

export class LiveSnapshotWatcher {
  private eventBus: EventBus;
  private projectionEngine: ProjectionEngine;
  private storage: PlatformStorage;
  private isRunning = false;
  private snapshotPath: string = '';
  private textSnapshotPath: string = '';
  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_MS = 500; // Write max once per 500ms

  constructor(
    eventBus: EventBus,
    projectionEngine: ProjectionEngine,
    storage: PlatformStorage
  ) {
    this.eventBus = eventBus;
    this.projectionEngine = projectionEngine;
    this.storage = storage;
  }

  /**
   * Start watching and writing live snapshots
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[LiveSnapshotWatcher] Already running');
      return;
    }

    try {
      // Create crash recovery directory
      const documentsPath = app.getPath('documents');
      const crashRecoveryDir = path.join(documentsPath, 'Aether-POS', 'crash-recovery');
      
      if (!fs.existsSync(crashRecoveryDir)) {
        fs.mkdirSync(crashRecoveryDir, { recursive: true });
      }

      // Setup file paths
      const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      this.snapshotPath = path.join(crashRecoveryDir, `live-snapshot-${dateStr}.json`);
      this.textSnapshotPath = path.join(crashRecoveryDir, `live-snapshot-${dateStr}.txt`);

      // Subscribe to EventBus - update on ANY event
      await this.eventBus.subscribe(async () => {
        this.scheduleSnapshot();
      }, { consumerId: 'live-snapshot-watcher' });

      // Write initial snapshot
      await this.writeSnapshot();

      this.isRunning = true;
      console.log('[LiveSnapshotWatcher] 🛡️ Started - Failsafe active');
      console.log(`[LiveSnapshotWatcher] 📁 Snapshot location: ${this.snapshotPath}`);
      console.log(`[LiveSnapshotWatcher] 📄 Text backup: ${this.textSnapshotPath}`);

    } catch (error) {
      console.error('[LiveSnapshotWatcher] Failed to start:', error);
      throw error;
    }
  }

  /**
   * Schedule snapshot write (debounced to avoid disk thrashing)
   */
  private scheduleSnapshot(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.writeSnapshot().catch(error => {
        console.error('[LiveSnapshotWatcher] Failed to write snapshot:', error);
      });
    }, this.DEBOUNCE_MS);
  }

  /**
   * Write current system state to disk
   */
  private async writeSnapshot(): Promise<void> {
    try {
      const snapshot = await this.buildSnapshot();

      // Write JSON (for programmatic recovery)
      const jsonContent = JSON.stringify(snapshot, null, 2);
      fs.writeFileSync(this.snapshotPath, jsonContent, 'utf-8');

      // Write TXT (for human reading/printing)
      const textContent = this.formatSnapshotAsText(snapshot);
      fs.writeFileSync(this.textSnapshotPath, textContent, 'utf-8');

      console.log(`[LiveSnapshotWatcher] ✅ Snapshot updated: ${snapshot.openTables.length} tables, €${snapshot.summary.totalPendingRevenue.toFixed(2)} pending`);

    } catch (error) {
      console.error('[LiveSnapshotWatcher] Write failed:', error);
      // Don't throw - failsafe should never crash the app
    }
  }

  /**
   * Build snapshot from current projection states
   */
  private async buildSnapshot(): Promise<LiveSnapshot> {
    const now = Date.now();

    // Get business day state
    let businessDay = {
      id: null as string | null,
      isOpen: false,
      openedBy: null as string | null,
      openedAt: null as number | null,
      openingFloat: 0
    };

    try {
      const currentDay = await this.storage.load('businessday:active:current', 'hot');
      if (currentDay && currentDay.status === 'open') {
        businessDay = {
          id: currentDay.id,
          isOpen: true,
          openedBy: currentDay.openedByName,
          openedAt: currentDay.openedAt,
          openingFloat: currentDay.openingFloat
        };
      }
    } catch (error) {
      // No active business day
    }

    // Get open tables from OpenTablesProjection
    const openTables: LiveSnapshot['openTables'] = [];
    try {
      const openTablesState = await this.projectionEngine.getState('openTables') as any;
      const tables = openTablesState?.tables || {};

      for (const [tableId, table] of Object.entries(tables)) {
        const items = (table as any).items?.map((item: any) => ({
          productName: item.productName || item.name || 'Unknown Product',
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || item.price || 0,
          totalPrice: (item.quantity || 0) * (item.unitPrice || item.price || 0)
        })) || [];

        const subtotal = items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
        const tax = subtotal * 0.21; // Belgian VAT 21%
        const total = subtotal + tax;

        openTables.push({
          tableId,
          tableName: (table as any).name || tableId,
          openedAt: (table as any).openedAt || now,
          openedAtReadable: new Date((table as any).openedAt || now).toLocaleString('nl-BE'),
          items,
          subtotal,
          tax,
          total,
          customerCount: (table as any).customerCount
        });
      }
    } catch (error) {
      console.error('[LiveSnapshotWatcher] Failed to load open tables:', error);
    }

    // Get active staff from StaffSessionsProjection
    const activeStaff: LiveSnapshot['activeStaff'] = [];
    try {
      const staffSessionsState = await this.projectionEngine.getState('staffSessions') as any;
      const sessions = staffSessionsState?.activeSessions || {};

      for (const [employeeId, session] of Object.entries(sessions)) {
        const clockedInAt = (session as any).clockedInAt || now;
        const hoursWorked = (now - clockedInAt) / (1000 * 60 * 60);

        activeStaff.push({
          employeeId,
          employeeName: (session as any).employeeName || employeeId,
          clockedInAt,
          clockedInAtReadable: new Date(clockedInAt).toLocaleString('nl-BE'),
          hoursWorked: parseFloat(hoursWorked.toFixed(2))
        });
      }
    } catch (error) {
      console.error('[LiveSnapshotWatcher] Failed to load staff sessions:', error);
    }

    // Build summary
    const totalPendingRevenue = openTables.reduce((sum, table) => sum + table.total, 0);

    return {
      timestamp: now,
      timestampISO: new Date(now).toISOString(),
      businessDay,
      openTables,
      activeStaff,
      summary: {
        totalOpenTables: openTables.length,
        totalPendingRevenue,
        totalActiveStaff: activeStaff.length,
        systemUptime: businessDay.openedAt ? now - businessDay.openedAt : 0
      }
    };
  }

  /**
   * Format snapshot as human-readable text (for printing/manual recovery)
   */
  private formatSnapshotAsText(snapshot: LiveSnapshot): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('          AETHER POS - CRASH RECOVERY SNAPSHOT');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`Generated: ${snapshot.timestampISO}`);
    lines.push(`Local Time: ${new Date(snapshot.timestamp).toLocaleString('nl-BE')}`);
    lines.push('');

    // Business Day Info
    lines.push('─── BUSINESS DAY ──────────────────────────────────────────────');
    if (snapshot.businessDay.isOpen) {
      lines.push(`Status: OPEN`);
      lines.push(`Day ID: ${snapshot.businessDay.id}`);
      lines.push(`Opened By: ${snapshot.businessDay.openedBy}`);
      lines.push(`Opened At: ${new Date(snapshot.businessDay.openedAt!).toLocaleString('nl-BE')}`);
      lines.push(`Opening Float: €${snapshot.businessDay.openingFloat.toFixed(2)}`);
    } else {
      lines.push(`Status: CLOSED (No active business day)`);
    }
    lines.push('');

    // Summary
    lines.push('─── SUMMARY ───────────────────────────────────────────────────');
    lines.push(`Open Tables: ${snapshot.summary.totalOpenTables}`);
    lines.push(`Total Pending Revenue: €${snapshot.summary.totalPendingRevenue.toFixed(2)}`);
    lines.push(`Active Staff: ${snapshot.summary.totalActiveStaff}`);
    lines.push('');

    // Open Tables
    if (snapshot.openTables.length > 0) {
      lines.push('─── OPEN TABLES ───────────────────────────────────────────────');
      lines.push('');

      snapshot.openTables.forEach((table, index) => {
        lines.push(`TABLE ${index + 1}: ${table.tableName}`);
        lines.push(`  Opened: ${table.openedAtReadable}`);
        if (table.customerCount) {
          lines.push(`  Customers: ${table.customerCount}`);
        }
        lines.push('  Items:');

        if (table.items.length === 0) {
          lines.push('    (No items yet)');
        } else {
          table.items.forEach(item => {
            lines.push(`    ${item.quantity}x ${item.productName.padEnd(30)} €${item.unitPrice.toFixed(2)} = €${item.totalPrice.toFixed(2)}`);
          });
        }

        lines.push('  ─────────────────────────────────────────────────────────');
        lines.push(`  Subtotal: €${table.subtotal.toFixed(2)}`);
        lines.push(`  Tax (21%): €${table.tax.toFixed(2)}`);
        lines.push(`  TOTAL: €${table.total.toFixed(2)}`);
        lines.push('');
      });
    } else {
      lines.push('─── OPEN TABLES ───────────────────────────────────────────────');
      lines.push('  (No open tables)');
      lines.push('');
    }

    // Active Staff
    if (snapshot.activeStaff.length > 0) {
      lines.push('─── ACTIVE STAFF ──────────────────────────────────────────────');
      snapshot.activeStaff.forEach((staff, index) => {
        lines.push(`${index + 1}. ${staff.employeeName}`);
        lines.push(`   Clocked In: ${staff.clockedInAtReadable}`);
        lines.push(`   Hours Worked: ${staff.hoursWorked.toFixed(2)}h`);
        lines.push('');
      });
    } else {
      lines.push('─── ACTIVE STAFF ──────────────────────────────────────────────');
      lines.push('  (No active staff)');
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('END OF CRASH RECOVERY SNAPSHOT');
    lines.push('═══════════════════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Stop watcher
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Write final snapshot
    await this.writeSnapshot();

    this.isRunning = false;
    console.log('[LiveSnapshotWatcher] Stopped');
  }
}
