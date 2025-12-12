/**
 * Meme Battle TypeScript Client
 * 
 * Provides helpers for interacting with the Meme Battle contract on Conway.
 * Handles tournament queries, voting, and match management.
 */

import { mutateApplication, queryApplication } from './lineraClient'

export interface MemeRef {
  auctionAppId: string
  memeId: number
  imageUrl: string
  title: string
  creator: string
}

export interface Match {
  matchId: number
  memeA: MemeRef
  memeB: MemeRef
  startTime: number
  endTime: number
  votesA: number
  votesB: number
  status: 'UPCOMING' | 'VOTING' | 'RESOLVED'
  winner: number | null
}

export interface Round {
  roundIndex: number
  matches: Match[]
}

export interface Tournament {
  tournamentId: number
  title: string
  description: string
  seasonId: number
  memeRefs: MemeRef[]
  currentRound: number
  rounds: Round[]
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED'
  createdAt: number
  creator: string
}

function requireEnv(name: string): string {
  const value = import.meta.env[name]
  if (!value || value === 'REPLACE_WITH_DEPLOYED_ID') {
    const error = `Missing ${name}. Did you deploy the Meme Battle contract and set it in .env?`
    console.error(`[MemeBattle] ${error}`)
    throw new Error(error)
  }
  return value
}

/**
 * Get the Meme Battle application ID from environment
 */
function getMemeBattleAppId(): string {
  return requireEnv('VITE_MEME_BATTLE_APP_ID')
}

export async function getActiveTournaments(): Promise<Tournament[]> {
  console.log('[MemeBattle] Fetching active tournaments')
  
  const appId = getMemeBattleAppId()
  const result = await queryApplication(appId, `
    query {
      activeTournaments {
        tournamentId
        title
        description
        seasonId
        currentRound
        status
        createdAt
        creator
        rounds {
          roundIndex
          matches {
            matchId
            memeA {
              auctionAppId
              memeId
              imageUrl
              title
              creator
            }
            memeB {
              auctionAppId
              memeId
              imageUrl
              title
              creator
            }
            startTime
            endTime
            votesA
            votesB
            status
            winner
          }
        }
      }
    }
  `) as { data?: { activeTournaments?: Tournament[] } }
  
  return result?.data?.activeTournaments || []
}

export async function getAllTournaments(): Promise<Tournament[]> {
  console.log('[MemeBattle] Fetching all tournaments')
  
  const appId = getMemeBattleAppId()
  const result = await queryApplication(appId, `
    query {
      allTournaments {
        tournamentId
        title
        description
        seasonId
        currentRound
        status
        createdAt
        creator
      }
    }
  `) as { data?: { allTournaments?: Tournament[] } }
  
  return result?.data?.allTournaments || []
}

export async function getTournament(tournamentId: number): Promise<Tournament | null> {
  console.log('[MemeBattle] Fetching tournament:', tournamentId)
  
  const appId = getMemeBattleAppId()
  const result = await queryApplication(appId, `
    query ($tournamentId: Int!) {
      tournament(tournamentId: $tournamentId) {
        tournamentId
        title
        description
        seasonId
        currentRound
        status
        createdAt
        creator
        memeRefs {
          auctionAppId
          memeId
          imageUrl
          title
          creator
        }
        rounds {
          roundIndex
          matches {
            matchId
            memeA {
              auctionAppId
              memeId
              imageUrl
              title
              creator
            }
            memeB {
              auctionAppId
              memeId
              imageUrl
              title
              creator
            }
            startTime
            endTime
            votesA
            votesB
            status
            winner
          }
        }
      }
    }
  `, { tournamentId }) as { data?: { tournament?: Tournament } }
  
  return result?.data?.tournament || null
}

export async function hasUserVoted(matchId: number, owner: string): Promise<boolean> {
  const appId = getMemeBattleAppId()
  const result = await queryApplication(appId, `
    query ($matchId: Int!, $owner: String!) {
      userVoted(matchId: $matchId, owner: $owner)
    }
  `, { matchId, owner }) as { data?: { userVoted?: boolean } }
  
  return result?.data?.userVoted || false
}

export async function voteMeme(
  tournamentId: number,
  matchId: number,
  choice: number
): Promise<void> {
  console.log('[MemeBattle] Voting:', { tournamentId, matchId, choice })
  
  const appId = getMemeBattleAppId()
  
  const mutation = `
    mutation {
      vote(tournamentId: ${tournamentId}, matchId: ${matchId}, choice: ${choice})
    }
  `
  
  await mutateApplication(appId, mutation)
  
  console.log('[MemeBattle] Vote successful ✅')
}

export async function finalizeMatch(
  tournamentId: number,
  matchId: number
): Promise<void> {
  console.log('[MemeBattle] Finalizing match:', { tournamentId, matchId })
  
  const appId = getMemeBattleAppId()
  
  const mutation = `
    mutation {
      finalizeMatch(tournamentId: ${tournamentId}, matchId: ${matchId})
    }
  `
  
  await mutateApplication(appId, mutation)
  
  console.log('[MemeBattle] Match finalized ✅')
}

export async function advanceRound(
  tournamentId: number
): Promise<void> {
  console.log('[MemeBattle] Advancing round:', tournamentId)
  
  const appId = getMemeBattleAppId()
  
  const mutation = `
    mutation {
      advanceRound(tournamentId: ${tournamentId})
    }
  `
  
  await mutateApplication(appId, mutation)
  
  console.log('[MemeBattle] Round advanced ✅')
}

export async function createTournament(
  title: string,
  description: string,
  seasonId: number,
  memeRefs: MemeRef[],
  matchDurationSecs: number = 3600
): Promise<void> {
  console.log('[MemeBattle] Creating tournament:', { title, memeRefs: memeRefs.length })
  
  const appId = getMemeBattleAppId()
  
  // Build meme refs input
  const memeRefsStr = memeRefs.map(ref => `{
    auctionAppId: "${ref.auctionAppId}",
    memeId: ${ref.memeId},
    imageUrl: "${ref.imageUrl}",
    title: "${ref.title.replace(/"/g, '\\"')}",
    creator: "${ref.creator}"
  }`).join(',\n    ')
  
  const mutation = `
    mutation {
      createTournament(
        title: "${title.replace(/"/g, '\\"')}",
        description: "${description.replace(/"/g, '\\"')}",
        seasonId: ${seasonId},
        memeRefs: [${memeRefsStr}],
        matchDurationSecs: ${matchDurationSecs}
      )
    }
  `
  
  await mutateApplication(appId, mutation)
  
  console.log('[MemeBattle] Tournament created ✅')
}

export function getTimeRemaining(endTime: number): string {
  const now = Math.floor(Date.now() / 1000)
  const remaining = endTime - now
  
  if (remaining <= 0) return 'Ended'
  
  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = remaining % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  } else {
    return `${seconds}s`
  }
}

export function getRoundName(roundIndex: number, totalRounds: number): string {
  const remaining = totalRounds - roundIndex
  
  if (remaining === 1) return 'Finals'
  if (remaining === 2) return 'Semi-Finals'
  if (remaining === 3) return 'Quarter-Finals'
  
  return `Round ${roundIndex + 1}`
}
