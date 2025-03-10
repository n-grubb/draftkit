import { useContext, useState } from 'react';
import { StatsPrefsContext } from '~/data/statsPrefsContext';
import { 
    ALL_BATTING_COLUMNS, 
    ALL_PITCHING_COLUMNS,
    DEFAULT_BATTING_COLUMNS,
    DEFAULT_PITCHING_COLUMNS
} from '~/features/filtering/columns';

const StatCheckbox = ({ stat, isSelected, onChange }) => (
    <div className="stat-checkbox">
        <label>
            <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onChange(stat.id)}
            />
            <span className="stat-name">{stat.name}</span>
        </label>
    </div>
);

const StatsPrefsModal = ({ onClose }) => {
    const { 
        selectedBattingStats, 
        selectedPitchingStats,
        expandedStatsView,
        updateBattingStats, 
        updatePitchingStats,
        toggleExpandedStatsView,
        resetToDefaults
    } = useContext(StatsPrefsContext);
    
    // Local state for current selections (to avoid updating context on every change)
    const [localBattingStats, setLocalBattingStats] = useState([...selectedBattingStats]);
    const [localPitchingStats, setLocalPitchingStats] = useState([...selectedPitchingStats]);
    const [localExpandedView, setLocalExpandedView] = useState(expandedStatsView);
    
    // Toggle a batting stat
    const toggleBattingStat = (statId) => {
        setLocalBattingStats(prev => {
            if (prev.includes(statId)) {
                return prev.filter(id => id !== statId);
            } else {
                return [...prev, statId];
            }
        });
    };
    
    // Toggle a pitching stat
    const togglePitchingStat = (statId) => {
        setLocalPitchingStats(prev => {
            if (prev.includes(statId)) {
                return prev.filter(id => id !== statId);
            } else {
                return [...prev, statId];
            }
        });
    };
    
    // Toggle expanded view
    const handleExpandedViewToggle = () => {
        setLocalExpandedView(prev => !prev);
    };
    
    // Save changes and close modal
    const saveChanges = () => {
        // Ensure at least one stat is selected for each type
        if (localBattingStats.length === 0) {
            alert("Please select at least one batting stat");
            return;
        }
        if (localPitchingStats.length === 0) {
            alert("Please select at least one pitching stat");
            return;
        }
        
        updateBattingStats(localBattingStats);
        updatePitchingStats(localPitchingStats);
        if (localExpandedView !== expandedStatsView) {
            toggleExpandedStatsView();
        }
        onClose();
    };
    
    // Reset to defaults
    const handleReset = () => {
        setLocalBattingStats(DEFAULT_BATTING_COLUMNS.map(col => col.id));
        setLocalPitchingStats(DEFAULT_PITCHING_COLUMNS.map(col => col.id));
        setLocalExpandedView(false);
    };
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="stats-prefs-modal" onClick={e => e.stopPropagation()}>
                <h2>Customize Stats Display</h2>
                
                <div className="expanded-toggle">
                    <label>
                        <input
                            type="checkbox"
                            checked={localExpandedView}
                            onChange={handleExpandedViewToggle}
                        />
                        <span>Expanded Stats View (Player Card)</span>
                    </label>
                    <p className="help-text">
                        When enabled, player cards will show all available stats
                    </p>
                </div>
                
                {!localExpandedView && (
                    <div className="stat-selections">
                        <div className="stat-column">
                            <h3>Batting Stats</h3>
                            <div className="stat-group">
                                {ALL_BATTING_COLUMNS.map(stat => (
                                    <StatCheckbox
                                        key={stat.id}
                                        stat={stat}
                                        isSelected={localBattingStats.includes(stat.id)}
                                        onChange={toggleBattingStat}
                                    />
                                ))}
                            </div>
                        </div>
                        
                        <div className="stat-column">
                            <h3>Pitching Stats</h3>
                            <div className="stat-group">
                                {ALL_PITCHING_COLUMNS.map(stat => (
                                    <StatCheckbox
                                        key={stat.id}
                                        stat={stat}
                                        isSelected={localPitchingStats.includes(stat.id)}
                                        onChange={togglePitchingStat}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="modal-buttons">
                    <button className="reset-button" onClick={handleReset}>
                        Reset to Defaults
                    </button>
                    <button className="cancel-button" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="save-button" onClick={saveChanges}>
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StatsPrefsModal;