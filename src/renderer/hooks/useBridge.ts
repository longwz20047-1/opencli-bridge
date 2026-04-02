import { useEffect } from 'react';

declare global {
  interface Window {
    bridge: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
    };
  }
}

export function useBridgeEvent(channel: string, handler: (...args: unknown[]) => void) {
  useEffect(() => {
    const unsub = window.bridge.on(channel, handler);
    return unsub;
  }, [channel, handler]);
}

export async function bridgeInvoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T> {
  return window.bridge.invoke(channel, ...args) as Promise<T>;
}
