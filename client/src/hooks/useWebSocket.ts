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
  const [status, setStatus] = useState<WebSocketStatus>('closed');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  
  const {
    reconnectOnClose = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onOpen,
    onMessage,
    onClose,
    onError,
  } = options;
  
  // Create WebSocket connection
  const connect = useCallback(() => {
    // Close any existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    // Determine the WebSocket URL based on the current host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}${path}`;
    
    setStatus('connecting');
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = (event) => {
        console.log('WebSocket connection established');
        setStatus('open');
        reconnectAttemptsRef.current = 0;
        
        if (onOpen) {
          onOpen(event);
        }
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          
          if (onMessage) {
            onMessage(data);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = (event) => {
        console.log('WebSocket connection closed');
        setStatus('closed');
        
        if (onClose) {
          onClose(event);
        }
        
        // Attempt to reconnect if enabled
        if (reconnectOnClose && reconnectAttemptsRef.current < maxReconnectAttempts) {
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})...`);
          
          if (reconnectTimeoutRef.current !== null) {
            window.clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, reconnectInterval);
        }
      };
      
      wsRef.current.onerror = (event) => {
        console.error('WebSocket error:', event);
        setStatus('error');
        
        if (onError) {
          onError(event);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setStatus('error');
    }
  }, [path, reconnectOnClose, reconnectInterval, maxReconnectAttempts, onOpen, onMessage, onClose, onError]);
  
  // Send a message through the WebSocket
  const sendMessage = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(message);
      return true;
    }
    return false;
  }, []);
  
  // Subscribe to a specific channel
  const subscribe = useCallback((channel: string) => {
    return sendMessage({
      type: 'subscribe',
      channel
    });
  }, [sendMessage]);
  
  // Unsubscribe from a specific channel
  const unsubscribe = useCallback((channel: string) => {
    return sendMessage({
      type: 'unsubscribe',
      channel
    });
  }, [sendMessage]);
  
  // Connect when component mounts, disconnect when it unmounts
  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);
  
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