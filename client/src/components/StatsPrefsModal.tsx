import { useContext, useState } from 'react';
import { StatsPrefsContext } from '~/data/statsPrefsContext';

const StatCheckbox = ({ stat, isSelected, onChange }) => (
    <div className="stat-checkbox">
        <label>
            <input type="checkbox" checked={isSelected} onChange={() => onChange(stat.id)} />
            <span className="stat-name">{stat.name}</span>
        </label>
    </div>
);

const StatsPrefsModal = ({ onClose }) => {
    const {
        selectedStats,
        statGroups,
        expandedStatsView,
        updateGroupStats,
        toggleExpandedStatsView,
    } = useContext(StatsPrefsContext);

    // Local working copy of each group's selection
    const [local, setLocal] = useState(() => {
        const copy = {};
        statGroups.forEach(g => { copy[g.key] = [...(selectedStats[g.key] || g.defaultIds)]; });
        return copy;
    });
    const [localExpandedView, setLocalExpandedView] = useState(expandedStatsView);

    const toggleStat = (groupKey, statId) => {
        setLocal(prev => {
            const current = prev[groupKey] || [];
            const next = current.includes(statId)
                ? current.filter(id => id !== statId)
                : [...current, statId];
            return { ...prev, [groupKey]: next };
        });
    };

    const saveChanges = () => {
        for (const g of statGroups) {
            if ((local[g.key] || []).length === 0) {
                alert(`Please select at least one ${g.label.toLowerCase()} stat`);
                return;
            }
        }
        statGroups.forEach(g => updateGroupStats(g.key, local[g.key]));
        if (localExpandedView !== expandedStatsView) toggleExpandedStatsView();
        onClose();
    };

    const handleReset = () => {
        const defaults = {};
        statGroups.forEach(g => { defaults[g.key] = [...g.defaultIds]; });
        setLocal(defaults);
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
                            onChange={() => setLocalExpandedView(prev => !prev)}
                        />
                        <span>Expanded Stats View (Player Card)</span>
                    </label>
                    <p className="help-text">
                        When enabled, player cards will show all available stats
                    </p>
                </div>

                {!localExpandedView && (
                    <div className="stat-selections">
                        {statGroups.map(group => (
                            <div className="stat-column" key={group.key}>
                                <h3>{group.label}</h3>
                                {group.help && <p className="help-text">{group.help}</p>}
                                <div className="stat-group">
                                    {group.columns.map(stat => (
                                        <StatCheckbox
                                            key={stat.id}
                                            stat={stat}
                                            isSelected={(local[group.key] || []).includes(stat.id)}
                                            onChange={(id) => toggleStat(group.key, id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="modal-buttons">
                    <button className="reset-button" onClick={handleReset}>Reset to Defaults</button>
                    <button className="cancel-button" onClick={onClose}>Cancel</button>
                    <button className="save-button" onClick={saveChanges}>Save Changes</button>
                </div>
            </div>
        </div>
    );
};

export default StatsPrefsModal;
