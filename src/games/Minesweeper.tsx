import { useState, useCallback } from 'react'

const ROWS = 9, COLS = 9, MINES = 10

type Cell = { mine: boolean; revealed: boolean; flagged: boolean; count: number }

function makeBoard(): Cell[][] {
  const board: Cell[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ mine: false, revealed: false, flagged: false, count: 0 }))
  )
  let placed = 0
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS)
    const c = Math.floor(Math.random() * COLS)
    if (!board[r][c].mine) { board[r][c].mine = true; placed++ }
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c].mine) continue
      let cnt = 0
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r+dr, nc = c+dc
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].mine) cnt++
        }
      board[r][c].count = cnt
    }
  }
  return board
}

function reveal(board: Cell[][], r: number, c: number): Cell[][] {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return board
  const cell = board[r][c]
  if (cell.revealed || cell.flagged) return board
  const next = board.map(row => row.map(cell => ({ ...cell })))
  next[r][c].revealed = true
  if (next[r][c].count === 0 && !next[r][c].mine) {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++)
        if (dr !== 0 || dc !== 0)
          reveal(next, r+dr, c+dc).forEach((row, ri) => row.forEach((cell, ci) => { next[ri][ci] = cell }))
  }
  return next
}

type Status = 'playing' | 'won' | 'lost'

export default function Minesweeper() {
  const [board, setBoard] = useState<Cell[][]>(makeBoard)
  const [status, setStatus] = useState<Status>('playing')
  const [flags, setFlags] = useState(0)
  const [firstClick, setFirstClick] = useState(true)

  const reset = () => {
    setBoard(makeBoard())
    setStatus('playing')
    setFlags(0)
    setFirstClick(true)
  }

  const handleClick = useCallback((r: number, c: number) => {
    if (status !== 'playing') return
    const cell = board[r][c]
    if (cell.revealed || cell.flagged) return

    // 첫 클릭에 지뢰면 재생성
    if (firstClick && cell.mine) {
      let b = makeBoard()
      while (b[r][c].mine) b = makeBoard()
      const next = reveal(b, r, c)
      setBoard(next)
      setFirstClick(false)
      return
    }
    setFirstClick(false)

    if (cell.mine) {
      // 게임 오버: 모든 지뢰 공개
      const next = board.map(row => row.map(c => c.mine ? { ...c, revealed: true } : { ...c }))
      setBoard(next)
      setStatus('lost')
      return
    }

    const next = reveal(board.map(row => row.map(c => ({ ...c }))), r, c)
    setBoard(next)

    const unrevealed = next.flat().filter(c => !c.revealed && !c.mine).length
    if (unrevealed === 0) setStatus('won')
  }, [board, status, firstClick])

  const handleRightClick = useCallback((e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault()
    if (status !== 'playing') return
    const cell = board[r][c]
    if (cell.revealed) return
    const next = board.map(row => row.map(c => ({ ...c })))
    next[r][c].flagged = !next[r][c].flagged
    setBoard(next)
    setFlags(f => f + (next[r][c].flagged ? 1 : -1))
  }, [board, status])

  const cellStyle = (cell: Cell) => {
    if (!cell.revealed) {
      return cell.flagged
        ? 'bg-red-100 border-red-200 text-red-500'
        : 'bg-gray-200 border-gray-300 hover:bg-gray-300 cursor-pointer'
    }
    if (cell.mine) return 'bg-red-500 border-red-600 text-white'
    return 'bg-white border-gray-200 text-gray-700'
  }

  const countColor = ['', 'text-blue-600', 'text-green-600', 'text-red-600', 'text-purple-700', 'text-red-800', 'text-cyan-600', 'text-black', 'text-gray-500']

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium text-gray-600">💣 {MINES - flags}</span>
        <span className={`font-bold text-lg ${status === 'won' ? 'text-green-600' : status === 'lost' ? 'text-red-600' : 'text-gray-700'}`}>
          {status === 'won' ? '🎉 클리어!' : status === 'lost' ? '💥 게임오버' : '🙂'}
        </span>
        <button onClick={reset} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 text-xs">새 게임</button>
      </div>

      <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        {board.map((row, r) => row.map((cell, c) => (
          <button key={`${r}-${c}`}
            className={`w-8 h-8 text-xs font-bold border rounded flex items-center justify-center select-none transition-colors ${cellStyle(cell)}`}
            onClick={() => handleClick(r, c)}
            onContextMenu={e => handleRightClick(e, r, c)}>
            {cell.flagged && !cell.revealed ? '🚩' :
              cell.revealed ? (cell.mine ? '💣' : cell.count > 0 ? <span className={countColor[cell.count]}>{cell.count}</span> : '') : ''}
          </button>
        )))}
      </div>
      <p className="text-xs text-gray-400">왼클릭: 열기 · 오른클릭: 깃발</p>
    </div>
  )
}
