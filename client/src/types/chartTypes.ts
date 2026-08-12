import {WsStatus} from "@/hooks/useResilientWebSocket";

export interface BinanceKlinePayload {
    k?: {
        t?: number;
        o?: string;
        h?: string;
        l?: string;
        c?: string;
    };
}

export interface BinanceTradePayload {
    p?: string;
}

export interface ResilientWsOptions {
    onMessage: (data: unknown, event: MessageEvent) => void;
    onStatusChange?: (status: WsStatus) => void;
    onGiveUp?: () => void;
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitter?: number;
    maxRetries?: number;
    connectTimeoutMs?: number;
    heartbeatTimeoutMs?: number;
}

export interface ResilientWsHandle {
    close: () => void;
}
