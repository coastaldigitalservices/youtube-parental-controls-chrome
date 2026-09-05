declare namespace chrome {
  namespace runtime {
    interface MessageSender { tab?: { id?: number }; frameId?: number }
    const lastError: { message?: string } | undefined;
    const onMessage: { addListener(callback: (message: unknown, sender: MessageSender) => void): void };
    const onStartup: { addListener(callback: () => void): void };
    const onInstalled: { addListener(callback: () => void): void };
    function getURL(path: string): string;
    function sendMessage(message: unknown): Promise<unknown>;
  }
  namespace storage.local {
    function get(key: string): Promise<Record<string, unknown>>;
    function set(items: Record<string, unknown>): Promise<void>;
  }
  namespace tabs {
    const onRemoved: { addListener(callback: (tabId: number) => void): void };
  }
}
