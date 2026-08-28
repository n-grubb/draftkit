import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { fetchRanking, createRanking, updateRanking as updateRemoteRanking } from './rankingService';
import { SportContext } from './sportContext';
import { storageKey } from './config';

const MAX_STORED_RANKINGS = 10;
const RANKINGS_STORAGE_KEY = 'storedRankings';
const SAVE_DEBOUNCE_MS = 500;

// Remove player IDs from a ranking that no longer exist in the current player data
function filterStalePlayers(rankingData, currentPlayers) {
    if (!currentPlayers || !rankingData?.players) return rankingData;
    const filtered = {};
    for (const id in rankingData.players) {
        if (currentPlayers[id]) {
            filtered[id] = rankingData.players[id];
        }
    }
    return { ...rankingData, players: filtered };
}

// Add players from currentPlayers that are missing from the ranking (e.g. newly added players)
function addNewPlayers(rankingData, currentPlayers) {
    if (!currentPlayers || !rankingData?.players) return rankingData;

    const existingPlayers = rankingData.players;
    const newPlayerIds = Object.keys(currentPlayers).filter(id => !existingPlayers[id]);
    if (newPlayerIds.length === 0) return rankingData;

    const maxRank = Object.values(existingPlayers).reduce<number>(
        (max, p: any) => Math.max(max, p.rank ?? 0),
        -1
    );

    newPlayerIds.sort((a, b) => {
        const adpA = currentPlayers[a].averageDraftPosition ?? Infinity;
        const adpB = currentPlayers[b].averageDraftPosition ?? Infinity;
        return adpA - adpB;
    });

    const updatedPlayers = { ...existingPlayers };
    newPlayerIds.forEach((id, i) => {
        updatedPlayers[id] = { rank: maxRank + 1 + i, ignore: false, highlight: false };
    });

    return { ...rankingData, players: updatedPlayers };
}

function syncRankingWithPlayers(rankingData, currentPlayers) {
    return addNewPlayers(filterStalePlayers(rankingData, currentPlayers), currentPlayers);
}

function readRankingsList(key) {
    const json = localStorage.getItem(key);
    return json ? JSON.parse(json) : [];
}

const useUserRanking = (players) => {
    const { sport, config } = useContext(SportContext);
    const localOnly = config.data.rankingsLocalOnly;
    const rankingsListKey = storageKey(sport, RANKINGS_STORAGE_KEY);
    const rkey = useCallback((id) => storageKey(sport, `ranking_${id}`), [sport]);

    // Get the ranking ID from URL if present
    const getUrlRankingId = () => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    };

    const [ranking, setRanking] = useState<any>({});
    const [savedRankings, setSavedRankings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pin, setPin] = useState('');
    const [isShared, setIsShared] = useState(false);

    const initialLoadDone = useRef(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const debouncedSaveToStorage = useCallback((rankingToSave) => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = setTimeout(() => {
            localStorage.setItem(rkey(rankingToSave.id), JSON.stringify(rankingToSave));
            saveTimerRef.current = null;
        }, SAVE_DEBOUNCE_MS);
    }, [rkey]);

    useEffect(() => {
        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
        };
    }, []);

    const loadSavedRankings = useCallback(() => {
        const storedRankings = readRankingsList(rankingsListKey);
        setSavedRankings(storedRankings);
        return storedRankings;
    }, [rankingsListKey]);

    const saveToRankingsList = useCallback((rankingToSave, { immediate = false } = {}) => {
        const currentRankings = readRankingsList(rankingsListKey);
        const existingIndex = currentRankings.findIndex(r => r.id === rankingToSave.id);

        const rankingForList = {
            id: rankingToSave.id,
            author: rankingToSave.author,
            description: rankingToSave.description,
            isShared: !rankingToSave.id.startsWith('local'),
            createdAt: rankingToSave.createdAt,
            updatedAt: rankingToSave.updatedAt,
            name: rankingToSave.name || (rankingToSave.author
                ? `${rankingToSave.author}'s Ranking`
                : `Ranking #${rankingToSave.id}`)
        };

        let updatedRankings;
        if (existingIndex >= 0) {
            updatedRankings = [...currentRankings];
            updatedRankings[existingIndex] = rankingForList;
        } else {
            if (currentRankings.length >= MAX_STORED_RANKINGS) {
                const removed = currentRankings[currentRankings.length - 1];
                if (removed?.id) {
                    localStorage.removeItem(rkey(removed.id));
                }
                updatedRankings = [...currentRankings];
                updatedRankings.pop();
            }
            updatedRankings = [rankingForList, ...(currentRankings || [])];
        }

        localStorage.setItem(rankingsListKey, JSON.stringify(updatedRankings));
        setSavedRankings(updatedRankings);

        if (immediate) {
            localStorage.setItem(rkey(rankingToSave.id), JSON.stringify(rankingToSave));
        } else {
            debouncedSaveToStorage(rankingToSave);
        }

        return updatedRankings;
    }, [debouncedSaveToStorage, rankingsListKey, rkey]);

    const persistRankingUpdate = useCallback((newRanking, remotePayload) => {
        setRanking(newRanking);
        saveToRankingsList(newRanking);

        if (!localOnly && isShared && !newRanking.id.startsWith('local') && pin) {
            updateRemoteRanking(newRanking.id, remotePayload, pin)
                .then((updatedRemoteRanking) => {
                    updatedRemoteRanking.name = newRanking.name;
                    setRanking(updatedRemoteRanking);
                    saveToRankingsList(updatedRemoteRanking);
                })
                .catch((err) => {
                    console.error('Failed to update remote ranking:', err);
                });
        }
    }, [isShared, pin, saveToRankingsList, localOnly]);

    const createNewRanking = useCallback((playersData = players, name = '') => {
        if (!playersData) {
            console.error('No players data available for creating new ranking');
            return;
        }

        const playerIds = Object.keys(playersData);

        playerIds.sort((a, b) => {
            if (playersData[a].averageDraftPosition && playersData[b].averageDraftPosition) {
                return playersData[a].averageDraftPosition - playersData[b].averageDraftPosition;
            }
            return playersData[b].ownership - playersData[a].ownership;
        });

        const playersMap = {};
        playerIds.forEach((playerId, index) => {
            playersMap[playerId] = { rank: index, ignore: false, highlight: false };
        });

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

        saveToRankingsList(initialRanking, { immediate: true });

        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('id');
        window.history.pushState({}, '', newUrl);

        return initialRanking;
    }, [players, saveToRankingsList]);

    useEffect(() => {
        if (!players || Object.keys(players).length === 0 || initialLoadDone.current) {
            return;
        }

        const initializeRanking = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const rankingId = getUrlRankingId();

                if (rankingId) {
                    const storedRanking = localStorage.getItem(rkey(rankingId));

                    if (storedRanking) {
                        const parsedRanking = syncRankingWithPlayers(JSON.parse(storedRanking), players);
                        setRanking(parsedRanking);
                        setIsShared(!rankingId.startsWith('local'));
                        return;
                    } else if (!localOnly) {
                        const fetchedRanking = await fetchRanking(rankingId);
                        setRanking(fetchedRanking);
                        setIsShared(true);
                        saveToRankingsList(fetchedRanking, { immediate: true });
                        return;
                    }
                }

                const savedRankings = loadSavedRankings();

                if (savedRankings && savedRankings.length > 0) {
                    const mostRecentId = savedRankings[0].id;
                    const storedRanking = localStorage.getItem(rkey(mostRecentId));

                    if (storedRanking) {
                        setRanking(syncRankingWithPlayers(JSON.parse(storedRanking), players));
                        setIsShared(!mostRecentId.startsWith('local'));
                    } else {
                        createNewRanking(players);
                    }
                } else {
                    createNewRanking(players);
                }
            } catch (err: any) {
                console.error('Error initializing ranking:', err);
                setError(err.message || 'Failed to load ranking');
                createNewRanking(players);
            } finally {
                setIsLoading(false);
                initialLoadDone.current = true;
            }
        };

        initializeRanking();
    }, [players, createNewRanking, saveToRankingsList, loadSavedRankings, rkey, localOnly]);

    const deleteRanking = (rankingId) => {
        if (ranking.id === rankingId) {
            return false;
        }

        const currentRankings = loadSavedRankings();
        const updatedRankings = currentRankings.filter(r => r.id !== rankingId);

        localStorage.setItem(rankingsListKey, JSON.stringify(updatedRankings));
        setSavedRankings(updatedRankings);
        localStorage.removeItem(rkey(rankingId));

        return true;
    };

    const switchRanking = async (rankingId) => {
        try {
            setIsLoading(true);
            setError(null);

            const storedRanking = localStorage.getItem(rkey(rankingId));

            let targetRanking;
            if (storedRanking) {
                targetRanking = syncRankingWithPlayers(JSON.parse(storedRanking), players);
            } else if (rankingId.startsWith('local') || localOnly) {
                return createNewRanking(players);
            } else {
                targetRanking = await fetchRanking(rankingId);
                localStorage.setItem(rkey(rankingId), JSON.stringify(targetRanking));
            }

            setRanking(targetRanking);
            setIsShared(!rankingId.startsWith('local'));
            setPin('');

            saveToRankingsList(targetRanking, { immediate: true });

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

    const shareRanking = async (author = '', description = '', newPin = '', name = '') => {
        if (localOnly) {
            // Local-only sports (football) don't use the sharing backend.
            return null;
        }
        try {
            setIsLoading(true);

            const sharedRanking = await createRanking(
                ranking.players,
                author,
                description,
                newPin
            );

            sharedRanking.name = name || (author ? `${author}'s Ranking` : `Ranking #${sharedRanking.id}`);

            setRanking(sharedRanking);
            setIsShared(true);
            if (newPin) setPin(newPin);

            saveToRankingsList(sharedRanking, { immediate: true });

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

    const loadRanking = async (id) => {
        return switchRanking(id);
    };

    const updateRanking = async (playerOrder) => {
        const updatedPlayers = { ...ranking.players };

        playerOrder.forEach((playerId, index) => {
            if (updatedPlayers[playerId]) {
                updatedPlayers[playerId] = { ...updatedPlayers[playerId], rank: index };
            } else {
                updatedPlayers[playerId] = { rank: index, ignore: false, highlight: false };
            }
        });

        const newRanking = { ...ranking, players: updatedPlayers, updatedAt: Date.now() };
        persistRankingUpdate(newRanking, { players: updatedPlayers });
    };

    const highlightPlayer = async (playerId) => {
        const currentPlayerInfo = ranking.players[playerId] || { rank: 0, ignore: false, highlight: false };
        const isCurrentlyHighlighted = currentPlayerInfo.highlight || false;

        const updatedPlayers = {
            ...ranking.players,
            [playerId]: { ...currentPlayerInfo, highlight: !isCurrentlyHighlighted, ignore: false }
        };

        const newRanking = { ...ranking, players: updatedPlayers, updatedAt: Date.now() };
        persistRankingUpdate(newRanking, { players: updatedPlayers });
    };

    const updatePlayerNote = async (playerId, note) => {
        const currentPlayerInfo = ranking.players[playerId] || { rank: 0, ignore: false, highlight: false };

        const updatedPlayers = {
            ...ranking.players,
            [playerId]: { ...currentPlayerInfo, note: note || undefined }
        };

        const newRanking = { ...ranking, players: updatedPlayers, updatedAt: Date.now() };
        persistRankingUpdate(newRanking, { players: updatedPlayers });
    };

    const updatePlayerProjection = async (playerId, statId, value) => {
        const currentPlayerInfo = ranking.players[playerId] || { rank: 0, ignore: false, highlight: false };
        const currentCustom = currentPlayerInfo.customProjections || {};

        let updatedCustom;
        if (value === null || value === undefined || value === '') {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [statId]: _removed, ...rest } = currentCustom;
            updatedCustom = Object.keys(rest).length > 0 ? rest : undefined;
        } else {
            updatedCustom = { ...currentCustom, [statId]: Number(value) };
        }

        const updatedPlayers = {
            ...ranking.players,
            [playerId]: { ...currentPlayerInfo, customProjections: updatedCustom }
        };

        const newRanking = { ...ranking, players: updatedPlayers, updatedAt: Date.now() };
        persistRankingUpdate(newRanking, { players: updatedPlayers });
    };

    const toggleCustomProjections = async () => {
        const newRanking = {
            ...ranking,
            useCustomProjections: ranking.useCustomProjections === false ? true : false,
            updatedAt: Date.now()
        };
        persistRankingUpdate(newRanking, { useCustomProjections: newRanking.useCustomProjections });
    };

    const ignorePlayer = async (playerId) => {
        const currentPlayerInfo = ranking.players[playerId] || { rank: 0, ignore: false, highlight: false };
        const isCurrentlyIgnored = currentPlayerInfo.ignore || false;

        const updatedPlayers = {
            ...ranking.players,
            [playerId]: { ...currentPlayerInfo, ignore: !isCurrentlyIgnored, highlight: false }
        };

        const newRanking = { ...ranking, players: updatedPlayers, updatedAt: Date.now() };
        persistRankingUpdate(newRanking, { players: updatedPlayers });
    };

    const getShareUrl = () => {
        if (!ranking || !ranking.id || ranking.id.startsWith('local')) {
            return null;
        }
        const url = new URL(window.location.origin);
        url.searchParams.set('id', ranking.id);
        return url.toString();
    };

    const isAtStorageLimit = savedRankings.length >= MAX_STORED_RANKINGS;

    return {
        ranking,
        savedRankings,
        isLoading,
        error,
        isShared,
        pin,
        setPin,
        localOnly,
        updateRanking,
        highlightPlayer,
        ignorePlayer,
        updatePlayerNote,
        updatePlayerProjection,
        toggleCustomProjections,
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
