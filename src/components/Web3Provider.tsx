import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Web3ContextType {
  address: string | null;
  setAddress: (address: string | null) => void;
}

const Web3Context = createContext<Web3ContextType>({
  address: null,
  setAddress: () => {},
});

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps): JSX.Element {
  const [address, setAddress] = useState<string | null>(null);

  return (
    <Web3Context.Provider value={{ address, setAddress }}>
      {children}
    </Web3Context.Provider>
  );
} 