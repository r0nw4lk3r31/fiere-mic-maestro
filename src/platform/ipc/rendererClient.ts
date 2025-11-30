// rendererClient.ts - typed renderer-side IPC client using preload bridges

import type { EventsAcceptRequest, ProjectionsGetStateRequest } from './IpcTypes';

declare global {
  interface Window {
    // ...existing code...
    aetherEvents?: { accept: (req: EventsAcceptRequest) => Promise<string> };
    aetherProjections?: {
      getState: <T = unknown>(req: ProjectionsGetStateRequest) => Promise<T>;
      rebuild: () => Promise<boolean>;
      reset: (projectionIds: string[]) => Promise<boolean>;
      list: () => Promise<string[]>;
    };
    aetherRepositories?: {
      productRepository?: {
        getProducts: () => Promise<any[]>;
      };
      stockRepository?: {
        getStockLevels: () => Promise<any[]>;
        getStockTransactions: () => Promise<any[]>;
      };
      supplierRepository?: {
        getAll: (filters?: any) => Promise<any[]>;
        getById: (id: string) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: string, data: any) => Promise<any>;
        delete: (id: string) => Promise<boolean>;
        updatePerformance: (id: string, performance: any) => Promise<any>;
        getStats: (id: string) => Promise<any>;
        pricing: {
          create: (data: any) => Promise<any>;
          getForProduct: (productId: string) => Promise<any[]>;
          getForSupplier: (supplierId: string) => Promise<any[]>;
          update: (pricingId: string, data: any, updatedBy: string, reason?: string) => Promise<any>;
          delete: (pricingId: string) => Promise<boolean>;
          getPreferred: (productId: string) => Promise<any>;
          setPreferred: (productId: string, supplierId: string, updatedBy: string) => Promise<boolean>;
        };
      };
      businessDayRepository?: {
        getCurrent: () => Promise<any>;
        getHistory: (startDate?: string, endDate?: string) => Promise<any[]>;
      };
    };
    aetherReady?: () => Promise<boolean>;
  }
}

function ensure<T>(value: T | undefined, name: string): T {
  if (!value) throw new Error(`${name} bridge not available`);
  return value as T;
}

export const ipcClient = {
  events: {
    accept: async (req: EventsAcceptRequest): Promise<string> => {
      const bridge = ensure(window.aetherEvents, 'aetherEvents');
      return bridge.accept(req);
    }
  },
  projections: {
    getState: async <T = unknown>(id: string): Promise<T> => {
      const bridge = ensure(window.aetherProjections, 'aetherProjections');
      return bridge.getState<T>({ id });
    },
    rebuild: async (): Promise<boolean> => {
      const bridge = ensure(window.aetherProjections, 'aetherProjections');
      return bridge.rebuild();
    },
    reset: async (projectionIds: string[]): Promise<boolean> => {
      const bridge = ensure(window.aetherProjections, 'aetherProjections');
      return bridge.reset(projectionIds);
    },
    list: async (): Promise<string[]> => {
      const bridge = ensure(window.aetherProjections, 'aetherProjections');
      return bridge.list();
    }
  }
};
