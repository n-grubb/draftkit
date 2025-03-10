import { createContext, useState, useEffect } from 'react';
import { DEFAULT_BATTING_COLUMNS, DEFAULT_PITCHING_COLUMNS } from '~/features/filtering/columns';

// Create context
export const StatsPrefsContext = createContext({
    selectedBattingStats: DEFAULT_BATTING_COLUMNS.map(col => col.id),
    selectedPitchingStats: DEFAULT_PITCHING_COLUMNS.map(col => col.id),
    expandedStatsView: false,
    toggleExpandedStatsView: () => {},
    updateBattingStats: () => {},
    updatePitchingStats: () => {},
    resetToDefaults: () => {},
});

// Provider component
export const StatsPrefsProvider = ({ children }) => {
    // Get saved preferences from localStorage or use defaults
    const getSavedStats = (key, defaultStats) => {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultStats.map(col => col.id);
    };
    
    // State for selected stats
    const [selectedBattingStats, setSelectedBattingStats] = useState(() => 
        getSavedStats('battingStats', DEFAULT_BATTING_COLUMNS)
    );
    
    const [selectedPitchingStats, setSelectedPitchingStats] = useState(() => 
        getSavedStats('pitchingStats', DEFAULT_PITCHING_COLUMNS)
    );
    
    // State for expanded view toggle
    const [expandedStatsView, setExpandedStatsView] = useState(() => {
        const saved = localStorage.getItem('expandedStatsView');
        return saved ? JSON.parse(saved) : false;
    });
    
    // Save preferences to localStorage when they change
    useEffect(() => {
        localStorage.setItem('battingStats', JSON.stringify(selectedBattingStats));
        localStorage.setItem('pitchingStats', JSON.stringify(selectedPitchingStats));
        localStorage.setItem('expandedStatsView', JSON.stringify(expandedStatsView));
    }, [selectedBattingStats, selectedPitchingStats, expandedStatsView]);
    
    // Toggle expanded view
    const toggleExpandedStatsView = () => {
        setExpandedStatsView(prev => !prev);
    };
    
    // Update batting stats
    const updateBattingStats = (statIds) => {
        setSelectedBattingStats(statIds);
    };
    
    // Update pitching stats
    const updatePitchingStats = (statIds) => {
        setSelectedPitchingStats(statIds);
    };
    
    // Reset to defaults
    const resetToDefaults = () => {
        setSelectedBattingStats(DEFAULT_BATTING_COLUMNS.map(col => col.id));
        setSelectedPitchingStats(DEFAULT_PITCHING_COLUMNS.map(col => col.id));
        setExpandedStatsView(false);
    };
    
    // Context value
    const contextValue = {
        selectedBattingStats,
        selectedPitchingStats,
        expandedStatsView,
        toggleExpandedStatsView,
        updateBattingStats,
        updatePitchingStats,
        resetToDefaults,
    };
    
    return (
        <StatsPrefsContext.Provider value={contextValue}>
            {children}
        </StatsPrefsContext.Provider>
    );
};

export default StatsPrefsProvider;