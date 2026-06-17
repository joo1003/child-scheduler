import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useChild } from '../contexts/ChildContext'
import { X, Plus, Star, ChevronDown, ChevronUp } from 'lucide-react'

type InterestInfo = {
  emoji: string
  label: string
  description: string
  activities: string[]
  books: string[]
  funFacts: string[]
  tags: string[]
}

const INTEREST_DB: Record<string, InterestInfo> = {
  공룡: {
    emoji: '🦕',
    label: '공룡',
    description: '지구를 지배했던 거대한 파충류! 약 6600만 년 전에 멸종했지만 화석으로 많은 것을 알 수 있어요.',
    activities: ['공룡 화석 발굴 체험', '자연사박물관 방문', '공룡 그리기', '점토로 공룡 만들기', '공룡 퍼즐 맞추기'],
    books: ['공룡 대백과', '내가 제일 좋아하는 공룡', '공룡들의 밤', '아기 공룡 두두', '공룡 탐험대'],
    funFacts: ['T-렉스의 팔은 너무 짧아서 입에 닿지 않았어요!', '브라키오사우루스는 목 길이만 9미터였어요', '가장 빠른 공룡은 오르니토미무스로 시속 70km였어요', '공룡 알 중 가장 큰 것은 축구공만 했어요'],
    tags: ['공룡', '화석', '쥐라기', '백악기', '고생물학'],
  },
  우주: {
    emoji: '🚀',
    label: '우주',
    description: '무한한 우주에는 은하, 별, 행성이 셀 수 없이 많아요. 우리 은하에만 별이 2000억 개 이상!',
    activities: ['천체망원경으로 별 관찰', '국립과천과학관 방문', '별자리 지도 그리기', '태양계 모형 만들기', 'NASA 사이트에서 우주 사진 보기'],
    books: ['우주 대탐험', '별을 사랑한 소년', '어린이 우주 백과', '달나라 탐험', '우리 태양계 이야기'],
    funFacts: ['태양은 지구의 109배 크기예요!', '달은 매년 3.8cm씩 지구에서 멀어지고 있어요', '우주에는 소리가 없어요 — 진공이기 때문이에요', '하루에 지구에 떨어지는 우주 먼지는 약 100톤이에요'],
    tags: ['우주', '행성', '별자리', '천문학', '로켓'],
  },
  동물: {
    emoji: '🐾',
    label: '동물',
    description: '지구에는 870만 종 이상의 동물이 살고 있어요. 바다 깊은 곳부터 높은 산꼭대기까지!',
    activities: ['동물원 체험 학습', '자연 다큐멘터리 시청', '곤충 채집 일기 쓰기', '새 모이통 만들기', '동물 스케치북 만들기'],
    books: ['동물 대백과', '세계의 동물', '이상한 동물 사전', '동물들의 놀라운 비밀', '멸종 위기 동물 이야기'],
    funFacts: ['문어는 심장이 3개예요!', '코끼리는 20km 밖에서 물 냄새를 맡을 수 있어요', '나비는 발로 맛을 느껴요', '돌고래는 잠을 잘 때 뇌의 절반만 잠들어요'],
    tags: ['동물', '야생동물', '생태계', '멸종위기종', '곤충'],
  },
  로봇: {
    emoji: '🤖',
    label: '로봇/코딩',
    description: '로봇과 코딩은 미래를 만드는 기술이에요! 스스로 생각하는 인공지능도 발전 중이에요.',
    activities: ['레고 마인드스톰으로 로봇 만들기', '스크래치 코딩 배우기', '아두이노 입문', '로봇 경진대회 참가', '엔트리 코딩 게임'],
    books: ['코딩이 뭐예요?', '어린이 로봇 공학', '소프트웨어야 놀자', '스크래치로 만드는 게임', 'AI와 친구 되기'],
    funFacts: ['세계 최초 로봇 이름은 "에릭"이에요 (1928년)', '현재 전 세계에 350만 대 이상의 산업용 로봇이 있어요', '일본에는 로봇이 운영하는 호텔이 있어요', '소프트웨어 개발자는 세계에서 가장 인기 있는 직업 중 하나예요'],
    tags: ['로봇', '코딩', 'AI', '인공지능', '프로그래밍'],
  },
  미술: {
    emoji: '🎨',
    label: '미술/그림',
    description: '그림, 조각, 공예 등 다양한 방식으로 감정과 생각을 표현하는 예술이에요.',
    activities: ['수채화 그리기', '클레이 아트 만들기', '미술관 견학', '만화 캐릭터 그리기', '색종이 접기와 꼴라쥬'],
    books: ['반 고흐의 별이 빛나는 밤', '어린이 미술 대백과', '세계의 유명 그림 이야기', '나만의 만화 그리기', '색깔의 비밀'],
    funFacts: ['모나리자는 가로 53cm, 세로 77cm의 작은 그림이에요!', '반 고흐는 평생 900점 이상의 그림을 그렸어요', '피카소는 4살에 그림을 그리기 시작했어요', '세계에서 가장 비싼 그림은 약 5600억 원에 팔렸어요'],
    tags: ['미술', '그림', '수채화', '조각', '공예'],
  },
  음악: {
    emoji: '🎵',
    label: '음악',
    description: '음악은 언어의 장벽을 넘어 전 세계 사람들을 연결하는 마법 같은 예술이에요.',
    activities: ['피아노/기타 배우기', '합창단 참여', '리코더 연주', '음악 감상 일기 쓰기', '나만의 노래 작사하기'],
    books: ['음악이 들려요', '베토벤 이야기', '클래식 음악 여행', '피아노 배우는 소녀', '세계의 악기 탐험'],
    funFacts: ['모차르트는 5살에 첫 번째 곡을 작곡했어요!', '음악을 들으면 뇌에서 도파민이 분비돼요', '고래도 노래를 불러요 — 혹등고래의 노래는 수백km를 이동해요', '세계에서 가장 오래된 악기는 뼈로 만든 피리예요 (4만 년 전)'],
    tags: ['음악', '피아노', '노래', '악기', '클래식'],
  },
  요리: {
    emoji: '🍳',
    label: '요리',
    description: '재료를 조합해 맛있는 음식을 만드는 요리는 과학이자 예술이에요!',
    activities: ['쿠키 & 케이크 만들기', '김밥 만들기 체험', '과일 주스 만들기', '요리 유튜브 따라하기', '나만의 레시피북 만들기'],
    books: ['어린이 요리 백과', '마법의 주방', '세계의 음식 여행', '과학으로 요리하기', '건강한 음식 이야기'],
    funFacts: ['초콜릿은 원래 쓴 음료였어요!', '피자는 이탈리아 나폴리에서 처음 만들어졌어요', '아이스크림은 약 3000년 전 중국에서 시작됐어요', '감자는 우주에서도 재배됐어요'],
    tags: ['요리', '베이킹', '음식', '레시피', '제과제빵'],
  },
  과학: {
    emoji: '🔬',
    label: '과학/실험',
    description: '왜? 어떻게? 라는 질문에서 시작하는 과학! 실험으로 세상의 비밀을 밝혀봐요.',
    activities: ['화산 폭발 실험', '슬라임 만들기', '식물 키우기 관찰 일기', '현미경으로 관찰하기', '과학관 체험학습'],
    books: ['신기한 과학 실험 100', '어린이 물리 탐험', '화학의 세계', '빛과 소리의 비밀', '우리 몸 대탐험'],
    funFacts: ['물은 4도에서 가장 무거워요!', '번개는 태양 표면보다 5배 뜨거워요', '소리는 물속에서 공기보다 4배 빨리 이동해요', '인체의 세포는 60조 개 이상이에요'],
    tags: ['과학', '실험', '물리', '화학', '생물'],
  },
  스포츠: {
    emoji: '⚽',
    label: '스포츠',
    description: '운동은 몸을 건강하게 하고 팀워크와 끈기도 배울 수 있어요!',
    activities: ['지역 스포츠 클럽 가입', '줄넘기 기록 도전', '수영 배우기', '인라인 스케이트 타기', '배드민턴 대회 참가'],
    books: ['스포츠 스타 이야기', '올림픽의 역사', '축구왕 이야기', '수영 챔피언', '체육의 과학'],
    funFacts: ['올림픽은 고대 그리스에서 2700년 전에 시작됐어요!', '마라톤의 거리(42.195km)는 실수로 정해졌어요', '농구공은 처음에 복숭아 바구니로 만든 골대를 사용했어요', '테니스는 원래 손바닥으로 치는 게임이었어요'],
    tags: ['스포츠', '축구', '수영', '올림픽', '운동'],
  },
  독서: {
    emoji: '📚',
    label: '독서/이야기',
    description: '책 속에는 무한한 세계가 있어요! 독서는 상상력과 어휘력을 키워줘요.',
    activities: ['독서 일기 쓰기', '도서관 탐방', '북클럽 참여', '좋아하는 장면 그리기', '독후감 쓰기 대회 참가'],
    books: ['해리포터', '어린왕자', '샬롯의 거미줄', '마법의 시간여행 시리즈', '엔더의 게임'],
    funFacts: ['세계에서 가장 많이 읽힌 책은 성경으로 50억 권 이상 팔렸어요', '평균적인 책 한 권에는 약 9만 개의 단어가 있어요', '핀란드 어린이들은 세계에서 독서를 가장 많이 해요', '책 냄새는 종이와 잉크가 분해될 때 나는 화학물질 때문이에요'],
    tags: ['독서', '책', '이야기', '도서관', '문학'],
  },
}

const PRESET_INTERESTS = Object.keys(INTEREST_DB)

export default function InterestsPage() {
  const { selectedChild, refreshChildren } = useChild()
  const [saving, setSaving] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [expandedInterest, setExpandedInterest] = useState<string | null>(null)

  const interests: string[] = selectedChild?.interests ?? []

  const toggleInterest = async (tag: string) => {
    if (!selectedChild) return
    setSaving(true)
    const newInterests = interests.includes(tag)
      ? interests.filter((i) => i !== tag)
      : [...interests, tag]
    await supabase.from('children').update({ interests: newInterests }).eq('id', selectedChild.id)
    await refreshChildren()
    setSaving(false)
  }

  const addCustom = async () => {
    const tag = customInput.trim()
    if (!tag || !selectedChild || interests.includes(tag)) return
    setSaving(true)
    await supabase.from('children').update({ interests: [...interests, tag] }).eq('id', selectedChild.id)
    await refreshChildren()
    setCustomInput('')
    setSaving(false)
  }

  if (!selectedChild) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>왼쪽에서 아이를 선택해 주세요.</p>
      </div>
    )
  }

  const activeInfoInterests = interests.filter((i) => INTEREST_DB[i])
  const customInterests = interests.filter((i) => !INTEREST_DB[i])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">⭐ {selectedChild.name}의 관심사</h1>
        <p className="text-gray-500 text-sm mt-1">관심사를 등록하면 관련 정보와 활동을 추천해 드려요!</p>
      </div>

      {/* Preset tags */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5">
        <h2 className="font-semibold text-gray-700 mb-3 text-sm">관심사 선택</h2>
        <div className="flex flex-wrap gap-2">
          {PRESET_INTERESTS.map((tag) => {
            const info = INTEREST_DB[tag]
            const active = interests.includes(tag)
            return (
              <button
                key={tag}
                onClick={() => toggleInterest(tag)}
                disabled={saving}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  active
                    ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <span>{info.emoji}</span>
                <span>{tag}</span>
                {active && <X className="w-3 h-3" />}
              </button>
            )
          })}
        </div>

        {/* Custom interest input */}
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            placeholder="직접 입력 (예: 마인크래프트, 발레...)"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            onClick={addCustom}
            disabled={!customInput.trim() || saving}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-40 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> 추가
          </button>
        </div>

        {customInterests.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {customInterests.map((tag) => (
              <span key={tag}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium border border-purple-200">
                {tag}
                <button onClick={() => toggleInterest(tag)} className="hover:text-purple-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Interest Info Cards */}
      {activeInfoInterests.length === 0 ? (
        <div className="text-center py-16 text-gray-300">
          <p className="text-5xl mb-3">🌟</p>
          <p className="text-base">위에서 관심사를 선택하면<br />관련 정보를 볼 수 있어요!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeInfoInterests.map((tag) => {
            const info = INTEREST_DB[tag]
            const isExpanded = expandedInterest === tag

            return (
              <div key={tag} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-5 text-left"
                  onClick={() => setExpandedInterest(isExpanded ? null : tag)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{info.emoji}</span>
                    <div>
                      <h3 className="font-bold text-gray-800">{info.label}</h3>
                      <p className="text-sm text-gray-500 line-clamp-1">{info.description}</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-50">
                    <p className="text-sm text-gray-600 mt-4 mb-5 leading-relaxed">{info.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Activities */}
                      <div className="bg-green-50 rounded-xl p-4">
                        <h4 className="font-semibold text-green-700 text-sm mb-2 flex items-center gap-1">
                          🎯 추천 활동
                        </h4>
                        <ul className="space-y-1">
                          {info.activities.map((a) => (
                            <li key={a} className="text-xs text-green-800 flex items-start gap-1">
                              <span className="mt-0.5 flex-shrink-0">•</span> {a}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Books */}
                      <div className="bg-blue-50 rounded-xl p-4">
                        <h4 className="font-semibold text-blue-700 text-sm mb-2 flex items-center gap-1">
                          📖 추천 도서
                        </h4>
                        <ul className="space-y-1">
                          {info.books.map((b) => (
                            <li key={b} className="text-xs text-blue-800 flex items-start gap-1">
                              <span className="mt-0.5 flex-shrink-0">•</span> {b}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Fun Facts */}
                      <div className="bg-yellow-50 rounded-xl p-4">
                        <h4 className="font-semibold text-yellow-700 text-sm mb-2 flex items-center gap-1">
                          💡 재미있는 사실
                        </h4>
                        <ul className="space-y-2">
                          {info.funFacts.map((f) => (
                            <li key={f} className="text-xs text-yellow-800 flex items-start gap-1">
                              <Star className="w-3 h-3 flex-shrink-0 mt-0.5 text-yellow-400" /> {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {info.tags.map((t) => (
                        <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">#{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
