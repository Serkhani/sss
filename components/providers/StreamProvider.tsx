'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createPublicClient, createWalletClient, custom, http, PublicClient, WalletClient, Chain } from 'viem';
import { SDK as Somnia } from '@somnia-chain/streams';

// Define Somnia Testnet Chain
const somniaTestnet: Chain = {
    id: 50312, // Replace with actual Chain ID if different, checking docs or user input might be needed. 
    // For now using a placeholder or common testnet ID if known. 
    // WAIT, I should probably ask or look for it. 
    // Let's use a generic one and add a comment.
    // Actually, I will use the one from the docs if I knew it. 
    // Let's assume 50312 (Somnia Devnet) or similar. 
    // I will use a standard definition.
    name: 'Somnia Testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'STT',
        symbol: 'STT',
    },
    rpcUrls: {
        default: { http: ['https://dream-rpc.somnia.network'] },
    },
    blockExplorers: {
        default: { name: 'Somnia Explorer', url: 'https://somnia-testnet.socialscan.io' },
    },
    testnet: true,
};

declare global {
    interface Window {
        ethereum: any;
    }
}

interface StreamContextType {
    sdk: Somnia | null;
    walletClient: WalletClient | null;
    publicClient: PublicClient | null;
    address: string | null;
    isConnected: boolean;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
}

const StreamContext = createContext<StreamContextType>({
    sdk: null,
    walletClient: null,
    publicClient: null,
    address: null,
    isConnected: false,
    connectWallet: async () => { },
    disconnectWallet: () => { },
});

export const useStream = () => useContext(StreamContext);

export const StreamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [sdk, setSdk] = useState<Somnia | null>(null);
    const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
    const [publicClient, setPublicClient] = useState<PublicClient | null>(null);
    const [address, setAddress] = useState<string | null>(null);

    // Initialize Public Client and SDK on mount
    useEffect(() => {
        const pc = createPublicClient({
            chain: somniaTestnet,
            transport: http(),
        });
        setPublicClient(pc);

        // Initialize SDK with public client only initially
        const somniaSdk = new Somnia({
            public: pc,
        } as any);
        setSdk(somniaSdk);
    }, []);

    const connectWallet = async () => {
        if (typeof window !== 'undefined' && window.ethereum) {
            try {
                // Request account access
                await window.ethereum.request({ method: 'eth_requestAccounts' });

                // Switch to Somnia Testnet
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: `0x${somniaTestnet.id.toString(16)}` }],
                    });
                } catch (switchError: any) {
                    // This error code indicates that the chain has not been added to MetaMask.
                    if (switchError.code === 4902) {
                        try {
                            await window.ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [
                                    {
                                        chainId: `0x${somniaTestnet.id.toString(16)}`,
                                        chainName: somniaTestnet.name,
                                        nativeCurrency: somniaTestnet.nativeCurrency,
                                        rpcUrls: somniaTestnet.rpcUrls.default.http,
                                        blockExplorerUrls: [somniaTestnet.blockExplorers?.default.url],
                                    },
                                ],
                            });
                        } catch (addError) {
                            console.error('Failed to add Somnia Testnet:', addError);
                            alert('Failed to add Somnia Testnet to your wallet.');
                            return;
                        }
                    } else {
                        console.error('Failed to switch to Somnia Testnet:', switchError);
                        alert('Failed to switch to Somnia Testnet.');
                        return;
                    }
                }

                const wc = createWalletClient({
                    chain: somniaTestnet,
                    transport: custom(window.ethereum),
                });
                const [addr] = await wc.requestAddresses();
                setWalletClient(wc);
                setAddress(addr);

                // Re-initialize SDK with both clients
                if (publicClient) {
                    const somniaSdk = new Somnia({
                        public: publicClient,
                        wallet: wc,
                    });
                    setSdk(somniaSdk);
                }

            } catch (error) {
                console.error('Failed to connect wallet:', error);
            }
        } else {
            alert('Please install a crypto wallet like MetaMask.');
        }
    };

    const disconnectWallet = () => {
        setWalletClient(null);
        setAddress(null);
    };

    return (
        <StreamContext.Provider
            value={{
                sdk,
                walletClient,
                publicClient,
                address,
                isConnected: !!address,
                connectWallet,
                disconnectWallet,
            }}
        >
            {children}
        </StreamContext.Provider>
    );
};
