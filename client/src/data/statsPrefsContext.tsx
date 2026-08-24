import { createContext, useState, useEffect } from 'react';
import { DEFAULT_OFFENSE_STAT_IDS } from '~/features/filtering/columns';

// Create context
export const StatsPrefsContext = createContext<any>({
    selectedStats: DEFAULT_OFFENSE_STAT_IDS,
    expandedStatsView: false,
    toggleExpandedStatsView: () => {},
    updateSelectedStats: () => {},
    resetToDefaults: () => {},
});

// Provider component
export const StatsPrefsProvider = ({ children }) => {
    // Get saved preferences from localStorage or use defaults
    const getSavedStats = () => {
        const saved = localStorage.getItem('selectedStats');
        return saved ? JSON.parse(saved) : [...DEFAULT_OFFENSE_STAT_IDS];
    };

    const [selectedStats, setSelectedStats] = useState(getSavedStats);

    // State for expanded view toggle
    const [expandedStatsView, setExpandedStatsView] = useState(() => {
        const saved = localStorage.getItem('expandedStatsView');
        return saved ? JSON.parse(saved) : false;
    });

    // Save preferences to localStorage when they change
    useEffect(() => {
        localStorage.setItem('selectedStats', JSON.stringify(selectedStats));
        localStorage.setItem('expandedStatsView', JSON.stringify(expandedStatsView));
    }, [selectedStats, expandedStatsView]);

    const toggleExpandedStatsView = () => {
        setExpandedStatsView(prev => !prev);
    };

    const updateSelectedStats = (statIds) => {
        setSelectedStats(statIds);
    };

    const resetToDefaults = () => {
        setSelectedStats([...DEFAULT_OFFENSE_STAT_IDS]);
        setExpandedStatsView(false);
    };

    const contextValue = {
        selectedStats,
        expandedStatsView,
        toggleExpandedStatsView,
        updateSelectedStats,
        resetToDefaults,
    };

    return (
        <StatsPrefsContext.Provider value={contextValue}>
            {children}
        </StatsPrefsContext.Provider>
    );
};

export default StatsPrefsProvider;
