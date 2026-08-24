import { useContext } from 'react';
import { StatsPrefsContext } from '~/data/statsPrefsContext';
import {
    FPTS_COLUMN,
    ALL_OFFENSE_COLUMNS,
    KICKING_COLUMNS,
    DEFENSE_COLUMNS,
} from '~/features/filtering/columns';

// Helper function to get full stat names
function getStatFullName(statId) {
    const statNames = {
        FPTS: 'Fantasy Points (PPR)',
        // Passing
        CMP: 'Completions',
        PATT: 'Pass Attempts',
        PYDS: 'Passing Yards',
        PTD: 'Passing Touchdowns',
        INT: 'Interceptions Thrown',
        // Rushing
        CAR: 'Rushing Attempts',
        RYDS: 'Rushing Yards',
        RTD: 'Rushing Touchdowns',
        // Receiving
        TGT: 'Targets',
        REC: 'Receptions',
        RECYDS: 'Receiving Yards',
        RECTD: 'Receiving Touchdowns',
        FUML: 'Fumbles Lost',
        // Kicking
        FGM: 'Field Goals Made',
        FGA: 'Field Goals Attempted',
        XPM: 'Extra Points Made',
        // Defense / special teams
        SACK: 'Sacks',
        DINT: 'Defensive Interceptions',
        FR: 'Fumbles Recovered',
        DTD: 'Defensive/ST Touchdowns',
        SFTY: 'Safeties',
        PA: 'Points Allowed',
        YDA: 'Yards Allowed',
    };

    return statNames[statId] || statId;
}

const LegendGroup = ({ title, columns }) => (
    <div className="stats-category">
        <h4>{title}</h4>
        <div className="stats-list">
            {columns.map(stat => (
                <div key={stat.id} className="stat-item">
                    <span className="stat-code">{stat.name}</span>
                    <span className="stat-name">{getStatFullName(stat.id)}</span>
                </div>
            ))}
        </div>
    </div>
);

const StatsLegend = () => {
    const { expandedStatsView } = useContext(StatsPrefsContext);

    if (!expandedStatsView) return null;

    return (
        <div className="stats-legend">
            <h3>Stats Legend</h3>
            <div className="stats-categories">
                <LegendGroup title="Offense" columns={[FPTS_COLUMN, ...ALL_OFFENSE_COLUMNS]} />
                <LegendGroup title="Kicking" columns={KICKING_COLUMNS} />
                <LegendGroup title="Defense / ST" columns={DEFENSE_COLUMNS} />
            </div>
        </div>
    );
};

export default StatsLegend;
