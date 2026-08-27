import { useContext, useMemo } from 'react';
import { StoreContext } from '~/data/store';
import { SportContext } from '~/data/sportContext';
import { DraftContext } from '~/data/draftContext';

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
    const { config } = useContext(SportContext);
    const { totalTeams, draftedPlayers } = useContext(DraftContext);

    const starterGroups = config.positions.starterGroups;
    const getAdjustedThreshold = config.positions.getAdjustedThreshold;
    const displayPositions = useMemo(
        () => starterGroups.flatMap(g => g.positions.map(p => ({ ...p, category: g.category }))),
        [starterGroups]
    );

    // Get the list of drafted player IDs
    const draftedPlayerIds = useMemo(() => 
        Object.values(draftedPlayers), 
        [draftedPlayers]
    );
    
    // Calculate starters remaining for each position
    const startersRemainingByPosition = useMemo(() => {
        const positionCounts: Record<string, any> = {};
        
        // Initialize position counts
        displayPositions.forEach(({ id }) => {
            positionCounts[id] = {
                total: 0,
                drafted: 0,
                remaining: 0,
                threshold: getAdjustedThreshold(id, totalTeams)
            };
        });
        
        // Count total players by position
        Object.values(players).forEach((player: any) => {
            player.pos.forEach((position: any) => {
                if (positionCounts[position]) {
                    positionCounts[position].total++;
                }
            });
        });
        
        // Count drafted players by position
        draftedPlayerIds.forEach((playerId: any) => {
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
    }, [players, draftedPlayerIds, totalTeams, displayPositions, getAdjustedThreshold]);

    // Group positions by category
    const positionsByCategory = starterGroups.map(group => ({
        category: group.category,
        positions: group.positions.map(pos => ({
            ...pos,
            stats: startersRemainingByPosition[pos.id]
        })),
    }));

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