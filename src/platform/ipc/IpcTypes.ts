export interface IpcResponse<T = unknown> {
  ok: boolean;
  result?: T;
  error?: string;
}

export interface EventsAcceptRequest {
  type: string;
  payload?: any;
  aggregateId?: string;
  meta?: {
    correlationId?: string;
    causationId?: string;
    staffId?: string;
    sessionId?: string;
  };
}

export interface ProjectionsGetStateRequest {
  id: string;
}
