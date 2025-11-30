/**
 * App Lifecycle Manager - Graceful Shutdown & State Comparison
 * 
 * Responsibilities:
 * 1. Coordinate graceful shutdown process
 * 2. Create final app state snapshot on exit
 * 3. Compare startup state with last shutdown state
 * 4. Report operational differences (open tables, staff, business day changes)
 */

import type { EventBus } from '../../events/core/EventBus';
import type { ProjectionEngine } from '../../events/projections/ProjectionEngine';
import type { PlatformStorage } from '../../storage/core/PlatformStorage';
import { LiveSnapshotWatcher } from '../failsafe/LiveSnapshotWatcher';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface AppExitSnapshot {
  timestamp: number;
  timestampISO: string;
  gracefulShutdown: boolean;
  businessDay: {
    id: string | null;
    status: 'open' | 'closed';
    openedBy: string | null;
    openedAt: number | null;
  };
  openTables: Array<{
    tableId: string;
    total: number;
    itemCount: number;
    lastActivity: number;
    staff: string;
  }>;
  activeStaff: Array<{
    staffId: string;
    name: string;
    loginAt: number;
    sessionDuration: number;
  }>;
  systemHealth: {
    uptime: number;
    totalEvents: number;
    lastEventAt: number;
    memoryUsage: number;
  };
  summary: {
    totalOpenTables: number;
    totalPendingRevenue: number;
    totalActiveStaff: number;
    criticalOperationsInProgress: string[];
  };
}

export interface StateComparisonReport {
  lastShutdown: AppExitSnapshot | null;
  currentState: AppExitSnapshot;
  differences: {
    businessDayChanged: boolean;
    businessDayDetails?: {
      previousDay: string | null;
      currentDay: string | null;
      dayTransition: boolean;
    };
    tablesChanged: boolean;
    tableDetails?: {
      previousTables: string[];
      currentTables: string[];
      newTables: string[];
      recoveredTables: string[];
      lostTables: string[];
    };
    staffChanged: boolean;
    staffDetails?: {
      previousStaff: string[];
      currentStaff: string[];
      newLogins: string[];
      missingStaff: string[];
    };
    timeGap: number; // milliseconds between shutdown and startup
    criticalChanges: string[];
  };
  recommendations: string[];
}

export class AppLifecycleManager {
  private eventBus: EventBus;
  private projectionEngine: ProjectionEngine;
  private storage: PlatformStorage;
  private liveSnapshotWatcher: LiveSnapshotWatcher | null = null;
  private isShuttingDown = false;
  
  // Storage paths
  private exitSnapshotPath: string;
  private exitSnapshotTextPath: string;
  
  constructor(
    eventBus: EventBus,
    projectionEngine: ProjectionEngine,
    storage: PlatformStorage
  ) {
    this.eventBus = eventBus;
    this.projectionEngine = projectionEngine;
    this.storage = storage;
    
    // Setup file paths
    const userDataPath = app?.getPath('userData') || path.join(process.cwd(), 'data');
    const crashRecoveryPath = path.join(userDataPath, 'crash-recovery');
    
    // Ensure directory exists
    if (!fs.existsSync(crashRecoveryPath)) {
      fs.mkdirSync(crashRecoveryPath, { recursive: true });
    }
    
    this.exitSnapshotPath = path.join(crashRecoveryPath, 'last-exit-snapshot.json');
    this.exitSnapshotTextPath = path.join(crashRecoveryPath, 'last-exit-snapshot.txt');
  }

  /**
   * Initialize lifecycle manager and setup shutdown handlers
   */
  async initialize(): Promise<void> {
    // Setup graceful shutdown handlers
    this.setupShutdownHandlers();
    
    // Initialize LiveSnapshotWatcher if not already running
    if (!this.liveSnapshotWatcher) {
      this.liveSnapshotWatcher = new LiveSnapshotWatcher(
        this.eventBus,
        this.projectionEngine,
        this.storage
      );
      await this.liveSnapshotWatcher.start();
    }
    
    console.log('[AppLifecycleManager] ✅ Initialized with graceful shutdown handlers');
  }

  /**
   * Perform startup state comparison
   * Returns comparison report showing what changed since last shutdown
   */
  async performStartupStateComparison(): Promise<StateComparisonReport> {
    console.log('[AppLifecycleManager] 🔍 Performing startup state comparison...');
    
    // Load last shutdown state
    const lastShutdown = await this.loadLastExitSnapshot();
    
    // Get current system state
    const currentState = await this.buildCurrentAppState(false);
    
    // Compare states
    const report = this.compareAppStates(lastShutdown, currentState);
    
    // Log findings
    this.logStateComparisonReport(report);
    
    return report;
  }

  /**
   * Perform graceful shutdown
   */
  async performGracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) {
      console.log('[AppLifecycleManager] ⚠️ Shutdown already in progress');
      return;
    }
    
    this.isShuttingDown = true;
    console.log('[AppLifecycleManager] 🛑 Starting graceful shutdown process...');
    
    try {
      // 1. Stop accepting new operations
      console.log('[AppLifecycleManager] 📴 Stopping new operations...');
      
      // 2. Create comprehensive exit snapshot FIRST (before any cleanup)
      console.log('[AppLifecycleManager] � Creating exit snapshot...');
      const exitSnapshot = await this.buildCurrentAppState(true);
      await this.saveExitSnapshot(exitSnapshot);
      
      // 3. Take final projection snapshots (after state capture)
      console.log('[AppLifecycleManager] � Taking final projection snapshots...');
      try {
        await this.projectionEngine.snapshotAll();
      } catch (error) {
        console.warn('[AppLifecycleManager] ⚠️ Failed to snapshot projections (storage may be unavailable):', error);
      }
      
      // 4. Cleanup resources (last step)
      console.log('[AppLifecycleManager] 🧹 Cleaning up resources...');
      await this.cleanupResources();
      
      console.log('[AppLifecycleManager] ✅ Graceful shutdown complete');
      
    } catch (error) {
      console.error('[AppLifecycleManager] ❌ Error during graceful shutdown:', error);
      
      // Mark as non-graceful shutdown with minimal snapshot
      try {
        const emergencySnapshot = await this.buildMinimalExitSnapshot();
        emergencySnapshot.gracefulShutdown = false;
        await this.saveExitSnapshot(emergencySnapshot);
      } catch (e) {
        console.error('[AppLifecycleManager] ❌ Failed to save emergency snapshot:', e);
        // Final fallback - save basic timestamp snapshot
        try {
          const basicSnapshot = {
            timestamp: Date.now(),
            timestampISO: new Date().toISOString(),
            gracefulShutdown: false,
            error: 'Complete shutdown failure - storage unavailable'
          };
          fs.writeFileSync(this.exitSnapshotPath, JSON.stringify(basicSnapshot, null, 2));
        } catch (finalError) {
          console.error('[AppLifecycleManager] ❌ Complete failure to save any shutdown record:', finalError);
        }
      }
    } finally {
      // Don't reset isShuttingDown - once shutdown starts, we should not allow it again
      // this.isShuttingDown = false;  // REMOVED: This was causing infinite loops
      console.log('[AppLifecycleManager] 🏁 Shutdown process completed');
    }
  }

  /**
   * Setup shutdown signal handlers
   */
  private setupShutdownHandlers(): void {
    // Electron app events
    if (app) {
      app.on('before-quit', (event) => {
        if (!this.isShuttingDown) {
          event.preventDefault();
          this.performGracefulShutdown()
            .then(() => {
              console.log('[AppLifecycleManager] ✅ Graceful shutdown completed, quitting app');
              app.quit();
            })
            .catch((error) => {
              console.error('[AppLifecycleManager] ❌ Graceful shutdown failed, forcing quit:', error);
              app.quit();
            });
        }
      });
    }
    
    // Process signals - only if not already shutting down
    process.on('SIGINT', () => {
      if (!this.isShuttingDown) {
        console.log('[AppLifecycleManager] 🛑 Received SIGINT');
        this.performGracefulShutdown()
          .then(() => {
            console.log('[AppLifecycleManager] ✅ Graceful shutdown completed, exiting process');
            process.exit(0);
          })
          .catch((error) => {
            console.error('[AppLifecycleManager] ❌ Graceful shutdown failed, forcing exit:', error);
            process.exit(1);
          });
      }
    });
    
    process.on('SIGTERM', () => {
      if (!this.isShuttingDown) {
        console.log('[AppLifecycleManager] 🛑 Received SIGTERM');
        this.performGracefulShutdown()
          .then(() => {
            console.log('[AppLifecycleManager] ✅ Graceful shutdown completed, exiting process');
            process.exit(0);
          })
          .catch((error) => {
            console.error('[AppLifecycleManager] ❌ Graceful shutdown failed, forcing exit:', error);
            process.exit(1);
          });
      }
    });
    
    // Window/browser events
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', (event) => {
        // Note: Can't perform async operations here, just trigger the process
        if (!this.isShuttingDown) {
          this.performGracefulShutdown();
        }
      });
    }
  }

  /**
   * Build current application state snapshot
   */
  private async buildCurrentAppState(gracefulShutdown: boolean): Promise<AppExitSnapshot> {
    const now = Date.now();
    
    // Check if storage is available first by attempting a simple operation
    try {
      // Try to perform a simple storage operation to test availability
      await this.storage.load('__storage_health_check', 'cold');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not initialized')) {
        console.warn('[AppLifecycleManager] Storage not available during shutdown, creating minimal snapshot');
        return this.buildMinimalExitSnapshot();
      }
      // Other errors are not initialization issues, continue with normal snapshot but warn
      console.warn('[AppLifecycleManager] Storage check failed, continuing with caution:', error);
    }
    
    // Get business day info from BusinessDaySalesProjection
    let businessDay = {
      id: null as string | null,
      status: 'closed' as 'open' | 'closed',
      openedBy: null as string | null,
      openedAt: null as number | null
    };
    
    try {
      const businessDayState = await this.projectionEngine.getState<any>('businessDaySales');
      if (businessDayState?.currentBusinessDayId) {
        const currentSummary = businessDayState.summaries[businessDayState.currentBusinessDayId];
        if (currentSummary) {
          businessDay = {
            id: businessDayState.currentBusinessDayId,
            status: currentSummary.closedAt ? 'closed' : 'open',
            openedBy: null, // BusinessDaySalesProjection doesn't track who opened it
            openedAt: currentSummary.openedAt || null
          };
        }
      }
    } catch (error) {
      console.warn('[AppLifecycleManager] Failed to load business day state (storage may be unavailable):', error);
    }
    
    // Get open tables
    let openTables: Array<any> = [];
    try {
      const tablesState = await this.projectionEngine.getState<any>('openTables');
      if (tablesState?.openTables) {
        openTables = Object.values(tablesState.openTables).map((table: any) => ({
          tableId: table.tableId,
          total: table.total || 0,
          itemCount: table.items?.length || 0,
          lastActivity: table.lastActivity || table.openedAt || now,
          staff: table.staff || 'Unknown'
        }));
      }
    } catch (error) {
      console.warn('[AppLifecycleManager] Failed to load tables state (storage may be unavailable):', error);
    }
    
    // Get active staff
    let activeStaff: Array<any> = [];
    try {
      const staffState = await this.projectionEngine.getState<any>('staffSessions');
      if (staffState?.activeSessions) {
        activeStaff = Object.values(staffState.activeSessions).map((session: any) => ({
          staffId: session.staffId,
          name: session.staffName || session.staffId,
          loginAt: session.loginAt || now,
          sessionDuration: now - (session.loginAt || now)
        }));
      }
    } catch (error) {
      console.warn('[AppLifecycleManager] Failed to load staff state:', error);
    }
    
    // Calculate summary
    const totalPendingRevenue = openTables.reduce((sum, table) => sum + table.total, 0);
    const criticalOperationsInProgress: string[] = [];
    
    if (openTables.length > 0) {
      criticalOperationsInProgress.push(`${openTables.length} open tables with €${totalPendingRevenue.toFixed(2)} pending`);
    }
    if (activeStaff.length > 0) {
      criticalOperationsInProgress.push(`${activeStaff.length} active staff sessions`);
    }
    if (businessDay.status === 'open') {
      criticalOperationsInProgress.push('Business day still open');
    }
    
    // Get system health
    const memoryUsage = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
    const uptime = businessDay.openedAt ? now - businessDay.openedAt : 0;
    
    return {
      timestamp: now,
      timestampISO: new Date(now).toISOString(),
      gracefulShutdown,
      businessDay,
      openTables,
      activeStaff,
      systemHealth: {
        uptime,
        totalEvents: 0, // Could be enhanced to track this
        lastEventAt: now,
        memoryUsage
      },
      summary: {
        totalOpenTables: openTables.length,
        totalPendingRevenue,
        totalActiveStaff: activeStaff.length,
        criticalOperationsInProgress
      }
    };
  }

  /**
   * Build minimal exit snapshot when storage is unavailable
   */
  private buildMinimalExitSnapshot(): AppExitSnapshot {
    const now = Date.now();
    
    return {
      timestamp: now,
      timestampISO: new Date(now).toISOString(),
      gracefulShutdown: false,
      businessDay: {
        id: null,
        status: 'closed',
        openedBy: null,
        openedAt: null
      },
      openTables: [],
      activeStaff: [],
      systemHealth: {
        uptime: 0,
        totalEvents: 0,
        lastEventAt: now,
        memoryUsage: process.memoryUsage ? process.memoryUsage().heapUsed : 0
      },
      summary: {
        totalOpenTables: 0,
        totalPendingRevenue: 0,
        totalActiveStaff: 0,
        criticalOperationsInProgress: ['Storage unavailable during shutdown']
      }
    };
  }

  /**
   * Compare two app states and generate report
   */
  private compareAppStates(lastShutdown: AppExitSnapshot | null, currentState: AppExitSnapshot): StateComparisonReport {
    const differences: StateComparisonReport['differences'] = {
      businessDayChanged: false,
      tablesChanged: false,
      staffChanged: false,
      timeGap: 0,
      criticalChanges: []
    };
    
    const recommendations: string[] = [];
    
    if (!lastShutdown) {
      recommendations.push('First startup - no previous state to compare');
      return {
        lastShutdown: null,
        currentState,
        differences,
        recommendations
      };
    }
    
    // Calculate time gap
    differences.timeGap = currentState.timestamp - lastShutdown.timestamp;
    
    // Business day comparison
    const previousDayId = lastShutdown.businessDay.id;
    const currentDayId = currentState.businessDay.id;
    
    if (previousDayId !== currentDayId) {
      differences.businessDayChanged = true;
      differences.businessDayDetails = {
        previousDay: previousDayId,
        currentDay: currentDayId,
        dayTransition: !!previousDayId && !!currentDayId
      };
      
      if (differences.businessDayDetails.dayTransition) {
        recommendations.push('Business day changed - verify day-end procedures completed');
      }
    }
    
    // Tables comparison
    const previousTables = lastShutdown.openTables.map(t => t.tableId);
    const currentTables = currentState.openTables.map(t => t.tableId);
    
    if (JSON.stringify(previousTables.sort()) !== JSON.stringify(currentTables.sort())) {
      differences.tablesChanged = true;
      differences.tableDetails = {
        previousTables,
        currentTables,
        newTables: currentTables.filter(t => !previousTables.includes(t)),
        recoveredTables: currentTables.filter(t => previousTables.includes(t)),
        lostTables: previousTables.filter(t => !currentTables.includes(t))
      };
      
      if (differences.tableDetails.recoveredTables.length > 0) {
        differences.criticalChanges.push('Tables recovered from previous session');
        recommendations.push('Review recovered tables - verify orders are still valid');
      }
    }
    
    // Staff comparison
    const previousStaffIds = lastShutdown.activeStaff.map(s => s.staffId);
    const currentStaffIds = currentState.activeStaff.map(s => s.staffId);
    
    if (JSON.stringify(previousStaffIds.sort()) !== JSON.stringify(currentStaffIds.sort())) {
      differences.staffChanged = true;
      differences.staffDetails = {
        previousStaff: previousStaffIds,
        currentStaff: currentStaffIds,
        newLogins: currentStaffIds.filter(s => !previousStaffIds.includes(s)),
        missingStaff: previousStaffIds.filter(s => !currentStaffIds.includes(s))
      };
      
      if (differences.staffDetails.missingStaff.length > 0) {
        differences.criticalChanges.push('Staff sessions not recovered');
        recommendations.push('Missing staff sessions - may need to log in again');
      }
    }
    
    // System health checks
    if (!lastShutdown.gracefulShutdown) {
      differences.criticalChanges.push('Previous shutdown was not graceful');
      recommendations.push('Previous session ended unexpectedly - verify data integrity');
    }
    
    if (differences.timeGap > 24 * 60 * 60 * 1000) { // > 24 hours
      differences.criticalChanges.push('Extended shutdown period');
      recommendations.push('Long time between sessions - review business continuity');
    }
    
    return {
      lastShutdown,
      currentState,
      differences,
      recommendations
    };
  }

  /**
   * Load last exit snapshot from disk
   */
  private async loadLastExitSnapshot(): Promise<AppExitSnapshot | null> {
    try {
      if (!fs.existsSync(this.exitSnapshotPath)) {
        return null;
      }
      
      const data = fs.readFileSync(this.exitSnapshotPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('[AppLifecycleManager] Failed to load last exit snapshot:', error);
      return null;
    }
  }

  /**
   * Save exit snapshot to disk
   */
  private async saveExitSnapshot(snapshot: AppExitSnapshot): Promise<void> {
    try {
      // Save JSON snapshot
      fs.writeFileSync(this.exitSnapshotPath, JSON.stringify(snapshot, null, 2));
      
      // Save human-readable text version
      const textReport = this.formatSnapshotAsText(snapshot);
      fs.writeFileSync(this.exitSnapshotTextPath, textReport);
      
      console.log('[AppLifecycleManager] ✅ Exit snapshot saved');
    } catch (error) {
      console.error('[AppLifecycleManager] ❌ Failed to save exit snapshot:', error);
    }
  }

  /**
   * Format snapshot as human-readable text
   */
  private formatSnapshotAsText(snapshot: AppExitSnapshot): string {
    const lines = [
      '🍺 AETHER POS - EXIT SNAPSHOT',
      '=' .repeat(50),
      '',
      `Exit Time: ${snapshot.timestampISO}`,
      `Graceful Shutdown: ${snapshot.gracefulShutdown ? '✅ Yes' : '❌ No'}`,
      '',
      '📊 BUSINESS DAY STATUS:',
      `  Day ID: ${snapshot.businessDay.id || 'None'}`,
      `  Status: ${snapshot.businessDay.status}`,
      `  Opened By: ${snapshot.businessDay.openedBy || 'N/A'}`,
      '',
      '🍽️ OPEN TABLES:',
      snapshot.openTables.length === 0 
        ? '  ✅ No open tables' 
        : snapshot.openTables.map(table => 
            `  • ${table.tableId}: €${table.total.toFixed(2)} (${table.itemCount} items) - ${table.staff}`
          ).join('\n'),
      '',
      '👥 ACTIVE STAFF:',
      snapshot.activeStaff.length === 0
        ? '  ✅ No active sessions'
        : snapshot.activeStaff.map(staff =>
            `  • ${staff.name} (${Math.round(staff.sessionDuration / 60000)}min session)`
          ).join('\n'),
      '',
      '⚠️ CRITICAL OPERATIONS:',
      snapshot.summary.criticalOperationsInProgress.length === 0
        ? '  ✅ None'
        : snapshot.summary.criticalOperationsInProgress.map(op => `  • ${op}`).join('\n'),
      '',
      '💾 SYSTEM HEALTH:',
      `  Memory Usage: ${Math.round(snapshot.systemHealth.memoryUsage / 1024 / 1024)}MB`,
      `  Uptime: ${Math.round(snapshot.systemHealth.uptime / 60000)}min`,
      '',
      '=' .repeat(50)
    ];
    
    return lines.join('\n');
  }

  /**
   * Log state comparison report to console
   */
  private logStateComparisonReport(report: StateComparisonReport): void {
    console.log('[AppLifecycleManager] 📋 STATE COMPARISON REPORT');
    console.log('=' .repeat(50));
    
    if (!report.lastShutdown) {
      console.log('🆕 First startup - no previous state to compare');
      return;
    }
    
    const timeGapHours = Math.round(report.differences.timeGap / (60 * 60 * 1000) * 10) / 10;
    console.log(`⏰ Time since last shutdown: ${timeGapHours}h`);
    
    if (report.differences.criticalChanges.length > 0) {
      console.log('🚨 CRITICAL CHANGES DETECTED:');
      report.differences.criticalChanges.forEach(change => {
        console.log(`  ❗ ${change}`);
      });
    }
    
    if (report.differences.businessDayChanged) {
      console.log(`📅 Business Day: ${report.differences.businessDayDetails?.previousDay} → ${report.differences.businessDayDetails?.currentDay}`);
    }
    
    if (report.differences.tablesChanged) {
      const details = report.differences.tableDetails!;
      if (details.recoveredTables.length > 0) {
        console.log(`🍽️ Recovered Tables: ${details.recoveredTables.join(', ')}`);
      }
      if (details.lostTables.length > 0) {
        console.log(`⚠️ Lost Tables: ${details.lostTables.join(', ')}`);
      }
    }
    
    if (report.differences.staffChanged) {
      const details = report.differences.staffDetails!;
      if (details.missingStaff.length > 0) {
        console.log(`👤 Missing Staff: ${details.missingStaff.join(', ')}`);
      }
    }
    
    if (report.recommendations.length > 0) {
      console.log('💡 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }
    
    console.log('=' .repeat(50));
  }

  /**
   * Cleanup resources during shutdown
   */
  private async cleanupResources(): Promise<void> {
    try {
      // Stop live snapshot watcher
      if (this.liveSnapshotWatcher) {
        await this.liveSnapshotWatcher.stop();
      }
      
      // Cleanup storage connections
      if (this.storage && typeof this.storage.close === 'function') {
        await this.storage.close();
      }
      
      // Clear any remaining timers or intervals
      // (Specific cleanup depends on your system components)
      
    } catch (error) {
      console.error('[AppLifecycleManager] Error during resource cleanup:', error);
    }
  }

  /**
   * Get exit snapshot path for external access
   */
  getExitSnapshotPath(): string {
    return this.exitSnapshotPath;
  }

  /**
   * Get text snapshot path for external access
   */
  getTextSnapshotPath(): string {
    return this.exitSnapshotTextPath;
  }
}