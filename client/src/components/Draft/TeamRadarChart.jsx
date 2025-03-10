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
    const { myDraftSlot, getTeamStats } = useContext(DraftContext);
    
    if (!myDraftSlot) return null;
    
    // Get team stats
    const teamStats = getTeamStats(myDraftSlot);
    
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
        
        return {
            stat: column.name,
            value: normalizedValue,
            fullStat: `${column.name}: ${rawValue ? formatStatValue(column.id, rawValue) : '-'}`
        };
    });
    
    // Prepare data for pitching stats radar
    const pitchingData = DEFAULT_PITCHING_COLUMNS.map(column => {
        const rawValue = teamStats[column.id];
        const normalizedValue = rawValue ? normalizeStatValue(column.id, rawValue) : 0;
        
        return {
            stat: column.name,
            value: normalizedValue,
            fullStat: `${column.name}: ${rawValue ? formatStatValue(column.id, rawValue) : '-'}`
        };
    });
    
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
                            <Tooltip 
                                formatter={(value, name, props) => [props.payload.fullStat, 'Rating']}
                                contentStyle={{
                                    backgroundColor: 'var(--soft-tan)',
                                    borderColor: 'var(--brown)',
                                    color: 'var(--brown)'
                                }}
                            />
                            <Radar 
                                name="Batting" 
                                dataKey="value" 
                                stroke="var(--teal)" 
                                fill="var(--teal)" 
                                fillOpacity={0.5}
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
                            <Tooltip 
                                formatter={(value, name, props) => [props.payload.fullStat, 'Rating']}
                                contentStyle={{
                                    backgroundColor: 'var(--soft-tan)',
                                    borderColor: 'var(--brown)',
                                    color: 'var(--brown)'
                                }}
                            />
                            <Radar 
                                name="Pitching" 
                                dataKey="value" 
                                stroke="var(--maroon)" 
                                fill="var(--maroon)" 
                                fillOpacity={0.5}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            <div className="stat-total-display">
                <div className="batting-stats">
                    {DEFAULT_BATTING_COLUMNS.map(column => {
                        const value = teamStats[column.id];
                        return (
                            <div className="stat-item" key={`batting-${column.id}`}>
                                <span className="stat-name">{column.name}</span>
                                <span className="stat-value">{value ? formatStatValue(column.id, value) : '-'}</span>
                            </div>
                        );
                    })}
                </div>
                <div className="pitching-stats">
                    {DEFAULT_PITCHING_COLUMNS.map(column => {
                        const value = teamStats[column.id];
                        return (
                            <div className="stat-item" key={`pitching-${column.id}`}>
                                <span className="stat-name">{column.name}</span>
                                <span className="stat-value">{value ? formatStatValue(column.id, value) : '-'}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TeamRadarChart;