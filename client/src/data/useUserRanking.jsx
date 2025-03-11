import { useState, useEffect, useRef } from 'react';
import { fetchRanking, createRanking, updateRanking as updateRemoteRanking } from './rankingService';

const useUserRanking = (players) => {
    // Get the ranking ID from URL if present
    const getUrlRankingId = () => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    };

    // State for the ranking
    const [ranking, setRanking] = useState({});
    // State for loading
    const [isLoading, setIsLoading] = useState(true);
    // State for error
    const [error, setError] = useState(null);
    // State for editing PIN
    const [pin, setPin] = useState('');
    // State to track if ranking is shared
    const [isShared, setIsShared] = useState(false);

    // Added a ref to track if we've done the initial load
    const initialLoadDone = useRef(false);

    useEffect(() => {
        // Only run this effect if players data exists and we haven't done the initial load
        if (!players || Object.keys(players).length === 0 || initialLoadDone.current) {
            return;
        }

        const initializeRanking = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Check if we have a ranking ID in the URL
                const rankingId = getUrlRankingId();

                // If rankingId is provided, fetch that ranking
                if (rankingId) {
                    const fetchedRanking = await fetchRanking(rankingId);
                    setRanking(fetchedRanking);
                    setIsShared(true);
                    localStorage.setItem('ranking', JSON.stringify(fetchedRanking));
                } else {
                    // Otherwise, try to load from localStorage or create new
                    let storedRanking = localStorage.getItem('ranking');
                    
                    if (storedRanking) {
                        setRanking(JSON.parse(storedRanking));
                    } else if (players && Object.keys(players).length > 0) {
                        // Create a new ranking if none exists
                        createNewRanking(players);
                    }
                }
            } catch (err) {
                console.error('Error initializing ranking:', err);
                setError(err.message || 'Failed to load ranking');
                
                // If there was an error loading a shared ranking, fallback to localStorage
                let storedRanking = localStorage.getItem('ranking');
                if (storedRanking) {
                    setRanking(JSON.parse(storedRanking));
                }
            } finally {
                setIsLoading(false);
                // Mark that we've completed the initial load
                initialLoadDone.current = true;
            }
        };

        initializeRanking();
    }, [players]);

    // Create a new local ranking
    const createNewRanking = (playersData) => {
        const playerIds = Object.keys(playersData);
        console.log('Creating initial ranking data...', { playerIds });

        // Sort by averageDraftPosition (lower is better)
        playerIds.sort((a, b) => {
            // If averageDraftPosition exists for both players, use that
            if (playersData[a].averageDraftPosition && playersData[b].averageDraftPosition) {
                return playersData[a].averageDraftPosition - playersData[b].averageDraftPosition;
            }
            // Fall back to ownership percentage if averageDraftPosition is missing
            return playersData[b].ownership - playersData[a].ownership;
        });

        // Create a map of player info
        const playersMap = {};
        playerIds.forEach((playerId, index) => {
            playersMap[playerId] = {
                rank: index,
                ignore: false,
                highlight: false
            };
        });

        const initialRanking = {
            id: 'local',
            author: null,
            description: null,
            players: playersMap,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        setRanking(initialRanking);
        setIsShared(false);

        // Save in local storage
        localStorage.setItem('ranking', JSON.stringify(initialRanking));
    };

    // Share a ranking
    const shareRanking = async (author = '', description = '', newPin = '') => {
        try {
            setIsLoading(true);
            
            // Create a new remote ranking
            const sharedRanking = await createRanking(
                ranking.players,
                author,
                description,
                newPin
            );
            
            // Update state
            setRanking(sharedRanking);
            setIsShared(true);
            if (newPin) setPin(newPin);
            
            // Save to localStorage
            localStorage.setItem('ranking', JSON.stringify(sharedRanking));
            
            // Update URL with the ranking ID without page reload
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('id', sharedRanking.id);
            window.history.pushState({}, '', newUrl);
            
            return sharedRanking;
        } catch (err) {
            setError(err.message || 'Failed to share ranking');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // Load a specific shared ranking
    const loadRanking = async (id) => {
        try {
            setIsLoading(true);
            
            // Fetch the ranking
            const loadedRanking = await fetchRanking(id);
            
            // Update state
            setRanking(loadedRanking);
            setIsShared(true);
            setPin(''); // Clear PIN since we're loading a new ranking
            
            // Save to localStorage
            localStorage.setItem('ranking', JSON.stringify(loadedRanking));
            
            // Update URL with the ranking ID without page reload
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('id', id);
            window.history.pushState({}, '', newUrl);
            
            return loadedRanking;
        } catch (err) {
            setError(err.message || 'Failed to load ranking');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // Takes a playerRanking (array of playerIds), 
    // & updates the stored ranking to match
    const updateRanking = async (playerOrder) => {
        // Update ranks based on new order
        const updatedPlayers = { ...ranking.players };

        playerOrder.forEach((playerId, index) => {
            if (updatedPlayers[playerId]) {
                updatedPlayers[playerId] = {
                    ...updatedPlayers[playerId],
                    rank: index
                };
            } else {
                updatedPlayers[playerId] = {
                    rank: index,
                    ignore: false,
                    highlight: false
                };
            }
        });

        const now = Date.now();
        const newRanking = {
            ...ranking,
            players: updatedPlayers,
            updatedAt: now
        };

        // Update state first for better UI responsiveness
        setRanking(newRanking);
        
        // Always save to localStorage
        localStorage.setItem('ranking', JSON.stringify(newRanking));

        // If this is a shared ranking and we have a PIN, update it remotely
        if (isShared && ranking.id !== 'local' && pin) {
            try {
                const updatedRemoteRanking = await updateRemoteRanking(
                    ranking.id,
                    { players: updatedPlayers },
                    pin
                );
                
                // Update with the response from server
                setRanking(updatedRemoteRanking);
                localStorage.setItem('ranking', JSON.stringify(updatedRemoteRanking));
            } catch (err) {
                console.error('Failed to update remote ranking:', err);
                // Continue with local update even if remote update fails
            }
        }
    };

    const highlightPlayer = async (playerId) => {
        const currentPlayerInfo = ranking.players[playerId] || { rank: 0, ignore: false, highlight: false };
        const isCurrentlyHighlighted = currentPlayerInfo.highlight || false;

        const updatedPlayers = {
            ...ranking.players,
            [playerId]: {
                ...currentPlayerInfo,
                highlight: !isCurrentlyHighlighted,
                ignore: false
            }
        };

        const now = Date.now();
        const newRanking = {
            ...ranking,
            players: updatedPlayers,
            updatedAt: now
        };

        // Update state first for better UI responsiveness
        setRanking(newRanking);
        
        // Always save to localStorage
        localStorage.setItem('ranking', JSON.stringify(newRanking));

        // If this is a shared ranking and we have a PIN, update it remotely
        if (isShared && ranking.id !== 'local' && pin) {
            try {
                const updatedRemoteRanking = await updateRemoteRanking(
                    ranking.id,
                    { players: updatedPlayers },
                    pin
                );
                
                // Update with the response from server
                setRanking(updatedRemoteRanking);
                localStorage.setItem('ranking', JSON.stringify(updatedRemoteRanking));
            } catch (err) {
                console.error('Failed to update remote ranking:', err);
                // Continue with local update even if remote update fails
            }
        }
    };

    const ignorePlayer = async (playerId) => {
        const currentPlayerInfo = ranking.players[playerId] || { rank: 0, ignore: false, highlight: false };
        const isCurrentlyIgnored = currentPlayerInfo.ignore || false;

        const updatedPlayers = {
            ...ranking.players,
            [playerId]: {
                ...currentPlayerInfo,
                ignore: !isCurrentlyIgnored,
                highlight: false
            }
        };

        const now = Date.now();
        const newRanking = {
            ...ranking,
            players: updatedPlayers,
            updatedAt: now
        };

        // Update state first for better UI responsiveness
        setRanking(newRanking);
        
        // Always save to localStorage
        localStorage.setItem('ranking', JSON.stringify(newRanking));

        // If this is a shared ranking and we have a PIN, update it remotely
        if (isShared && ranking.id !== 'local' && pin) {
            try {
                const updatedRemoteRanking = await updateRemoteRanking(
                    ranking.id,
                    { players: updatedPlayers },
                    pin
                );
                
                // Update with the response from server
                setRanking(updatedRemoteRanking);
                localStorage.setItem('ranking', JSON.stringify(updatedRemoteRanking));
            } catch (err) {
                console.error('Failed to update remote ranking:', err);
                // Continue with local update even if remote update fails
            }
        }
    };

    // Function to get the share URL for the current ranking
    const getShareUrl = () => {
        if (!ranking || !ranking.id || ranking.id === 'local') {
            return null;
        }
        
        const url = new URL(window.location.origin);
        url.searchParams.set('id', ranking.id);
        return url.toString();
    };

    return {
        ranking,
        isLoading,
        error,
        isShared,
        pin,
        setPin,
        updateRanking,
        highlightPlayer,
        ignorePlayer,
        shareRanking,
        loadRanking,
        createNewRanking,
        getShareUrl
    };
};

export default useUserRanking;