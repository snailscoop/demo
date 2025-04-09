import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Web3Service } from '../services/Web3Service';

interface Web3ContextType {
  web3Service: Web3Service;
  isConnected: boolean;
  address: string | null;
  connect: () => Promise<void>;
  balance: string | null;
  error: string | null;
}

const Web3Context = createContext<Web3ContextType | null>(null);

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider = ({ children }: Web3ProviderProps): JSX.Element => {
  const web3Service = Web3Service.getInstance();
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    try {
      setError(null);
      await web3Service.connectKeplr();
      setIsConnected(true);
      setAddress(web3Service.getAddress());
      const balance = await web3Service.getBalance();
      setBalance(balance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
      setIsConnected(false);
      setAddress(null);
      setBalance(null);
    }
  };

  useEffect(() => {
    // Check initial connection status
    setIsConnected(web3Service.isConnected());
    setAddress(web3Service.getAddress());
  }, []);

  return (
    <Web3Context.Provider
      value={{
        web3Service,
        isConnected,
        address,
        connect,
        balance,
        error,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}; 