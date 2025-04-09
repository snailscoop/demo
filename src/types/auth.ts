export interface Session {
  address: string;
  publicKey: string;
  privateKey: string;
  createdAt: number;
  lastActive: number;
  permissions: string[];
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface KeplrError {
  name: string;
  message: string;
  type: string;
  details?: string;
} 