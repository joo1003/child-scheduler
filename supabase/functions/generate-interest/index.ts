import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { topic } = await req.json()
    if (!topic) return new Response(JSON.stringify({ error: 'topic required' }), { status: 400, headers: corsHeaders })

    const client = new Anthropic()

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `한국 초등학생 아이를 위해 "${topic}"에 대한 콘텐츠를 JSON 형식으로 만들어줘.

반드시 아래 JSON 형식만 출력해. 다른 텍스트는 절대 쓰지 마:
{
  "emoji": "주제를 나타내는 이모지 1개",
  "color": "#16진수 색상코드 (예: #7c3aed)",
  "description": "초등학생이 이해하기 쉬운 설명 2문장",
  "activities": ["체험 활동 1", "체험 활동 2", "체험 활동 3", "체험 활동 4"],
  "funFacts": ["놀라운 사실 1", "놀라운 사실 2", "놀라운 사실 3"],
  "searchQueries": ["유튜브 검색어 1", "유튜브 검색어 2", "유튜브 검색어 3", "유튜브 검색어 4"]
}

searchQueries는 유튜브에서 검색할 한국어 검색어야. "어린이 ${topic}" 스타일로 만들어줘.`
      }]
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSON 파싱 실패')

    const data = JSON.parse(jsonMatch[0])
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
