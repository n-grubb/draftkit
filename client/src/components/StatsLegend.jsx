import { useContext } from 'react';
import { StatsPrefsContext } from '~/data/statsPrefsContext';
import { ALL_BATTING_COLUMNS, ALL_PITCHING_COLUMNS } from '~/features/filtering/columns';

// Helper function to get full stat names
function getStatFullName(statId) {
    const statNames = {
        // Batting stats
        'R': 'Runs',
        'HR': 'Home Runs',
        'RBI': 'Runs Batted In',
        'SB': 'Stolen Bases',
        'OBP': 'On-Base Percentage',
        'AB': 'At Bats',
        'PA': 'Plate Appearances',
        'AVG': 'Batting Average',
        'KO': 'Strikeouts',
        'CS': 'Caught Stealing',
        'OPS': 'On-base Plus Slugging',
        'SLG': 'Slugging Percentage',
        'XBH': 'Extra Base Hits',
        'bBB': 'Walks',
        
        // Pitching stats
        'K': 'Strikeouts',
        'W': 'Wins',
        'ERA': 'Earned Run Average',
        'SVHD': 'Saves + Holds',
        'WHIP': 'Walks + Hits per IP',
        'IP': 'Innings Pitched',
        'HD': 'Holds',
        'SV': 'Saves',
        'QS': 'Quality Starts',
        'BB': 'Walks',
        'K/9': 'Strikeouts per 9 IP',
        'K/BB': 'Strikeout to Walk Ratio',
        'BS': 'Blown Saves',
        'HRA': 'Home Runs Allowed'
    };
    
    return statNames[statId] || statId;
}

// Helper component for stat legend display
const StatsLegend = () => {
    const { expandedStatsView } = useContext(StatsPrefsContext);
    
    if (!expandedStatsView) return null;
    
    return (
        <div className="stats-legend">
            <h3>Stats Legend</h3>
            <div className="stats-categories">
                <div className="stats-category">
                    <h4>Batting Stats</h4>
                    <div className="stats-list">
                        {ALL_BATTING_COLUMNS.map(stat => (
                            <div key={stat.id} className="stat-item">
                                <span className="stat-code">{stat.name}</span>
                                <span className="stat-name">{getStatFullName(stat.id)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="stats-category">
                    <h4>Pitching Stats</h4>
                    <div className="stats-list">
                        {ALL_PITCHING_COLUMNS.map(stat => (
                            <div key={stat.id} className="stat-item">
                                <span className="stat-code">{stat.name}</span>
                                <span className="stat-name">{getStatFullName(stat.id)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsLegend;