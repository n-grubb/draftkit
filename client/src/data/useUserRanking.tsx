import { useState, useEffect, useRef } from 'react';
import { fetchRanking, createRanking, updateRanking as updateRemoteRanking } from './rankingService';

const MAX_STORED_RANKINGS = 10;
const RANKINGS_STORAGE_KEY = 'storedRankings';

const useUserRanking = (players) => {
    // Get the ranking ID from URL if present
    const getUrlRankingId = () => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    };

    // State for the active ranking
    const [ranking, setRanking] = useState<any>({});
    // State for all saved rankings
    const [savedRankings, setSavedRankings] = useState([]);
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

    // Load all saved rankings from localStorage
    const loadSavedRankings = () => {
        const storedRankingsJson = localStorage.getItem(RANKINGS_STORAGE_KEY);
        const storedRankings = storedRankingsJson ? JSON.parse(storedRankingsJson) : [];
        setSavedRankings(storedRankings);
        return storedRankings;
    };

    // Save a ranking to the stored rankings list
    const saveToRankingsList = (rankingToSave) => {
        // Get current saved rankings
        const currentRankings = loadSavedRankings();
        
        // Check if this ranking already exists in our list (by ID)
        const existingIndex = currentRankings.findIndex(r => r.id === rankingToSave.id);
        
        // Create a light version of the ranking for the list (without all player data)
        const rankingForList = {
            id: rankingToSave.id,
            author: rankingToSave.author,
            description: rankingToSave.description,
            isShared: rankingToSave.id !== 'local',
            createdAt: rankingToSave.createdAt,
            updatedAt: rankingToSave.updatedAt,
            name: rankingToSave.name || (rankingToSave.author 
                ? `${rankingToSave.author}'s Ranking` 
                : `Ranking #${rankingToSave.id}`)
        };
        
        let updatedRankings;
        if (existingIndex >= 0) {
            // Update existing entry
            updatedRankings = [...currentRankings];
            updatedRankings[existingIndex] = rankingForList;
        } else {
            // Check if we've reached the limit
            if (currentRankings.length >= MAX_STORED_RANKINGS) {
                // Remove the oldest ranking to make space
                updatedRankings = [...currentRankings];
                updatedRankings.pop(); // Remove the last (oldest) item
            }
            
            // Add new ranking at the beginning (newest first)
            updatedRankings = [rankingForList, ...(currentRankings || [])];
        }
        
        // Save the updated list
        localStorage.setItem(RANKINGS_STORAGE_KEY, JSON.stringify(updatedRankings));
        setSavedRankings(updatedRankings);
        
        // Also save the full ranking separately (for quick access)
        localStorage.setItem(`ranking_${rankingToSave.id}`, JSON.stringify(rankingToSave));
        
        return updatedRankings;
    };

    // Create a new local ranking
    const createNewRanking = (playersData = players, name = '') => {
        if (!playersData) {
            console.error('No players data available for creating new ranking');
            return;
        }

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

        // Generate a unique local ID
        const localId = `local_${Date.now()}`;
        
        const initialRanking = {
            id: localId,
            name: name || 'My Ranking',
            author: null,
            description: null,
            players: playersMap,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        setRanking(initialRanking);
        setIsShared(false);
        setPin('');

        // Save to our rankings list
        saveToRankingsList(initialRanking);
        
        // Update URL to remove any ranking ID
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('id');
        window.history.pushState({}, '', newUrl);
        
        return initialRanking;
    };

    useEffect(() => {
        // Only proceed if we have players data and haven't done the initial load yet
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
                    // First check if we already have it locally
                    const storedRanking = localStorage.getItem(`ranking_${rankingId}`);
                    
                    if (storedRanking) {
                        // Use the stored version
                        const parsedRanking = JSON.parse(storedRanking);
                        setRanking(parsedRanking);
                        setIsShared(rankingId !== 'local');
                        return; // Exit early after loading the URL ranking
                    } else {
                        // Fetch from server
                        const fetchedRanking = await fetchRanking(rankingId);
                        setRanking(fetchedRanking);
                        setIsShared(true);
                        saveToRankingsList(fetchedRanking);
                        return; // Exit early after loading the URL ranking
                    }
                }
            
                // No URL ranking, try to load most recent or create new
                const savedRankings = loadSavedRankings();
                
                if (savedRankings && savedRankings.length > 0) {
                    // Load the most recent ranking
                    const mostRecentId = savedRankings[0].id;
                    const storedRanking = localStorage.getItem(`ranking_${mostRecentId}`);
                    
                    if (storedRanking) {
                        setRanking(JSON.parse(storedRanking));
                        setIsShared(mostRecentId !== 'local');
                    } else {
                        // Create new if we can't find the stored data
                        createNewRanking(players);
                    }
                } else {
                    // Create a new ranking if none exists
                    createNewRanking(players);
                }
            } catch (err: any) {
                console.error('Error initializing ranking:', err);
                setError(err.message || 'Failed to load ranking');
                
                // If there was an error loading a shared ranking, fallback to a new one
                createNewRanking(players);
            } finally {
                setIsLoading(false);
                initialLoadDone.current = true;
            }
        };

        initializeRanking();
    }, [players, setRanking, setIsShared, setError, setIsLoading, createNewRanking, saveToRankingsList, loadSavedRankings]);

    // Remove a ranking from the list and its storage
    const deleteRanking = (rankingId) => {
        // Check if we're trying to delete the active ranking
        if (ranking.id === rankingId) {
            return false; // Can't delete the active ranking
        }
        
        // Get current saved rankings
        const currentRankings = loadSavedRankings();
        
        // Filter out the ranking to delete
        const updatedRankings = currentRankings.filter(r => r.id !== rankingId);
        
        // Update the stored list
        localStorage.setItem(RANKINGS_STORAGE_KEY, JSON.stringify(updatedRankings));
        setSavedRankings(updatedRankings);
        
        // Remove the full ranking data
        localStorage.removeItem(`ranking_${rankingId}`);
        
        return true;
    };

    // Switch to a different ranking
    const switchRanking = async (rankingId) => {
        try {
            setIsLoading(true);
            setError(null);
            
            // Check if we have it locally first
            const storedRanking = localStorage.getItem(`ranking_${rankingId}`);
            
            let targetRanking;
            if (storedRanking) {
                targetRanking = JSON.parse(storedRanking);
            } else if (rankingId.startsWith('local')) {
                // If it's a local ranking but we don't have it stored, create a new one
                return createNewRanking(players);
            } else {
                // Fetch from server
                targetRanking = await fetchRanking(rankingId);
                // Save full ranking data
                localStorage.setItem(`ranking_${rankingId}`, JSON.stringify(targetRanking));
            }
            
            // Update state
            setRanking(targetRanking);
            setIsShared(!rankingId.startsWith('local'));
            setPin(''); // Clear PIN when switching rankings
            
            // Add to the recent rankings list
            saveToRankingsList(targetRanking);
            
            // Update URL with the ranking ID
            const newUrl = new URL(window.location.href);
            if (rankingId.startsWith('local')) {
                newUrl.searchParams.delete('id');
            } else {
                newUrl.searchParams.set('id', rankingId);
            }
            window.history.pushState({}, '', newUrl);
            
            return targetRanking;
        } catch (err: any) {
            setError(`Failed to load ranking: ${err.message}`);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // Share a ranking
    const shareRanking = async (author = '', description = '', newPin = '', name = '') => {
        try {
            setIsLoading(true);
            
            // Create a new remote ranking
            const sharedRanking = await createRanking(
                ranking.players,
                author,
                description,
                newPin
            );
            
            // Add name if provided
            sharedRanking.name = name || (author ? `${author}'s Ranking` : `Ranking #${sharedRanking.id}`);
            
            // Update state
            setRanking(sharedRanking);
            setIsShared(true);
            if (newPin) setPin(newPin);
            
            // Save to our rankings list
            saveToRankingsList(sharedRanking);
            
            // Update URL with the ranking ID without page reload
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('id', sharedRanking.id);
            window.history.pushState({}, '', newUrl);
            
            return sharedRanking;
        } catch (err: any) {
            setError(err.message || 'Failed to share ranking');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // Load a specific shared ranking
    const loadRanking = async (id) => {
        return switchRanking(id);
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
        
        // Save to our rankings storage
        localStorage.setItem(`ranking_${newRanking.id}`, JSON.stringify(newRanking));
        
        // Update the list entry with updated timestamp
        saveToRankingsList(newRanking);

        // If this is a shared ranking and we have a PIN, update it remotely
        if (isShared && !ranking.id.startsWith('local') && pin) {
            try {
                const updatedRemoteRanking = await updateRemoteRanking(
                    ranking.id,
                    { players: updatedPlayers },
                    pin
                );
                
                // Update with the response from server
                updatedRemoteRanking.name = newRanking.name; // Preserve the name
                setRanking(updatedRemoteRanking);
                localStorage.setItem(`ranking_${updatedRemoteRanking.id}`, JSON.stringify(updatedRemoteRanking));
                saveToRankingsList(updatedRemoteRanking);
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
        
        // Save to our rankings storage
        localStorage.setItem(`ranking_${newRanking.id}`, JSON.stringify(newRanking));
        
        // Update the list entry with updated timestamp
        saveToRankingsList(newRanking);

        // If this is a shared ranking and we have a PIN, update it remotely
        if (isShared && !ranking.id.startsWith('local') && pin) {
            try {
                const updatedRemoteRanking = await updateRemoteRanking(
                    ranking.id,
                    { players: updatedPlayers },
                    pin
                );
                
                // Update with the response from server
                updatedRemoteRanking.name = newRanking.name; // Preserve the name
                setRanking(updatedRemoteRanking);
                localStorage.setItem(`ranking_${updatedRemoteRanking.id}`, JSON.stringify(updatedRemoteRanking));
                saveToRankingsList(updatedRemoteRanking);
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
        
        // Save to our rankings storage
        localStorage.setItem(`ranking_${newRanking.id}`, JSON.stringify(newRanking));
        
        // Update the list entry with updated timestamp
        saveToRankingsList(newRanking);

        // If this is a shared ranking and we have a PIN, update it remotely
        if (isShared && !ranking.id.startsWith('local') && pin) {
            try {
                const updatedRemoteRanking = await updateRemoteRanking(
                    ranking.id,
                    { players: updatedPlayers },
                    pin
                );
                
                // Update with the response from server
                updatedRemoteRanking.name = newRanking.name; // Preserve the name
                setRanking(updatedRemoteRanking);
                localStorage.setItem(`ranking_${updatedRemoteRanking.id}`, JSON.stringify(updatedRemoteRanking));
                saveToRankingsList(updatedRemoteRanking);
            } catch (err) {
                console.error('Failed to update remote ranking:', err);
                // Continue with local update even if remote update fails
            }
        }
    };

    // Function to get the share URL for the current ranking
    const getShareUrl = () => {
        if (!ranking || !ranking.id || ranking.id.startsWith('local')) {
            return null;
        }
        
        const url = new URL(window.location.origin);
        url.searchParams.set('id', ranking.id);
        return url.toString();
    };

    // Check if we've reached the storage limit
    const isAtStorageLimit = savedRankings.length >= MAX_STORED_RANKINGS;

    return {
        ranking,
        savedRankings,
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
        switchRanking,
        deleteRanking,
        getShareUrl,
        isAtStorageLimit,
        loadSavedRankings
    };
};

export default useUserRanking;