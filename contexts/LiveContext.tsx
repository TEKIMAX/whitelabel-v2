import React, { createContext, useContext } from 'react';

interface LiveContextType {
    isLivePanelOpen: boolean;
    setIsLivePanelOpen: (isOpen: boolean) => void;
    toggleLivePanel: () => void;
}

const LiveContext = createContext<LiveContextType | undefined>(undefined);

export const LiveProvider: React.FC<{
    children: React.ReactNode;
    value: LiveContextType
}> = ({ children, value }) => {
    return (
        <LiveContext.Provider value={value}>
            {children}
        </LiveContext.Provider>
    );
};

export const useLive = () => {
    const context = useContext(LiveContext);
    if (context === undefined) {
        throw new Error('useLive must be used within a LiveProvider');
    }
    return context;
};
