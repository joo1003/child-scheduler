import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { FamilyMessage } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Send, Users, Smile } from 'lucide-react'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

const ROLE_COLORS: Record<string, string> = {
  parent: '#6366f1',
  child: '#f59e0b',
}

const ROLE_EMOJI: Record<string, string> = {
  parent: '👨‍👩',
  child: '🧒',
}

// Kaomoji and sticker strings sent as text
const KAOMOJI_LIST = [
  '(◕ᴗ◕✿)','(◠‿◠)','(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧','ʕ•ᴥ•ʔ','(｡♥‿♥｡)','(◍•ᴗ•◍)❤',
  '(っ˘ω˘ς)','(•ω•)','(*＾▽＾*)','(≧◡≦)','(˘▽˘>ԅ( ˘▽˘)','ヽ(•‿•)ノ',
  '(ᵔᴥᵔ)','(≧∇≦)/','(づ｡◕‿‿◕｡)づ','\\(^o^)/','(o^▽^o)','(´｡• ω •｡`)',
  '(*^‿^*)','( ˘ ³˘)♥','(◡‿◡*)','(ﾉ´ヮ`)ﾉ*: ･ﾟ','ฅ^•ﻌ•^ฅ','(^・ω・^ )',
  'ʕっ•ᴥ•ʔっ','(◕‿◕)♡','(っ◔◡◔)っ ♥','(*˘︶˘*)','(≧ω≦)','(◕ω◕✿)',
  '(oﾟvﾟ)ノ','( ｡ớ ₃ờ)','(ง •̀_•́)ง','(๑•̀ㅂ•́)و✧','(((o(*ﾟ▽ﾟ*)o)))','(*/ω＼*)',
]

const CUTE_EMOJI_LIST = [
  '🥺','🥹','🤩','😍','🥰','😘','😊','🤗','😋','🤭',
  '💕','💖','💗','💓','💞','💝','💘','❤️','🧡','💛','💚','💙','💜',
  '✨','⭐','🌟','💫','🌸','🌺','🌼','🌻','🍀','🦋',
  '🐣','🐥','🐰','🐹','🐱','🐶','🐼','🐨','🦊','🐻',
  '🍓','🍑','🍒','🍰','🧁','🍭','🍬','🍫','🍩','🧃',
  '👑','🎀','🎁','🎈','🎉','🎊','🌈','🎶','🎵','💌',
  '👶','🧒','👧','🧑','🙌','👏','🤝','👍','✌️','🤞',
  '🛁','🧸','🪀','🎠','🎡','🎪','🏆','🥇','🎗️','🎯',
]

const STICKER_LIST = [
  'ㅋㅋㅋ','ㅎㅎ','ㅠㅠ','ㅜㅜ','^^','^^*','~~~~~','!!!','???','ㅋㅋ',
  'ㄱㄱ','ㄴㄴ','ㅇㅇ','ㅗㅗ','ㄷㄷ','ㄲㄲ','ㅊㅋ','ㅂㅂ','ㅈㅅ','ㅍㅍ',
  '♥♥♥','♡♡♡','★★★','☆☆☆','♪♪♪','~♡~','♥_♥','(*^^*)','(><)','(T_T)',
  '(^_^)/','(>_<)','(-.-)zzz','(￣▽￣)','(-_-)','(^ω^)','(*´▽`*)','(´；ω；`)',
  '💕감사해요','💖사랑해','😄좋아요','👍최고!','🎉대박!','😂ㅋㅋㅋ','🥺보고싶어','😍예뻐요',
]

const EMOJI_CATEGORIES = [
  {
    label: '표정',
    emojis: ['😀','😁','😂','🤣','😃','😄','😅','😆','😇','😈','😉','😊','😋','😌','😍','🥰','😎','😏','😐','😑','😒','😓','😔','😕','😖','😗','😘','😙','😚','😛','😜','😝','😞','😟','😠','😡','😢','😣','😤','😥','😦','😧','😨','😩','😪','😫','😬','😭','😮','😯','😰','😱','😲','😳','😴','😵','😶','😷','🤒','🤓','🤔','🤕','🤗','🤠','🤡','🤢','🤣','🤤','🤥','🤧','🤨','🤩','🤪','🤫','🤬','🤭','🥺','🥹'],
  },
  {
    label: '동물',
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐈','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿','🦔'],
  },
  {
    label: '음식',
    emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶','🫑','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋','🍵','☕','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉'],
  },
  {
    label: '스포츠',
    emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🥊','🥋','🥅','⛳','🏹','🎣','🤿','🎽','🎿','🛷','🥌','⛸','🏆','🥇','🥈','🥉','🏅','🎖','🎗','🏋','🤸','⛹','🤺','🤾','🏌','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🤼','🤹'],
  },
  {
    label: '사물',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','✨','⭐','🌟','💫','🔥','🌈','☀️','🌙','⚡','❄️','🌊','🎵','🎶','🎉','🎊','🎈','🎁','🎀','🎮','🕹','🎲','♟','🎯','🎳','🎭','🎨','🖼','🎪','🎟','🎬','🎤','🎧','🎷','🎸','🎹','🎺','🎻','🪘','🥁','📱','💻','🖥','⌨️','🖱','🖨','📷','📸','📹','📺','📻','🎙','🔭','🔬','💡','🔦','📚','📖','✏️','📝','🖊','📌','📍','🗂','📁','📂','🗓','📅','📆'],
  },
]

function formatTime(dateStr: string) {
  const d = parseISO(dateStr)
  if (isToday(d)) return format(d, 'a h:mm', { locale: ko })
  if (isYesterday(d)) return '어제 ' + format(d, 'a h:mm', { locale: ko })
  return format(d, 'M/d a h:mm', { locale: ko })
}

export default function ChatPage() {
  const { user, myFamily, myMember } = useAuth()
  const [messages, setMessages] = useState<FamilyMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [activeEmojiTab, setActiveEmojiTab] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  const fetchMessages = async () => {
    if (!myFamily) return
    const { data } = await supabase
      .from('family_messages')
      .select('*')
      .eq('family_id', myFamily.id)
      .order('created_at', { ascending: true })
      .limit(200)
    if (data) setMessages(data)
  }

  useEffect(() => {
    fetchMessages()
  }, [myFamily])

  // Realtime subscription
  useEffect(() => {
    if (!myFamily) return

    const channel = supabase
      .channel(`chat:${myFamily.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'family_messages', filter: `family_id=eq.${myFamily.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as FamilyMessage])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [myFamily])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current
    if (!el) { setInput((p) => p + emoji); return }
    const start = el.selectionStart ?? input.length
    const end = el.selectionEnd ?? input.length
    const newVal = input.slice(0, start) + emoji + input.slice(end)
    setInput(newVal)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + emoji.length, start + emoji.length)
    }, 0)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !myFamily || !user || !myMember) return
    setSending(true)
    const content = input.trim()
    setInput('')
    setShowEmojiPicker(false)
    await supabase.from('family_messages').insert({
      family_id: myFamily.id,
      user_id: user.id,
      display_name: myMember.display_name,
      role: myMember.role,
      content,
    })
    setSending(false)
  }

  if (!myFamily) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>가족 설정 후 이용할 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
          <Users className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h1 className="font-bold text-gray-800">{myFamily.name}</h1>
          <p className="text-xs text-gray-400">가족 채팅</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-300">
            <p className="text-4xl mb-2">💬</p>
            <p>첫 메시지를 보내보세요!</p>
          </div>
        )}
        {messages.map((msg, idx) => {
          const isMe = msg.user_id === user?.id
          const prevMsg = messages[idx - 1]
          const showAvatar = !prevMsg || prevMsg.user_id !== msg.user_id

          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              {!isMe && (
                <div className="flex-shrink-0 w-8">
                  {showAvatar && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: ROLE_COLORS[msg.role] ?? '#6366f1' }}>
                      {msg.display_name[0]}
                    </div>
                  )}
                </div>
              )}

              <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                {showAvatar && !isMe && (
                  <span className="text-xs text-gray-400 ml-1">
                    {ROLE_EMOJI[msg.role] ?? ''} {msg.display_name}
                  </span>
                )}
                <div className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                  isMe
                    ? 'bg-blue-500 text-white rounded-br-md'
                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md shadow-sm'
                }`}>
                  {msg.content}
                </div>
                <span className="text-[10px] text-gray-300 px-1">{formatTime(msg.created_at)}</span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="mx-4 mb-2 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-hide">
            {['😊 표정','🐶 동물','🍕 음식','⚽ 스포츠','💝 사물','(◕ᴗ◕) 카오모지','🌸 귀여운','💬 스티커'].map((label, i) => (
              <button
                key={label}
                onClick={() => setActiveEmojiTab(i)}
                className={`px-3 py-2 text-xs font-medium flex-shrink-0 transition-colors whitespace-nowrap ${
                  activeEmojiTab === i ? 'text-pink-500 border-b-2 border-pink-400' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Content */}
          <div className="p-3 h-44 overflow-y-auto">
            {activeEmojiTab < 5 ? (
              /* Standard emoji grid */
              <div className="grid grid-cols-10 gap-1">
                {EMOJI_CATEGORIES[activeEmojiTab].emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="w-8 h-8 text-xl flex items-center justify-center rounded-lg hover:bg-pink-50 transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : activeEmojiTab === 5 ? (
              /* Kaomoji */
              <div className="grid grid-cols-2 gap-1.5">
                {KAOMOJI_LIST.map((k) => (
                  <button
                    key={k}
                    onClick={() => insertEmoji(k)}
                    className="px-2 py-1.5 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl transition-colors text-left truncate font-mono"
                  >
                    {k}
                  </button>
                ))}
              </div>
            ) : activeEmojiTab === 6 ? (
              /* Cute emoji */
              <div className="grid grid-cols-10 gap-1">
                {CUTE_EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="w-8 h-8 text-xl flex items-center justify-center rounded-lg hover:bg-pink-50 transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : (
              /* Sticker text */
              <div className="grid grid-cols-2 gap-1.5">
                {STICKER_LIST.map((s) => (
                  <button
                    key={s}
                    onClick={() => insertEmoji(s)}
                    className="px-2 py-1.5 text-xs bg-yellow-50 hover:bg-yellow-100 text-yellow-800 rounded-xl transition-colors text-left truncate"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className="px-4 py-3 bg-white border-t border-gray-100 flex gap-2 items-center">
        <button
          type="button"
          onClick={() => setShowEmojiPicker((p) => !p)}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors flex-shrink-0 ${
            showEmojiPicker ? 'bg-yellow-100 text-yellow-500' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          }`}
        >
          <Smile className="w-5 h-5" />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지 입력..."
          className="flex-1 px-4 py-2.5 bg-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-10 h-10 bg-blue-500 rounded-2xl flex items-center justify-center hover:bg-blue-600 disabled:opacity-40 transition-colors flex-shrink-0"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </form>
    </div>
  )
}
