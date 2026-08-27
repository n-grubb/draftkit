import { createContext, useState, useEffect, useContext } from 'react';
import { SportContext } from './sportContext';
import { storageKey } from './config';

// Stat preferences are keyed by the active sport's stat groups. `selectedStats`
// is a map of { [groupKey]: string[] } of chosen stat ids per group.
export const StatsPrefsContext = createContext<any>({
    selectedStats: {},
    statGroups: [],
    expandedStatsView: false,
    toggleExpandedStatsView: () => {},
    updateGroupStats: () => {},
    resetToDefaults: () => {},
});

export const StatsPrefsProvider = ({ children }) => {
    const { sport, config } = useContext(SportContext);
    const prefsKey = storageKey(sport, 'selectedStats');
    const expandedKey = storageKey(sport, 'expandedStatsView');

    const buildDefaults = () =>
        Object.fromEntries(config.statGroups.map(g => [g.key, [...g.defaultIds]]));

    const [selectedStats, setSelectedStats] = useState(() => {
        const saved = localStorage.getItem(prefsKey);
        const defaults = buildDefaults();
        if (saved) {
            try {
                return { ...defaults, ...JSON.parse(saved) };
            } catch {
                return defaults;
            }
        }
        return defaults;
    });

    const [expandedStatsView, setExpandedStatsView] = useState(() => {
        const saved = localStorage.getItem(expandedKey);
        return saved ? JSON.parse(saved) : false;
    });

    useEffect(() => {
        localStorage.setItem(prefsKey, JSON.stringify(selectedStats));
        localStorage.setItem(expandedKey, JSON.stringify(expandedStatsView));
    }, [selectedStats, expandedStatsView, prefsKey, expandedKey]);

    const toggleExpandedStatsView = () => setExpandedStatsView(prev => !prev);

    const updateGroupStats = (groupKey, ids) =>
        setSelectedStats(prev => ({ ...prev, [groupKey]: ids }));

    const resetToDefaults = () => {
        setSelectedStats(buildDefaults());
        setExpandedStatsView(false);
    };

    const contextValue = {
        selectedStats,
        statGroups: config.statGroups,
        expandedStatsView,
        toggleExpandedStatsView,
        updateGroupStats,
        resetToDefaults,
    };

    return (
        <StatsPrefsContext.Provider value={contextValue}>
            {children}
        </StatsPrefsContext.Provider>
    );
};

export default StatsPrefsProvider;
