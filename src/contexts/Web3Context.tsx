import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { BrowserProvider } from 'ethers';

interface Web3ContextType {
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

const BSC_CHAIN_ID = 56; // BSC主网
const BSC_TESTNET_CHAIN_ID = 97; // BSC测试网

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const isConnected = !!account;
  const isCorrectNetwork = chainId === BSC_CHAIN_ID || chainId === BSC_TESTNET_CHAIN_ID;

  useEffect(() => {
    // 检查是否已连接
    checkConnection();

    // 监听账户变化
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const checkConnection = async () => {
    if (!window.ethereum) return;

    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      
      if (accounts.length > 0) {
        setAccount(accounts[0].address);
      }

      const network = await provider.getNetwork();
      setChainId(Number(network.chainId));
    } catch (error) {
      console.error('检查连接失败:', error);
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length > 0) {
      setAccount(accounts[0]);
    } else {
      setAccount(null);
    }
  };

  const handleChainChanged = () => {
    // 链变化时重新加载页面
    window.location.reload();
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('请安装MetaMask钱包！');
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      }

      const network = await provider.getNetwork();
      setChainId(Number(network.chainId));

      // 如果不是BSC网络，提示切换
      if (Number(network.chainId) !== BSC_CHAIN_ID && Number(network.chainId) !== BSC_TESTNET_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x38' }], // BSC主网
          });
        } catch (switchError: unknown) {
          // 如果链不存在，添加BSC网络
          if ((switchError as { code: number }).code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0x38',
                    chainName: 'Binance Smart Chain',
                    nativeCurrency: {
                      name: 'BNB',
                      symbol: 'BNB',
                      decimals: 18,
                    },
                    rpcUrls: ['https://bsc-dataseed.binance.org/'],
                    blockExplorerUrls: ['https://bscscan.com/'],
                  },
                ],
              });
            } catch (addError) {
              console.error('添加BSC网络失败:', addError);
            }
          }
        }
      }
    } catch (error) {
      console.error('连接钱包失败:', error);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setChainId(null);
  };

  return (
    <Web3Context.Provider
      value={{
        account,
        chainId,
        isConnected,
        isCorrectNetwork,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}

// 扩展Window类型
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}
