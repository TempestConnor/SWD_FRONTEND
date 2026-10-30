import { useId } from 'react'
import { Button } from './Button'
import { sharedUiMessages } from './messages'

const messages = sharedUiMessages.promotion

export type PromotionPiece = keyof typeof messages.pieces

const pieces: PromotionPiece[] = ['q', 'r', 'b', 'n']

type PromotionDialogProps = {
  onChoose: (piece: PromotionPiece) => void
  onCancel: () => void
}

export function PromotionDialog({ onChoose, onCancel }: PromotionDialogProps) {
  const titleId = useId()

  return (
    <dialog open aria-labelledby={titleId} className="mx-auto my-3 rounded-xl bg-surface p-4 text-ink shadow-xl ring-1 ring-line">
      <h2 id={titleId} className="mb-3 font-semibold">
        {messages.title}
      </h2>
      <div className="flex flex-wrap gap-2">
        {pieces.map((piece) => (
          <Button key={piece} onClick={() => onChoose(piece)}>
            {messages.pieces[piece]}
          </Button>
        ))}
        <button type="button" onClick={onCancel} className="px-4 py-2 font-medium text-muted hover:text-ink">
          {messages.cancel}
        </button>
      </div>
    </dialog>
  )
}
