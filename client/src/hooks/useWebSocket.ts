import { useState, useEffect, useCallback, useRef } from 'react';

export type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

export type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error';

export interface UseWebSocketOptions {
  reconnectOnClose?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: (event: Event) => void;
  onMessage?: (data: WebSocketMessage) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

export function useWebSocket(path: string = '/ws', options: UseWebSocketOptions = {}) {
  // Fixed status, never tries to connect
  const [status, setStatus] = useState<WebSocketStatus>('closed');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  const {
    onOpen,
    onMessage,
    onClose,
    onError,
  } = options;

  // Dummy function, no longer attempts to connect
  const connect = useCallback(() => {
    console.log('WebSocket implementation removed');
    return;
  }, []);
  
  // Dummy send message function that always returns false
  const sendMessage = useCallback((data: any) => {
    return false;
  }, []);
  
  // Dummy subscribe function that always returns false
  const subscribe = useCallback((channel: string) => {
    return false;
  }, []);
  
  // Dummy unsubscribe function that always returns false
  const unsubscribe = useCallback((channel: string) => {
    return false;
  }, []);
  
  // No-op effect
  useEffect(() => {
    return () => {};
  }, []);
  
  return {
    status,
    lastMessage,
    sendMessage,
    subscribe,
    unsubscribe,
    reconnect: connect
  };
}

export default useWebSocket;