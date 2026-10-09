// Estima alimentos e nutrientes a partir de uma foto (utilizadores com sessão iniciada).
const U = process.env.SUPABASE_URL, S = process.env.SUPABASE_SERVICE_KEY, K = process.env.ANTHROPIC_API_KEY;
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
export default async (req) => {
  if (req.method !== 'POST') return J({ error: 'Método inválido' }, 405);
  const t = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const a = await fetch(U + '/auth/v1/user', { headers: { apikey: S, Authorization: 'Bearer ' + t } });
  if (!a.ok) return J({ error: 'Sem sessão' }, 401);
  const { image } = await req.json();
  if (!image || image.length > 4_000_000) return J({ error: 'Imagem inválida' }, 400);
  const prompt = 'Analisa esta foto de um prato ou de produtos alimentares. Responde APENAS com JSON: {"items":[{"n":"nome em português","g":gramas estimadas,"kcal":número,"p":proteína g,"c":hidratos g,"f":gordura g}]} com valores TOTAIS para a gramagem estimada. Se for rótulo nutricional, usa os valores do rótulo.';
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': K, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 1000, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } }, { type: 'text', text: prompt }] }] })
  });
  if (!r.ok) return J({ error: 'Falha na análise da imagem' }, 502);
  const j = await r.json();
  const txt = (j.content || []).map(c => c.text || '').join('').replace(/```json|```/g, '').trim();
  try { return J(JSON.parse(txt)); } catch { return J({ error: 'Resposta inválida da IA' }, 502); }
};
