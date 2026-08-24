import { useContext } from 'react';
import { DraftContext } from '~/data/draftContext';
import { formatStatValue, normalizeStatValue } from '~/features/stats';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip,
    Legend
} from 'recharts';

// Offensive output categories charted for a drafted team
const RADAR_COLUMNS = [
    { id: 'PYDS', name: 'PYDS' },
    { id: 'PTD', name: 'PTD' },
    { id: 'RYDS', name: 'RYDS' },
    { id: 'RTD', name: 'RTD' },
    { id: 'REC', name: 'REC' },
    { id: 'RECYDS', name: 'RECYDS' },
    { id: 'RECTD', name: 'RECTD' },
];

const TOTALS_COLUMNS = [{ id: 'FPTS', name: 'FPTS' }, ...RADAR_COLUMNS];

const TeamRadarChart = () => {
    const { myDraftSlot, getTeamStats, getLeagueAverages } = useContext(DraftContext);

    if (!myDraftSlot) return null;

    const teamStats = getTeamStats(myDraftSlot);
    const leagueAvg = getLeagueAverages();

    if (!teamStats) {
        return (
            <div className="team-radar-chart">
                <h3>Team Output</h3>
                <div className="empty-chart-message">
                    Draft players to see your team totals
                </div>
            </div>
        );
    }

    const radarData = RADAR_COLUMNS.map(column => {
        const rawValue = teamStats[column.id];
        const leagueValue = leagueAvg ? leagueAvg[column.id] : null;
        return {
            stat: column.name,
            value: rawValue ? normalizeStatValue(column.id, rawValue) : 0,
            league: leagueValue ? normalizeStatValue(column.id, leagueValue) : 0,
            fullStat: `${column.name}: ${rawValue ? formatStatValue(column.id, rawValue) : '-'}`,
            leagueStat: leagueValue ? `League Avg: ${formatStatValue(column.id, leagueValue)}` : null,
        };
    });

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length > 0) {
            const data = payload[0].payload;
            return (
                <div className="radar-tooltip">
                    <p>{data.fullStat}</p>
                    {data.leagueStat && <p>{data.leagueStat}</p>}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="team-radar-chart">
            <h3>Team Output</h3>

            <div className="radar-charts-container">
                <div className="radar-chart-section">
                    <h4>Offensive Output</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <RadarChart outerRadius={90} data={radarData}>
                            <PolarGrid gridType="polygon" />
                            <PolarAngleAxis dataKey="stat" tick={{ fill: 'var(--brown)', fontSize: 14 }} />
                            <PolarRadiusAxis
                                angle={90}
                                domain={[0, 100]}
                                axisLine={false}
                                tick={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Radar
                                name="Your Team"
                                dataKey="value"
                                stroke="var(--teal)"
                                fill="var(--teal)"
                                fillOpacity={0.5}
                            />
                            <Radar
                                name="League Average"
                                dataKey="league"
                                stroke="var(--grey)"
                                fill="var(--grey)"
                                fillOpacity={0.3}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="stat-total-display">
                <div className="batting-stats">
                    {TOTALS_COLUMNS.map(column => {
                        const value = teamStats[column.id] || 0;
                        const leagueValue = leagueAvg && leagueAvg[column.id] ? leagueAvg[column.id] : 0;
                        const diff = value - leagueValue;
                        const diffClass = diff === 0 ? 'neutral' : diff > 0 ? 'positive' : 'negative';

                        return (
                            <div className="stat-item" key={`total-${column.id}`}>
                                <span className="stat-name">{column.name}</span>
                                <span className="stat-value">
                                    {formatStatValue(column.id, value)}
                                    <span className={`stat-diff ${diffClass}`}>
                                        {diff >= 0 ? '+' : ''}{formatStatValue(column.id, diff)}
                                    </span>
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TeamRadarChart;
