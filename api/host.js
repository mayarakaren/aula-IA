const G = require('../lib/game');
const C = G.C;
const send = (res, code, obj) => res.status(code).json(obj);

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return send(res, 405, { error: 'method' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    if (!process.env.HOST_PASSWORD) return send(res, 500, { error: 'HOST_PASSWORD não configurada na Vercel.' });
    if (body.password !== process.env.HOST_PASSWORD) return send(res, 401, { error: 'Senha incorreta.' });

    if (body.action === 'setStage') {
      if (!C.STAGES.includes(body.stage)) return send(res, 400, { error: 'stage inválido' });
      return send(res, 200, await G.setStage(body.stage, body.durationMs));
    }
    if (body.action === 'extend') return send(res, 200, await G.extendDeadline(Number(body.ms) || 30000));
    if (body.action === 'reset') return send(res, 200, await G.resetAll());
    if (body.action === 'board') {
      const st = await G.getState(true);
      const ps = await G.allPlayers();
      const top = G.ranking(ps).slice(0, Number(body.top) || 8).map((p) => ({ nick: p.nick, total: p.total }));
      const doneNow = ps.filter((p) => G.isDone(p, st.stage)).length;
      // painel do Mistério
      const mis = ps.filter((p) => p.misterio.done);
      const certo = C.MISTERIO.cards.map((c) => c.guess === C.POKEMON[c.pk].tipo);
      const pistaCount = Object.fromEntries(C.MISTERIO.pistas.map((x) => [x, mis.filter((p) => p.misterio.pistas.includes(x)).length]));
      const misterio = {
        enviaram: mis.length,
        marcasMedia: mis.length ? Math.round((mis.reduce((a, p) => a + p.misterio.marks.filter((m, i) => m === certo[i]).length, 0) / mis.length) * 10) / 10 : 0,
        completas: mis.filter((p) => C.MISTERIO.certas.every((x) => p.misterio.pistas.includes(x)) && p.misterio.pistas.length === C.MISTERIO.certas.length).length,
        pistaCount,
      };
      // painel do Treinador
      const tr = ps.filter((p) => p.treino.tentativas > 0);
      const treino = { jogaram: tr.length, perfeitos: tr.filter((p) => p.treino.melhor === 4).length, tentativasMedia: tr.length ? Math.round((tr.reduce((a, p) => a + p.treino.tentativas, 0) / tr.length) * 10) / 10 : 0 };
      // mural do Conserte
      const mural = ps.filter((p) => p.conserte.done).sort((a, b) => (b.conserte.at || 0) - (a.conserte.at || 0)).slice(0, 40)
        .map((p) => ({ nick: p.nick, ex: p.conserte.ex.map((e) => ({ ...e, nome: C.POKEMON[e.pk].nome, tipo: C.POKEMON[e.pk].tipo })), frase: p.conserte.frase, quebra: p.conserte.quebra }));
      return send(res, 200, { stage: st.stage, seq: st.seq, deadline: st.deadline, startedAt: st.startedAt, serverNow: Date.now(), count: ps.length, doneNow, top, misterio, treino, mural });
    }
    return send(res, 400, { error: 'action' });
  } catch (e) { return send(res, 500, { error: String(e.message || e) }); }
};
