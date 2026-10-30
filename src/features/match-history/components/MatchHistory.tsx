import { Link } from 'react-router'
import { errorMessages } from '../../../api/errorMessages'
import { Button } from '../../../shared/ui/Button'
import { sharedUiMessages } from '../../../shared/ui/messages'
import type { MatchHistoryEntry, MatchHistoryPage } from '../api'
import { useMatchHistoryQuery } from '../hooks/useMatchHistoryQuery'
import { matchHistoryMessages as messages } from '../messages'
import { HistoryResult } from './HistoryResult'

const terms = sharedUiMessages.terms

type MatchHistoryProps = {
  /** Zero-based, as the backend counts pages. */
  page: number
  onPageChange: (page: number) => void
}

/** The viewer's completed online games, newest first (F13). Pending, cancelled, CPU and local games never appear. */
export function MatchHistory({ page, onPageChange }: MatchHistoryProps) {
  const query = useMatchHistoryQuery(page)
  const history = query.data

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">{messages.title}</h1>
      {history ? (
        <>
          {history.content?.length ? (
            <ul aria-label={messages.title} className="flex flex-col gap-3">
              {history.content.map((entry) => (
                <HistoryEntry key={entry.gameId} entry={entry} />
              ))}
            </ul>
          ) : (
            <p>{messages.empty}</p>
          )}
          <Pagination history={history} page={page} onPageChange={onPageChange} />
        </>
      ) : query.isError ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-red-700">
            {errorMessages.generic}
          </p>
          <Button onClick={() => void query.refetch()}>{messages.retry}</Button>
        </div>
      ) : (
        <p>{messages.loading}</p>
      )}
    </section>
  )
}

type HistoryEntryProps = { entry: MatchHistoryEntry }

function HistoryEntry({ entry }: HistoryEntryProps) {
  const opponent = entry.opponent?.displayName ?? ''

  return (
    <li className="flex flex-col gap-2 rounded border border-gray-200 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{messages.opponent(opponent)}</span>
        {entry.endedAt ? (
          <time dateTime={entry.endedAt} className="text-sm text-gray-600">
            {new Date(entry.endedAt).toLocaleString()}
          </time>
        ) : null}
      </div>
      <HistoryResult result={entry.result} terminationReason={entry.terminationReason} />
      {/* Unrated games have no rating events (BR-RATE-007). */}
      {entry.ratingChange ? <p className="text-sm">{messages.viewerRating(entry.ratingChange)}</p> : null}
      {/* Plain labels rather than GameTerms, whose own list would nest inside this list item. */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded bg-gray-100 px-2 py-1">{entry.rated ? terms.rated : terms.unrated}</span>
        <span className="rounded bg-gray-100 px-2 py-1">
          {entry.clock?.enabled
            ? terms.clock(entry.clock.initialMinutes ?? 0, entry.clock.incrementSeconds ?? 0)
            : terms.noClock}
        </span>
        {entry.source ? <span className="text-gray-600">{messages.source[entry.source] ?? entry.source}</span> : null}
      </div>
      <Link to={`/history/${entry.gameId}`} className="self-start underline">
        {messages.viewGame(opponent)}
      </Link>
    </li>
  )
}

type PaginationProps = {
  history: MatchHistoryPage
  page: number
  onPageChange: (page: number) => void
}

function Pagination({ history, page, onPageChange }: PaginationProps) {
  const totalPages = history.totalPages ?? 0
  if (totalPages <= 1) {
    return null
  }
  // While the next page loads, the previous one stays on screen, so the controls follow the data shown.
  const shownPage = history.page ?? page

  return (
    <nav className="flex items-center gap-3">
      <Button disabled={shownPage <= 0} onClick={() => onPageChange(page - 1)}>
        {messages.previousPage}
      </Button>
      <span>{messages.pageStatus(shownPage + 1, totalPages)}</span>
      <Button disabled={history.last ?? true} onClick={() => onPageChange(page + 1)}>
        {messages.nextPage}
      </Button>
    </nav>
  )
}
