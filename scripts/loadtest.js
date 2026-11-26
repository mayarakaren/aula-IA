// Simula N alunos + a professora passando pelas 6 atividades. Uso:
//   BASE_URL=https://seu-site.vercel.app HOST_PASSWORD=suasenha PLAYERS=40 SPEED=0.3 node scripts/loadtest.js
// SPEED=1 = tempo real. SPEED=0.2 = 5x mais rápido. ATENÇÃO: ele ZERA a sala. Nunca rode durante uma aula.
const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const PASS = process.env.HOST_PASSWORD || 'teste';
const N = Number(process.env.PLAYERS || 40);
const SPEED = Number(process.env.SPEED || 0.2);
let calls = 0, errors = 0; const lat = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

async function call(path, body, method = 'POST') {
  const t0 = performance.now(); calls++;
  try {
    const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'POST' ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    lat.push(performance.now() - t0);
    if (!r.ok && r.status !== 409 && r.status !== 400) { errors++; if (errors <= 5) console.log('  ERRO', path, r.status, JSON.stringify(j).slice(0, 140)); }
    return { status: r.status, ...j };
  } catch (e) { errors++; if (errors <= 5) console.log('  ERRO rede', e.message); return { status: 0 }; }
}
const host = (action, extra = {}) => call('/api/host', { password: PASS, action, ...extra });

async function player(i) {
  await sleep(rnd(0, 1500) * SPEED);
  const j = await call('/api/play', { action: 'join', nick: 'Aluno ' + i });
  if (!j.id) return null;
  const id = j.id; let cur = 'lobby';
  const poll = setInterval(async () => { const s = await call('/api/state', null, 'GET'); if (s.stage) cur = s.stage; }, Math.max(300, 2500 * SPEED) + rnd(0, 400));
  const waitFor = async (st) => { while (cur !== st) await sleep(80); };
  const play = (action, extra = {}) => call('/api/play', { action, id, ...extra });

  // 1) Detetive
  await waitFor('detetive'); const d = await play('enter', { stage: 'detetive' });
  await sleep(rnd(5000, 20000) * SPEED);
  const certo = d.fotos.map((f) => f.ia === f.real); const olh = ['fora', 'fora', 'fora', 'lesao', 'fora', 'fora'];
  await play('detetive_submit', { marks: certo.map((c) => (Math.random() < 0.85 ? c : !c)), olhou: olh.map((o) => (Math.random() < 0.8 ? o : o === 'fora' ? 'lesao' : 'fora')), regra: Math.random() < 0.7 ? 0 : pick([1, 2, 3]) });
  // 3) Pesquisa
  await waitFor('pesquisa'); await play('enter', { stage: 'pesquisa' });
  const ans = ['pele branca e asiatica', '10.000', 'Europa e Leste Asiatico'];
  for (let q = 0; q < 3; q++) { await sleep(rnd(3000, 9000) * SPEED); if (Math.random() < 0.2) await play('pesquisa_answer', { qi: q, text: 'nao sei' }); await play('pesquisa_answer', { qi: q, text: ans[q] }); }
  await play('pesquisa_norteadora', { text: 'A IA pode errar em peles negras e pardas, que quase nao estavam nos dados. Eu exigiria fotos de brasileiros.' });
  // 4) Treinador
  await waitFor('treino'); const t = await play('enter', { stage: 'treino' });
  const ids = t.pool.map((c) => c.id);
  const bom = ['t1', 't2', 't4', 't7', 't8', 't10'];
  for (let k = 0; k < 3; k++) {
    await sleep(rnd(4000, 12000) * SPEED);
    const escolha = k === 2 || Math.random() < 0.3 ? bom : [...ids].sort(() => Math.random() - 0.5).slice(0, 6);
    const r = await play('treino_train', { ids: escolha, previsao: Math.floor(Math.random() * 7) });
    if (r.done) break;
  }
  // 5) Auditoria
  await waitFor('auditoria'); const c = await play('enter', { stage: 'auditoria' });
  const gab = [0, 1, 0, 2, 1, 0];
  for (let q = 0; q < c.total; q++) { const n = await play('audit_next'); if (n.done) break; await sleep(rnd(1000, 7000) * SPEED); await play('audit_answer', { choice: Math.random() < 0.7 ? gab[q] : (gab[q] + 1) % 3 }); }
  // 6) Plano
  await waitFor('plano'); await play('enter', { stage: 'plano' });
  await sleep(rnd(5000, 15000) * SPEED);
  const ops = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'];
  await play('plano_submit', { ids: Math.random() < 0.5 ? ['p1', 'p3', 'p7', 'p9'] : [...ops].sort(() => Math.random() - 0.5).slice(0, 4), frase: Math.random() < 0.8 ? 'Dados variados de brasileiros evitam atalhos e erros' : '' });
  await waitFor('final'); const f = await play('final');
  clearInterval(poll); return f;
}

async function main() {
  console.log(`Teste: ${N} alunos em ${BASE} (SPEED=${SPEED})`);
  const r0 = await host('reset'); if (r0.status !== 200) { console.log('Falha no reset:', r0); process.exit(1); }
  const t0 = Date.now(); const players = Array.from({ length: N }, (_, i) => player(i + 1));
  const stageWait = async (stage, maxMs) => {
    await host('setStage', { stage });
    const end = Date.now() + maxMs * SPEED;
    while (Date.now() < end) { const b = await host('board'); if (b.doneNow >= b.count && b.count >= N) break; await sleep(500); }
    const b = await host('board'); console.log(`  [${stage}] alunos=${b.count} concluíram=${b.doneNow}`);
    await host('setStage', { stage: 'closed' }); await sleep(600);
  };
  await sleep(2500 * SPEED + 2500);
  await stageWait('detetive', 60000); await stageWait('pesquisa', 90000); await stageWait('treino', 90000); await stageWait('auditoria', 90000); await stageWait('plano', 60000);
  await host('setStage', { stage: 'final' });
  const finals = (await Promise.all(players)).filter(Boolean);
  const b = await host('board', { top: 5 });
  lat.sort((a, x) => a - x); const p = (q) => Math.round(lat[Math.min(lat.length - 1, Math.floor(lat.length * q))]);
  console.log('\n== RESULTADO ==');
  console.log(`tempo total: ${Math.round((Date.now() - t0) / 1000)}s | chamadas: ${calls} | erros: ${errors}`);
  console.log(`latência ms: mediana ${p(0.5)} | p95 ${p(0.95)} | máx ${p(1)}`);
  console.log(`alunos que chegaram ao final: ${finals.length}/${N}`);
  console.log('top 5:', b.top.map((x) => `${x.nick} ${x.total}`).join(' · '));
  console.log('painel detetive:', JSON.stringify(b.detetive.regraCount.map((r) => r.n)), '| treino:', JSON.stringify(b.treino), '| norteadora:', b.respostas.length, '| plano:', b.plano.enviaram);
  console.log(errors === 0 && finals.length === N ? '\n✅ PASSOU' : '\n⚠️ ATENÇÃO: revise os erros acima');
  process.exit(0);
}
main();
