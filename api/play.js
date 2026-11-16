const G = require('../lib/game');
const C = G.C;
const send = (res, code, obj) => res.status(code).json(obj);

const card = (c) => ({ ...c, nome: C.POKEMON[c.pk].nome });
const STAGE_OF = { misterio_submit: 'misterio', pesquisa_answer: 'pesquisa', treino_train: 'treino', treino_done: 'treino', conserte_submit: 'conserte' };

async function join(res, body) {
  const nick = String(body.nick || '').trim().replace(/\s+/g, ' ');
  if (!/^[\p{L}\p{N} _.\-!?]{2,24}$/u.test(nick)) return send(res, 400, { error: 'Use de 2 a 24 caracteres (letras, números, espaço). Nada de nome real!' });
  const ps = await G.allPlayers();
  if (ps.length >= G.MAX_PLAYERS) return send(res, 400, { error: 'Sala cheia.' });
  if (ps.some((p) => G.norm(p.nick) === G.norm(nick))) return send(res, 400, { error: 'Esse apelido já está em uso. Escolha outro!' });
  const id = require('crypto').randomBytes(8).toString('hex');
  await G.savePlayer(G.newPlayer(id, nick));
  return send(res, 200, { id, nick });
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return send(res, 405, { error: 'method' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const action = String(body.action || '');
    if (action === 'join') return await join(res, body);

    const p = await G.loadPlayer(body.id);
    if (!p) return send(res, 401, { error: 'unknown_player' });

    const expected = action === 'enter' ? body.stage : STAGE_OF[action] || (action.startsWith('colou_') ? 'colou' : null);
    let st = await G.getState();
    if (expected && st.stage !== expected) st = await G.getState(true); // outra cópia do servidor pode estar 1s atrasada
    const now = Date.now();
    const remainingMs = st.deadline ? Math.max(0, st.deadline - now) : null;
    const elapsed = now - (st.startedAt || now);
    const limit = st.deadline && st.startedAt ? st.deadline - st.startedAt : 180000;
    const need = (stage) => {
      if (st.stage !== stage) { send(res, 409, { error: 'closed', stage: st.stage }); return false; }
      if (st.deadline && now > st.deadline + 2000) { send(res, 409, { error: 'closed', stage: st.stage, timeup: true }); return false; }
      return true;
    };

    // ---------- entrar numa etapa ----------
    if (action === 'enter') {
      const stage = body.stage;
      if (!need(stage)) return;
      const base = { done: G.isDone(p, stage), points: p.scores[stage] || 0, remainingMs };
      if (stage === 'misterio') return send(res, 200, { ...base, cards: C.MISTERIO.cards.map((c) => ({ ...card(c), real: C.POKEMON[c.pk].tipo })), pistas: C.MISTERIO.pistas });
      if (stage === 'pesquisa') return send(res, 200, { ...base, citacao: C.PESQUISA.citacao, url: C.PESQUISA.url, prompts: C.PESQUISA.questions.map((q) => q.prompt), answered: p.pesquisa.answered });
      if (stage === 'treino') return send(res, 200, { ...base, escolher: C.TREINO.escolher, pool: C.TREINO.pool.map((c) => ({ ...card(c), tipo: C.POKEMON[c.pk].tipo, cor: C.POKEMON[c.pk].cor })), teste: C.TREINO.teste.map(card), tentativas: p.treino.tentativas, melhor: p.treino.melhor });
      if (stage === 'colou') return send(res, 200, { ...base, total: C.COLOU.situations.length, idx: p.colou.idx });
      if (stage === 'conserte') return send(res, 200, { ...base, exemplos: C.CONSERTE.exemplos, pokemon: Object.entries(C.POKEMON).map(([pk, v]) => ({ pk, ...v })), fundos: C.FUNDOS, vicio: C.VICIO });
      return send(res, 400, { error: 'stage' });
    }

    // ---------- 1) Mistério ----------
    if (action === 'misterio_submit') {
      if (!need('misterio')) return;
      if (p.misterio.done) return send(res, 200, { already: true, points: p.scores.misterio });
      const marks = Array.isArray(body.marks) ? body.marks.slice(0, C.MISTERIO.cards.length) : [];
      const pistas = Array.isArray(body.pistas) ? body.pistas.filter((x) => C.MISTERIO.pistas.includes(x)) : [];
      if (marks.length !== C.MISTERIO.cards.length || marks.some((m) => typeof m !== 'boolean')) return send(res, 400, { error: 'Marque se a IA acertou ou errou em todas as fotos!' });
      if (!pistas.length) return send(res, 400, { error: 'Escolha o que a IA estava olhando.' });
      const certo = C.MISTERIO.cards.map((c) => c.guess === C.POKEMON[c.pk].tipo);
      const marcasOk = marks.filter((m, i) => m === certo[i]).length;
      const acertouPistas = C.MISTERIO.certas.filter((x) => pistas.includes(x)).length;
      const erradas = pistas.filter((x) => !C.MISTERIO.certas.includes(x)).length;
      let ptsPista = 0;
      if (acertouPistas === C.MISTERIO.certas.length && !erradas) ptsPista = C.POINTS.misterioPista;
      else if (acertouPistas > 0) ptsPista = C.POINTS.misterioPistaParcial;
      const pts = marcasOk * C.POINTS.misterioMarca + ptsPista + (ptsPista ? G.timePts(elapsed, limit, C.POINTS.misterioTime) : 0);
      p.misterio = { done: true, marks, pistas }; p.scores.misterio = pts;
      await G.savePlayer(p);
      return send(res, 200, { points: pts, marcasOk, total: certo.length, certo, pistaCompleta: ptsPista === C.POINTS.misterioPista, certas: C.MISTERIO.certas });
    }

    // ---------- 3) Pesquisa ----------
    if (action === 'pesquisa_answer') {
      if (!need('pesquisa')) return;
      const qi = Number(body.qi); const q = C.PESQUISA.questions[qi];
      if (!q) return send(res, 400, { error: 'qi' });
      if (p.pesquisa.answered[qi]) return send(res, 200, { correct: true, already: true });
      const ans = G.norm(body.text);
      if (!(ans.length > 0 && G.matches(ans, q.accept))) return send(res, 200, { correct: false });
      const pts = C.POINTS.pesquisaBase + G.timePts(elapsed, limit, C.POINTS.pesquisaTime);
      p.pesquisa.answered[qi] = true; p.scores.pesquisa += pts;
      await G.savePlayer(p);
      return send(res, 200, { correct: true, points: pts, allDone: p.pesquisa.answered.every(Boolean) });
    }

    // ---------- 4) Treinador ----------
    if (action === 'treino_train') {
      if (!need('treino')) return;
      if (p.treino.done) return send(res, 200, { already: true });
      const ids = [...new Set(Array.isArray(body.ids) ? body.ids : [])];
      const cards = C.TREINO.pool.filter((c) => ids.includes(c.id));
      if (cards.length !== C.TREINO.escolher) return send(res, 400, { error: `Escolha exatamente ${C.TREINO.escolher} fotos de treino.` });
      const r = G.treinar(cards);
      p.treino.tentativas += 1;
      if (r.acertos > p.treino.melhor) p.treino.melhor = r.acertos;
      const pts = p.treino.melhor * C.POINTS.treinoAcerto + (p.treino.melhor === 4 ? C.POINTS.treinoPerfeito : 0);
      p.scores.treino = pts;
      if (r.acertos === 4) p.treino.done = true;
      await G.savePlayer(p);
      return send(res, 200, { ...r, prova: r.prova.map((x) => ({ ...card(x), real: x.real, palpite: x.palpite, por: x.por, ok: x.ok })), points: pts, melhor: p.treino.melhor, tentativas: p.treino.tentativas, done: p.treino.done });
    }
    if (action === 'treino_done') {
      if (!need('treino')) return;
      p.treino.done = true; await G.savePlayer(p);
      return send(res, 200, { done: true, points: p.scores.treino });
    }

    // ---------- 5) Aprendeu ou colou? ----------
    if (action === 'colou_next' || action === 'colou_answer') {
      if (!need('colou')) return;
      const items = C.COLOU.situations; const s = p.colou;
      if (action === 'colou_next') {
        if (s.idx >= items.length) return send(res, 200, { done: true, points: p.scores.colou });
        if (!s.sentAt || now - s.sentAt > C.COLOU.limitMs + 2000) { s.sentAt = now; await G.savePlayer(p); }
        const it = items[s.idx];
        return send(res, 200, { index: s.idx, total: items.length, q: it.text, opts: C.COLOU.options, bonus: !!it.bonus, remainingMs: Math.max(0, C.COLOU.limitMs - (now - s.sentAt)) });
      }
      if (!s.sentAt || s.idx >= items.length) return send(res, 409, { error: 'no_question' });
      const it = items[s.idx]; const el = now - s.sentAt; const choice = Number(body.choice);
      const inTime = el <= C.COLOU.limitMs + 1500; const correct = inTime && choice === it.correct;
      let pts = correct ? C.POINTS.colouBase + G.timePts(el, C.COLOU.limitMs, C.POINTS.colouTime) : 0;
      if (correct && it.bonus) pts *= 2;
      s.idx += 1; s.sentAt = null; p.scores.colou += pts;
      await G.savePlayer(p);
      return send(res, 200, { correct, correctIndex: it.correct, points: pts, why: it.why, timedOut: !inTime, done: s.idx >= items.length });
    }

    // ---------- 6) Conserte a Pokédex ----------
    if (action === 'conserte_submit') {
      if (!need('conserte')) return;
      if (p.conserte.done) return send(res, 200, { already: true, points: p.scores.conserte });
      const ex = (Array.isArray(body.ex) ? body.ex : []).slice(0, C.CONSERTE.exemplos).filter((e) => e && C.POKEMON[e.pk] && C.FUNDOS[e.fundo]).map((e) => ({ pk: e.pk, fundo: e.fundo }));
      if (ex.length !== C.CONSERTE.exemplos) return send(res, 400, { error: `Monte os ${C.CONSERTE.exemplos} exemplos (Pokémon + fundo).` });
      const frase = String(body.frase || '').trim().replace(/\s+/g, ' ').slice(0, 160);
      const quebraCor = ex.some((e) => C.POKEMON[e.pk].cor !== C.VICIO[C.POKEMON[e.pk].tipo].cor);
      const quebraFundo = ex.some((e) => e.fundo !== C.VICIO[C.POKEMON[e.pk].tipo].fundo);
      const pts = (quebraCor ? C.POINTS.conserteCor : 0) + (quebraFundo ? C.POINTS.conserteFundo : 0) + (frase.length >= C.CONSERTE.minFrase ? C.POINTS.conserteFrase : 0);
      p.conserte = { done: true, ex, frase, quebra: { cor: quebraCor, fundo: quebraFundo }, at: now }; p.scores.conserte = pts;
      await G.savePlayer(p);
      return send(res, 200, { points: pts, quebraCor, quebraFundo });
    }

    // ---------- ranking e final ----------
    if (action === 'ranking') {
      const snap = await G.getSnapshot();
      const me = snap.pos[p.id] ? { rank: snap.pos[p.id][0], total: snap.pos[p.id][1] } : null;
      return send(res, 200, { top: snap.top, count: snap.count, me, myTotal: p.total });
    }
    if (action === 'final') {
      const all = G.ranking(await G.allPlayers());
      return send(res, 200, { total: p.total, rank: all.findIndex((x) => x.id === p.id) + 1, count: all.length, scores: p.scores });
    }
    if (action === 'me') return send(res, 200, { nick: p.nick, total: p.total });
    return send(res, 400, { error: 'action' });
  } catch (e) { return send(res, 500, { error: String(e.message || e) }); }
};
