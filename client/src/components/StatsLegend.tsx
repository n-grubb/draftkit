import { useContext } from 'react';
import { StatsPrefsContext } from '~/data/statsPrefsContext';
import { SportContext } from '~/data/sportContext';

const StatsLegend = () => {
    const { expandedStatsView } = useContext(StatsPrefsContext);
    const { config } = useContext(SportContext);

    if (!expandedStatsView) return null;

    const fullNames = config.columns.statFullNames || {};
    const legendGroups = config.columns.legendGroups || [];

    return (
        <div className="stats-legend">
            <h3>Stats Legend</h3>
            <div className="stats-categories">
                {legendGroups.map(group => (
                    <div className="stats-category" key={group.title}>
                        <h4>{group.title}</h4>
                        <div className="stats-list">
                            {group.columns.map(stat => (
                                <div key={stat.id} className="stat-item">
                                    <span className="stat-code">{stat.name}</span>
                                    <span className="stat-name">{fullNames[stat.id] || stat.id}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StatsLegend;
