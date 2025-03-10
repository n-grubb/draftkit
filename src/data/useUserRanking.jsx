import {useState, useEffect} from 'react'

const useUserRanking = (players) => {
    let storedRanking = localStorage.getItem('ranking')
    let shouldCreateRanking = !storedRanking
    const [ranking, setRanking] = useState(storedRanking ? JSON.parse(storedRanking) : {});

    useEffect(() => {
        const playerIds = players ? Object.keys(players) : []
        if (playerIds.length > 0 && shouldCreateRanking) {
            console.log('Creating initial ranking data...', { playerIds })

            playerIds.sort((a,b) => players[b].ownership - players[a].ownership)
            
            // Create a map of player info
            const playersMap = {}
            playerIds.forEach((playerId, index) => {
                playersMap[playerId] = {
                    rank: index,
                    ignore: false,
                    highlight: false
                }
            })

            const initialRanking = {
                id: '0000',
                author: null,
                players: playersMap
            }

            setRanking(initialRanking)

            // Save in local storage
            localStorage.setItem('ranking', JSON.stringify(initialRanking))
        }
    }, [players])

    // Takes a playerRanking (array of playerIds), 
    // & updates the stored ranking to match
    const updateRanking = (playerOrder) => {
        // Update ranks based on new order
        const updatedPlayers = {...ranking.players}
        
        playerOrder.forEach((playerId, index) => {
            if (updatedPlayers[playerId]) {
                updatedPlayers[playerId] = {
                    ...updatedPlayers[playerId],
                    rank: index
                }
            } else {
                updatedPlayers[playerId] = {
                    rank: index,
                    ignore: false,
                    highlight: false
                }
            }
        })

        const newRanking = {
            ...ranking,
            players: updatedPlayers
        }

        console.log('Saving new ranking...', newRanking)
        setRanking(newRanking)

        // Save in local storage
        localStorage.setItem('ranking', JSON.stringify(newRanking))
    }

    const highlightPlayer = (playerId) => {
        const currentPlayerInfo = ranking.players[playerId] || { rank: 0, ignore: false, highlight: false }
        const isCurrentlyHighlighted = currentPlayerInfo.highlight || false
        
        const updatedPlayers = {
            ...ranking.players,
            [playerId]: {
                ...currentPlayerInfo,
                highlight: !isCurrentlyHighlighted,
                ignore: false
            }
        }

        const updatedPlayer = {
            [playerId]: {
                ...currentPlayerInfo,
                highlight: !isCurrentlyHighlighted,
                ignore: false
            }
        }

        console.log( { updatedPlayer } )
        
        const newRanking = {
            ...ranking,
            players: updatedPlayers
        }
        
        setRanking(newRanking)
        localStorage.setItem('ranking', JSON.stringify(newRanking))
    }

    const ignorePlayer = (playerId) => {
        const currentPlayerInfo = ranking.players[playerId] || { rank: 0, ignore: false, highlight: false }
        const isCurrentlyIgnored = currentPlayerInfo.ignore || false
        
        const updatedPlayers = {
            ...ranking.players,
            [playerId]: {
                ...currentPlayerInfo,
                ignore: !isCurrentlyIgnored,
                highlight: false
            }
        }
        
        const newRanking = {
            ...ranking,
            players: updatedPlayers
        }
        
        setRanking(newRanking)
        localStorage.setItem('ranking', JSON.stringify(newRanking))
    }

    const isLoading = !ranking.players || Object.keys(ranking.players).length < 1

    return {
        ranking,
        isLoading,
        updateRanking,
        highlightPlayer,
        ignorePlayer
    }
}

export default useUserRanking