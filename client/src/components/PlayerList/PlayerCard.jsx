import { useContext } from 'react'
import { StoreContext } from '~/data/store'
import { StatsPrefsContext } from '~/data/statsPrefsContext'
import { statsToDisplay } from '~/features/filtering/columns'
import { formatStatValue, normalizeStatValue, evaluateStatQuality } from '~/features/stats'
import StatsLegend from '~/components/StatsLegend'
import { 
    Radar, 
    RadarChart, 
    PolarGrid, 
    PolarAngleAxis, 
    PolarRadiusAxis, 
    ResponsiveContainer,
    Tooltip
} from 'recharts'

const EXLUDED_POSITIONS = ['P', 'UTIL']

const PlayerCard = ({ playerId, onClose }) => {
    const { players, teams } = useContext(StoreContext);
    const { expandedStatsView, selectedBattingStats, selectedPitchingStats } = useContext(StatsPrefsContext);
    
    const player      = players[playerId]
    const projections = player.projections
    const stats       = player.stats

    // Don't show specialty roster spots as POS
    let positions = [...player.pos].filter(position => !EXLUDED_POSITIONS.includes(position))
    if (positions.length > 1) {
        positions = positions.filter(position => position != 'DH')
    }

    const teamLogo = teams[player.team_id].logo?.href
    
    // Use expanded view or custom stats based on user preferences
    const columns = expandedStatsView 
        ? statsToDisplay(player.pos, null, null, true) // Show all stats
        : statsToDisplay(player.pos, selectedBattingStats, selectedPitchingStats);
    
    return (
        <div className="player-card-overlay" onClick={onClose}>
            <div className="player-card" onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={onClose}>×</button>
                
                <div className="player-card-header">
                    <div className="player-photos large">
                        { teamLogo && (<img className="team-logo" src={teamLogo} width="48" />) }
                        <img className="player-headshot" src={player.headshot.replace('w=96', 'w=426').replace('h=70', 'h=320')} width="180" /> 
                    </div>
                    <div className="player-info">
                        <h2>{player.name}</h2>
                        <div className="player-positions">
                            {player.pos.map(position => (
                                <span key={position} className="position-chip" data-pos={position}>{position}</span>
                            ))}
                        </div>
                        <div className="player-team" style={{ color: teams[player.team_id].color || 'var(--brown)' }}>
                            {teams[player.team_id].name}
                        </div>
                        {player.averageDraftPosition && (
                            <div className="adp">
                                <span className="adp-label">Average Draft Position:</span> 
                                <span className="adp-value">{Math.round(player.averageDraftPosition * 10) / 10}</span>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="player-card-stats">
                    <h3>Stats</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Year</th>
                                {columns.map(column => (
                                    <th key={column.id}>{column.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* 2023 Stats Row */}
                            <tr>
                                <td className="year">2023</td>
                                {columns.map(column => {
                                    if (stats && stats['2023'] && stats['2023'][column.id]) {
                                        const value = stats['2023'][column.id];
                                        const formattedValue = formatStatValue(column.id, value);
                                        return (
                                            <td key={column.id}>
                                                {formattedValue}
                                            </td>
                                        );
                                    } else {
                                        return <td key={column.id}>-</td>;
                                    }
                                })}
                            </tr>
                            
                            {/* 2024 Stats Row */}
                            <tr>
                                <td className="year">2024</td>
                                {columns.map(column => {
                                    if (stats && stats['2024'] && stats['2024'][column.id]) {
                                        const value = stats['2024'][column.id];
                                        const formattedValue = formatStatValue(column.id, value);
                                        return (
                                            <td key={column.id}>
                                                {formattedValue}
                                            </td>
                                        );
                                    } else {
                                        return <td key={column.id}>-</td>;
                                    }
                                })}
                            </tr>
                            
                            {/* 2025 Projections Row */}
                            <tr className="projections">
                                <td className="year">2025 (Proj)</td>
                                {columns.map(column => {
                                    if (projections && projections[column.id]) {
                                        const value = projections[column.id];
                                        const formattedValue = formatStatValue(column.id, value);
                                        return (
                                            <td key={column.id}>
                                                {formattedValue}
                                            </td>
                                        );
                                    } else {
                                        return <td key={column.id}>-</td>;
                                    }
                                })}
                            </tr>
                        </tbody>
                    </table>
                    
                    <div className="player-card-ratings">
                        <h3>Skill Ratings</h3>
                        <div className="spider-chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <RadarChart 
                                    outerRadius={90} 
                                    data={columns.map(column => {
                                        const rawValue = projections && projections[column.id];
                                        const normalizedValue = rawValue ? normalizeStatValue(column.id, rawValue) : 0;
                                        
                                        return {
                                            stat: column.name,
                                            value: normalizedValue,
                                            fullStat: `${column.name}: ${rawValue ? formatStatValue(column.id, rawValue) : '-'}`
                                        };
                                    })}
                                >
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
                                        name="Skills" 
                                        dataKey="value" 
                                        stroke="var(--highlighted)" 
                                        fill="var(--highlighted)" 
                                        fillOpacity={0.5}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="rating-legend">
                            {columns.map(column => {
                                const value = projections && projections[column.id];
                                return (
                                    <div className="rating-item-compact" key={`rating-${column.id}`}>
                                        <div className="rating-name">{column.name}</div>
                                        <div className="rating-value">
                                            {value ? formatStatValue(column.id, value) : '-'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                
                {/* Add Stats Legend when expanded view is enabled */}
                <StatsLegend />
            </div>
        </div>
    )
}

export default PlayerCard