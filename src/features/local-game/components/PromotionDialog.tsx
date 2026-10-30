import { useId } from 'react'
import { Button } from '../../../shared/ui/Button'
import { localGameMessages } from '../messages'

const messages = localGameMessages.promotion

export type PromotionPiece = keyof typeof messages.pieces

const pieces: PromotionPiece[] = ['q', 'r', 'b', 'n']

type PromotionDialogProps = {
  onChoose: (piece: PromotionPiece) => void
  onCancel: () => void
}

export function PromotionDialog({ onChoose, onCancel }: PromotionDialogProps) {
  const titleId = useId()

  return (
    <dialog open aria-labelledby={titleId} className="mx-auto my-2 rounded border border-gray-300 p-4 shadow-lg">
      <h2 id={titleId} className="mb-3 font-semibold">
        {messages.title}
      </h2>
      <div className="flex flex-wrap gap-2">
        {pieces.map((piece) => (
          <Button key={piece} onClick={() => onChoose(piece)}>
            {messages.pieces[piece]}
          </Button>
        ))}
        <button type="button" onClick={onCancel} className="px-4 py-2 underline">
          {messages.cancel}
        </button>
      </div>
    </dialog>
  )
}
