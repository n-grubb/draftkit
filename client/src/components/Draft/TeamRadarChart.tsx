import { useContext } from 'react';
import { DraftContext } from '~/data/draftContext';
import { DEFAULT_BATTING_COLUMNS, DEFAULT_PITCHING_COLUMNS } from '~/features/filtering/columns';
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

const TeamRadarChart = () => {
    const { myDraftSlot, getTeamStats, getLeagueAverages } = useContext(DraftContext);
    
    if (!myDraftSlot) return null;
    
    // Get team stats and league averages
    const teamStats = getTeamStats(myDraftSlot);
    const leagueAvg = getLeagueAverages();
    
    if (!teamStats) {
        return (
            <div className="team-radar-chart">
                <h3>Team Skill Ratings</h3>
                <div className="empty-chart-message">
                    Draft players to see your team stats
                </div>
            </div>
        );
    }
    
    // Prepare data for batting stats radar
    const battingData = DEFAULT_BATTING_COLUMNS.map(column => {
        const rawValue = teamStats[column.id];
        const normalizedValue = rawValue ? normalizeStatValue(column.id, rawValue) : 0;
        const leagueValue = leagueAvg ? leagueAvg[column.id] : null;
        const normalizedLeagueValue = leagueValue ? normalizeStatValue(column.id, leagueValue) : 0;
        
        return {
            stat: column.name,
            value: normalizedValue,
            league: normalizedLeagueValue,
            fullStat: `${column.name}: ${rawValue ? formatStatValue(column.id, rawValue) : '-'}`,
            leagueStat: leagueValue ? `League Avg: ${formatStatValue(column.id, leagueValue)}` : null
        };
    });
    
    // Prepare data for pitching stats radar
    const pitchingData = DEFAULT_PITCHING_COLUMNS.map(column => {
        const rawValue = teamStats[column.id];
        const normalizedValue = rawValue ? normalizeStatValue(column.id, rawValue) : 0;
        const leagueValue = leagueAvg ? leagueAvg[column.id] : null;
        const normalizedLeagueValue = leagueValue ? normalizeStatValue(column.id, leagueValue) : 0;
        
        return {
            stat: column.name,
            value: normalizedValue,
            league: normalizedLeagueValue,
            fullStat: `${column.name}: ${rawValue ? formatStatValue(column.id, rawValue) : '-'}`,
            leagueStat: leagueValue ? `League Avg: ${formatStatValue(column.id, leagueValue)}` : null
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
            <h3>Team Skill Ratings</h3>
            
            <div className="radar-charts-container">
                <div className="radar-chart-section">
                    <h4>Batting Stats</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <RadarChart outerRadius={90} data={battingData}>
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
                
                <div className="radar-chart-section">
                    <h4>Pitching Stats</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <RadarChart outerRadius={90} data={pitchingData}>
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
                                stroke="var(--maroon)" 
                                fill="var(--maroon)" 
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
                    {DEFAULT_BATTING_COLUMNS.map(column => {
                        const value = teamStats[column.id];
                        const leagueValue = leagueAvg ? leagueAvg[column.id] : null;
                        const diff = value && leagueValue ? value - leagueValue : null;
                        const isPositive = (column.id === 'ERA' || column.id === 'WHIP') ? diff < 0 : diff > 0;
                        const diffClass = isPositive ? 'positive' : 'negative';
                        
                        return (
                            <div className="stat-item" key={`batting-${column.id}`}>
                                <span className="stat-name">{column.name}</span>
                                <span className="stat-value">
                                    {value ? formatStatValue(column.id, value) : '-'}
                                    {diff && (
                                        <span className={`stat-diff ${diffClass}`}>
                                            {isPositive ? '+' : ''}{formatStatValue(column.id, diff)}
                                        </span>
                                    )}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <div className="pitching-stats">
                    {DEFAULT_PITCHING_COLUMNS.map(column => {
                        const value = teamStats && teamStats[column.id] ? teamStats[column.id] : 0;
                        const leagueValue = leagueAvg && leagueAvg[column.id] ? leagueAvg[column.id] : 0
                        const diff = value - leagueValue
                        const isPositive = (column.id === 'ERA' || column.id === 'WHIP') ? diff < 0 : diff > 0;
                        const diffClass = diff == 0 ? 'neutral' : isPositive ? 'positive' : 'negative';
                        
                        console.log({ value, leagueValue, diff, isPositive, diffClass })

                        return (
                            <div className="stat-item" key={`pitching-${column.id}`}>
                                <span className="stat-name">{column.name}</span>
                                <span className="stat-value">
                                    {formatStatValue(column.id, value)}
                                    {
                                        <span className={`stat-diff ${diffClass}`}>
                                            {diff == 0 || isPositive ? '+' : ''}{formatStatValue(column.id, diff)}
                                        </span>
                                    }
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