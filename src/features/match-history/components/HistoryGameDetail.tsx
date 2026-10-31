import { Link } from 'react-router'
import { errorMessages } from '../../../api/errorMessages'
import { ApiError } from '../../../api/errors'
import { replayMoves, START_FEN, toSide, type Side } from '../../../shared/lib/chess'
import { Board } from '../../../shared/ui/Board'
import { Button } from '../../../shared/ui/Button'
import { GameTerms } from '../../../shared/ui/GameTerms'
import { MovePanel, WithMovePanel } from '../../../shared/ui/MovePanel'
import type { HistoryGame, RatingChange } from '../api'
import { useHistoryGameQuery } from '../hooks/useHistoryGameQuery'
import { matchHistoryMessages } from '../messages'
import { HistoryResult } from './HistoryResult'

const messages = matchHistoryMessages.detail
const noLegalMoves: string[] = []
const ignoreMove = () => {}

type HistoryGameDetailProps = {
  gameId: number
}

/** One completed online game with both players' rating changes and its moves (F13). Replay is out of scope. */
export function HistoryGameDetail({ gameId }: HistoryGameDetailProps) {
  const validId = Number.isSafeInteger(gameId) && gameId > 0
  const query = useHistoryGameQuery(gameId, validId)
  const errorCode = query.error instanceof ApiError ? query.error.errorCode : undefined
  const game = query.data

  return (
    <section className="flex flex-col gap-4">
      <Link to="/history" className="self-start font-medium text-brand underline-offset-4 hover:underline">
        {messages.back}
      </Link>
      {!validId || errorCode === 'ONLINE_GAME_NOT_FOUND' ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
          {messages.notFound}
        </p>
      ) : errorCode === 'GAME_NOT_IN_HISTORY' ? (
        // Active games are not in history; they stay reachable through the live game page.
        <div className="flex flex-col items-start gap-2">
          <p>{messages.notInHistory}</p>
          <Link to={`/games/${gameId}`} className="font-medium text-brand underline-offset-4 hover:underline">
            {messages.toGame}
          </Link>
        </div>
      ) : game ? (
        <GameRecord game={game} />
      ) : query.isError ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
            {errorMessages.generic}
          </p>
          <Button onClick={() => void query.refetch()}>{matchHistoryMessages.retry}</Button>
        </div>
      ) : (
        <p>{matchHistoryMessages.loading}</p>
      )}
    </section>
  )
}

type GameRecordProps = { game: HistoryGame }

function GameRecord({ game }: GameRecordProps) {
  const viewerSide = toSide(game.viewerColor)
  const white = game.white?.displayName ?? ''
  const black = game.black?.displayName ?? ''
  const moves = game.moves ?? []
  const record = replayMoves(game.initialFen ?? START_FEN, moves.map((move) => move.move ?? ''))

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{messages.title(white, black)}</h1>
      <div className="flex flex-col gap-1 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
        <p>{messages.player('WHITE', white)}</p>
        <p>{messages.player('BLACK', black)}</p>
        <p className="font-medium">{messages.viewerColor(viewerSide)}</p>
      </div>
      <HistoryResult result={game.result} terminationReason={game.terminationReason} />
      <div className="flex flex-wrap items-center gap-2">
        <GameTerms rated={game.rated ?? false} clock={game.clock} />
        {game.source ? (
          <span className="text-sm text-muted">{matchHistoryMessages.source[game.source] ?? game.source}</span>
        ) : null}
      </div>
      <PlayerRating name={white} change={game.whiteRatingChange} />
      <PlayerRating name={black} change={game.blackRatingChange} />
      <WithMovePanel panel={<MovePanel moves={moves.map((move) => move.san ?? move.move ?? '')} played={record.played} fen={record.fen} />}>
        {game.finalFen ? (
          <figure className="flex flex-col gap-2">
            <figcaption className="font-medium">{messages.finalPosition}</figcaption>
            <FinalPosition fen={game.finalFen} orientation={viewerSide} />
          </figure>
        ) : null}
      </WithMovePanel>
    </>
  )
}

type PlayerRatingProps = { name: string; change: RatingChange | undefined }

/** Absent for unrated games, which have no rating events (BR-RATE-007). */
function PlayerRating({ name, change }: PlayerRatingProps) {
  return change ? <p className="text-sm">{messages.playerRating(name, change)}</p> : null
}

type FinalPositionProps = { fen: string; orientation: Side }

/** The board as the game ended; nothing can be moved. */
function FinalPosition({ fen, orientation }: FinalPositionProps) {
  return (
    <Board
      fen={fen}
      movableSide={orientation}
      orientation={orientation}
      legalMoves={noLegalMoves}
      locked
      onMove={ignoreMove}
      onIllegalMove={ignoreMove}
    />
  )
}
