// Recebe a foto (Base64), pede ao Claude (visão) os alimentos e macros e devolve JSON.
import { json, requireUser } from './lib/auth.mjs';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5'; // rápido; troca por claude-sonnet-5-5 se o teu plano Netlify permitir >10 s
const TIMEOUT = Number(process.env.ANALYZE_TIMEOUT_MS || 8500);   // as funções síncronas do Netlify têm ~10 s por omissão
const PROMPT = `Analisa esta foto de uma refeição, prato ou produtos alimentares.
Identifica cada alimento visível, estima a gramagem e os macronutrientes TOTAIS dessa gramagem.
Se vires um rótulo nutricional, usa os valores do rótulo.
Responde APENAS com JSON válido, sem texto antes ou depois, neste formato:
{"items":[{"n":"nome em português","g":0,"kcal":0,"p":0,"c":0,"f":0}],"note":"observação curta opcional"}
n = alimento, g = gramas, kcal = calorias, p = proteína (g), c = hidratos (g), f = gordura (g). Usa números, sem unidades.`;

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método inválido' }, 405);
  const a = await requireUser(req);
  if (a.res) return a.res;
  const K = process.env.ANTHROPIC_API_KEY;
  if (!K) return json({ error: 'Falta configurar ANTHROPIC_API_KEY no Netlify.' }, 500);

  const b = await req.json().catch(() => ({}));
  const image = String(b.image || '').replace(/^data:[^,]+,/, '');
  const mt = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(b.media_type) ? b.media_type : 'image/jpeg';
  if (image.length < 100) return json({ error: 'Imagem em falta ou inválida.' }, 400);
  if (image.length > 4_500_000) return json({ error: 'Imagem demasiado grande. Tenta outra foto.' }, 413);

  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), TIMEOUT);
  const models = [...new Set([process.env.ANTHROPIC_MODEL, 'claude-haiku-5-5', 'claude-sonnet-5-5'].filter(Boolean))];
  let r, lastMsg = '';
  try {
    for (const model of models) { // se um modelo não existir/estiver indisponível na conta, tenta o seguinte
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: ctl.signal,
        headers: { 'x-api-key': K, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 800, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mt, data: image } }, { type: 'text', text: PROMPT }] }] })
      });
      if (r.ok) break;
      const t = await r.clone().json().catch(() => ({}));
      lastMsg = (t.error && t.error.message) || '';
      if (!(r.status === 404 || (r.status === 400 && /model/i.test(lastMsg)))) break;
    }
  } catch (e) {
    return json({ error: e.name === 'AbortError' ? 'A análise demorou demasiado. Tenta de novo (ou com uma foto mais simples).' : 'Não foi possível contactar a API do Claude.' }, 504);
  } finally { clearTimeout(to); }

  if (!r.ok) {
    const hint = r.status === 401 ? ' (chave ANTHROPIC_API_KEY inválida)' : r.status === 429 ? ' (limite de pedidos/saldo)' : '';
    return json({ error: `Claude API ${r.status}${hint}${lastMsg ? ': ' + lastMsg.slice(0, 140) : ''}` }, 502);
  }
  const j = await r.json();
  const txt = (j.content || []).map((c) => c.text || '').join('');
  const i = txt.indexOf('{'), k = txt.lastIndexOf('}');
  let out;
  try { out = JSON.parse(txt.slice(i, k + 1)); } catch { return json({ error: 'A resposta da IA não veio em JSON. Tenta de novo.' }, 502); }
  const num = (v) => { const x = parseFloat(String(v).replace(',', '.')); return Number.isFinite(x) && x >= 0 ? Math.round(x * 10) / 10 : 0; };
  const items = (Array.isArray(out.items) ? out.items : []).slice(0, 15).map((x) => ({ n: String(x.n || '').slice(0, 80), g: num(x.g), kcal: num(x.kcal), p: num(x.p), c: num(x.c), f: num(x.f) })).filter((x) => x.n);
  return json({ items, note: String(out.note || '').slice(0, 200) });
};
