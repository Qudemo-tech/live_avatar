import { useState, useRef, useCallback } from 'react';
import { LogEntry } from '../lib/types';

export function useEventLogger() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdCounter = useRef(0);

  const log = useCallback((category: string, message: string, data?: any) => {
    const entry: LogEntry = {
      id: logIdCounter.current++,
      category,
      message,
      data: data !== undefined ? data : undefined,
    };

    setLogs(prev => [entry, ...prev].slice(0, 1000)); // Keep last 1000 logs

    // Also log to console for developer tools
    const prefix = `[${category}]`;
    if (data !== undefined) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    log('SYSTEM', 'Logs cleared');
  }, [log]);

  return {
    logs,
    log,
    clearLogs,
  };
}
