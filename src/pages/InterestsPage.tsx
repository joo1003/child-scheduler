import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useChild } from '../contexts/ChildContext'
import { X, Plus, Play, ExternalLink, ChevronDown, ChevronUp, Search } from 'lucide-react'

type Video = { id: string; title: string }
type ImageItem = { url: string; alt: string }

type InterestInfo = {
  emoji: string
  label: string
  color: string
  description: string
  videos: Video[]
  images: ImageItem[]
  activities: string[]
  funFacts: string[]
  searchQuery: string
}

const INTEREST_DB: Record<string, InterestInfo> = {
  공룡: {
    emoji: '🦕', label: '공룡', color: '#16a34a',
    description: '지구를 지배했던 거대한 파충류! 약 6600만 년 전에 멸종했지만 화석으로 많은 것을 알 수 있어요.',
    videos: [
      { id: 'qH9kGsYFPD0', title: '공룡의 세계 - 아이들을 위한 공룡 이야기' },
      { id: 'Pjp-yNtRlCc', title: 'T-Rex 티라노사우루스 공룡 이야기' },
      { id: 'mU8rKrW1bPM', title: '공룡 종류 완벽 정리! 어린이 공룡 백과' },
      { id: 'Q6VjMqBsaRo', title: '브라키오사우루스 vs 트리케라톱스' },
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1601459427108-47e20d579a35?w=400&h=250&fit=crop', alt: '공룡 화석' },
      { url: 'https://images.unsplash.com/photo-1519880856348-763a8b40aa79?w=400&h=250&fit=crop', alt: '공룡 모형' },
      { url: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&h=250&fit=crop', alt: '화석 발굴' },
    ],
    activities: ['자연사박물관 공룡 화석 관람', '공룡 발굴 체험', '공룡 점토 만들기', '공룡 도감 만들기'],
    funFacts: ['T-렉스 팔은 너무 짧아 입에 닿지 않았어요!', '가장 빠른 공룡은 시속 70km였어요', '공룡 알은 최대 축구공만 했어요'],
    searchQuery: '어린이 공룡 영상',
  },
  우주: {
    emoji: '🚀', label: '우주', color: '#7c3aed',
    description: '무한한 우주에는 은하, 별, 행성이 셀 수 없이 많아요. 우리 은하에만 별이 2000억 개 이상!',
    videos: [
      { id: 'mP5p4QbvPtc', title: '우주의 크기 - 상상도 못할 우주 이야기' },
      { id: '_p8AfDSpjr8', title: '태양계 행성 8개 완벽 정리' },
      { id: 'libKVRa01L8', title: '달은 어떻게 생겼을까? 달 탐험 이야기' },
      { id: 'HGJYwlnC8ME', title: '별자리 이야기 - 밤하늘의 그림들' },
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=250&fit=crop', alt: '우주 은하' },
      { url: 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=400&h=250&fit=crop', alt: '행성들' },
      { url: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=400&h=250&fit=crop', alt: '로켓 발사' },
    ],
    activities: ['천체망원경으로 별 관찰', '별자리 지도 그리기', '태양계 모형 만들기', '우주 그림 그리기'],
    funFacts: ['태양은 지구의 109배 크기예요!', '달은 매년 3.8cm씩 멀어지고 있어요', '우주에는 소리가 없어요'],
    searchQuery: '어린이 우주 과학',
  },
  동물: {
    emoji: '🐾', label: '동물', color: '#d97706',
    description: '지구에는 870만 종 이상의 동물이 살아요. 바다 깊은 곳부터 높은 산꼭대기까지!',
    videos: [
      { id: 'BW0tPNNBDCo', title: '세계의 신기한 동물들 - 어린이 동물 탐험' },
      { id: 'DtaO9C5VqX4', title: '바다 동물의 세계 - 심해 탐험' },
      { id: 'rFPOgiD4X0M', title: '아프리카 초원의 동물들 - 사자 기린 코끼리' },
      { id: 'UrHg0RzT1ck', title: '귀여운 아기 동물 모음 - 세상에서 가장 귀여운 동물' },
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=400&h=250&fit=crop', alt: '여우' },
      { url: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=400&h=250&fit=crop', alt: '펭귄' },
      { url: 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=400&h=250&fit=crop', alt: '바다거북' },
    ],
    activities: ['동물원 체험 학습', '자연 다큐멘터리 시청', '곤충 채집 일기', '동물 스케치북'],
    funFacts: ['문어는 심장이 3개예요!', '코끼리는 20km 밖에서 물 냄새를 맡아요', '나비는 발로 맛을 느껴요'],
    searchQuery: '어린이 동물 자연',
  },
  로봇: {
    emoji: '🤖', label: '로봇/코딩', color: '#0891b2',
    description: '로봇과 코딩은 미래를 만드는 기술이에요! 스스로 생각하는 인공지능도 발전 중이에요.',
    videos: [
      { id: 'x1rqMRLDTAY', title: '코딩이 뭐예요? 어린이 코딩 입문' },
      { id: 'nKIu9yen5nc', title: '로봇은 어떻게 만들어질까? 로봇 공학 이야기' },
      { id: 'mJEpimi_tio', title: '스크래치로 게임 만들기 - 초보자 코딩' },
      { id: 'iE7YRHxwoDs', title: '인공지능 AI 어린이 설명 - 미래의 기술' },
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1561557944-6e7860d1a7eb?w=400&h=250&fit=crop', alt: '로봇' },
      { url: 'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=400&h=250&fit=crop', alt: '코딩' },
      { url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=250&fit=crop', alt: '프로그래밍' },
    ],
    activities: ['스크래치 코딩 배우기', '레고 로봇 만들기', '엔트리 게임 만들기', '아두이노 입문'],
    funFacts: ['세계 최초 로봇 이름은 에릭(1928년)이에요!', '전 세계에 350만 대 산업용 로봇이 있어요'],
    searchQuery: '어린이 코딩 로봇',
  },
  미술: {
    emoji: '🎨', label: '미술/그림', color: '#e11d48',
    description: '그림, 조각, 공예 등 다양한 방식으로 감정과 생각을 표현하는 예술이에요.',
    videos: [
      { id: '3SQJWG6mgQk', title: '쉽게 그리는 귀여운 캐릭터 그리기' },
      { id: 'H4N36FwU4io', title: '수채화 기초 - 어린이 미술 시간' },
      { id: 'Q7WcXs-4BmI', title: '클레이로 케이크 만들기 - 재미있는 만들기' },
      { id: 'c3x5H56Q52A', title: '세계 유명 그림 이야기 - 모나리자 별이 빛나는 밤' },
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=250&fit=crop', alt: '수채화' },
      { url: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&h=250&fit=crop', alt: '그림 그리기' },
      { url: 'https://images.unsplash.com/photo-1531913764164-f85c52e6e654?w=400&h=250&fit=crop', alt: '미술 재료' },
    ],
    activities: ['수채화 그리기', '클레이 아트', '미술관 견학', '만화 캐릭터 그리기'],
    funFacts: ['모나리자는 가로 53cm의 작은 그림이에요!', '피카소는 4살에 그림을 그리기 시작했어요'],
    searchQuery: '어린이 미술 그리기',
  },
  음악: {
    emoji: '🎵', label: '음악', color: '#7c3aed',
    description: '음악은 언어의 장벽을 넘어 전 세계 사람들을 연결하는 마법 같은 예술이에요.',
    videos: [
      { id: 'bkG9QzjkN3U', title: '어린이 피아노 배우기 - 쉬운 동요 연주' },
      { id: 'lXcDMDMB4P4', title: '세계 악기 소개 - 신기한 악기들' },
      { id: 'I9hJ_uqLVHE', title: '베토벤 이야기 - 위대한 음악가' },
      { id: 'cC7E1G2PMLM', title: '리듬과 박자 배우기 - 음악의 기초' },
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&h=250&fit=crop', alt: '피아노' },
      { url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=250&fit=crop', alt: '기타' },
      { url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=250&fit=crop', alt: '음악 공연' },
    ],
    activities: ['피아노/기타 배우기', '합창단 참여', '나만의 노래 작사하기', '음악 감상 일기'],
    funFacts: ['모차르트는 5살에 첫 번째 곡을 작곡했어요!', '고래도 노래를 불러요'],
    searchQuery: '어린이 음악 악기',
  },
  요리: {
    emoji: '🍳', label: '요리', color: '#ea580c',
    description: '재료를 조합해 맛있는 음식을 만드는 요리는 과학이자 예술이에요!',
    videos: [
      { id: 'nTsHHPOxwS8', title: '어린이 쿠키 만들기 - 쉬운 베이킹' },
      { id: 'JL9VFBewTBw', title: '김밥 만들기 - 어린이 요리 교실' },
      { id: 'n7j0kCFqZRE', title: '과일 주스 만들기 - 건강한 음료' },
      { id: 'LFkMH7pUPAY', title: '세계 음식 이야기 - 나라마다 다른 음식' },
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&h=250&fit=crop', alt: '쿠키' },
      { url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=250&fit=crop', alt: '요리하기' },
      { url: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=250&fit=crop', alt: '케이크' },
    ],
    activities: ['쿠키 & 케이크 만들기', '김밥 만들기 체험', '과일 주스 만들기', '나만의 레시피북'],
    funFacts: ['초콜릿은 원래 쓴 음료였어요!', '아이스크림은 약 3000년 전 중국에서 시작됐어요'],
    searchQuery: '어린이 요리 만들기',
  },
  과학: {
    emoji: '🔬', label: '과학/실험', color: '#0d9488',
    description: '왜? 어떻게? 라는 질문에서 시작하는 과학! 실험으로 세상의 비밀을 밝혀봐요.',
    videos: [
      { id: 'bHh3DNHG1JM', title: '집에서 하는 신기한 과학 실험 5가지' },
      { id: 'q0pKjnB_HoE', title: '화산 폭발 실험 - 베이킹소다와 식초' },
      { id: 'PXuDFTnPFJE', title: '슬라임 만들기 - 쉽고 재미있는 과학 실험' },
      { id: 'wfNb_PmFVjY', title: '빛의 굴절 실험 - 무지개 만들기' },
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1532094349884-543559338b24?w=400&h=250&fit=crop', alt: '과학 실험' },
      { url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=250&fit=crop', alt: '현미경' },
      { url: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=400&h=250&fit=crop', alt: '화학 실험' },
    ],
    activities: ['화산 폭발 실험', '슬라임 만들기', '식물 키우기 관찰 일기', '과학관 체험'],
    funFacts: ['물은 4도에서 가장 무거워요!', '번개는 태양 표면보다 5배 뜨거워요'],
    searchQuery: '어린이 과학 실험',
  },
  스포츠: {
    emoji: '⚽', label: '스포츠', color: '#2563eb',
    description: '운동은 몸을 건강하게 하고 팀워크와 끈기도 배울 수 있어요!',
    videos: [
      { id: 'MR0fJxCo38Y', title: '축구 기초 기술 - 어린이 축구 레슨' },
      { id: 'xf7OhHSfGu4', title: '수영 기초 배우기 - 어린이 수영 강습' },
      { id: 'y8ByaR2SwVw', title: '올림픽 이야기 - 세계 최고 스포츠 경기' },
      { id: 'vXFHg5T-9oE', title: '줄넘기 고급 기술 - 어린이 줄넘기 챌린지' },
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=400&h=250&fit=crop', alt: '축구' },
      { url: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=250&fit=crop', alt: '수영' },
      { url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=250&fit=crop', alt: '육상' },
    ],
    activities: ['지역 스포츠 클럽', '줄넘기 기록 도전', '수영 배우기', '배드민턴 대회 참가'],
    funFacts: ['올림픽은 2700년 전 그리스에서 시작됐어요!', '마라톤 거리(42.195km)는 실수로 정해졌어요'],
    searchQuery: '어린이 스포츠 운동',
  },
  독서: {
    emoji: '📚', label: '독서/이야기', color: '#9333ea',
    description: '책 속에는 무한한 세계가 있어요! 독서는 상상력과 어휘력을 키워줘요.',
    videos: [
      { id: 'VIIhGNkWmfA', title: '어린이 동화 - 백설공주 이야기' },
      { id: 'Nm0gH5f-uJo', title: '재미있는 그림책 읽기 - 인기 동화' },
      { id: 'iTJW2RMd9GA', title: '어린이 도서관 탐방 - 책 고르는 방법' },
      { id: 'aBZlNPFKjAI', title: '독서의 중요성 - 책 읽기의 놀라운 효과' },
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=250&fit=crop', alt: '책 읽기' },
      { url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=250&fit=crop', alt: '도서관' },
      { url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=250&fit=crop', alt: '동화책' },
    ],
    activities: ['독서 일기 쓰기', '도서관 탐방', '좋아하는 장면 그리기', '독후감 쓰기'],
    funFacts: ['세계에서 가장 많이 읽힌 책은 성경으로 50억 권 이상!', '평균 책 한 권에는 9만 개 단어가 있어요'],
    searchQuery: '어린이 동화 책 읽기',
  },
}

const PRESET_INTERESTS = Object.keys(INTEREST_DB)

// 커스텀 주제에 대해 검색 기반 자동 콘텐츠 생성 (API 불필요)
function getAutoContent(topic: string) {
  return {
    emoji: '✨',
    color: '#6366f1',
    description: `${topic}에 대해 탐구하고 배워보아요! 영상을 보며 더 깊이 알아가 보세요.`,
    searchQueries: [
      `어린이 ${topic}`,
      `${topic} 배우기`,
      `${topic} 재미있는 영상`,
      `${topic} 체험`,
    ],
    activities: [
      `${topic} 관련 영상 찾아보기`,
      `${topic} 책 읽어보기`,
      `${topic} 체험 활동 참여하기`,
      `${topic} 일기 쓰기`,
    ],
    funFacts: [
      `${topic}에 대해 더 알아보면 놀라운 사실들이 가득해요!`,
      `도서관이나 인터넷에서 ${topic}에 관한 정보를 찾아보세요.`,
      `친구나 가족에게 ${topic}에 대해 이야기해 보세요!`,
    ],
  }
}

function YouTubeCard({ video }: { video: { id: string; title: string } }) {
  const thumb = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`
  const url = `https://www.youtube.com/watch?v=${video.id}`
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="group relative block rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
      <div className="relative">
        <img src={thumb} alt={video.title} className="w-full h-28 object-cover" />
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
      </div>
      <div className="p-2 bg-white">
        <p className="text-xs text-gray-700 font-medium line-clamp-2 leading-tight">{video.title}</p>
      </div>
    </a>
  )
}

function YouTubeSearchCard({ query, color }: { query: string; color: string }) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="group flex items-center gap-3 p-3 rounded-xl border-2 transition-all hover:shadow-md"
      style={{ borderColor: color + '40', backgroundColor: color + '08' }}>
      <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-700 line-clamp-2">{query}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">유튜브에서 검색</p>
      </div>
      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-gray-300 group-hover:text-gray-500" />
    </a>
  )
}

export default function InterestsPage() {
  const { selectedChild, refreshChildren } = useChild()
  const [saving, setSaving] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [activeTab, setActiveTab] = useState<'videos' | 'images' | 'facts'>('videos')
  const [expandedInterest, setExpandedInterest] = useState<string | null>(null)

  const interests: string[] = selectedChild?.interests ?? []

  const saveInterests = async (newInterests: string[]) => {
    if (!selectedChild) return false
    const { error } = await supabase.from('children').update({ interests: newInterests }).eq('id', selectedChild.id)
    if (error) { alert('저장에 실패했습니다: ' + error.message); return false }
    await refreshChildren()
    return true
  }

  const toggleInterest = async (tag: string) => {
    if (!selectedChild) return
    setSaving(true)
    const newInterests = interests.includes(tag)
      ? interests.filter((i) => i !== tag)
      : [...interests, tag]
    const ok = await saveInterests(newInterests)
    setSaving(false)
    if (ok && !interests.includes(tag)) setExpandedInterest(tag)
  }

  const addCustom = async () => {
    const tag = customInput.trim()
    if (!tag || !selectedChild || interests.includes(tag)) return
    setSaving(true)
    const ok = await saveInterests([...interests, tag])
    if (ok) { setCustomInput(''); setExpandedInterest(tag) }
    setSaving(false)
  }

  const removeInterest = async (tag: string) => {
    if (!selectedChild) return
    setSaving(true)
    const ok = await saveInterests(interests.filter((i) => i !== tag))
    if (ok && expandedInterest === tag) setExpandedInterest(null)
    setSaving(false)
  }

  if (!selectedChild) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 p-8">
        <p className="text-center">아이를 선택해 주세요.</p>
      </div>
    )
  }

  const presetActive = interests.filter((i) => INTEREST_DB[i])
  const customInterests = interests.filter((i) => !INTEREST_DB[i])
  const allActive = [...presetActive, ...customInterests]

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">⭐ {selectedChild.name}의 관심사</h1>
        <p className="text-gray-500 text-sm mt-1">관심사를 선택하거나 직접 입력하면 AI가 관련 콘텐츠를 추천해드려요!</p>
      </div>

      {/* 관심사 선택 */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm mb-5">
        <h2 className="font-semibold text-gray-700 mb-3 text-sm">관심사 선택하기</h2>
        <div className="flex flex-wrap gap-2">
          {PRESET_INTERESTS.map((tag) => {
            const info = INTEREST_DB[tag]
            const active = interests.includes(tag)
            return (
              <button key={tag} onClick={() => toggleInterest(tag)} disabled={saving}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  active ? 'text-white border-transparent shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
                style={active ? { backgroundColor: info.color, borderColor: info.color } : {}}>
                <span>{info.emoji}</span>
                <span>{tag}</span>
                {active && <X className="w-3 h-3 opacity-80" />}
              </button>
            )
          })}
        </div>

        {/* 직접 입력 */}
        <div className="mt-4 flex gap-2">
          <input type="text" value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            placeholder="직접 입력 (예: 마인크래프트, 발레, 수영...)"
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          <button onClick={addCustom} disabled={!customInput.trim() || saving}
            className="px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-40 flex items-center gap-1 flex-shrink-0">
            <Plus className="w-4 h-4" /> 추가
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">💡 직접 입력한 주제는 AI가 자동으로 관련 콘텐츠를 생성해드려요</p>

        {customInterests.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {customInterests.map((tag) => (
              <span key={tag} className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                ✨ {tag}
                <button onClick={() => removeInterest(tag)} className="hover:text-purple-900 ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 관심사 콘텐츠 */}
      {allActive.length === 0 ? (
        <div className="text-center py-16 text-gray-300">
          <p className="text-5xl mb-4">🌟</p>
          <p className="text-lg font-medium text-gray-400">위에서 관심사를 선택해보세요!</p>
          <p className="text-sm text-gray-300 mt-1">유튜브 영상과 사진을 추천해드려요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allActive.map((tag) => {
            const info = INTEREST_DB[tag]
            const auto = info ? null : getAutoContent(tag)
            const isExpanded = expandedInterest === tag
            const color = info?.color ?? auto?.color ?? '#6366f1'
            const emoji = info?.emoji ?? auto?.emoji ?? '✨'
            const description = info?.description ?? auto?.description ?? ''

            return (
              <div key={tag} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* 헤더 */}
                <button className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedInterest(isExpanded ? null : tag)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: color + '20' }}>
                      {emoji}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-800 text-sm md:text-base">{tag}</h3>
                      {description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{description.slice(0, 45)}...</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {isExpanded
                      ? <ChevronUp className="w-5 h-5 text-gray-400" />
                      : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {/* 탭 — 프리셋은 3개, 커스텀은 2개 */}
                    <div className="flex border-b border-gray-100 px-4 overflow-x-auto">
                      {(info
                        ? [['videos', '📹 영상'], ['images', '🖼️ 사진'], ['facts', '💡 사실']]
                        : [['videos', '📹 영상'], ['facts', '💡 사실']]
                      ).map(([t, label]) => (
                        <button key={t} onClick={() => setActiveTab(t as typeof activeTab)}
                          className={`px-3 md:px-4 py-3 text-xs font-medium transition-colors border-b-2 -mb-px flex-shrink-0 ${
                            activeTab === t ? 'border-current font-semibold' : 'border-transparent text-gray-400 hover:text-gray-600'
                          }`}
                          style={activeTab === t ? { color, borderColor: color } : {}}>
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="p-4">
                      {/* 영상 탭 */}
                      {activeTab === 'videos' && (
                        <div className="space-y-3">
                          {info ? (
                            <>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {info.videos.map((v) => <YouTubeCard key={v.id} video={v} />)}
                              </div>
                              <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(info.searchQuery)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border-2"
                                style={{ color, borderColor: color + '40', backgroundColor: color + '08' }}>
                                <Search className="w-4 h-4" />
                                "{info.searchQuery}" 유튜브에서 더 보기
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </>
                          ) : (
                            auto?.searchQueries.map((q) => (
                              <YouTubeSearchCard key={q} query={q} color={color} />
                            ))
                          )}
                        </div>
                      )}

                      {/* 사진 탭 (프리셋 전용) */}
                      {activeTab === 'images' && info && (
                        <div>
                          <div className="grid grid-cols-3 gap-3">
                            {info.images.map((img) => (
                              <div key={img.url} className="rounded-xl overflow-hidden shadow-sm">
                                <img src={img.url} alt={img.alt} className="w-full h-24 md:h-36 object-cover" />
                                <p className="text-xs text-center text-gray-500 py-1.5 bg-gray-50">{img.alt}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                            {info.activities.map((a) => (
                              <div key={a} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                                style={{ backgroundColor: color + '10', color }}>
                                <span className="font-bold">✓</span> {a}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 사실 탭 */}
                      {activeTab === 'facts' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            {(info?.funFacts ?? auto?.funFacts ?? []).map((fact, i) => (
                              <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                                style={{ backgroundColor: color + '10' }}>
                                <span className="text-xl flex-shrink-0">{['🌟', '🎯', '🔥', '💎'][i % 4]}</span>
                                <p className="text-sm font-medium" style={{ color }}>{fact}</p>
                              </div>
                            ))}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-2">🎯 추천 활동</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {(info?.activities ?? auto?.activities ?? []).map((a) => (
                                <div key={a} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                                  style={{ backgroundColor: color + '10', color }}>
                                  <span className="font-bold">✓</span> {a}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
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
