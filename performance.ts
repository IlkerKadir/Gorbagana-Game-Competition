// frontend/src/utils/performance.ts
/*
import { useCallback, useEffect, useRef, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';

// Debounce hook for reducing excessive API calls
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook for limiting function executions
export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastExecRef = useRef<number>(0);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastExecRef.current >= delay) {
        lastExecRef.current = now;
        return func(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          lastExecRef.current = Date.now();
          func(...args);
        }, delay - (now - lastExecRef.current));
      }
    }) as T,
    [func, delay]
  );
}

// Optimized connection manager with connection pooling
export class OptimizedConnectionManager {
  private connections: Map<string, Connection> = new Map();
  private healthChecks: Map<string, number> = new Map();
  private readonly maxConnections = 3;
  private readonly healthCheckInterval = 30000; // 30 seconds

  constructor() {
    // Periodically check connection health
    setInterval(() => {
      this.performHealthChecks();
    }, this.healthCheckInterval);
  }

  getConnection(endpoint: string, commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed'): Connection {
    const key = `${endpoint}-${commitment}`;

    if (!this.connections.has(key)) {
      if (this.connections.size >= this.maxConnections) {
        // Remove oldest connection
        const firstKey = this.connections.keys().next().value;
        this.connections.delete(firstKey);
        this.healthChecks.delete(firstKey);
      }

      const connection = new Connection(endpoint, commitment);
      this.connections.set(key, connection);
      this.healthChecks.set(key, Date.now());
    }

    return this.connections.get(key)!;
  }

  private async performHealthChecks() {
    for (const [key, connection] of this.connections.entries()) {
      try {
        const startTime = Date.now();
        await connection.getSlot();
        const responseTime = Date.now() - startTime;

        // Remove slow connections
        if (responseTime > 10000) { // 10 seconds timeout
          console.warn(`Removing slow connection: ${key} (${responseTime}ms)`);
          this.connections.delete(key);
          this.healthChecks.delete(key);
        } else {
          this.healthChecks.set(key, Date.now());
        }
      } catch (error) {
        console.error(`Connection health check failed for ${key}:`, error);
        this.connections.delete(key);
        this.healthChecks.delete(key);
      }
    }
  }

  clearConnections() {
    this.connections.clear();
    this.healthChecks.clear();
  }
}

// Memoized account fetching with caching
export class AccountCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly cacheTimeout = 5000; // 5 seconds

  async getAccount<T>(
    connection: Connection,
    pubkey: PublicKey,
    parser: (data: any) => T,
    forceRefresh = false
  ): Promise<T | null> {
    const key = pubkey.toString();
    const now = Date.now();

    // Check cache
    if (!forceRefresh && this.cache.has(key)) {
      const cached = this.cache.get(key)!;
      if (now - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const accountInfo = await connection.getAccountInfo(pubkey);
      if (!accountInfo) {
        this.cache.set(key, { data: null, timestamp: now });
        return null;
      }

      const parsed = parser(accountInfo);
      this.cache.set(key, { data: parsed, timestamp: now });
      return parsed;
    } catch (error) {
      console.error(`Failed to fetch account ${key}:`, error);
      return null;
    }
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

// Batch transaction processing
export class TransactionBatcher {
  private pendingTransactions: Array<{
    transaction: () => Promise<string>;
    resolve: (signature: string) => void;
    reject: (error: Error) => void;
  }> = [];
  private processing = false;
  private readonly batchSize = 5;
  private readonly batchDelay = 100; // milliseconds

  async addTransaction(transaction: () => Promise<string>): Promise<string> {
    return new Promise((resolve, reject) => {
      this.pendingTransactions.push({ transaction, resolve, reject });
      this.processBatch();
    });
  }

  private async processBatch() {
    if (this.processing || this.pendingTransactions.length === 0) {
      return;
    }

    this.processing = true;

    while (this.pendingTransactions.length > 0) {
      const batch = this.pendingTransactions.splice(0, this.batchSize);

      // Process transactions in parallel within the batch
      const promises = batch.map(async ({ transaction, resolve, reject }) => {
        try {
          const signature = await transaction();
          resolve(signature);
        } catch (error) {
          reject(error as Error);
        }
      });

      await Promise.allSettled(promises);

      // Add delay between batches to avoid overwhelming the network
      if (this.pendingTransactions.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.batchDelay));
      }
    }

    this.processing = false;
  }
}

// React hook for optimized WebSocket subscriptions
export function useOptimizedWebSocket(
  url: string,
  onMessage: (data: any) => void,
  dependencies: any[] = []
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState('connecting');
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setConnectionState('connected');
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setConnectionState('disconnected');
      console.log('WebSocket disconnected');

      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionState('disconnected');
    };

    wsRef.current = ws;
  }, [url, onMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, ...dependencies]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent');
    }
  }, []);

  return { connectionState, sendMessage };
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  startTimer(name: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (!this.metrics.has(name)) {
        this.metrics.set(name, []);
      }

      const timings = this.metrics.get(name)!;
      timings.push(duration);

      // Keep only last 100 measurements
      if (timings.length > 100) {
        timings.shift();
      }

      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    };
  }

  getAverageTime(name: string): number {
    const timings = this.metrics.get(name);
    if (!timings || timings.length === 0) {
      return 0;
    }

    return timings.reduce((sum, time) => sum + time, 0) / timings.length;
  }

  getMetrics(): Record<string, { count: number; average: number; min: number; max: number }> {
    const result: Record<string, any> = {};

    for (const [name, timings] of this.metrics.entries()) {
      if (timings.length > 0) {
        result[name] = {
          count: timings.length,
          average: timings.reduce((sum, time) => sum + time, 0) / timings.length,
          min: Math.min(...timings),
          max: Math.max(...timings),
        };
      }
    }

    return result;
  }

  clearMetrics() {
    this.metrics.clear();
  }
}

// Global instances
export const connectionManager = new OptimizedConnectionManager();
export const accountCache = new AccountCache();
export const transactionBatcher = new TransactionBatcher();
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const measure = useCallback((name: string) => {
    return performanceMonitor.startTimer(name);
  }, []);

  const getMetrics = useCallback(() => {
    return performanceMonitor.getMetrics();
  }, []);

  return { measure, getMetrics };
}

export default {
  useDebounce,
  useThrottle,
  OptimizedConnectionManager,
  AccountCache,
  TransactionBatcher,
  useOptimizedWebSocket,
  PerformanceMonitor,
  connectionManager,
  accountCache,
  transactionBatcher,
  performanceMonitor,
  usePerformanceMonitor,
};
