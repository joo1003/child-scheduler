import { useState } from 'react'

// 퍼즐 (0 = 빈칸)
const PUZZLES = [
  {
    puzzle: [
      [5,3,0,0,7,0,0,0,0],
      [6,0,0,1,9,5,0,0,0],
      [0,9,8,0,0,0,0,6,0],
      [8,0,0,0,6,0,0,0,3],
      [4,0,0,8,0,3,0,0,1],
      [7,0,0,0,2,0,0,0,6],
      [0,6,0,0,0,0,2,8,0],
      [0,0,0,4,1,9,0,0,5],
      [0,0,0,0,8,0,0,7,9],
    ],
    solution: [
      [5,3,4,6,7,8,9,1,2],
      [6,7,2,1,9,5,3,4,8],
      [1,9,8,3,4,2,5,6,7],
      [8,5,9,7,6,1,4,2,3],
      [4,2,6,8,5,3,7,9,1],
      [7,1,3,9,2,4,8,5,6],
      [9,6,1,5,3,7,2,8,4],
      [2,8,7,4,1,9,6,3,5],
      [3,4,5,2,8,6,1,7,9],
    ],
  },
  {
    puzzle: [
      [0,0,0,2,6,0,7,0,1],
      [6,8,0,0,7,0,0,9,0],
      [1,9,0,0,0,4,5,0,0],
      [8,2,0,1,0,0,0,4,0],
      [0,0,4,6,0,2,9,0,0],
      [0,5,0,0,0,3,0,2,8],
      [0,0,9,3,0,0,0,7,4],
      [0,4,0,0,5,0,0,3,6],
      [7,0,3,0,1,8,0,0,0],
    ],
    solution: [
      [4,3,5,2,6,9,7,8,1],
      [6,8,2,5,7,1,4,9,3],
      [1,9,7,8,3,4,5,6,2],
      [8,2,6,1,9,5,3,4,7],
      [3,7,4,6,8,2,9,1,5],
      [9,5,1,7,4,3,6,2,8],
      [5,1,9,3,2,6,8,7,4],
      [2,4,8,9,5,7,1,3,6],
      [7,6,3,4,1,8,2,5,9],
    ],
  },
]

function isConflict(grid: number[][], r: number, c: number, val: number) {
  if (val === 0) return false
  for (let i = 0; i < 9; i++) {
    if (i !== c && grid[r][i] === val) return true
    if (i !== r && grid[i][c] === val) return true
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++)
      if ((br+dr !== r || bc+dc !== c) && grid[br+dr][bc+dc] === val) return true
  return false
}

export default function Sudoku() {
  const [puzzleIdx, setPuzzleIdx] = useState(0)
  const { puzzle, solution } = PUZZLES[puzzleIdx]
  const [grid, setGrid] = useState<number[][]>(() => puzzle.map(r => [...r]))
  const [selected, setSelected] = useState<[number,number]|null>(null)
  const [won, setWon] = useState(false)
  const [showHint, setShowHint] = useState(false)

  const reset = (idx = puzzleIdx) => {
    setGrid(PUZZLES[idx].puzzle.map(r => [...r]))
    setSelected(null)
    setWon(false)
    setShowHint(false)
  }

  const handleInput = (r: number, c: number, val: string) => {
    if (puzzle[r][c] !== 0) return
    const num = val === '' ? 0 : parseInt(val)
    if (isNaN(num) || num < 0 || num > 9) return
    const next = grid.map(row => [...row])
    next[r][c] = num
    setGrid(next)
    if (next.every((row, ri) => row.every((v, ci) => v === solution[ri][ci]))) setWon(true)
  }

  const fillHint = () => {
    if (!selected) return
    const [r, c] = selected
    if (puzzle[r][c] !== 0) return
    const next = grid.map(row => [...row])
    next[r][c] = solution[r][c]
    setGrid(next)
    if (next.every((row, ri) => row.every((v, ci) => v === solution[ri][ci]))) setWon(true)
  }

  const boxBorder = (r: number, c: number) => {
    let cls = ''
    if (r % 3 === 0 && r !== 0) cls += ' border-t-2 border-t-gray-500'
    if (c % 3 === 0 && c !== 0) cls += ' border-l-2 border-l-gray-500'
    return cls
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {won && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-3 text-green-700 font-bold text-lg">
          🎉 완성! 훌륭해요!
        </div>
      )}

      <div className="inline-grid border-2 border-gray-700 rounded-lg overflow-hidden"
        style={{ gridTemplateColumns: 'repeat(9, 1fr)' }}>
        {grid.map((row, r) => row.map((val, c) => {
          const isFixed = puzzle[r][c] !== 0
          const isSel = selected?.[0] === r && selected?.[1] === c
          const conflict = !isFixed && val !== 0 && isConflict(grid, r, c, val)
          const sameNum = selected && grid[selected[0]][selected[1]] !== 0 && val === grid[selected[0]][selected[1]]
          return (
            <div key={`${r}-${c}`}
              className={`w-9 h-9 flex items-center justify-center border border-gray-200 relative cursor-pointer select-none transition-colors
                ${boxBorder(r,c)}
                ${isSel ? 'bg-blue-200' : sameNum ? 'bg-blue-50' : isFixed ? 'bg-gray-50' : 'bg-white hover:bg-blue-50'}
                ${conflict ? '!bg-red-100' : ''}`}
              onClick={() => setSelected([r, c])}>
              {showHint && !isFixed && val === 0
                ? <span className="text-gray-300 text-xs">{solution[r][c]}</span>
                : <span className={`text-sm font-bold ${isFixed ? 'text-gray-800' : conflict ? 'text-red-600' : 'text-blue-600'}`}>
                    {val !== 0 ? val : ''}
                  </span>
              }
              {isSel && !isFixed && (
                <input autoFocus type="tel" maxLength={1}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  onChange={e => { handleInput(r, c, e.target.value.slice(-1)); e.target.value = '' }}
                  onKeyDown={e => { if (e.key === 'Backspace' || e.key === 'Delete') handleInput(r, c, '0') }}
                />
              )}
            </div>
          )
        }))}
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => selected && handleInput(selected[0], selected[1], String(n))}
            className="w-9 h-9 bg-gray-100 hover:bg-blue-100 rounded-lg text-sm font-bold text-gray-700">
            {n}
          </button>
        ))}
        <button onClick={() => selected && handleInput(selected[0], selected[1], '0')}
          className="w-9 h-9 bg-gray-100 hover:bg-red-100 rounded-lg text-xs text-gray-500">
          지우기
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => fillHint()} disabled={!selected}
          className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-xl text-sm font-medium disabled:opacity-40">
          💡 힌트
        </button>
        <button onClick={() => setShowHint(!showHint)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm">
          {showHint ? '힌트 숨기기' : '전체 힌트'}
        </button>
        <button onClick={() => { const ni = (puzzleIdx+1)%PUZZLES.length; setPuzzleIdx(ni); reset(ni) }}
          className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl text-sm">
          다른 문제
        </button>
        <button onClick={() => reset()}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm">
          초기화
        </button>
      </div>
    </div>
  )
}
