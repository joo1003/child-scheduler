import { useState, useEffect, useRef } from 'react'

const WORD_SETS = {
  easy: ['사과','바나나','포도','딸기','수박','복숭아','키위','망고','귤','레몬','배','감','자두','블루베리','체리'],
  medium: ['하늘이 파랗다','오늘 날씨가 좋다','나는 학생이다','밥을 먹었다','책을 읽는다','음악을 듣는다','운동을 한다','공부를 열심히'],
  hard: ['대한민국의 수도는 서울입니다','나는 매일 아침 일찍 일어납니다','한글은 세종대왕이 만들었습니다','오늘도 열심히 공부해 봅시다','가나다라마바사아자차카타파하'],
}

type Level = keyof typeof WORD_SETS

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]]
  }
  return a
}

export default function TypingGame() {
  const [level, setLevel] = useState<Level>('easy')
  const [words, setWords] = useState<string[]>(() => shuffle(WORD_SETS.easy))
  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState('')
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)
  const [charCount, setCharCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null)

  const start = (lv: Level) => {
    const ws = shuffle(WORD_SETS[lv])
    setWords(ws)
    setIdx(0)
    setInput('')
    setCorrect(0)
    setWrong(0)
    setStarted(true)
    setFinished(false)
    setTimeLeft(60)
    setCharCount(0)
    inputRef.current?.focus()
  }

  useEffect(() => {
    if (!started || finished) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); setFinished(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [started, finished])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    const target = words[idx] ?? ''

    // 스페이스나 엔터로 제출
    if (val.endsWith(' ') || val.endsWith('\n')) {
      const typed = val.trim()
      if (typed === target) {
        setCorrect(c => c+1)
        setCharCount(n => n + typed.length)
      } else {
        setWrong(w => w+1)
      }
      const nextIdx = idx + 1
      if (nextIdx >= words.length) {
        // 단어 다 씀 → 섞어서 재사용
        setWords(shuffle(WORD_SETS[level]))
        setIdx(0)
      } else {
        setIdx(nextIdx)
      }
      setInput('')
      return
    }
    setInput(val)
  }

  const currentWord = words[idx] ?? ''
  const wpm = Math.round(charCount / 5 / ((60 - timeLeft + 0.01) / 60))
  const accuracy = correct + wrong > 0 ? Math.round(correct / (correct + wrong) * 100) : 100

  // 입력 색상: 맞는 부분/틀린 부분 표시
  const renderWord = () => {
    return currentWord.split('').map((char, i) => {
      let color = 'text-gray-400'
      if (i < input.length) color = input[i] === char ? 'text-green-600' : 'text-red-500'
      else if (i === input.length) color = 'text-gray-800 underline'
      return <span key={i} className={`${color} font-bold`}>{char}</span>
    })
  }

  if (!started) {
    return (
      <div className="max-w-sm mx-auto space-y-4">
        <p className="text-center text-gray-600 text-sm">60초 동안 최대한 많은 단어를 타이핑해보세요!</p>
        <div className="grid grid-cols-3 gap-2">
          {(['easy','medium','hard'] as Level[]).map(lv => (
            <button key={lv} onClick={() => { setLevel(lv); start(lv) }}
              className={`py-3 rounded-xl font-medium text-sm ${
                lv==='easy' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                lv==='medium' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
                'bg-red-100 text-red-700 hover:bg-red-200'
              }`}>
              {lv==='easy' ? '쉬움\n(단어)' : lv==='medium' ? '보통\n(짧은 문장)' : '어려움\n(긴 문장)'}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="max-w-sm mx-auto text-center space-y-4">
        <div className="text-4xl">⌨️</div>
        <h3 className="text-xl font-bold text-gray-800">결과</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-2xl p-4">
            <p className="text-2xl font-bold text-blue-700">{wpm}</p>
            <p className="text-xs text-blue-500 mt-1">WPM</p>
          </div>
          <div className="bg-green-50 rounded-2xl p-4">
            <p className="text-2xl font-bold text-green-700">{accuracy}%</p>
            <p className="text-xs text-green-500 mt-1">정확도</p>
          </div>
          <div className="bg-purple-50 rounded-2xl p-4">
            <p className="text-2xl font-bold text-purple-700">{correct}</p>
            <p className="text-xs text-purple-500 mt-1">완성 단어</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => start(level)} className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600">다시하기</button>
          <button onClick={() => { setStarted(false); setFinished(false) }} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200">레벨 선택</button>
        </div>
      </div>
    )
  }

  const timeColor = timeLeft <= 10 ? 'text-red-600' : timeLeft <= 20 ? 'text-orange-500' : 'text-gray-700'

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-3 text-sm">
          <span className="text-green-600 font-bold">✓ {correct}</span>
          <span className="text-red-500 font-bold">✗ {wrong}</span>
        </div>
        <span className={`text-2xl font-bold tabular-nums ${timeColor}`}>{timeLeft}s</span>
        <span className="text-sm text-gray-500">WPM: {wpm}</span>
      </div>

      {/* 진행 바 */}
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${(timeLeft/60)*100}%` }} />
      </div>

      {/* 현재 단어 */}
      <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-6 text-center">
        <div className="text-3xl tracking-wider mb-1">{renderWord()}</div>
        {input && <div className="text-sm text-gray-400 mt-2">입력 중: {input}</div>}
      </div>

      {/* 다음 단어 미리보기 */}
      <div className="text-center text-gray-300 text-sm">
        다음: {words[idx+1] ?? words[0]}
      </div>

      <input ref={inputRef} value={input} onChange={handleChange}
        placeholder="여기에 타이핑하세요 (스페이스로 제출)"
        className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl text-lg focus:outline-none focus:border-blue-500"
        autoComplete="off" autoCorrect="off" spellCheck={false}
      />
    </div>
  )
}
