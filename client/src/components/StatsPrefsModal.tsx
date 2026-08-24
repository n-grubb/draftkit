import { useContext, useState } from 'react';
import { StatsPrefsContext } from '~/data/statsPrefsContext';
import {
    ALL_OFFENSE_COLUMNS,
    DEFAULT_OFFENSE_STAT_IDS,
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
        selectedStats,
        expandedStatsView,
        updateSelectedStats,
        toggleExpandedStatsView,
    } = useContext(StatsPrefsContext);

    // Local state for current selections (to avoid updating context on every change)
    const [localStats, setLocalStats] = useState([...selectedStats]);
    const [localExpandedView, setLocalExpandedView] = useState(expandedStatsView);

    const toggleStat = (statId) => {
        setLocalStats(prev => {
            if (prev.includes(statId)) {
                return prev.filter(id => id !== statId);
            }
            return [...prev, statId];
        });
    };

    const handleExpandedViewToggle = () => {
        setLocalExpandedView(prev => !prev);
    };

    const saveChanges = () => {
        if (localStats.length === 0) {
            alert("Please select at least one stat");
            return;
        }

        updateSelectedStats(localStats);
        if (localExpandedView !== expandedStatsView) {
            toggleExpandedStatsView();
        }
        onClose();
    };

    const handleReset = () => {
        setLocalStats([...DEFAULT_OFFENSE_STAT_IDS]);
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
                            <h3>Offense Stats (All view)</h3>
                            <p className="help-text">
                                Shown in the default table. Position filters (QB, RB, K, DST…)
                                always show their own curated columns.
                            </p>
                            <div className="stat-group">
                                {ALL_OFFENSE_COLUMNS.map(stat => (
                                    <StatCheckbox
                                        key={stat.id}
                                        stat={stat}
                                        isSelected={localStats.includes(stat.id)}
                                        onChange={toggleStat}
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
