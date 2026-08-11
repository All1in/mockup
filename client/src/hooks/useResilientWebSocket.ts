import { useCallback, useEffect, useRef } from 'react';
import {ResilientWsHandle, ResilientWsOptions} from "@/types/chartTypes";
import { calcBackoffDelay } from "@/utils/helperFunctions";

export type WsStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

export function useResilientWebSocket(
    url: string | null | undefined,
    options: ResilientWsOptions,
): ResilientWsHandle {
    const {
        onMessage,
        onStatusChange,
        onGiveUp,
        baseDelayMs        = 500,
        maxDelayMs         = 30_000,
        jitter             = 0.3,
        maxRetries         = Infinity,
        connectTimeoutMs   = 10_000,
        heartbeatTimeoutMs = 15_000,
    } = options;

    const onMessageRef      = useRef(onMessage);
    const onStatusChangeRef = useRef(onStatusChange);
    const onGiveUpRef       = useRef(onGiveUp);

    useEffect(() => { onMessageRef.current      = onMessage;      }, [onMessage]);
    useEffect(() => { onStatusChangeRef.current = onStatusChange; }, [onStatusChange]);
    useEffect(() => { onGiveUpRef.current       = onGiveUp;       }, [onGiveUp]);

    const intentionalCloseRef = useRef(false);

    const retryCountRef = useRef(0);

    const retryTimerRef   = useRef<ReturnType<typeof setTimeout>  | null>(null);
    const connectTimerRef = useRef<ReturnType<typeof setTimeout>  | null>(null);
    const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const lastMessageAtRef = useRef<number>(Date.now());

    const wsRef = useRef<WebSocket | null>(null);

    const clearRetryTimer = useCallback(() => {
        if (retryTimerRef.current !== null) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
    }, []);

    const clearConnectTimer = useCallback(() => {
        if (connectTimerRef.current !== null) {
            clearTimeout(connectTimerRef.current);
            connectTimerRef.current = null;
        }
    }, []);

    const clearHeartbeat = useCallback(() => {
        if (heartbeatTimerRef.current !== null) {
            clearInterval(heartbeatTimerRef.current);
            heartbeatTimerRef.current = null;
        }
    }, []);

    const notifyStatus = useCallback((status: WsStatus) => {
        queueMicrotask(() => onStatusChangeRef.current?.(status));
    }, []);

    const closeCurrentSocket = useCallback((code = 1000, reason = 'replaced') => {
        const ws = wsRef.current;
        if (!ws) return;

        ws.onopen    = null;
        ws.onmessage = null;
        ws.onerror   = null;
        ws.onclose   = null;

        if (
            ws.readyState === WebSocket.OPEN ||
            ws.readyState === WebSocket.CONNECTING
        ) {
            ws.close(code, reason);
        }

        wsRef.current = null;
    }, []);

    useEffect(() => {
        if (!url) return;

        intentionalCloseRef.current = false;
        retryCountRef.current       = 0;

        const scheduleReconnect = () => {
            if (intentionalCloseRef.current) return;

            const attempt = retryCountRef.current;

            if (attempt >= maxRetries) {
                console.error(`[WS] Giving up after ${attempt} attempt(s) on ${url}.`);
                notifyStatus('closed');
                queueMicrotask(() => onGiveUpRef.current?.());
                return;
            }

            retryCountRef.current += 1;

            const delay = calcBackoffDelay(attempt, baseDelayMs, maxDelayMs, jitter);

            console.warn(
                `[WS] Reconnect #${retryCountRef.current} in ${Math.round(delay)}ms…`,
            );

            notifyStatus('reconnecting');
            retryTimerRef.current = setTimeout(open, delay);
        };

        function open() {
            if (intentionalCloseRef.current) return;

            closeCurrentSocket(1000, 'reconnecting');

            notifyStatus(retryCountRef.current === 0 ? 'connecting' : 'reconnecting');

            let ws: WebSocket;
            try {
                ws = new WebSocket(url!);
            } catch (err) {
                console.error('[WS] WebSocket constructor threw for', url, err);
                scheduleReconnect();
                return;
            }

            wsRef.current = ws;

            if (connectTimeoutMs > 0) {
                clearConnectTimer();
                connectTimerRef.current = setTimeout(() => {
                    if (wsRef.current === ws && ws.readyState !== WebSocket.OPEN) {
                        console.warn(
                            `[WS] Handshake timed out after ${connectTimeoutMs}ms on ${url}`,
                        );
                        ws.close(4001, 'connect_timeout');
                    }
                }, connectTimeoutMs);
            }

            ws.onopen = () => {
                clearConnectTimer();

                retryCountRef.current    = 0;
                lastMessageAtRef.current = Date.now();
                notifyStatus('open');

                if (heartbeatTimeoutMs > 0) {
                    clearHeartbeat();
                    heartbeatTimerRef.current = setInterval(() => {
                        const age = Date.now() - lastMessageAtRef.current;
                        if (age > heartbeatTimeoutMs) {
                            console.warn(
                                `[WS] Silent for ${age}ms (>${heartbeatTimeoutMs}ms). ` +
                                `Force-closing stale socket on ${url}`,
                            );
                            ws.close(4000, 'heartbeat_timeout');
                        }
                    }, Math.max(1_000, heartbeatTimeoutMs / 3));
                }
            };

            ws.onmessage = (event: MessageEvent) => {
                lastMessageAtRef.current = Date.now();
                try {
                    const parsed = JSON.parse(event.data as string) as unknown;
                    onMessageRef.current(parsed, event);
                } catch {
                    onMessageRef.current(event.data, event);
                }
            };

            ws.onerror = (event: Event) => {
                console.error('[WS] Error on', url, event);
            };

            ws.onclose = (event: CloseEvent) => {
                clearConnectTimer();
                clearHeartbeat();
                wsRef.current = null;

                if (intentionalCloseRef.current) {
                    notifyStatus('closed');
                    return;
                }

                console.warn(
                    `[WS] Closed — code=${event.code} reason="${event.reason}"`,
                );

                scheduleReconnect();
            };
        }

        open();

        const teardown = () => {
            intentionalCloseRef.current = true;
            clearRetryTimer();
            clearConnectTimer();
            clearHeartbeat();
            closeCurrentSocket(1000, 'unmount');
        };

        return teardown;
    }, [url]);

    const close = useCallback(() => {
        intentionalCloseRef.current = true;
        clearRetryTimer();
        clearConnectTimer();
        clearHeartbeat();
        closeCurrentSocket(1000, 'permanent_close');
        notifyStatus('closed');
    }, [clearRetryTimer, clearConnectTimer, clearHeartbeat, closeCurrentSocket, notifyStatus]);

    return { close };
}