import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Calculator, Globe, ChevronLeft, Star, Trophy, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { useChild } from '../contexts/ChildContext'
import { useAuth } from '../contexts/AuthContext'

// ── 문제 타입 ──────────────────────────────────────────────
type Question = {
  q: string
  choices: string[]
  answer: number // choices 인덱스
  explanation?: string
}

// ── 학년 파싱 ──────────────────────────────────────────────
function parseGrade(grade?: string): number {
  if (!grade) return 3
  const m = grade.match(/(\d+)/)
  const n = m ? parseInt(m[1]) : 3
  return Math.min(Math.max(n, 1), 6)
}

// ── 문제 생성 ──────────────────────────────────────────────
function generateQuestions(subject: 'korean' | 'math' | 'english', grade: number, seed: number): Question[] {
  if (subject === 'math') return generateMath(grade, seed)
  if (subject === 'korean') return generateKorean(grade, seed)
  return generateEnglish(grade, seed)
}

function generateMath(grade: number, seed: number): Question[] {
  const qs: Question[] = []
  const rng = (s: number) => {
    let x = Math.sin(s + seed * 137.5) * 10000
    return Math.abs(x - Math.floor(x))
  }
  const ri = (min: number, max: number, s: number) => Math.floor(rng(s) * (max - min + 1)) + min

  for (let i = 0; i < 10; i++) {
    const s = seed * 100 + i
    if (grade <= 2) {
      // 1-2학년: 덧셈 뺄셈 (10~50)
      const a = ri(1, 20, s)
      const b = ri(1, 20, s + 1)
      const ops = ['+', '-']
      const op = ops[ri(0, 1, s + 2)]
      const ans = op === '+' ? a + b : Math.abs(a - b)
      const fa = a > b ? a : b, fb = a < b ? a : b
      const realQ = op === '-' ? `${fa} - ${fb} = ?` : `${a} + ${b} = ?`
      const realAns = op === '-' ? fa - fb : ans
      const wrong = [realAns + ri(1, 5, s + 3), realAns - ri(1, 5, s + 4), realAns + ri(6, 10, s + 5)]
        .map(w => Math.max(0, w))
      const choices = shuffle([realAns, ...wrong.slice(0, 3)], s)
      qs.push({ q: realQ, choices: choices.map(String), answer: choices.indexOf(realAns) })
    } else if (grade <= 4) {
      // 3-4학년: 곱셈 나눗셈
      const type = ri(0, 1, s)
      if (type === 0) {
        const a = ri(2, 9, s), b = ri(2, 9, s + 1)
        const ans = a * b
        const wrong = [ans + ri(1, 9, s + 3), ans - ri(1, 9, s + 4), ans + ri(10, 20, s + 5)]
        const choices = shuffle([ans, ...wrong.slice(0, 3)], s)
        qs.push({ q: `${a} × ${b} = ?`, choices: choices.map(String), answer: choices.indexOf(ans) })
      } else {
        const b = ri(2, 9, s), c = ri(2, 9, s + 1)
        const a = b * c
        const ans = c
        const wrong = [ans + ri(1, 4, s + 3), ans - ri(1, 4, s + 4), ans + ri(5, 9, s + 5)]
          .map(w => Math.max(1, w))
        const choices = shuffle([ans, ...wrong.slice(0, 3)], s)
        qs.push({ q: `${a} ÷ ${b} = ?`, choices: choices.map(String), answer: choices.indexOf(ans) })
      }
    } else {
      // 5-6학년: 분수, 소수
      const type = ri(0, 2, s)
      if (type === 0) {
        const den = ri(2, 8, s), num1 = ri(1, den - 1, s + 1), num2 = ri(1, den - 1, s + 2)
        const ansNum = num1 + num2
        const ans = ansNum >= den ? `${Math.floor(ansNum / den)}과 ${ansNum % den}/${den}` : `${ansNum}/${den}`
        const wrongs = [`${num1 + num2 + 1}/${den}`, `${num1}/${den}`, `${num2 + 1}/${den}`]
        const choices = shuffle([ans, ...wrongs], s)
        qs.push({ q: `${num1}/${den} + ${num2}/${den} = ?`, choices, answer: choices.indexOf(ans) })
      } else if (type === 1) {
        const a = ri(1, 99, s), b = ri(1, 99, s + 1)
        const ans = parseFloat(((a + b) / 10).toFixed(1))
        const wrongs = [ans + 0.1, ans - 0.1, ans + 1.0].map(w => parseFloat(w.toFixed(1)))
        const choices = shuffle([ans, ...wrongs.slice(0, 3)], s)
        qs.push({ q: `${(a / 10).toFixed(1)} + ${(b / 10).toFixed(1)} = ?`, choices: choices.map(String), answer: choices.indexOf(ans) })
      } else {
        const a = ri(2, 9, s), b = ri(2, 9, s + 1), c = ri(2, 9, s + 2)
        const ans = a * b + c
        const wrongs = [ans + ri(1, 5, s + 3), ans - ri(1, 5, s + 4), ans + ri(6, 15, s + 5)]
        const choices = shuffle([ans, ...wrongs.slice(0, 3)], s)
        qs.push({ q: `${a} × ${b} + ${c} = ?`, choices: choices.map(String), answer: choices.indexOf(ans) })
      }
    }
  }
  return qs
}

function generateKorean(grade: number, seed: number): Question[] {
  const banks: Record<number, Question[]> = {
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
    ],
    3: [
      { q: '다음 문장에서 주어는? "토끼가 빠르게 달렸다."', choices: ['빠르게', '달렸다', '토끼가', '토끼'], answer: 2 },
      { q: '"위기"의 반의어는?', choices: ['안전', '위험', '불안', '걱정'], answer: 0 },
      { q: '다음 중 의태어는?', choices: ['펑펑', '방글방글', '쨍쨍', '우르르'], answer: 1 },
      { q: '"보다"의 높임말은?', choices: ['본다', '봐요', '보셨다', '보시다'], answer: 3 },
      { q: '다음 중 동사는?', choices: ['예쁜', '크다', '달리다', '파란'], answer: 2 },
      { q: '"비"가 오는 계절로 가장 많이 연결되는 것은?', choices: ['겨울', '봄', '가을', '여름'], answer: 3 },
      { q: '"일석이조"의 뜻은?', choices: ['하나도 못 얻다', '두 마리 새', '한 가지 일로 두 가지 이득', '돌 하나'], answer: 2 },
      { q: '다음 중 "형용사"는?', choices: ['달리다', '먹다', '아름답다', '놀다'], answer: 2 },
      { q: '문장에서 서술어의 역할은?', choices: ['누가', '무엇을', '어디서', '어떻다'], answer: 3 },
      { q: '"친구에게 편지를 쓰다"에서 목적어는?', choices: ['친구에게', '편지를', '쓰다', '친구'], answer: 1 },
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
    ],
    5: [
      { q: '"역설"이란 무엇인가요?', choices: ['겉으로 보면 모순이지만 속에 진리가 담긴 표현', '반복되는 표현', '비유하는 표현', '강조하는 표현'], answer: 0 },
      { q: '다음 중 "직유법"이 쓰인 문장은?', choices: ['하늘이 울었다', '그는 사자다', '그녀의 눈은 별처럼 빛났다', '바람이 속삭였다'], answer: 2 },
      { q: '"이심전심(以心傳心)"의 한자 중 "전(傳)"의 뜻은?', choices: ['마음', '전하다', '두 개', '사람'], answer: 1 },
      { q: '다음 중 수동태 문장은?', choices: ['고양이가 쥐를 잡았다', '쥐가 고양이에게 잡혔다', '쥐가 달아났다', '고양이가 뛰었다'], answer: 1 },
      { q: '"복잡하다"의 한자 표기로 가장 알맞은 것은?', choices: ['單純', '複雜', '簡單', '平凡'], answer: 1 },
      { q: '다음 중 "은유법"이 쓰인 문장은?', choices: ['산처럼 든든하다', '그는 나의 등불이다', '달이 환하게 빛난다', '꽃이 활짝 피었다'], answer: 1 },
      { q: '"문학의 3요소"에 해당하지 않는 것은?', choices: ['운율', '주제', '구성', '인물'], answer: 0 },
      { q: '다음 중 피동 접미사가 쓰인 것은?', choices: ['먹다', '잡히다', '달리다', '웃다'], answer: 1 },
      { q: '"자업자득"의 뜻은?', choices: ['남이 도와줘서 성공', '자기 행동의 결과를 자기가 받음', '여러 사람이 함께 함', '하늘이 도와줌'], answer: 1 },
      { q: '다음 중 "풍유법(알레고리)"이란?', choices: ['직접적으로 비유', '사물이나 인물을 통해 다른 뜻을 나타냄', '반복으로 강조', '감탄으로 표현'], answer: 1 },
    ],
    6: [
      { q: '"아이러니"와 가장 비슷한 의미의 수사법은?', choices: ['과장법', '반어법', '의인법', '설의법'], answer: 1 },
      { q: '다음 중 문장 성분이 나머지와 다른 것은?', choices: ['학교에서', '빠르게', '연필로', '공원에'], answer: 1 },
      { q: '"사필귀정(事必歸正)"의 뜻은?', choices: ['모든 일은 반드시 바른 길로 돌아간다', '일이 복잡하다', '사람은 반드시 죽는다', '노력하면 성공한다'], answer: 0 },
      { q: '다음 중 "경어법"이 올바르게 쓰인 것은?', choices: ['선생님이 오다', '선생님께서 오셨습니다', '선생님이 왔어요', '선생님 와요'], answer: 1 },
      { q: '"오 헨리"식 결말이란?', choices: ['해피엔딩', '예상치 못한 반전 결말', '비극적 결말', '열린 결말'], answer: 1 },
      { q: '다음 중 "현재진행형"으로 바르게 쓰인 것은?', choices: ['달렸다', '달리고 있다', '달릴 것이다', '달렸을 것이다'], answer: 1 },
      { q: '"설의법"이란?', choices: ['물어보는 형식으로 강조하는 법', '사물을 사람처럼 표현', '직접 비유', '반대로 표현'], answer: 0 },
      { q: '다음 중 "복문(複文)"은?', choices: ['하늘이 맑다', '새가 날아갔다', '비가 오니 우산을 가져가라', '꽃이 피었다'], answer: 2 },
      { q: '"군계일학"의 뜻은?', choices: ['닭이 무리 지어 다님', '뛰어난 한 사람', '학이 날아감', '군대에서 일하다'], answer: 1 },
      { q: '다음 중 "간접화법"으로 바르게 전환된 것은?', choices: ['"나는 학교에 간다"→그는 학교에 간다고 했다', '"나는 행복하다"→나는 행복하다', '"밥을 먹어라"→밥 먹어라', '"왔니?"→왔어'], answer: 0 },
    ],
  }
  const pool = banks[Math.min(grade, 6)] ?? banks[3]
  // seed로 섞기
  return shuffleArr(pool, seed).slice(0, 10)
}

function generateEnglish(grade: number, seed: number): Question[] {
  const banks: Record<number, Question[]> = {
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
    ],
    4: [
      { q: 'What is the superlative of "good"?', choices: ['gooder', 'better', 'best', 'goodest'], answer: 2 },
      { q: '"그는 어제 축구를 했다"를 영어로?', choices: ['He plays soccer yesterday.', 'He played soccer yesterday.', 'He play soccer yesterday.', 'He playing soccer yesterday.'], answer: 1 },
      { q: '"도서관"을 영어로 하면?', choices: ['museum', 'library', 'hospital', 'stadium'], answer: 1 },
      { q: 'Choose the correct sentence.', choices: ['She don\'t like coffee.', 'She doesn\'t likes coffee.', 'She doesn\'t like coffee.', 'She not like coffee.'], answer: 2 },
      { q: '"가장 긴"을 영어로 최상급으로 하면?', choices: ['longer', 'most long', 'longest', 'more long'], answer: 2 },
      { q: 'What does "However" mean?', choices: ['그러므로', '게다가', '그러나', '따라서'], answer: 2 },
      { q: '"그들은 지금 공부하고 있다"를 영어로?', choices: ['They study now.', 'They are studying now.', 'They studied now.', 'They studies now.'], answer: 1 },
      { q: '"환경"을 영어로 하면?', choices: ['environment', 'energy', 'equipment', 'emotion'], answer: 0 },
      { q: 'Which is the passive voice?', choices: ['The cat caught the mouse.', 'The mouse was caught by the cat.', 'The mouse catches the cat.', 'The cat is catching.'], answer: 1 },
      { q: '"I have lived here ___ 2010."에 알맞은 전치사는?', choices: ['for', 'since', 'at', 'on'], answer: 1 },
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
    ],
    6: [
      { q: '"Despite"가 들어간 올바른 문장은?', choices: ['Despite of the rain, we went out.', 'Despite the rain, we went out.', 'Despite raining, we went out.', 'Despite it rained, we went out.'], answer: 1 },
      { q: '"The data ___ analyzed carefully." 올바른 수동태는?', choices: ['was', 'were', 'is', 'are'], answer: 1 },
      { q: 'Choose the word with the correct prefix for "not possible":',  choices: ['unpossible', 'inpossible', 'impossible', 'dispossible'], answer: 2 },
      { q: '"She is used to ___ early." 빈칸에 알맞은 것은?', choices: ['wake', 'waking', 'woke', 'have woken'], answer: 1 },
      { q: '"논리적인"을 영어로 하면?', choices: ['logical', 'physical', 'critical', 'ethical'], answer: 0 },
      { q: 'Which is a complex sentence?', choices: ['I ran.', 'I ran and she walked.', 'Although it rained, we played outside.', 'Run!'], answer: 2 },
      { q: '"그것이 사실이었다면 좋았을 텐데"를 영어로?', choices: ['I wish it is true.', 'I wish it were true.', 'I wish it was true.', 'I wish it will be true.'], answer: 1 },
      { q: 'What does "ambiguous" mean?', choices: ['명확한', '모호한', '강력한', '독창적인'], answer: 1 },
      { q: '"Not only ___ he arrive late, but he also forgot his homework."', choices: ['did', 'does', 'had', 'has'], answer: 0 },
      { q: '"The more you practice, ___ you get." 빈칸에 알맞은 것은?', choices: ['better', 'the better', 'much better', 'more better'], answer: 1 },
    ],
  }
  const pool = banks[Math.min(grade, 6)] ?? banks[3]
  return shuffleArr(pool, seed).slice(0, 10)
}

function shuffle(arr: number[], seed: number): number[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.abs(Math.sin(seed + i) * 10000)) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function shuffleArr<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.abs(Math.sin(seed + i) * 10000)) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── 포인트 저장/불러오기 ──────────────────────────────────
function getPoints(childId: string): number {
  return parseInt(localStorage.getItem(`study_points_${childId}`) ?? '0', 10)
}
function addPoints(childId: string, pts: number): number {
  const current = getPoints(childId)
  const next = current + pts
  localStorage.setItem(`study_points_${childId}`, String(next))
  return next
}

// ── 과목 설정 ──────────────────────────────────────────────
const SUBJECTS = [
  { key: 'korean' as const, label: '국어', emoji: '📖', color: 'from-rose-400 to-pink-500', lightBg: 'bg-rose-50', ring: 'ring-rose-300', text: 'text-rose-600' },
  { key: 'math' as const, label: '수학', emoji: '🔢', color: 'from-blue-400 to-indigo-500', lightBg: 'bg-blue-50', ring: 'ring-blue-300', text: 'text-blue-600' },
  { key: 'english' as const, label: '영어', emoji: '🌏', color: 'from-emerald-400 to-teal-500', lightBg: 'bg-emerald-50', ring: 'ring-emerald-300', text: 'text-emerald-600' },
]

type Subject = 'korean' | 'math' | 'english'

export default function StudyPage() {
  const { selectedChild } = useChild()
  const { myMember } = useAuth()
  const isChild = myMember?.role === 'child'

  const grade = parseGrade(selectedChild?.grade)
  const childId = selectedChild?.id ?? 'default'

  const [subject, setSubject] = useState<Subject | null>(null)
  const [seed, setSeed] = useState(Date.now())
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [showResult, setShowResult] = useState(false)
  const [points, setPoints] = useState(getPoints(childId))
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)

  useEffect(() => {
    setPoints(getPoints(childId))
  }, [childId])

  const startSubject = useCallback((s: Subject) => {
    const newSeed = Date.now()
    setSeed(newSeed)
    setSubject(s)
    setQuestions(generateQuestions(s, grade, newSeed))
    setCurrent(0)
    setSelected(null)
    setAnswers([])
    setShowResult(false)
    setSessionCorrect(0)
    setTotalAnswered(0)
  }, [grade])

  const handleSelect = (idx: number) => {
    if (selected !== null) return
    setSelected(idx)
    const correct = idx === questions[current].answer
    const newAnswers = [...answers, correct]
    setAnswers(newAnswers)
    if (correct) {
      setSessionCorrect(prev => prev + 1)
      setTotalAnswered(prev => prev + 1)
    } else {
      setTotalAnswered(prev => prev + 1)
    }

    // 아이인 경우에만 포인트 적립
    if (correct && isChild) {
      const next = addPoints(childId, 10)
      setPoints(next)
    }
  }

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setShowResult(true)
    } else {
      setCurrent(prev => prev + 1)
      setSelected(null)
    }
  }

  const handleNewQuestions = () => {
    if (!subject) return
    const newSeed = Date.now()
    setSeed(newSeed)
    setQuestions(generateQuestions(subject, grade, newSeed))
    setCurrent(0)
    setSelected(null)
    setAnswers([])
    setShowResult(false)
    setSessionCorrect(0)
    setTotalAnswered(0)
  }

  const subjectInfo = SUBJECTS.find(s => s.key === subject)

  // ── 결과 화면 ──
  if (showResult && subject && subjectInfo) {
    const total = questions.length
    const correct = answers.filter(Boolean).length
    const pct = Math.round((correct / total) * 100)
    return (
      <div className="min-h-full p-4 md:p-6 bg-gray-50 flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="text-5xl mb-3">{pct >= 80 ? '🏆' : pct >= 60 ? '⭐' : '💪'}</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            {pct >= 80 ? '훌륭해요!' : pct >= 60 ? '잘했어요!' : '다시 도전해봐요!'}
          </h2>
          <p className="text-gray-500 mb-4 text-sm">{subjectInfo.label} 문제 결과</p>
          <div className="flex justify-center gap-6 mb-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">{correct}</p>
              <p className="text-xs text-gray-400">맞춤</p>
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
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4">
              <p className="text-yellow-700 font-semibold text-sm">
                +{correct * 10} 포인트 획득! 총 {points}P ⭐
              </p>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <button onClick={handleNewQuestions}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" /> 새 문제 풀기
            </button>
            <button onClick={() => setSubject(null)}
              className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold">
              과목 선택으로
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 문제 풀기 화면 ──
  if (subject && subjectInfo && questions.length > 0) {
    const q = questions[current]
    const progress = ((current + (selected !== null ? 1 : 0)) / questions.length) * 100
    return (
      <div className="min-h-full p-4 md:p-6 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setSubject(null)}
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
              </span>
            </div>
          </div>

          {/* 진행 바 */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${subjectInfo.color} transition-all duration-500`}
                style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
              {current + 1} / {questions.length}
            </span>
          </div>

          {/* 문제 카드 */}
          <div className="bg-white rounded-2xl shadow-md p-6 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              문제 {current + 1}
            </p>
            <p className="text-lg md:text-xl font-bold text-gray-800 leading-relaxed mb-6">
              {q.q}
            </p>
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

          {/* 결과 피드백 + 다음 버튼 */}
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

  // ── 과목 선택 화면 ──
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
          {isChild && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl px-4 py-2 shadow-md">
                <Trophy className="w-5 h-5 text-white" />
                <span className="text-white font-bold text-lg">{points}P</span>
              </div>
              <span className="text-xs text-gray-400 mt-1">내 포인트</span>
            </div>
          )}
        </div>

        {/* 과목 카드 */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          {SUBJECTS.map(s => (
            <button key={s.key} onClick={() => startSubject(s.key)}
              className={`w-full rounded-2xl shadow-md overflow-hidden text-left group hover:shadow-lg transition-all`}>
              <div className={`bg-gradient-to-r ${s.color} px-6 py-5 flex items-center justify-between`}>
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{s.emoji}</span>
                  <div>
                    <p className="text-xl font-bold text-white">{s.label}</p>
                    <p className="text-white/80 text-sm">{grade}학년 수준 · 10문제</p>
                  </div>
                </div>
                <div className="bg-white/20 rounded-xl px-4 py-2 group-hover:bg-white/30 transition-colors">
                  <span className="text-white font-semibold text-sm">시작 →</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 포인트 안내 (부모에게는 숨김) */}
        {isChild && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-400" />
              <p className="font-bold text-yellow-800">포인트 안내</p>
            </div>
            <p className="text-sm text-yellow-700">문제를 맞힐 때마다 <strong>10포인트</strong>가 쌓여요!</p>
            <p className="text-sm text-yellow-700 mt-0.5">10문제 다 맞히면 <strong>100포인트</strong>!</p>
          </div>
        )}

        {/* 부모 뷰: 아이 포인트 현황 */}
        {!isChild && selectedChild && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-indigo-500" />
              <p className="font-bold text-gray-700">{selectedChild.name}의 학습 포인트</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-gray-500 text-sm">누적 포인트</p>
              <p className="text-2xl font-bold text-indigo-600">{getPoints(selectedChild.id)}P</p>
            </div>
            <p className="text-xs text-gray-400 mt-2">* 포인트는 아이가 직접 문제를 풀어야 쌓입니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}
