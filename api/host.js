const G = require('../lib/game');
const C = G.C;
const send = (res, code, obj) => res.status(code).json(obj);
const avg = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0);

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
      // 1) Detetive
      const F = C.DETETIVE.fotos; const certo = F.map((f) => f.ia === f.real);
      const det = ps.filter((p) => p.detetive.done);
      const detetive = {
        enviaram: det.length,
        marcasMedia: avg(det.map((p) => p.detetive.marks.filter((m, i) => m === certo[i]).length)),
        olhouMedia: avg(det.map((p) => p.detetive.olhou.filter((o, i) => o === F[i].olhou).length)),
        regraCount: C.DETETIVE.regras.map((r, i) => ({ regra: r, n: det.filter((p) => p.detetive.regra === i).length, certa: i === C.DETETIVE.regraCerta })),
      };
      // 3) Pesquisa: respostas à pergunta norteadora
      const respostas = ps.filter((p) => p.pesquisa.norteadora).sort((a, b) => (b.pesquisa.at || 0) - (a.pesquisa.at || 0)).slice(0, 40).map((p) => ({ nick: p.nick, text: p.pesquisa.norteadora }));
      // 4) Treinador
      const tr = ps.filter((p) => p.treino.tentativas > 0); const tot = C.TREINO.teste.length;
      const treino = { jogaram: tr.length, perfeitos: tr.filter((p) => p.treino.melhor === tot).length, melhorMedia: avg(tr.map((p) => p.treino.melhor)), tentativasMedia: avg(tr.map((p) => p.treino.tentativas)), previram: tr.filter((p) => p.treino.previu).length, total: tot };
      // 6) Plano de dados
      const pl = ps.filter((p) => p.plano.done);
      const plano = {
        enviaram: pl.length,
        contagem: C.PLANO.opcoes.map((o) => ({ id: o.id, text: o.text, boa: o.boa, n: pl.filter((p) => p.plano.ids.includes(o.id)).length })),
        frases: pl.filter((p) => p.plano.frase).sort((a, b) => (b.plano.at || 0) - (a.plano.at || 0)).slice(0, 30).map((p) => ({ nick: p.nick, frase: p.plano.frase })),
      };
      return send(res, 200, { stage: st.stage, seq: st.seq, deadline: st.deadline, startedAt: st.startedAt, serverNow: Date.now(), count: ps.length, doneNow, top, detetive, respostas, treino, plano });
    }
    return send(res, 400, { error: 'action' });
  } catch (e) { return send(res, 500, { error: String(e.message || e) }); }
};
