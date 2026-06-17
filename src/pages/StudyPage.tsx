import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft, Star, Trophy, RefreshCw, CheckCircle, XCircle,
  History, RotateCcw, BookOpen, AlertCircle
} from 'lucide-react'
import { useChild } from '../contexts/ChildContext'
import { useAuth } from '../contexts/AuthContext'

// ── 타입 ─────────────────────────────────────────────────────
type Question = {
  q: string
  choices: string[]
  answer: number
  explanation?: string
}

type Subject = 'korean' | 'math' | 'english' | 'science' | 'social'

type QuizAttempt = {
  questionText: string
  choices: string[]
  answer: number
  selected: number
  correct: boolean
}

type QuizSession = {
  id: string
  subject: Subject
  grade: number
  date: string
  attempts: QuizAttempt[]
  score: number
  total: number
}

// ── 과목 설정 ─────────────────────────────────────────────────
const SUBJECTS: { key: Subject; label: string; emoji: string; color: string; lightBg: string; ring: string; text: string }[] = [
  { key: 'korean',  label: '국어', emoji: '📖', color: 'from-rose-400 to-pink-500',      lightBg: 'bg-rose-50',    ring: 'ring-rose-300',    text: 'text-rose-600' },
  { key: 'math',    label: '수학', emoji: '🔢', color: 'from-blue-400 to-indigo-500',    lightBg: 'bg-blue-50',    ring: 'ring-blue-300',    text: 'text-blue-600' },
  { key: 'english', label: '영어', emoji: '🌏', color: 'from-emerald-400 to-teal-500',   lightBg: 'bg-emerald-50', ring: 'ring-emerald-300',  text: 'text-emerald-600' },
  { key: 'science', label: '과학', emoji: '🔬', color: 'from-violet-400 to-purple-500',  lightBg: 'bg-violet-50',  ring: 'ring-violet-300',   text: 'text-violet-600' },
  { key: 'social',  label: '사회', emoji: '🌍', color: 'from-amber-400 to-orange-500',   lightBg: 'bg-amber-50',   ring: 'ring-amber-300',    text: 'text-amber-600' },
]


// ── 유틸 ─────────────────────────────────────────────────────
function parseGrade(grade?: string): number {
  if (!grade) return 3
  const m = grade.match(/(\d+)/)
  const n = m ? parseInt(m[1]) : 3
  return Math.min(Math.max(n, 1), 6)
}

function shuffleArr<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.abs(Math.sin(seed + i) * 10000)) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function shuffle(arr: number[], seed: number): number[] {
  return shuffleArr(arr, seed) as number[]
}

// ── 이력 관리 ─────────────────────────────────────────────────
function historyKey(childId: string) { return `study_history_${childId}` }

function getHistory(childId: string): QuizSession[] {
  try {
    const raw = localStorage.getItem(historyKey(childId))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveSession(childId: string, session: QuizSession) {
  const history = getHistory(childId)
  history.unshift(session)
  localStorage.setItem(historyKey(childId), JSON.stringify(history.slice(0, 200)))
}

function getWrongQuestions(childId: string, subject: Subject, grade: number): Question[] {
  const history = getHistory(childId).filter(s => s.subject === subject && s.grade === grade)
  const wrongMap = new Map<string, Question>()
  for (const session of history) {
    for (const a of session.attempts) {
      if (!a.correct && !wrongMap.has(a.questionText)) {
        wrongMap.set(a.questionText, { q: a.questionText, choices: a.choices, answer: a.answer })
      }
    }
    // 맞은 문제는 오답 목록에서 제거
    for (const a of session.attempts) {
      if (a.correct) wrongMap.delete(a.questionText)
    }
  }
  return Array.from(wrongMap.values())
}

function getWrongCount(childId: string, subject: Subject, grade: number): number {
  return getWrongQuestions(childId, subject, grade).length
}

// ── 포인트 ───────────────────────────────────────────────────
function getPoints(childId: string): number {
  return parseInt(localStorage.getItem(`study_points_${childId}`) ?? '0', 10)
}
function addPoints(childId: string, pts: number): number {
  const current = getPoints(childId)
  const next = current + pts
  localStorage.setItem(`study_points_${childId}`, String(next))
  return next
}
function spendPoints(childId: string, pts: number): number {
  const current = getPoints(childId)
  const next = Math.max(0, current - pts)
  localStorage.setItem(`study_points_${childId}`, String(next))
  return next
}

// ── 보상 ─────────────────────────────────────────────────────
type Reward = { id: string; name: string; emoji: string; points: number }
type RewardRequest = {
  id: string; childId: string; rewardId: string; rewardName: string
  rewardEmoji: string; points: number; status: 'pending' | 'approved' | 'rejected'
  requestedAt: string; resolvedAt?: string
}

function getRewards(familyId: string): Reward[] {
  try { return JSON.parse(localStorage.getItem(`rewards_${familyId}`) ?? '[]') } catch { return [] }
}
function saveRewards(familyId: string, rewards: Reward[]) {
  localStorage.setItem(`rewards_${familyId}`, JSON.stringify(rewards))
}
function getRequests(childId: string): RewardRequest[] {
  try { return JSON.parse(localStorage.getItem(`reward_requests_${childId}`) ?? '[]') } catch { return [] }
}
function saveRequests(childId: string, requests: RewardRequest[]) {
  localStorage.setItem(`reward_requests_${childId}`, JSON.stringify(requests))
}

// ── 문제 생성 ─────────────────────────────────────────────────
function buildQuestions(
  subject: Subject,
  grade: number,
  seed: number,
  wrongQs: Question[],
  wrongOnly: boolean,
): Question[] {
  if (wrongOnly) return shuffleArr(wrongQs, seed)

  const wrongToInclude = shuffleArr(wrongQs, seed).slice(0, 3)
  const needed = Math.max(10 - wrongToInclude.length, 7)
  let newQs: Question[] = []

  if (subject === 'math') newQs = generateMath(grade, seed, needed)
  else {
    const bank = subject === 'korean' ? koreanBank
      : subject === 'english' ? englishBank
      : subject === 'science' ? scienceBank
      : socialBank
    newQs = shuffleArr(bank[Math.min(grade, 6)] ?? bank[3], seed).slice(0, needed)
  }

  const combined = [...wrongToInclude, ...newQs].slice(0, 10)
  return shuffleArr(combined, seed + 9999)
}

// ── 수학 문제 생성 ────────────────────────────────────────────
function generateMath(grade: number, seed: number, count: number = 10): Question[] {
  const qs: Question[] = []
  const rng = (s: number) => { let x = Math.sin(s + seed * 137.5) * 10000; return Math.abs(x - Math.floor(x)) }
  const ri = (min: number, max: number, s: number) => Math.floor(rng(s) * (max - min + 1)) + min

  for (let i = 0; i < count; i++) {
    const s = seed * 100 + i
    if (grade <= 2) {
      const a = ri(1, 20, s), b = ri(1, 20, s + 1)
      const ops = ['+', '-'], op = ops[ri(0, 1, s + 2)]
      const fa = a > b ? a : b, fb = a < b ? a : b
      const realQ = op === '-' ? `${fa} - ${fb} = ?` : `${a} + ${b} = ?`
      const realAns = op === '-' ? fa - fb : a + b
      const wrong = [realAns + ri(1, 5, s + 3), realAns - ri(1, 5, s + 4), realAns + ri(6, 10, s + 5)].map(w => Math.max(0, w))
      const choices = shuffle([realAns, ...wrong.slice(0, 3)], s)
      qs.push({ q: realQ, choices: choices.map(String), answer: choices.indexOf(realAns) })
    } else if (grade <= 4) {
      const type = ri(0, 1, s)
      if (type === 0) {
        const a = ri(2, 9, s), b = ri(2, 9, s + 1), ans = a * b
        const wrong = [ans + ri(1, 9, s + 3), ans - ri(1, 9, s + 4), ans + ri(10, 20, s + 5)]
        const choices = shuffle([ans, ...wrong.slice(0, 3)], s)
        qs.push({ q: `${a} × ${b} = ?`, choices: choices.map(String), answer: choices.indexOf(ans) })
      } else {
        const b = ri(2, 9, s), c = ri(2, 9, s + 1), a = b * c, ans = c
        const wrong = [ans + ri(1, 4, s + 3), ans - ri(1, 4, s + 4), ans + ri(5, 9, s + 5)].map(w => Math.max(1, w))
        const choices = shuffle([ans, ...wrong.slice(0, 3)], s)
        qs.push({ q: `${a} ÷ ${b} = ?`, choices: choices.map(String), answer: choices.indexOf(ans) })
      }
    } else {
      const type = ri(0, 2, s)
      if (type === 0) {
        const den = ri(2, 8, s), num1 = ri(1, den - 1, s + 1), num2 = ri(1, den - 1, s + 2)
        const ansNum = num1 + num2
        const ans = ansNum >= den ? `${Math.floor(ansNum / den)}과 ${ansNum % den}/${den}` : `${ansNum}/${den}`
        const wrongs = [`${num1 + num2 + 1}/${den}`, `${num1}/${den}`, `${num2 + 1}/${den}`]
        const choices: string[] = shuffleArr([ans, ...wrongs], s)
        qs.push({ q: `${num1}/${den} + ${num2}/${den} = ?`, choices, answer: choices.indexOf(ans) })
      } else if (type === 1) {
        const a = ri(1, 99, s), b = ri(1, 99, s + 1)
        const ans = parseFloat(((a + b) / 10).toFixed(1))
        const wrongs = [ans + 0.1, ans - 0.1, ans + 1.0].map(w => parseFloat(w.toFixed(1)))
        const choices = shuffle([ans, ...wrongs.slice(0, 3)], s)
        qs.push({ q: `${(a / 10).toFixed(1)} + ${(b / 10).toFixed(1)} = ?`, choices: choices.map(String), answer: choices.indexOf(ans) })
      } else {
        const a = ri(2, 9, s), b = ri(2, 9, s + 1), c = ri(2, 9, s + 2), ans = a * b + c
        const wrongs = [ans + ri(1, 5, s + 3), ans - ri(1, 5, s + 4), ans + ri(6, 15, s + 5)]
        const choices = shuffle([ans, ...wrongs.slice(0, 3)], s)
        qs.push({ q: `${a} × ${b} + ${c} = ?`, choices: choices.map(String), answer: choices.indexOf(ans) })
      }
    }
  }
  return qs
}

// ── 국어 문제 은행 ────────────────────────────────────────────
const koreanBank: Record<number, Question[]> = {
  1: [
    { q: '다음 중 받침이 있는 글자는?', choices: ['가', '나', '닭', '도'], answer: 2 },
    { q: '"사과"는 몇 글자인가요?', choices: ['1글자', '2글자', '3글자', '4글자'], answer: 1 },
    { q: '다음 중 모음은?', choices: ['ㄱ', 'ㄴ', 'ㅏ', 'ㄷ'], answer: 2 },
    { q: '"하늘"의 반대말은?', choices: ['땅', '구름', '비', '바람'], answer: 0 },
    { q: '다음 중 동물 이름은?', choices: ['사과', '고양이', '자동차', '연필'], answer: 1 },
    { q: '"크다"의 반대말은?', choices: ['높다', '작다', '많다', '넓다'], answer: 1 },
    { q: '봄 다음에 오는 계절은?', choices: ['겨울', '가을', '여름', '봄'], answer: 2 },
    { q: '"엄마"에서 모음은 몇 개인가요?', choices: ['1개', '2개', '3개', '4개'], answer: 1 },
    { q: '다음 중 과일은?', choices: ['당근', '배추', '딸기', '감자'], answer: 2 },
    { q: '"학교"의 "교"에 있는 자음은?', choices: ['ㄱ', 'ㄴ', 'ㅎ', 'ㅇ'], answer: 0 },
    { q: '"강아지"는 몇 글자인가요?', choices: ['2글자', '3글자', '4글자', '5글자'], answer: 1 },
    { q: '다음 중 색깔을 나타내는 낱말은?', choices: ['크다', '빨갛다', '달리다', '먹다'], answer: 1 },
  ],
  2: [
    { q: '"슬프다"와 뜻이 비슷한 낱말은?', choices: ['기쁘다', '우울하다', '행복하다', '즐겁다'], answer: 1 },
    { q: '다음 중 높임말이 바르게 쓰인 것은?', choices: ['할머니가 밥을 먹다', '할머니가 밥을 드시다', '할머니가 밥을 먹어요', '할머니가 밥을 줘요'], answer: 1 },
    { q: '"빠르다"의 반대말은?', choices: ['크다', '느리다', '높다', '많다'], answer: 1 },
    { q: '문장 부호 "."의 이름은?', choices: ['쉼표', '느낌표', '마침표', '물음표'], answer: 2 },
    { q: '"토끼"는 어떤 종류의 낱말인가요?', choices: ['사람', '동물', '식물', '사물'], answer: 1 },
    { q: '"달리다"의 기본형은?', choices: ['달리', '달림', '달리다', '달렸다'], answer: 2 },
    { q: '"밝다"와 반대 뜻의 낱말은?', choices: ['어둡다', '넓다', '높다', '크다'], answer: 0 },
    { q: '다음 중 계절을 나타내는 낱말은?', choices: ['파도', '가을', '하늘', '구름'], answer: 1 },
    { q: '"예쁘다"를 높임말로 바꾸면?', choices: ['예쁩니다', '예쁘시다', '예뻐요', '예쁜다'], answer: 1 },
    { q: '"나무"가 들어가지 않는 문장은?', choices: ['나무가 자란다', '나무에 꽃이 피었다', '물고기가 헤엄친다', '나무 아래서 쉬었다'], answer: 2 },
    { q: '다음 중 "?"를 써야 하는 문장은?', choices: ['오늘은 맑다', '밥을 먹어라', '날씨가 좋니', '꽃이 피었다'], answer: 2 },
    { q: '"아름답다"와 비슷한 뜻의 낱말은?', choices: ['무섭다', '예쁘다', '슬프다', '빠르다'], answer: 1 },
  ],
  3: [
    { q: '다음 문장에서 주어는? "토끼가 빠르게 달렸다."', choices: ['빠르게', '달렸다', '토끼가', '토끼'], answer: 2 },
    { q: '"위기"의 반의어는?', choices: ['안전', '위험', '불안', '걱정'], answer: 0 },
    { q: '다음 중 의태어는?', choices: ['펑펑', '방글방글', '쨍쨍', '우르르'], answer: 1 },
    { q: '"보다"의 높임말은?', choices: ['본다', '봐요', '보셨다', '보시다'], answer: 3 },
    { q: '다음 중 동사는?', choices: ['예쁜', '크다', '달리다', '파란'], answer: 2 },
    { q: '"일석이조"의 뜻은?', choices: ['하나도 못 얻다', '두 마리 새', '한 가지 일로 두 가지 이득', '돌 하나'], answer: 2 },
    { q: '다음 중 "형용사"는?', choices: ['달리다', '먹다', '아름답다', '놀다'], answer: 2 },
    { q: '문장에서 서술어의 역할은?', choices: ['누가', '무엇을', '어디서', '어떻다'], answer: 3 },
    { q: '"친구에게 편지를 쓰다"에서 목적어는?', choices: ['친구에게', '편지를', '쓰다', '친구'], answer: 1 },
    { q: '다음 중 의성어는?', choices: ['방글방글', '살금살금', '멍멍', '꼬불꼬불'], answer: 2 },
    { q: '"비"가 오는 계절로 가장 많이 연결되는 것은?', choices: ['겨울', '봄', '가을', '여름'], answer: 3 },
    { q: '"손뼉을 치다"에서 "손뼉을"의 문장 성분은?', choices: ['주어', '서술어', '목적어', '부사어'], answer: 2 },
  ],
  4: [
    { q: '"겸손"의 반의어는?', choices: ['교만', '친절', '정직', '용기'], answer: 0 },
    { q: '다음 중 관용어가 맞는 것은?', choices: ['발이 넓다 (친구가 많다)', '손이 크다 (손 사이즈)', '눈이 높다 (키가 크다)', '입이 짧다 (말이 없다)'], answer: 0 },
    { q: '"날씨가 맑다"에서 서술어는?', choices: ['날씨가', '맑다', '날씨', '맑'], answer: 1 },
    { q: '다음 중 속담이 아닌 것은?', choices: ['가는 말이 고와야 오는 말이 곱다', '원숭이도 나무에서 떨어진다', '파란 하늘', '세 살 버릇 여든까지 간다'], answer: 2 },
    { q: '"황당하다"와 비슷한 뜻의 낱말은?', choices: ['당연하다', '어이없다', '훌륭하다', '정확하다'], answer: 1 },
    { q: '다음 중 맞춤법이 올바른 것은?', choices: ['안되', '않돼', '안 돼', '않 돼'], answer: 2 },
    { q: '"이심전심"의 뜻은?', choices: ['두 사람의 마음이 서로 통함', '두 개의 심장', '마음을 전달하다', '심장이 두근거림'], answer: 0 },
    { q: '다음 중 의성어는?', choices: ['흔들흔들', '뾰족뾰족', '쨍그랑', '반짝반짝'], answer: 2 },
    { q: '"소설"과 "시"의 공통점은?', choices: ['운율이 있다', '문학 작품이다', '행과 연으로 이루어진다', '주인공이 반드시 있다'], answer: 1 },
    { q: '다음 중 "-이다"가 붙는 서술격 조사가 쓰인 문장은?', choices: ['꽃이 핀다', '하늘이 파랗다', '이것은 연필이다', '새가 난다'], answer: 2 },
    { q: '"사자성어" 중 어려운 상황을 이겨낸다는 뜻의 말은?', choices: ['유비무환', '고진감래', '금시초문', '청천벽력'], answer: 1 },
    { q: '다음 중 피동문은?', choices: ['고양이가 쥐를 잡았다', '쥐가 고양이에게 잡혔다', '고양이가 달렸다', '쥐가 도망쳤다'], answer: 1 },
  ],
  5: [
    { q: '"역설"이란 무엇인가요?', choices: ['겉으로 보면 모순이지만 속에 진리가 담긴 표현', '반복되는 표현', '비유하는 표현', '강조하는 표현'], answer: 0 },
    { q: '다음 중 "직유법"이 쓰인 문장은?', choices: ['하늘이 울었다', '그는 사자다', '그녀의 눈은 별처럼 빛났다', '바람이 속삭였다'], answer: 2 },
    { q: '다음 중 수동태 문장은?', choices: ['고양이가 쥐를 잡았다', '쥐가 고양이에게 잡혔다', '쥐가 달아났다', '고양이가 뛰었다'], answer: 1 },
    { q: '다음 중 "은유법"이 쓰인 문장은?', choices: ['산처럼 든든하다', '그는 나의 등불이다', '달이 환하게 빛난다', '꽃이 활짝 피었다'], answer: 1 },
    { q: '"문학의 3요소"에 해당하지 않는 것은?', choices: ['운율', '주제', '구성', '인물'], answer: 0 },
    { q: '다음 중 피동 접미사가 쓰인 것은?', choices: ['먹다', '잡히다', '달리다', '웃다'], answer: 1 },
    { q: '"자업자득"의 뜻은?', choices: ['남이 도와줘서 성공', '자기 행동의 결과를 자기가 받음', '여러 사람이 함께 함', '하늘이 도와줌'], answer: 1 },
    { q: '다음 중 "풍유법(알레고리)"이란?', choices: ['직접적으로 비유', '사물이나 인물을 통해 다른 뜻을 나타냄', '반복으로 강조', '감탄으로 표현'], answer: 1 },
    { q: '"복잡하다"의 한자 표기로 가장 알맞은 것은?', choices: ['單純', '複雜', '簡單', '平凡'], answer: 1 },
    { q: '"이심전심(以心傳心)"의 한자 중 "전(傳)"의 뜻은?', choices: ['마음', '전하다', '두 개', '사람'], answer: 1 },
    { q: '시의 "운율"이란 무엇인가요?', choices: ['시의 주제', '시의 리듬감', '시의 길이', '시의 등장인물'], answer: 1 },
    { q: '소설의 3요소가 아닌 것은?', choices: ['주제', '구성', '문체', '운율'], answer: 3 },
  ],
  6: [
    { q: '"아이러니"와 가장 비슷한 의미의 수사법은?', choices: ['과장법', '반어법', '의인법', '설의법'], answer: 1 },
    { q: '"사필귀정(事必歸正)"의 뜻은?', choices: ['모든 일은 반드시 바른 길로 돌아간다', '일이 복잡하다', '사람은 반드시 죽는다', '노력하면 성공한다'], answer: 0 },
    { q: '다음 중 "경어법"이 올바르게 쓰인 것은?', choices: ['선생님이 오다', '선생님께서 오셨습니다', '선생님이 왔어요', '선생님 와요'], answer: 1 },
    { q: '"오 헨리"식 결말이란?', choices: ['해피엔딩', '예상치 못한 반전 결말', '비극적 결말', '열린 결말'], answer: 1 },
    { q: '"설의법"이란?', choices: ['물어보는 형식으로 강조하는 법', '사물을 사람처럼 표현', '직접 비유', '반대로 표현'], answer: 0 },
    { q: '다음 중 "복문(複文)"은?', choices: ['하늘이 맑다', '새가 날아갔다', '비가 오니 우산을 가져가라', '꽃이 피었다'], answer: 2 },
    { q: '"군계일학"의 뜻은?', choices: ['닭이 무리 지어 다님', '뛰어난 한 사람', '학이 날아감', '군대에서 일하다'], answer: 1 },
    { q: '다음 중 "간접화법"으로 바르게 전환된 것은?', choices: ['"나는 학교에 간다"→그는 학교에 간다고 했다', '"나는 행복하다"→나는 행복하다', '"밥을 먹어라"→밥 먹어라', '"왔니?"→왔어'], answer: 0 },
    { q: '다음 중 문장 성분이 나머지와 다른 것은?', choices: ['학교에서', '빠르게', '연필로', '공원에'], answer: 1 },
    { q: '다음 중 "현재진행형"으로 바르게 쓰인 것은?', choices: ['달렸다', '달리고 있다', '달릴 것이다', '달렸을 것이다'], answer: 1 },
    { q: '"수미상관"이란?', choices: ['처음과 끝이 같은 시구로 구성', '반복으로 강조', '비유로 표현', '역설로 표현'], answer: 0 },
    { q: '기행문에 반드시 들어가는 요소가 아닌 것은?', choices: ['여정', '감상', '견문', '운율'], answer: 3 },
  ],
}

// ── 영어 문제 은행 ────────────────────────────────────────────
const englishBank: Record<number, Question[]> = {
  1: [
    { q: '다음 그림과 맞는 영어 단어는? 🐶', choices: ['cat', 'dog', 'bird', 'fish'], answer: 1 },
    { q: '"사과"를 영어로 하면?', choices: ['banana', 'orange', 'apple', 'grape'], answer: 2 },
    { q: '"안녕하세요"를 영어로 하면?', choices: ['Goodbye', 'Thank you', 'Hello', 'Sorry'], answer: 2 },
    { q: '"빨간색"을 영어로 하면?', choices: ['blue', 'green', 'red', 'yellow'], answer: 2 },
    { q: '"1, 2, 3" 다음에 오는 숫자는?', choices: ['five', 'four', 'six', 'three'], answer: 1 },
    { q: '"고양이"를 영어로 하면?', choices: ['dog', 'cat', 'cow', 'pig'], answer: 1 },
    { q: '"감사합니다"를 영어로 하면?', choices: ['Hello', 'Sorry', 'Thank you', 'Goodbye'], answer: 2 },
    { q: '"파란색"을 영어로 하면?', choices: ['red', 'green', 'yellow', 'blue'], answer: 3 },
    { q: '"어머니"를 영어로 하면?', choices: ['father', 'mother', 'sister', 'brother'], answer: 1 },
    { q: '"학교"를 영어로 하면?', choices: ['house', 'school', 'park', 'store'], answer: 1 },
    { q: '"강아지"를 영어로 하면?', choices: ['cat', 'rabbit', 'puppy', 'bird'], answer: 2 },
    { q: '"노란색"을 영어로 하면?', choices: ['red', 'blue', 'yellow', 'green'], answer: 2 },
  ],
  2: [
    { q: '"나는 학생이다"를 영어로 하면?', choices: ['I am a teacher.', 'I am a student.', 'He is a student.', 'She is a teacher.'], answer: 1 },
    { q: 'What color is the sky?', choices: ['red', 'green', 'blue', 'yellow'], answer: 2 },
    { q: '"월요일"을 영어로 하면?', choices: ['Sunday', 'Tuesday', 'Monday', 'Friday'], answer: 2 },
    { q: '"행복한"을 영어로 하면?', choices: ['sad', 'angry', 'happy', 'tired'], answer: 2 },
    { q: 'How many days are in a week?', choices: ['5', '6', '7', '8'], answer: 2 },
    { q: '"책"을 영어로 하면?', choices: ['pen', 'book', 'bag', 'desk'], answer: 1 },
    { q: '"I have two ___ ."에 알맞은 말은?', choices: ['apple', 'apples', 'a apple', 'an apples'], answer: 1 },
    { q: '"크다"를 영어로 하면?', choices: ['small', 'big', 'old', 'new'], answer: 1 },
    { q: '"생일 축하해"를 영어로 하면?', choices: ['Good morning', 'Happy birthday', 'Good night', 'See you later'], answer: 1 },
    { q: '"손"을 영어로 하면?', choices: ['foot', 'hand', 'arm', 'leg'], answer: 1 },
    { q: '"사자"를 영어로 하면?', choices: ['tiger', 'lion', 'bear', 'wolf'], answer: 1 },
    { q: '"일요일"을 영어로 하면?', choices: ['Monday', 'Saturday', 'Sunday', 'Friday'], answer: 2 },
  ],
  3: [
    { q: 'Which is the correct sentence?', choices: ['She go to school.', 'She goes to school.', 'She gos to school.', 'She going to school.'], answer: 1 },
    { q: '"어제"를 영어로 하면?', choices: ['today', 'tomorrow', 'yesterday', 'now'], answer: 2 },
    { q: 'What is the past tense of "eat"?', choices: ['eated', 'ate', 'eating', 'eats'], answer: 1 },
    { q: '"봄"을 영어로 하면?', choices: ['summer', 'fall', 'spring', 'winter'], answer: 2 },
    { q: 'Choose the correct word: "I ___ a dog."', choices: ['has', 'have', 'had', 'having'], answer: 1 },
    { q: '"병원"을 영어로 하면?', choices: ['school', 'library', 'hospital', 'store'], answer: 2 },
    { q: 'What is the plural of "child"?', choices: ['childs', 'childes', 'children', 'childrens'], answer: 2 },
    { q: '"나는 사과를 좋아한다"를 영어로?', choices: ['I likes apples.', 'I like apple.', 'I like apples.', 'I liking apples.'], answer: 2 },
    { q: '"크다" → "더 크다"를 영어로 비교급으로 하면?', choices: ['more big', 'bigger', 'most big', 'big'], answer: 1 },
    { q: 'Which sentence uses "and" correctly?', choices: ['I and she', 'She and I are friends.', 'And I she go', 'Friends and are we'], answer: 1 },
    { q: '"도서관"을 영어로 하면?', choices: ['museum', 'hospital', 'library', 'park'], answer: 2 },
    { q: 'What is the past tense of "go"?', choices: ['goed', 'gone', 'went', 'goes'], answer: 2 },
  ],
  4: [
    { q: 'What is the superlative of "good"?', choices: ['gooder', 'better', 'best', 'goodest'], answer: 2 },
    { q: '"그는 어제 축구를 했다"를 영어로?', choices: ['He plays soccer yesterday.', 'He played soccer yesterday.', 'He play soccer yesterday.', 'He playing soccer yesterday.'], answer: 1 },
    { q: 'Choose the correct sentence.', choices: ["She don't like coffee.", "She doesn't likes coffee.", "She doesn't like coffee.", 'She not like coffee.'], answer: 2 },
    { q: '"가장 긴"을 영어로 최상급으로 하면?', choices: ['longer', 'most long', 'longest', 'more long'], answer: 2 },
    { q: 'What does "However" mean?', choices: ['그러므로', '게다가', '그러나', '따라서'], answer: 2 },
    { q: '"그들은 지금 공부하고 있다"를 영어로?', choices: ['They study now.', 'They are studying now.', 'They studied now.', 'They studies now.'], answer: 1 },
    { q: '"환경"을 영어로 하면?', choices: ['environment', 'energy', 'equipment', 'emotion'], answer: 0 },
    { q: 'Which is the passive voice?', choices: ['The cat caught the mouse.', 'The mouse was caught by the cat.', 'The mouse catches the cat.', 'The cat is catching.'], answer: 1 },
    { q: '"I have lived here ___ 2010."에 알맞은 전치사는?', choices: ['for', 'since', 'at', 'on'], answer: 1 },
    { q: '"도서관"을 영어로 하면?', choices: ['museum', 'library', 'hospital', 'stadium'], answer: 1 },
    { q: '"아름다운"을 영어로 하면?', choices: ['ugly', 'beautiful', 'smart', 'fast'], answer: 1 },
    { q: 'What does "Therefore" mean?', choices: ['그러나', '게다가', '그러므로', '하지만'], answer: 2 },
  ],
  5: [
    { q: 'Choose the correct relative pronoun: "The boy ___ won the prize is my friend."', choices: ['which', 'what', 'who', 'whom'], answer: 2 },
    { q: '"만약 내가 새라면 날 수 있을 텐데"를 영어로 가정법으로 하면?', choices: ['If I am a bird, I can fly.', 'If I were a bird, I could fly.', 'If I be a bird, I fly.', 'If I was a bird, I will fly.'], answer: 1 },
    { q: 'What does "perseverance" mean?', choices: ['포기', '인내', '용기', '지식'], answer: 1 },
    { q: '"She told me that she ___ tired." 빈칸에 알맞은 것은?', choices: ['is', 'was', 'were', 'be'], answer: 1 },
    { q: 'Which sentence uses the present perfect correctly?', choices: ['I have saw the movie.', 'I have seen the movie.', 'I seen the movie.', 'I had see the movie.'], answer: 1 },
    { q: '"영향을 미치다"를 영어로 하면?', choices: ['affect', 'effect', 'infect', 'reflect'], answer: 0 },
    { q: 'Choose the correct conjunction: "I studied hard ___ I passed the exam."', choices: ['but', 'or', 'so', 'nor'], answer: 2 },
    { q: '"독립적인"을 영어로 하면?', choices: ['dependent', 'independent', 'interdependent', 'codependent'], answer: 1 },
    { q: 'What is the correct reported speech? He said, "I am happy."', choices: ['He said that he is happy.', 'He said that he was happy.', 'He said that I am happy.', 'He said that I was happy.'], answer: 1 },
    { q: '"The book ___ on the table was interesting." 빈칸에 알맞은 것은?', choices: ['lay', 'laying', 'laid', 'lain'], answer: 0 },
    { q: 'What does "approximately" mean?', choices: ['정확히', '대략', '완전히', '빠르게'], answer: 1 },
    { q: 'Choose the correct word: "The news ___ surprising."', choices: ['were', 'are', 'was', 'be'], answer: 2 },
  ],
  6: [
    { q: '"Despite"가 들어간 올바른 문장은?', choices: ['Despite of the rain, we went out.', 'Despite the rain, we went out.', 'Despite raining, we went out.', 'Despite it rained, we went out.'], answer: 1 },
    { q: '"The data ___ analyzed carefully." 올바른 수동태는?', choices: ['was', 'were', 'is', 'are'], answer: 1 },
    { q: 'Choose the word with the correct prefix for "not possible":', choices: ['unpossible', 'inpossible', 'impossible', 'dispossible'], answer: 2 },
    { q: '"She is used to ___ early." 빈칸에 알맞은 것은?', choices: ['wake', 'waking', 'woke', 'have woken'], answer: 1 },
    { q: '"논리적인"을 영어로 하면?', choices: ['logical', 'physical', 'critical', 'ethical'], answer: 0 },
    { q: 'Which is a complex sentence?', choices: ['I ran.', 'I ran and she walked.', 'Although it rained, we played outside.', 'Run!'], answer: 2 },
    { q: '"그것이 사실이었다면 좋았을 텐데"를 영어로?', choices: ['I wish it is true.', 'I wish it were true.', 'I wish it was true.', 'I wish it will be true.'], answer: 1 },
    { q: 'What does "ambiguous" mean?', choices: ['명확한', '모호한', '강력한', '독창적인'], answer: 1 },
    { q: '"Not only ___ he arrive late, but he also forgot his homework."', choices: ['did', 'does', 'had', 'has'], answer: 0 },
    { q: '"The more you practice, ___ you get." 빈칸에 알맞은 것은?', choices: ['better', 'the better', 'much better', 'more better'], answer: 1 },
    { q: 'What does "consequently" mean?', choices: ['그러나', '결과적으로', '반면에', '게다가'], answer: 1 },
    { q: '"Whom did you call?" 이 문장에서 "whom"의 역할은?', choices: ['주어', '목적어', '보어', '부사'], answer: 1 },
  ],
}

// ── 과학 문제 은행 ────────────────────────────────────────────
const scienceBank: Record<number, Question[]> = {
  1: [
    { q: '다음 중 식물이 아닌 것은?', choices: ['장미', '소나무', '강아지', '해바라기'], answer: 2 },
    { q: '봄에 피는 꽃은?', choices: ['국화', '진달래', '코스모스', '눈꽃'], answer: 1 },
    { q: '다음 중 동물이 아닌 것은?', choices: ['고양이', '사자', '사과나무', '독수리'], answer: 2 },
    { q: '비가 내린 후 하늘에 뜨는 것은?', choices: ['구름', '무지개', '번개', '태양'], answer: 1 },
    { q: '식물이 자라려면 무엇이 필요한가요?', choices: ['어둠과 소금물', '햇빛과 물', '얼음과 모래', '불과 바람'], answer: 1 },
    { q: '다음 중 날 수 있는 동물은?', choices: ['개구리', '고양이', '참새', '물고기'], answer: 2 },
    { q: '밤에 하늘에 빛나는 것은?', choices: ['태양', '별', '구름', '무지개'], answer: 1 },
    { q: '물이 얼면 어떻게 되나요?', choices: ['수증기가 된다', '얼음이 된다', '흙이 된다', '불이 된다'], answer: 1 },
    { q: '다음 중 겨울에 볼 수 있는 것은?', choices: ['진달래', '수박', '눈사람', '모기'], answer: 2 },
    { q: '개구리는 어디에 사나요?', choices: ['사막', '연못 주변', '극지방', '불 속'], answer: 1 },
    { q: '햇빛이 없으면 식물은?', choices: ['더 빨리 자란다', '자라기 어렵다', '변화 없다', '꽃이 더 많이 핀다'], answer: 1 },
    { q: '다음 중 물속에 사는 동물은?', choices: ['독수리', '뱀', '붕어', '다람쥐'], answer: 2 },
  ],
  2: [
    { q: '식물이 광합성을 할 때 필요한 것이 아닌 것은?', choices: ['햇빛', '물', '이산화탄소', '소금'], answer: 3 },
    { q: '동물이 겨울잠을 자는 이유는?', choices: ['먹이가 부족하고 추워서', '여름이 싫어서', '비가 와서', '태양이 뜨거워서'], answer: 0 },
    { q: '다음 중 초식동물은?', choices: ['사자', '호랑이', '토끼', '늑대'], answer: 2 },
    { q: '뼈가 없는 동물은?', choices: ['개구리', '뱀', '지렁이', '참새'], answer: 2 },
    { q: '비가 내리는 과정에서 구름은 무엇으로 만들어지나요?', choices: ['먼지', '작은 물방울', '가스', '연기'], answer: 1 },
    { q: '씨앗에서 싹이 트는 것을 무엇이라고 하나요?', choices: ['광합성', '발아', '증산', '호흡'], answer: 1 },
    { q: '다음 중 알을 낳는 동물은?', choices: ['고양이', '소', '닭', '개'], answer: 2 },
    { q: '물이 끓으면 어떻게 되나요?', choices: ['얼음이 된다', '수증기가 된다', '흙이 된다', '색깔이 변한다'], answer: 1 },
    { q: '다음 중 잎이 넓은 나무는?', choices: ['소나무', '단풍나무', '전나무', '잣나무'], answer: 1 },
    { q: '자석에 붙는 물건은?', choices: ['나무', '종이', '철', '유리'], answer: 2 },
    { q: '달팽이의 특징은?', choices: ['날개가 있다', '껍데기를 가지고 있다', '지느러미가 있다', '털이 많다'], answer: 1 },
    { q: '무지개는 몇 가지 색인가요?', choices: ['5가지', '6가지', '7가지', '8가지'], answer: 2 },
  ],
  3: [
    { q: '식물이 광합성으로 만드는 것은?', choices: ['산소와 포도당', '이산화탄소와 물', '질소와 수소', '단백질과 지방'], answer: 0 },
    { q: '지구의 표면 중 바다가 차지하는 비율은?', choices: ['약 30%', '약 50%', '약 70%', '약 90%'], answer: 2 },
    { q: '다음 중 곤충의 특징은?', choices: ['다리가 8개', '다리가 6개', '뼈가 없다', '날개가 반드시 있다'], answer: 1 },
    { q: '물질의 세 가지 상태가 아닌 것은?', choices: ['고체', '액체', '기체', '열체'], answer: 3 },
    { q: '지구에서 태양까지의 거리는?', choices: ['약 1억 5천만 km', '약 1만 km', '약 10억 km', '약 3억 km'], answer: 0 },
    { q: '자석의 같은 극끼리는?', choices: ['서로 당긴다', '서로 밀어낸다', '아무 반응이 없다', '합쳐진다'], answer: 1 },
    { q: '공기의 주성분은?', choices: ['산소', '이산화탄소', '질소', '수소'], answer: 2 },
    { q: '달이 스스로 빛을 내지 못하는 이유는?', choices: ['너무 작아서', '항성이 아니어서', '지구에 가려서', '물이 있어서'], answer: 1 },
    { q: '사람 몸에서 혈액을 순환시키는 기관은?', choices: ['폐', '간', '심장', '신장'], answer: 2 },
    { q: '화석은 어떻게 만들어지나요?', choices: ['화산 폭발로', '생물이 퇴적층에 묻혀서', '빙하가 녹아서', '운석이 떨어져서'], answer: 1 },
    { q: '소리가 전달되려면 무엇이 필요한가요?', choices: ['빛', '물질(매질)', '자석', '전기'], answer: 1 },
    { q: '태양계에서 가장 큰 행성은?', choices: ['토성', '지구', '목성', '화성'], answer: 2 },
  ],
  4: [
    { q: '식물의 뿌리 기능이 아닌 것은?', choices: ['물 흡수', '지지 역할', '양분 저장', '광합성'], answer: 3 },
    { q: '용해란 무엇인가요?', choices: ['물질이 타는 것', '물질이 물에 녹는 것', '물질이 굳는 것', '물질이 증발하는 것'], answer: 1 },
    { q: '전기 회로에서 전구에 불이 켜지려면?', choices: ['회로가 끊겨야 한다', '회로가 연결되어야 한다', '자석이 필요하다', '물이 필요하다'], answer: 1 },
    { q: '빛이 프리즘을 통과하면?', choices: ['하나의 색이 된다', '여러 색으로 나뉜다', '빛이 사라진다', '빨간색만 나온다'], answer: 1 },
    { q: '다음 중 화산 활동으로 만들어지지 않는 것은?', choices: ['용암', '화산재', '퇴적암', '현무암'], answer: 2 },
    { q: '사람 몸에서 산소를 교환하는 기관은?', choices: ['심장', '간', '폐', '위'], answer: 2 },
    { q: '물이 증발하면 어디로 가나요?', choices: ['땅속으로', '공기 중으로', '바다로', '구름 속으로만'], answer: 1 },
    { q: '힘의 단위는?', choices: ['kg', 'N(뉴턴)', 'cm', 'L'], answer: 1 },
    { q: '다음 중 변온동물은?', choices: ['곰', '독수리', '도마뱀', '토끼'], answer: 2 },
    { q: '전기를 절약하는 방법이 아닌 것은?', choices: ['LED 전구 사용', '사용하지 않는 전기 끄기', '에어컨 최대로 켜기', '가전제품 대기전력 차단'], answer: 2 },
    { q: '식물의 잎에서 물이 수증기로 빠져나가는 현상은?', choices: ['광합성', '증산 작용', '호흡', '발아'], answer: 1 },
    { q: '지층에서 아래에 있는 지층일수록?', choices: ['더 나중에 쌓였다', '더 오래 전에 쌓였다', '시간과 관계없다', '더 단단하다'], answer: 1 },
  ],
  5: [
    { q: '세포의 기본 구성 요소가 아닌 것은?', choices: ['세포막', '세포핵', '미토콘드리아', '혈관'], answer: 3 },
    { q: '식물 세포에만 있고 동물 세포에 없는 것은?', choices: ['세포막', '핵', '세포벽', '미토콘드리아'], answer: 2 },
    { q: '광합성이 일어나는 세포 소기관은?', choices: ['미토콘드리아', '엽록체', '핵', '세포막'], answer: 1 },
    { q: '산성비의 원인이 아닌 것은?', choices: ['자동차 배기가스', '공장 매연', '산소', '황산화물'], answer: 2 },
    { q: '지구 온난화의 주요 원인 기체는?', choices: ['산소', '질소', '이산화탄소', '수소'], answer: 2 },
    { q: '물질을 태울 때 필요한 것은?', choices: ['물과 빛', '산소와 발화점 이상의 온도', '이산화탄소와 물', '질소와 열'], answer: 1 },
    { q: '빛의 속도는 약 얼마인가요?', choices: ['초속 약 30만 km', '초속 약 3만 km', '초속 약 300km', '초속 약 340m'], answer: 0 },
    { q: '지구가 자전하는 방향은?', choices: ['서쪽에서 동쪽', '동쪽에서 서쪽', '남쪽에서 북쪽', '북쪽에서 남쪽'], answer: 0 },
    { q: '혈액의 구성 성분이 아닌 것은?', choices: ['적혈구', '백혈구', '혈소판', '뉴런'], answer: 3 },
    { q: '생태계에서 생산자에 해당하는 것은?', choices: ['사자', '토끼', '풀', '곰팡이'], answer: 2 },
    { q: '물질의 상태 변화 중 "응결"이란?', choices: ['기체→고체', '기체→액체', '액체→기체', '고체→액체'], answer: 1 },
    { q: '뼈와 뼈가 연결되는 부분을?', choices: ['근육', '관절', '힘줄', '연골'], answer: 1 },
  ],
  6: [
    { q: '유전자(DNA)를 가지고 있는 세포 소기관은?', choices: ['미토콘드리아', '세포막', '핵', '엽록체'], answer: 2 },
    { q: '생태계 먹이사슬에서 분해자의 역할은?', choices: ['광합성으로 양분 생산', '죽은 생물을 분해해 무기물로 환원', '다른 동물을 잡아먹음', '태양에너지 저장'], answer: 1 },
    { q: '달의 공전 주기는 약 얼마인가요?', choices: ['7일', '15일', '29.5일', '365일'], answer: 2 },
    { q: '화학 변화의 예가 아닌 것은?', choices: ['철이 녹슮', '나무가 탐', '소금이 물에 녹음', '음식이 썩음'], answer: 2 },
    { q: '전류가 흐를 때 발생하는 힘(전자기력)을 이용한 기구는?', choices: ['전구', '전동기(모터)', '저항', '배터리'], answer: 1 },
    { q: '뉴턴의 제3법칙(작용 반작용)의 예는?', choices: ['책이 책상에 놓여 있다', '로켓이 가스를 뒤로 분사해 앞으로 나아간다', '공이 굴러간다', '물이 위에서 아래로 흐른다'], answer: 1 },
    { q: '빛의 굴절이 일어나는 이유는?', choices: ['빛이 직진하기 때문', '다른 매질을 지날 때 속도가 달라지기 때문', '자석 때문', '공기가 없기 때문'], answer: 1 },
    { q: '원자핵을 구성하는 입자는?', choices: ['전자와 중성자', '양성자와 중성자', '전자와 양성자', '중성자와 쿼크'], answer: 1 },
    { q: '판 구조론에서 지진이 자주 발생하는 지역은?', choices: ['대륙 중앙부', '판의 경계 부분', '해양의 중앙', '극지방'], answer: 1 },
    { q: '생물 분류의 기본 단위는?', choices: ['계', '문', '종', '강'], answer: 2 },
    { q: '항생제가 효과가 없는 감염은?', choices: ['세균 감염', '바이러스 감염', '곰팡이 감염', '기생충 감염'], answer: 1 },
    { q: '온실효과의 원리는?', choices: ['태양열이 지구로 들어오지 못함', '지구 복사열이 대기에 갇혀 지구가 따뜻해짐', '바다가 열을 흡수함', '북극 얼음이 녹음'], answer: 1 },
  ],
}

// ── 사회 문제 은행 ────────────────────────────────────────────
const socialBank: Record<number, Question[]> = {
  1: [
    { q: '우리 가족을 이루는 사람들로 알맞지 않은 것은?', choices: ['아빠', '엄마', '이웃집 아저씨', '할머니'], answer: 2 },
    { q: '우리가 사는 곳을 무엇이라고 하나요?', choices: ['학교', '동네(마을)', '병원', '시장'], answer: 1 },
    { q: '교통 신호등에서 초록불은?', choices: ['멈추세요', '건너세요', '조심하세요', '뛰세요'], answer: 1 },
    { q: '쓰레기를 버릴 때 올바른 방법은?', choices: ['아무 곳에나 버린다', '분리수거를 한다', '땅에 묻는다', '강에 버린다'], answer: 1 },
    { q: '우리 동네에서 불이 났을 때 신고하는 곳은?', choices: ['112', '119', '114', '1330'], answer: 1 },
    { q: '도서관에서 지켜야 할 예절은?', choices: ['크게 떠든다', '책을 던진다', '조용히 한다', '뛰어다닌다'], answer: 2 },
    { q: '우리나라의 국기는?', choices: ['성조기', '일장기', '태극기', '유니언잭'], answer: 2 },
    { q: '우리나라의 수도는?', choices: ['부산', '서울', '대구', '인천'], answer: 1 },
    { q: '가족 중 나보다 먼저 태어난 형제를 부르는 말(남자 아이 기준)은?', choices: ['남동생', '누나', '형', '여동생'], answer: 2 },
    { q: '학교에서 선생님 말씀을 들을 때 바른 자세는?', choices: ['옆 친구와 이야기', '바른 자세로 집중', '장난치기', '엎드리기'], answer: 1 },
    { q: '우리 동네 사람들을 도와주는 사람이 아닌 것은?', choices: ['의사', '소방관', '경찰관', '외계인'], answer: 3 },
    { q: '음식을 먹을 때 기본 예절은?', choices: ['돌아다니면서 먹기', '바른 자세로 앉아서 먹기', '텔레비전만 보면서 먹기', '빨리 먹고 나가기'], answer: 1 },
  ],
  2: [
    { q: '우리 고장의 문제를 해결하는 기관은?', choices: ['학교', '지방 자치 단체(시청/군청)', '병원', '마트'], answer: 1 },
    { q: '지도에서 높은 산은 어떤 색으로 표시하나요?', choices: ['파란색', '초록색', '갈색', '흰색'], answer: 2 },
    { q: '나라와 나라 사이의 경계를 무엇이라고 하나요?', choices: ['강', '국경', '도로', '바다'], answer: 1 },
    { q: '옛날 사람들이 물건을 사고팔던 곳은?', choices: ['공장', '시장', '학교', '병원'], answer: 1 },
    { q: '우리나라 전통 명절 중 음력 8월 15일은?', choices: ['설날', '추석', '단오', '한식'], answer: 1 },
    { q: '지도에서 방향을 알려주는 표시는?', choices: ['등고선', '범례', '방위표', '축척'], answer: 2 },
    { q: '우리나라의 문화유산이 아닌 것은?', choices: ['경복궁', '석굴암', '에펠탑', '한복'], answer: 2 },
    { q: '공공장소에서 지켜야 할 규칙이 아닌 것은?', choices: ['줄을 잘 선다', '쓰레기를 아무데나 버린다', '조용히 한다', '차례를 지킨다'], answer: 1 },
    { q: '우리나라 명절 설날에 하는 풍습은?', choices: ['성묘하기', '차례 지내고 세배하기', '단오장 차리기', '연등 달기'], answer: 1 },
    { q: '우리 고장의 자연환경 중 강의 역할이 아닌 것은?', choices: ['식수원', '농업용수', '홍수 발생', '교통로'], answer: 2 },
    { q: '마을 사람들이 모두 사용하는 장소를 "공공시설"이라 한다. 공공시설은?', choices: ['개인 주택', '도서관', '개인 상점', '개인 농장'], answer: 1 },
    { q: '지도의 축척이 1:10000이면 지도에서 1cm는 실제로?', choices: ['10m', '100m', '1000m', '10000m'], answer: 1 },
  ],
  3: [
    { q: '민주주의의 기본 원칙이 아닌 것은?', choices: ['국민 주권', '다수결 원칙', '한 사람의 독재', '기본권 보장'], answer: 2 },
    { q: '조선을 세운 왕은?', choices: ['세종대왕', '이성계(태조)', '광개토대왕', '왕건'], answer: 1 },
    { q: '우리나라 헌법에서 규정하는 국민의 의무가 아닌 것은?', choices: ['납세의 의무', '국방의 의무', '교육의 의무', '여행의 의무'], answer: 3 },
    { q: '지역의 대표를 선출하는 민주주의 방법은?', choices: ['추첨', '선거', '지명', '세습'], answer: 1 },
    { q: '고려를 세운 왕은?', choices: ['이성계', '왕건', '주몽', '온조'], answer: 1 },
    { q: '세계 지도에서 적도는 어디를 지나나요?', choices: ['북극과 남극', '지구의 가운데 부분', '유럽 대륙', '아시아만'], answer: 1 },
    { q: '3.1 운동이 일어난 해는?', choices: ['1910년', '1919년', '1945년', '1950년'], answer: 1 },
    { q: '법을 만드는 우리나라의 기관은?', choices: ['대법원', '청와대', '국회', '정부'], answer: 2 },
    { q: '다음 중 1차 산업에 해당하는 것은?', choices: ['자동차 제조', '쌀 농사', '은행 업무', '인터넷 서비스'], answer: 1 },
    { q: '한글을 창제한 왕은?', choices: ['태조', '세종대왕', '광개토대왕', '영조'], answer: 1 },
    { q: '다음 중 열대 기후의 특징은?', choices: ['일년 내내 춥다', '사계절이 뚜렷하다', '일년 내내 덥고 비가 많다', '건조하고 모래바람이 분다'], answer: 2 },
    { q: '유럽에서 가장 큰 나라는?', choices: ['영국', '프랑스', '러시아', '독일'], answer: 2 },
  ],
  4: [
    { q: '대한민국 임시정부가 수립된 곳은?', choices: ['평양', '상하이', '도쿄', '워싱턴'], answer: 1 },
    { q: '우리나라 정부의 3권 분립 중 "사법권"을 가진 기관은?', choices: ['국회', '대통령(행정부)', '대법원(법원)', '지방 자치 단체'], answer: 2 },
    { q: '6.25 전쟁이 시작된 해는?', choices: ['1945년', '1948년', '1950년', '1953년'], answer: 2 },
    { q: '선거의 4대 원칙이 아닌 것은?', choices: ['보통 선거', '직접 선거', '비밀 선거', '의무 선거'], answer: 3 },
    { q: '다음 중 무역을 하는 이유가 아닌 것은?', choices: ['부족한 자원을 얻기 위해', '다른 나라 문화를 없애기 위해', '잉여 생산물을 팔기 위해', '더 저렴한 상품을 얻기 위해'], answer: 1 },
    { q: '광복절은 언제인가요?', choices: ['3월 1일', '8월 15일', '10월 3일', '10월 9일'], answer: 1 },
    { q: '삼국시대의 세 나라가 아닌 것은?', choices: ['고구려', '백제', '신라', '조선'], answer: 3 },
    { q: '우리나라 최고의 법은?', choices: ['민법', '형법', '헌법', '교육법'], answer: 2 },
    { q: '인권이란 무엇인가요?', choices: ['나라가 허가한 권리', '모든 사람이 태어나면서부터 가지는 기본 권리', '성인만 가지는 권리', '돈이 있는 사람만 가지는 권리'], answer: 1 },
    { q: '국회의원 선거는 몇 년에 한 번 치러지나요?', choices: ['2년', '4년', '5년', '6년'], answer: 1 },
    { q: '세계 4대 문명 발상지가 아닌 것은?', choices: ['메소포타미아', '이집트', '인더스', '유럽'], answer: 3 },
    { q: '우리나라 대통령 임기는?', choices: ['3년', '4년', '5년', '6년'], answer: 2 },
  ],
  5: [
    { q: '조선 시대 신분 제도에서 가장 높은 계층은?', choices: ['평민', '천민', '양반', '중인'], answer: 2 },
    { q: '"임진왜란"이 일어난 해는?', choices: ['1392년', '1592년', '1678년', '1776년'], answer: 1 },
    { q: '세계 인구가 가장 많은 대륙은?', choices: ['유럽', '아프리카', '아시아', '아메리카'], answer: 2 },
    { q: '지속 가능한 발전이란?', choices: ['경제만 성장하면 된다', '미래 세대를 고려한 현재의 발전', '환경만 보호하면 된다', '빠른 성장이 최우선'], answer: 1 },
    { q: '세계 무역 기구(WTO)의 역할은?', choices: ['군사 협력', '국제 무역 규칙 관리', '우주 탐사', '환경 보호'], answer: 1 },
    { q: '갑오개혁이 일어난 해는?', choices: ['1876년', '1884년', '1894년', '1910년'], answer: 2 },
    { q: '다음 중 세계 3대 종교가 아닌 것은?', choices: ['기독교', '불교', '이슬람교', '유교'], answer: 3 },
    { q: 'UN(국제연합)이 설립된 목적은?', choices: ['경제 발전', '국제 평화와 안전 유지', '스포츠 발전', '과학 연구'], answer: 1 },
    { q: '수출이 수입보다 많은 상태를?', choices: ['무역 적자', '무역 흑자', '무역 균형', '경기 침체'], answer: 1 },
    { q: '동학 농민 운동이 일어난 해는?', choices: ['1862년', '1876년', '1894년', '1919년'], answer: 2 },
    { q: '세계에서 가장 넓은 나라는?', choices: ['미국', '중국', '러시아', '캐나다'], answer: 2 },
    { q: '국제 앰네스티의 활동 분야는?', choices: ['경제 개발', '인권 보호', '환경 보호', '스포츠'], answer: 1 },
  ],
  6: [
    { q: '대한민국 정부 수립일은?', choices: ['1945년 8월 15일', '1948년 8월 15일', '1950년 6월 25일', '1953년 7월 27일'], answer: 1 },
    { q: '남북 분단의 직접적 원인은?', choices: ['임진왜란', '6.25 전쟁', '일제 강점기 후 미소 군정', '갑오개혁'], answer: 2 },
    { q: '세계 경제의 불평등을 나타내는 "남북문제"에서 "북"은?', choices: ['가난한 나라들', '잘사는 선진국들', '북극 지방', '북아메리카만'], answer: 1 },
    { q: '민주주의의 기본 가치가 아닌 것은?', choices: ['자유', '평등', '독재', '인권'], answer: 2 },
    { q: '세계화의 영향이 아닌 것은?', choices: ['문화 교류 증가', '무역 증가', '나라 간 고립 강화', '다국적 기업 성장'], answer: 2 },
    { q: '5.18 민주화 운동이 일어난 도시는?', choices: ['서울', '부산', '광주', '대구'], answer: 2 },
    { q: '기후 변화 협약 "파리 협정"의 목표는?', choices: ['경제 성장 극대화', '지구 평균 기온 상승 억제', '핵무기 감축', '빈곤 퇴치'], answer: 1 },
    { q: '다음 중 국제기구가 아닌 것은?', choices: ['UN', 'WHO', 'WTO', 'BTS'], answer: 3 },
    { q: '"세계화"의 의미는?', choices: ['나라 간 교류가 줄어든다', '나라 간 교류가 활발해져 세계가 하나처럼 연결된다', '한 나라가 세계를 지배한다', '나라의 수가 줄어든다'], answer: 1 },
    { q: '독도가 우리나라 영토임을 기록한 조선 시대 문헌은?', choices: ['동국여지승람', '경국대전', '삼국유사', '고려사'], answer: 0 },
    { q: '지속가능발전목표(SDGs)를 채택한 국제 기구는?', choices: ['WTO', 'NATO', 'UN', 'EU'], answer: 2 },
    { q: '우리나라 국회의 역할이 아닌 것은?', choices: ['법률 제정', '예산 심의', '재판 판결', '국정 감사'], answer: 2 },
  ],
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function StudyPage() {
  const { selectedChild } = useChild()
  const { myMember, myFamily } = useAuth()
  const isChild = myMember?.role === 'child'
  const familyId = myFamily?.id ?? 'default'

  const grade = parseGrade(selectedChild?.grade)
  const childId = selectedChild?.id ?? 'default'

  type View = 'menu' | 'quiz' | 'result' | 'history' | 'wrongReview'

  const [view, setView] = useState<View>('menu')
  const [subject, setSubject] = useState<Subject | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [points, setPoints] = useState(getPoints(childId))
  const [wrongOnlyMode, setWrongOnlyMode] = useState(false)
  const [history, setHistory] = useState<QuizSession[]>([])
  const [showRewardShop, setShowRewardShop] = useState(false)
  const [showRewardMgmt, setShowRewardMgmt] = useState(false)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [requests, setRequests] = useState<RewardRequest[]>([])
  const [newRewardName, setNewRewardName] = useState('')
  const [newRewardEmoji, setNewRewardEmoji] = useState('🎁')
  const [newRewardPoints, setNewRewardPoints] = useState('')

  useEffect(() => {
    setPoints(getPoints(childId))
    setHistory(getHistory(childId))
    setRequests(getRequests(childId))
  }, [childId])

  useEffect(() => {
    setRewards(getRewards(familyId))
  }, [familyId])

  const requestReward = (reward: Reward) => {
    const newReq: RewardRequest = {
      id: `${Date.now()}`, childId, rewardId: reward.id,
      rewardName: reward.name, rewardEmoji: reward.emoji, points: reward.points,
      status: 'pending', requestedAt: new Date().toISOString(),
    }
    const updated = [...requests, newReq]
    saveRequests(childId, updated)
    setRequests(updated)
  }

  const approveRequest = (reqId: string) => {
    const req = requests.find(r => r.id === reqId)
    if (!req) return
    const updated = requests.map(r => r.id === reqId
      ? { ...r, status: 'approved' as const, resolvedAt: new Date().toISOString() } : r)
    saveRequests(childId, updated)
    setRequests(updated)
    const next = spendPoints(childId, req.points)
    setPoints(next)
  }

  const rejectRequest = (reqId: string) => {
    const updated = requests.map(r => r.id === reqId
      ? { ...r, status: 'rejected' as const, resolvedAt: new Date().toISOString() } : r)
    saveRequests(childId, updated)
    setRequests(updated)
  }

  const addReward = () => {
    if (!newRewardName.trim() || !newRewardPoints) return
    const reward: Reward = {
      id: `${Date.now()}`, name: newRewardName.trim(),
      emoji: newRewardEmoji, points: Number(newRewardPoints),
    }
    const updated = [...rewards, reward]
    saveRewards(familyId, updated)
    setRewards(updated)
    setNewRewardName('')
    setNewRewardPoints('')
  }

  const deleteReward = (id: string) => {
    const updated = rewards.filter(r => r.id !== id)
    saveRewards(familyId, updated)
    setRewards(updated)
  }

  const startSubject = useCallback((s: Subject, wrongOnly = false) => {
    const seed = Date.now()
    const wrongQs = getWrongQuestions(childId, s, grade)
    const qs = buildQuestions(s, grade, seed, wrongQs, wrongOnly)
    setSubject(s)
    setQuestions(qs)
    setCurrent(0)
    setSelected(null)
    setAttempts([])
    setWrongOnlyMode(wrongOnly)
    setView('quiz')
  }, [childId, grade])

  const handleSelect = (idx: number) => {
    if (selected !== null || !subject) return
    setSelected(idx)
    const q = questions[current]
    const correct = idx === q.answer
    const attempt: QuizAttempt = {
      questionText: q.q,
      choices: q.choices,
      answer: q.answer,
      selected: idx,
      correct,
    }
    setAttempts(prev => [...prev, attempt])
    if (correct && isChild) {
      const next = addPoints(childId, 10)
      setPoints(next)
    }
  }

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      // 세션 저장
      if (subject) {
        const session: QuizSession = {
          id: `${Date.now()}`,
          subject,
          grade,
          date: new Date().toISOString(),
          attempts: [...attempts],
          score: attempts.filter(a => a.correct).length + (selected !== null && attempts.length === current + 1 ? 0 : 0),
          total: questions.length,
        }
        // 마지막 attempt는 이미 포함됨
        const finalScore = attempts.filter(a => a.correct).length
        session.score = finalScore
        saveSession(childId, session)
        setHistory(getHistory(childId))
      }
      setView('result')
    } else {
      setCurrent(prev => prev + 1)
      setSelected(null)
    }
  }

  const handleNewQuestions = () => {
    if (!subject) return
    startSubject(subject, false)
  }

  const subjectInfo = SUBJECTS.find(s => s.key === subject)
  const _correctCount = attempts.filter(a => a.correct).length; void _correctCount

  // ── 결과 화면 ──────────────────────────────────────────────
  if (view === 'result' && subject && subjectInfo) {
    const total = questions.length
    const correct = attempts.filter(a => a.correct).length
    const pct = Math.round((correct / total) * 100)
    const wrongQsAfter = getWrongQuestions(childId, subject, grade)

    return (
      <div className="min-h-full p-4 md:p-6 bg-gray-50 flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
          <div className="text-center mb-5">
            <div className="text-5xl mb-3">{pct >= 80 ? '🏆' : pct >= 60 ? '⭐' : '💪'}</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              {pct >= 80 ? '훌륭해요!' : pct >= 60 ? '잘했어요!' : '다시 도전해봐요!'}
            </h2>
            <p className="text-gray-500 text-sm">{subjectInfo.label} 문제 결과</p>
          </div>

          <div className="flex justify-center gap-6 mb-5">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">{correct}</p>
              <p className="text-xs text-gray-400">맞음</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-400">{total - correct}</p>
              <p className="text-xs text-gray-400">틀림</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-500">{pct}%</p>
              <p className="text-xs text-gray-400">정확도</p>
            </div>
          </div>

          {isChild && correct > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4 text-center">
              <p className="text-yellow-700 font-semibold text-sm">+{correct * 10} 포인트 획득! 총 {points}P ⭐</p>
            </div>
          )}

          {/* 틀린 문제 목록 */}
          {attempts.filter(a => !a.correct).length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
              <p className="text-sm font-bold text-red-700 mb-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> 틀린 문제 ({attempts.filter(a => !a.correct).length}개)
              </p>
              <div className="space-y-2">
                {attempts.filter(a => !a.correct).map((a, i) => (
                  <div key={i} className="text-xs text-red-600 bg-white rounded-lg p-2 border border-red-100">
                    <p className="font-medium">Q. {a.questionText}</p>
                    <p className="text-red-400 mt-0.5">내 답: {a.choices[a.selected]} → 정답: <strong className="text-red-600">{a.choices[a.answer]}</strong></p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {wrongQsAfter.length > 0 && (
              <button onClick={() => startSubject(subject, true)}
                className="w-full py-3 bg-gradient-to-r from-red-400 to-rose-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> 오답만 다시 풀기 ({wrongQsAfter.length}개)
              </button>
            )}
            <button onClick={handleNewQuestions}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" /> 새 문제 풀기
            </button>
            <button onClick={() => setView('menu')}
              className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold">
              과목 선택으로
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 문제 풀기 화면 ─────────────────────────────────────────
  if (view === 'quiz' && subject && subjectInfo && questions.length > 0) {
    const q = questions[current]
    const progress = ((current + (selected !== null ? 1 : 0)) / questions.length) * 100

    return (
      <div className="min-h-full p-4 md:p-6 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setView('menu')}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm font-medium">
              <ChevronLeft className="w-4 h-4" /> 과목 선택
            </button>
            <div className="flex items-center gap-3">
              {isChild && (
                <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                  <span className="text-sm font-bold text-yellow-700">{points}P</span>
                </div>
              )}
              <span className={`text-sm font-semibold ${subjectInfo.text}`}>
                {subjectInfo.emoji} {subjectInfo.label}
                {wrongOnlyMode && <span className="ml-1 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">오답</span>}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${subjectInfo.color} transition-all duration-500`}
                style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
              {current + 1} / {questions.length}
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">문제 {current + 1}</p>
            <p className="text-lg md:text-xl font-bold text-gray-800 leading-relaxed mb-6">{q.q}</p>
            <div className="space-y-3">
              {q.choices.map((choice, idx) => {
                let style = 'border-2 border-gray-100 bg-gray-50 hover:border-blue-300 hover:bg-blue-50 text-gray-700'
                if (selected !== null) {
                  if (idx === q.answer) style = 'border-2 border-green-400 bg-green-50 text-green-800'
                  else if (idx === selected && selected !== q.answer) style = 'border-2 border-red-400 bg-red-50 text-red-700'
                  else style = 'border-2 border-gray-100 bg-gray-50 text-gray-400'
                }
                return (
                  <button key={idx} onClick={() => handleSelect(idx)} disabled={selected !== null}
                    className={`w-full text-left px-4 py-3.5 rounded-xl font-medium transition-all flex items-center gap-3 ${style}`}>
                    <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-sm leading-snug">{choice}</span>
                    {selected !== null && idx === q.answer && <CheckCircle className="w-5 h-5 text-green-500 ml-auto flex-shrink-0" />}
                    {selected !== null && idx === selected && selected !== q.answer && <XCircle className="w-5 h-5 text-red-400 ml-auto flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {selected !== null && (
            <div className={`rounded-xl p-4 mb-4 ${selected === q.answer ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                {selected === q.answer
                  ? <><CheckCircle className="w-5 h-5 text-green-500" /><span className="font-bold text-green-700">정답이에요!</span></>
                  : <><XCircle className="w-5 h-5 text-red-400" /><span className="font-bold text-red-600">오답이에요</span></>
                }
                {selected === q.answer && isChild && (
                  <span className="ml-auto text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">+10P</span>
                )}
              </div>
              {selected !== q.answer && (
                <p className="text-sm text-red-600">정답: <strong>{q.choices[q.answer]}</strong></p>
              )}
            </div>
          )}

          {selected !== null && (
            <button onClick={handleNext}
              className={`w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r ${subjectInfo.color} shadow-md`}>
              {current + 1 >= questions.length ? '결과 보기' : '다음 문제'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── 학습 이력 화면 ─────────────────────────────────────────
  if (view === 'history') {
    return (
      <div className="min-h-full p-4 md:p-6 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setView('menu')}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm font-medium">
              <ChevronLeft className="w-4 h-4" /> 돌아가기
            </button>
            <h2 className="text-xl font-bold text-gray-800">학습 이력</h2>
          </div>

          {history.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">아직 학습 기록이 없어요.</p>
              <p className="text-gray-400 text-sm mt-1">문제를 풀면 여기에 기록이 남아요!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(session => {
                const info = SUBJECTS.find(s => s.key === session.subject)
                const pct = Math.round((session.score / session.total) * 100)
                const dateObj = new Date(session.date)
                const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()} ${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2, '0')}`
                return (
                  <div key={session.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${info?.color ?? 'from-gray-300 to-gray-400'} flex items-center justify-center text-2xl flex-shrink-0`}>
                      {info?.emoji ?? '📚'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800">{info?.label ?? session.subject}</span>
                        <span className="text-xs text-gray-400">{session.grade}학년</span>
                        <span className="text-xs text-gray-300">|</span>
                        <span className="text-xs text-gray-400">{dateStr}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${pct >= 80 ? 'bg-green-400' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">
                          {session.score}/{session.total} ({pct}%)
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── 과목 선택 화면 ─────────────────────────────────────────
  return (
    <div className="min-h-full p-4 md:p-6 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">공부하기</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedChild ? `${selectedChild.name} · ${selectedChild.grade ?? '학년 미설정'}` : '아이를 선택하세요'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setView('history')}
              className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 shadow-sm">
              <History className="w-4 h-4" /> 학습 이력
            </button>
            {isChild && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl px-4 py-2 shadow-md">
                <Trophy className="w-5 h-5 text-white" />
                <span className="text-white font-bold text-lg">{points}P</span>
              </div>
            )}
          </div>
        </div>

        {/* 과목 카드 */}
        <div className="grid grid-cols-1 gap-4 mb-4">
          {SUBJECTS.map(s => {
            const wrongCount = getWrongCount(childId, s.key, grade)
            return (
              <div key={s.key} className="rounded-2xl shadow-md overflow-hidden">
                <button onClick={() => startSubject(s.key)}
                  className={`w-full bg-gradient-to-r ${s.color} px-6 py-5 flex items-center justify-between group hover:opacity-95 transition-all text-left`}>
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{s.emoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-bold text-white">{s.label}</p>
                        {wrongCount > 0 && (
                          <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            오답 {wrongCount}
                          </span>
                        )}
                      </div>
                      <p className="text-white/80 text-sm">{grade}학년 수준 · 10문제</p>
                    </div>
                  </div>
                  <div className="bg-white/20 rounded-xl px-4 py-2 group-hover:bg-white/30 transition-colors">
                    <span className="text-white font-semibold text-sm">시작 →</span>
                  </div>
                </button>
                {wrongCount > 0 && (
                  <button onClick={() => startSubject(s.key, true)}
                    className="w-full bg-white border-t border-gray-100 px-6 py-2.5 flex items-center gap-2 hover:bg-red-50 transition-colors text-left">
                    <RotateCcw className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-sm text-red-600 font-medium">오답 {wrongCount}개 다시 풀기</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* 포인트 안내 + 보상 교환소 */}
        {isChild && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-400" />
                <p className="font-bold text-yellow-800">포인트 안내</p>
              </div>
              {rewards.length > 0 && (
                <button onClick={() => setShowRewardShop(true)}
                  className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors">
                  🎁 보상 교환소
                  {requests.filter(r => r.status === 'pending').length > 0 && (
                    <span className="bg-white text-yellow-600 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                      {requests.filter(r => r.status === 'pending').length}
                    </span>
                  )}
                </button>
              )}
            </div>
            <p className="text-sm text-yellow-700">문제를 맞힐 때마다 <strong>10포인트</strong>가 쌓여요!</p>
            <p className="text-sm text-yellow-700 mt-0.5">10문제 다 맞히면 <strong>100포인트</strong>!</p>
            {rewards.length === 0 && (
              <p className="text-xs text-yellow-500 mt-1">부모님께 보상을 등록해달라고 해보세요 😊</p>
            )}
          </div>
        )}

        {/* 부모 뷰 */}
        {!isChild && selectedChild && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-indigo-500" />
                <p className="font-bold text-gray-700">{selectedChild.name}의 학습 현황</p>
              </div>
              <button onClick={() => setShowRewardMgmt(true)}
                className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors">
                🎁 보상 관리
                {requests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="bg-indigo-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                    {requests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
            </div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-500 text-sm">누적 포인트</p>
              <p className="text-2xl font-bold text-indigo-600">{getPoints(selectedChild.id)}P</p>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {SUBJECTS.map(s => {
                const wc = getWrongCount(selectedChild.id, s.key, grade)
                const recentSessions = history.filter(h => h.subject === s.key)
                const avgScore = recentSessions.length > 0
                  ? Math.round(recentSessions.slice(0, 5).reduce((sum, h) => sum + (h.score / h.total) * 100, 0) / Math.min(recentSessions.length, 5))
                  : null
                return (
                  <div key={s.key} className={`${s.lightBg} rounded-xl p-2 text-center`}>
                    <p className="text-lg">{s.emoji}</p>
                    <p className={`text-xs font-bold ${s.text}`}>{s.label}</p>
                    {avgScore !== null
                      ? <p className="text-xs text-gray-500 mt-0.5">{avgScore}%</p>
                      : <p className="text-xs text-gray-400 mt-0.5">미도전</p>
                    }
                    {wc > 0 && <p className="text-xs text-red-500 font-bold">오답{wc}</p>}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-3">* 최근 5회 평균 점수 기준</p>
          </div>
        )}
      </div>

      {/* 보상 교환소 모달 (아이용) */}
      {showRewardShop && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-800 text-lg">🎁 보상 교환소</h2>
                <p className="text-xs text-gray-400 mt-0.5">현재 포인트: <strong className="text-yellow-600">{points}P</strong></p>
              </div>
              <button onClick={() => setShowRewardShop(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {rewards.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">부모님께 보상을 등록해달라고 해보세요!</p>
            ) : (
              <div className="space-y-2 mb-5">
                {rewards.map(reward => {
                  const alreadyPending = requests.some(r => r.rewardId === reward.id && r.status === 'pending')
                  const canAfford = points >= reward.points
                  return (
                    <div key={reward.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <span className="text-2xl">{reward.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm">{reward.name}</p>
                        <p className="text-xs text-yellow-600 font-bold">{reward.points}P 필요</p>
                      </div>
                      <button
                        disabled={alreadyPending || !canAfford}
                        onClick={() => requestReward(reward)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                          alreadyPending ? 'bg-gray-200 text-gray-400' :
                          !canAfford ? 'bg-gray-100 text-gray-300' :
                          'bg-yellow-400 hover:bg-yellow-500 text-white'
                        }`}>
                        {alreadyPending ? '요청중' : !canAfford ? '포인트 부족' : '요청'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {requests.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">내 요청 내역</p>
                <div className="space-y-2">
                  {[...requests].reverse().slice(0, 10).map(req => (
                    <div key={req.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                      <span className="text-lg">{req.rewardEmoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{req.rewardName}</p>
                        <p className="text-[10px] text-gray-400">{req.points}P · {new Date(req.requestedAt).toLocaleDateString('ko-KR')}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        req.status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {req.status === 'pending' ? '대기중' : req.status === 'approved' ? '승인됨' : '거절됨'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 보상 관리 모달 (부모용) */}
      {showRewardMgmt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800 text-lg">🎁 보상 관리</h2>
              <button onClick={() => setShowRewardMgmt(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {/* 대기 중인 요청 */}
            {requests.filter(r => r.status === 'pending').length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">승인 대기 요청</p>
                <div className="space-y-2">
                  {requests.filter(r => r.status === 'pending').map(req => (
                    <div key={req.id} className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-100 rounded-xl">
                      <span className="text-xl">{req.rewardEmoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{req.rewardName}</p>
                        <p className="text-[10px] text-gray-400">{req.points}P · {new Date(req.requestedAt).toLocaleDateString('ko-KR')}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => approveRequest(req.id)}
                          className="px-2.5 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-colors">
                          승인
                        </button>
                        <button onClick={() => rejectRequest(req.id)}
                          className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg text-xs font-bold transition-colors">
                          거절
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 보상 목록 */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">등록된 보상</p>
              {rewards.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-xl">보상을 추가해주세요</p>
              ) : (
                <div className="space-y-2">
                  {rewards.map(reward => (
                    <div key={reward.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                      <span className="text-xl">{reward.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{reward.name}</p>
                        <p className="text-xs text-yellow-600 font-bold">{reward.points}P</p>
                      </div>
                      <button onClick={() => deleteReward(reward.id)}
                        className="text-gray-300 hover:text-red-400 text-lg leading-none transition-colors">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 보상 추가 */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">보상 추가</p>
              <div className="flex gap-2 mb-2">
                <input value={newRewardEmoji} onChange={e => setNewRewardEmoji(e.target.value)}
                  className="w-12 border border-gray-200 rounded-xl text-center text-lg px-1 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <input value={newRewardName} onChange={e => setNewRewardName(e.target.value)}
                  placeholder="보상 이름 (예: 게임 30분)"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div className="flex gap-2">
                <input type="number" value={newRewardPoints} onChange={e => setNewRewardPoints(e.target.value)}
                  placeholder="필요 포인트"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <button onClick={addReward} disabled={!newRewardName.trim() || !newRewardPoints}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold disabled:opacity-40 transition-colors">
                  추가
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
