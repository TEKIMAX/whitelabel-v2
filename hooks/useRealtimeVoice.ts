import { useRef, useState, useCallback, useEffect } from 'react';

interface RealtimeVoiceOptions {
    onTextDelta?: (text: string) => void;
    onAudioOutput?: (audioChunk: Uint8Array) => void; // Binary audio chunk from model
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: any) => void;
}

export function useRealtimeVoice(options: RealtimeVoiceOptions) {
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const connect = useCallback(() => {
        // Use the Rust API Endpoint
        // In dev: ws://localhost:8787/v1/realtime
        // In prod: wss://adaptive-api-rust.christiank.workers.dev/v1/realtime
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // You might want to make this configurable via env vars
        const endpoint = process.env.NEXT_PUBLIC_REALTIME_API_URL || "wss://adaptive-api-rust.christiank.workers.dev/v1/realtime";

        try {
            const ws = new WebSocket(endpoint);
            ws.binaryType = "arraybuffer";

            ws.onopen = () => {
                setIsConnected(true);
                options.onConnect?.();
            };

            ws.onmessage = (event) => {
                if (typeof event.data === 'string') {
                    // Text or Control Message
                    options.onTextDelta?.(event.data);
                } else {
                    // Binary Audio
                    options.onAudioOutput?.(new Uint8Array(event.data));
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                options.onDisconnect?.();
            };

            ws.onerror = (err) => {
                options.onError?.(err);
            };

            wsRef.current = ws;
        } catch (e) {
            options.onError?.(e);
        }
    }, [options]);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    const sendAudio = useCallback((audioChunk: Float32Array | Int16Array | ArrayBuffer) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(audioChunk);
        }
    }, []);

    const sendText = useCallback((text: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(text);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    return {
        connect,
        disconnect,
        sendAudio,
        sendText,
        isConnected
    };
}
