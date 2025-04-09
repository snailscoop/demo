import React from 'react';
import { useWeb3 } from '../contexts/Web3Context';

export const Web3Connect: React.FC = () => {
  const { isConnected, address, connect, balance, error } = useWeb3();

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      {!isConnected ? (
        <button
          onClick={connect}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Connect Keplr Wallet
        </button>
      ) : (
        <div>
          <p className="text-sm text-gray-600">Connected Address:</p>
          <p className="font-mono text-sm break-all">{address}</p>
          {balance && (
            <div className="mt-2">
              <p className="text-sm text-gray-600">Balance:</p>
              <p className="font-mono text-sm">{balance} OSMO</p>
            </div>
          )}
        </div>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}; 