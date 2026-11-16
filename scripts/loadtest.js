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

  // 1) Mistério
  await waitFor('misterio'); const m = await play('enter', { stage: 'misterio' });
  await sleep(rnd(5000, 20000) * SPEED);
  const marks = m.cards.map((c) => (Math.random() < 0.85 ? c.guess === c.real : !(c.guess === c.real)));
  const pistas = pick([['cor', 'fundo'], ['cor', 'fundo'], ['cor'], ['fundo'], ['forma'], ['cor', 'fundo', 'tamanho']]);
  await play('misterio_submit', { marks, pistas });
  // 3) Pesquisa
  await waitFor('pesquisa'); await play('enter', { stage: 'pesquisa' });
  const ans = ['grass', 'hospital token', 'estudantes'];
  for (let q = 0; q < 3; q++) { await sleep(rnd(4000, 12000) * SPEED); if (Math.random() < 0.2) await play('pesquisa_answer', { qi: q, text: 'nao sei' }); await play('pesquisa_answer', { qi: q, text: ans[q] }); }
  // 4) Treinador
  await waitFor('treino'); const t = await play('enter', { stage: 'treino' });
  const ids = t.pool.map((c) => c.id);
  const bom = ['t1', 't4', 't5', 't7', 't8', 't9'];
  for (let k = 0; k < 3; k++) {
    await sleep(rnd(4000, 12000) * SPEED);
    const escolha = k === 2 || Math.random() < 0.3 ? bom : [...ids].sort(() => Math.random() - 0.5).slice(0, 6);
    const r = await play('treino_train', { ids: escolha });
    if (r.done) break;
  }
  // 5) Aprendeu ou colou?
  await waitFor('colou'); const c = await play('enter', { stage: 'colou' });
  for (let q = 0; q < c.total; q++) { const n = await play('colou_next'); if (n.done) break; await sleep(rnd(1000, 6000) * SPEED); await play('colou_answer', { choice: Math.random() < 0.7 ? [0, 1, 1, 0, 1, 1][q] : 1 - [0, 1, 1, 0, 1, 1][q] }); }
  // 6) Conserte
  await waitFor('conserte'); await play('enter', { stage: 'conserte' });
  await sleep(rnd(5000, 15000) * SPEED);
  const pks = ['charmander', 'magikarp', 'squirtle', 'oddish', 'ponyta', 'bulbasaur']; const fs = ['vulcao', 'mar', 'grama'];
  await play('conserte_submit', { ex: [{ pk: pick(pks), fundo: pick(fs) }, { pk: pick(pks), fundo: pick(fs) }], frase: Math.random() < 0.8 ? 'Mostra cores e fundos diferentes pra IA' : '' });
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
  await stageWait('misterio', 60000); await stageWait('pesquisa', 90000); await stageWait('treino', 90000); await stageWait('colou', 90000); await stageWait('conserte', 60000);
  await host('setStage', { stage: 'final' });
  const finals = (await Promise.all(players)).filter(Boolean);
  const b = await host('board', { top: 5 });
  lat.sort((a, x) => a - x); const p = (q) => Math.round(lat[Math.min(lat.length - 1, Math.floor(lat.length * q))]);
  console.log('\n== RESULTADO ==');
  console.log(`tempo total: ${Math.round((Date.now() - t0) / 1000)}s | chamadas: ${calls} | erros: ${errors}`);
  console.log(`latência ms: mediana ${p(0.5)} | p95 ${p(0.95)} | máx ${p(1)}`);
  console.log(`alunos que chegaram ao final: ${finals.length}/${N}`);
  console.log('top 5:', b.top.map((x) => `${x.nick} ${x.total}`).join(' · '));
  console.log('painel mistério:', JSON.stringify(b.misterio), '| treino:', JSON.stringify(b.treino), '| mural:', b.mural.length, 'ideias');
  console.log(errors === 0 && finals.length === N ? '\n✅ PASSOU' : '\n⚠️ ATENÇÃO: revise os erros acima');
  process.exit(0);
}
main();
