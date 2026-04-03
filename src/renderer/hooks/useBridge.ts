import { useEffect } from 'react';

declare global {
  interface Window {
    bridge?: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
    };
  }
}

function getBridge() {
  if (!window.bridge) {
    throw new Error('Bridge not available — preload may have failed to load');
  }
  return window.bridge;
}

export function useBridgeEvent(channel: string, handler: (...args: unknown[]) => void) {
  useEffect(() => {
    if (!window.bridge) {
      console.error(`[Bridge] Cannot subscribe to "${channel}" — bridge not available`);
      return () => {};
    }
    const unsub = window.bridge.on(channel, handler);
    return unsub;
  }, [channel, handler]);
}

export async function bridgeInvoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T> {
  return getBridge().invoke(channel, ...args) as Promise<T>;
}
