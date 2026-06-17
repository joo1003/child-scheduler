import { useState } from 'react'

const DIGITS = 3

function makeSecret() {
  const pool = [1,2,3,4,5,6,7,8,9]
  const arr: number[] = []
  while (arr.length < DIGITS) {
    const idx = Math.floor(Math.random() * pool.length)
    arr.push(pool.splice(idx, 1)[0])
  }
  return arr
}

function judge(secret: number[], guess: number[]) {
  let strikes = 0, balls = 0
  for (let i = 0; i < DIGITS; i++) {
    if (guess[i] === secret[i]) strikes++
    else if (secret.includes(guess[i])) balls++
  }
  return { strikes, balls }
}

type Record = { guess: string; strikes: number; balls: number }

export default function BaseballGame() {
  const [secret, setSecret] = useState(makeSecret)
  const [input, setInput] = useState('')
  const [records, setRecords] = useState<Record[]>([])
  const [won, setWon] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)

  const reset = () => {
    setSecret(makeSecret())
    setInput('')
    setRecords([])
    setWon(false)
    setShowAnswer(false)
  }

  const handleGuess = () => {
    const digits = input.split('').map(Number)
    if (digits.length !== DIGITS || new Set(digits).size !== DIGITS ||
        digits.some(d => d < 1 || d > 9)) {
      alert(`1~9 사이 서로 다른 숫자 ${DIGITS}개를 입력하세요`)
      return
    }
    const { strikes, balls } = judge(secret, digits)
    const entry: Record = { guess: input, strikes, balls }
    const next = [entry, ...records]
    setRecords(next)
    setInput('')
    if (strikes === DIGITS) setWon(true)
  }

  const resultLabel = (r: Record) => {
    if (r.strikes === DIGITS) return '🎉 홈런!'
    if (r.strikes === 0 && r.balls === 0) return '⚾ 아웃'
    return `${r.strikes}스트라이크 ${r.balls}볼`
  }

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <p className="font-bold mb-1">게임 방법</p>
        <p>컴퓨터가 고른 <b>1~9 서로 다른 숫자 3개</b>를 맞춰보세요!</p>
        <p className="mt-1">· 자리와 숫자 모두 맞으면 <b>스트라이크</b></p>
        <p>· 숫자는 맞지만 자리가 틀리면 <b>볼</b></p>
        <p>· 숫자가 없으면 <b>아웃</b></p>
      </div>

      {won ? (
        <div className="text-center bg-green-50 border border-green-200 rounded-2xl p-6">
          <p className="text-4xl mb-2">🎉</p>
          <p className="text-xl font-bold text-green-700">홈런! {records.length}번 만에 성공!</p>
          <p className="text-sm text-green-600 mt-1">정답: {secret.join('')}</p>
          <button onClick={reset} className="mt-4 px-6 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600">다시하기</button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="text" maxLength={DIGITS} value={input}
              onChange={e => setInput(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleGuess()}
              placeholder={`숫자 ${DIGITS}개 입력`}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-2xl font-mono tracking-[0.3em] focus:outline-none focus:border-amber-400"
            />
            <button onClick={handleGuess} disabled={input.length !== DIGITS}
              className="px-5 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 disabled:opacity-40">
              투구
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {records.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-xl">
                <span className="font-mono text-lg font-bold tracking-widest text-gray-700">{r.guess}</span>
                <span className={`text-sm font-medium ${r.strikes === DIGITS ? 'text-green-600' : r.strikes === 0 && r.balls === 0 ? 'text-gray-400' : 'text-blue-600'}`}>
                  {resultLabel(r)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={reset} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">새 게임</button>
            <button onClick={() => setShowAnswer(!showAnswer)} className="flex-1 py-2 border border-red-200 rounded-xl text-sm text-red-400 hover:bg-red-50">
              {showAnswer ? `정답: ${secret.join('')}` : '정답 보기'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
