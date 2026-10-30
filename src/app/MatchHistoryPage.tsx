import { useSearchParams } from 'react-router'
import { MatchHistory } from '../features/match-history/components/MatchHistory'
import { RequireSession } from './RequireSession'

/** The address carries the page one-based (`?page=2`) so a refresh or a shared link keeps it. */
function parsePage(value: string | null): number {
  const page = Number(value)
  return Number.isSafeInteger(page) && page >= 1 ? page - 1 : 0
}

export function MatchHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  return (
    <RequireSession>
      <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 sm:py-10">
        <MatchHistory
          page={parsePage(searchParams.get('page'))}
          onPageChange={(page) => setSearchParams({ page: String(page + 1) })}
        />
      </main>
    </RequireSession>
  )
}
