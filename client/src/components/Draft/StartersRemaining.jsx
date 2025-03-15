import { useContext, useMemo } from 'react';
import { StoreContext } from '~/data/store';
import { DraftContext } from '~/data/draftContext';
import { STARTER_THRESHOLDS, getAdjustedThreshold } from '~/features/positions';

const DISPLAY_POSITIONS = [
    { id: 'C', label: 'C', category: 'Batters' },
    { id: '1B', label: '1B', category: 'Batters' },
    { id: '2B', label: '2B', category: 'Batters' },
    { id: '3B', label: '3B', category: 'Batters' },
    { id: 'SS', label: 'SS', category: 'Batters' },
    { id: 'OF', label: 'OF', category: 'Batters' },
    { id: '1B/3B', label: 'CI', category: 'Batters' },
    { id: '2B/SS', label: 'MI', category: 'Batters' },
    // { id: 'UTIL', label: 'UTIL', category: 'Batters' },
    { id: 'SP', label: 'SP', category: 'Pitchers' },
    { id: 'RP', label: 'RP', category: 'Pitchers' },
];

// Helper to group positions by category
const POSITION_CATEGORIES = {
    'Batters': ['C', '1B', '2B', '3B', 'SS', 'OF', '1B/3B', '2B/SS'],
    'Pitchers': ['SP', 'RP'],
};

// Circular progress component
const CircularProgress = ({ value, size = 50, strokeWidth = 5, position }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (value / 100) * circumference;
    
    // Different colors based on percentage remaining
    const getColor = () => {
        if (value > 66) return 'var(--forest)'; // Green: Plenty remaining
        if (value > 33) return 'var(--gold)';   // Yellow: Getting low
        return 'var(--maroon)';                 // Red: Almost gone
    };
    
    return (
        <div className="circular-progress-container" style={{ width: size, height: size }}>
            <svg
                className="circular-progress"
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
            >
                {/* Background circle */}
                <circle
                    className="circular-progress-background"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                
                {/* Progress circle */}
                <circle
                    className="circular-progress-value"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    fill="none"
                    stroke={getColor()}
                    style={{ 
                        strokeDasharray: circumference,
                        strokeDashoffset: strokeDashoffset,
                        transition: 'stroke-dashoffset 0.5s ease'
                    }}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </svg>
            
            <div className="circular-progress-content">
                <div className="position-label">{position}</div>
            </div>
        </div>
    );
};

const StartersRemaining = () => {
    const { players } = useContext(StoreContext);
    const { totalTeams, draftedPlayers } = useContext(DraftContext);
    
    // Get the list of drafted player IDs
    const draftedPlayerIds = useMemo(() => 
        Object.values(draftedPlayers), 
        [draftedPlayers]
    );
    
    // Calculate starters remaining for each position
    const startersRemainingByPosition = useMemo(() => {
        const positionCounts = {};
        
        // Initialize position counts
        DISPLAY_POSITIONS.forEach(({ id }) => {
            positionCounts[id] = {
                total: 0,
                drafted: 0,
                remaining: 0,
                threshold: getAdjustedThreshold(id, totalTeams)
            };
        });
        
        // Count total players by position
        Object.values(players).forEach(player => {
            player.pos.forEach(position => {
                if (positionCounts[position]) {
                    positionCounts[position].total++;
                }
            });
        });
        
        // Count drafted players by position
        draftedPlayerIds.forEach(playerId => {
            const player = players[playerId];
            if (player) {
                player.pos.forEach(position => {
                    if (positionCounts[position]) {
                        positionCounts[position].drafted++;
                    }
                });
            }
        });
        
        // Calculate remaining starters
        Object.keys(positionCounts).forEach(position => {
            const { total, drafted, threshold } = positionCounts[position];
            
            // Limited by either total available or the threshold
            const effectiveTotal = Math.min(total, threshold);
            
            // Calculate remaining starters (drafted from the top N)
            const draftedFromTop = Math.min(drafted, threshold);
            positionCounts[position].remaining = effectiveTotal - draftedFromTop;
            
            // Calculate percentage remaining
            positionCounts[position].percentRemaining = 
                effectiveTotal > 0 
                    ? Math.round((positionCounts[position].remaining / effectiveTotal) * 100) 
                    : 0;
        });
        
        return positionCounts;
    }, [players, draftedPlayerIds, totalTeams]);
    
    // Group positions by category
    const positionsByCategory = Object.entries(POSITION_CATEGORIES).map(([category, positions]) => {
        return {
            category,
            positions: positions.map(posId => {
                const posInfo = DISPLAY_POSITIONS.find(p => p.id === posId);
                return {
                    ...posInfo,
                    stats: startersRemainingByPosition[posId]
                };
            })
        };
    });
    
    console.log({ positionsByCategory, startersRemainingByPosition });

    return (
        <div className="starters-remaining-container">
            <h3>Starters Remaining</h3>
            
            <div className="position-categories">
                {positionsByCategory.map(({ category, positions }) => (
                    <div key={category} className="position-category">
                        <h4>{category}</h4>
                        <div className="position-circles">
                            {positions.map(({ id, label, stats }) => (
                                <div key={id} className="position-circle-wrapper">
                                    <CircularProgress 
                                        value={stats.percentRemaining} 
                                        position={label}
                                    />
                                    <div className="position-count">
                                        {stats.remaining}/{stats.threshold}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StartersRemaining;