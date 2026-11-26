// Conteúdo da aula "A IA só aprende o que os dados mostram" (EDITE AQUI). Respostas certas ficam só no servidor.

const STAGES = ['lobby', 'detetive', 'pesquisa', 'treino', 'auditoria', 'plano', 'closed', 'final'];

// Prazo global de cada etapa (ms). A etapa fecha sozinha pra todos. 60000 = 1 min.
const STAGE_TIMERS = { detetive: 210000, pesquisa: 240000, treino: 240000, auditoria: 120000, plano: 150000 };

// ---------- Atividade 1: Detetive de dados (fotos reais) ----------
// Uma IA "Cão ou Lobo?" treinada com lobos fotografados na neve. olhou = onde ela realmente olhou (mapa de calor).
const DETETIVE = {
  fotos: [
    { id: 'd1', legenda: 'Cão (husky)', real: 'Cão', ia: 'Lobo', conf: 97, olhou: 'fundo' },
    { id: 'd2', legenda: 'Cão (malamute)', real: 'Cão', ia: 'Cão', conf: 88, olhou: 'animal' },
    { id: 'd3', legenda: 'Lobo-branco', real: 'Lobo', ia: 'Cão', conf: 91, olhou: 'fundo' },
    { id: 'd4', legenda: 'Cão (husky de pelo escuro)', real: 'Cão', ia: 'Lobo', conf: 95, olhou: 'fundo' },
    { id: 'd5', legenda: 'Cão (labrador)', real: 'Cão', ia: 'Cão', conf: 93, olhou: 'animal' },
    { id: 'd6', legenda: 'Dois lobos-cinzentos', real: 'Lobo', ia: 'Cão', conf: 72, olhou: 'fundo' },
  ],
  regras: ['Se tem neve, é lobo', 'Orelha pontuda é lobo', 'Pelo cinza ou branco é lobo', 'Animal grande é lobo'],
  regraCerta: 0,
};

// ---------- Atividade 3: Pesquisa no artigo (Anais Brasileiros de Dermatologia, 2025) ----------
const PESQUISA = {
  citacao: 'Silva DLF, Rubinho R, Denofre A, Avila S, Magalhães RF. Inteligência artificial em dermatoses inflamatórias: onde estamos e para onde vamos? An Bras Dermatol. 2025;100(5):501164.',
  url: '/artigo.pdf',
  doi: 'https://doi.org/10.1016/j.abdp.2025.501164',
  questions: [
    { prompt: 'Conclusão (p. 6): a maioria dos algoritmos é treinada com pessoas de quais tons de pele?', dica: 'São dois. Procure por "pele" na Conclusão.', accept: [['branc', 'asiat'], ['clar', 'asiat']] },
    { prompt: 'Psoríase (p. 2): idealmente, um modelo de aprendizado profundo deveria ser treinado com mais de quantas imagens?', dica: 'Um número redondo, logo antes da seção de dermatite.', accept: [['10 000'], ['10000'], ['dez mil'], ['10 mil']] },
    { prompt: 'Outras dermatoses (p. 5): que condição das fotos o artigo diz ser difícil de obter em larga escala?', dica: 'Tem a ver com a qualidade da foto.', accept: [['ilumina'], ['luz'], ['padroniza'], ['qualidade']] },
  ],
  norteadora: 'Uma IA de dermatologia treinada na Europa e na Ásia vai ser usada numa UBS no Brasil. O que pode dar errado, e que dados você exigiria antes de confiar nela?',
  minNorteadora: 40,
};

// ---------- Atividade 4: Treinador da Pokédex (nível difícil) ----------
const POKEMON = {
  charmander: { nome: 'Charmander', tipo: 'Fogo', cor: 'laranja' },
  growlithe: { nome: 'Growlithe', tipo: 'Fogo', cor: 'laranja' },
  ponyta: { nome: 'Ponyta', tipo: 'Fogo', cor: 'amarelo' },
  squirtle: { nome: 'Squirtle', tipo: 'Água', cor: 'azul' },
  psyduck: { nome: 'Psyduck', tipo: 'Água', cor: 'amarelo' },
  magikarp: { nome: 'Magikarp', tipo: 'Água', cor: 'laranja' },
  krabby: { nome: 'Krabby', tipo: 'Água', cor: 'laranja' },
  bulbasaur: { nome: 'Bulbasaur', tipo: 'Planta', cor: 'verde' },
  oddish: { nome: 'Oddish', tipo: 'Planta', cor: 'azul' },
};
const FUNDOS = { vulcao: 'vulcão', mar: 'mar', grama: 'grama' };
const TREINO = {
  escolher: 6,
  maxTentativas: 3,
  pool: [
    { id: 't1', pk: 'charmander', fundo: 'vulcao' }, { id: 't2', pk: 'growlithe', fundo: 'vulcao' },
    { id: 't3', pk: 'ponyta', fundo: 'vulcao' }, { id: 't4', pk: 'charmander', fundo: 'grama' },
    { id: 't5', pk: 'squirtle', fundo: 'mar' }, { id: 't6', pk: 'psyduck', fundo: 'mar' },
    { id: 't7', pk: 'magikarp', fundo: 'mar' }, { id: 't8', pk: 'squirtle', fundo: 'grama' },
    { id: 't9', pk: 'bulbasaur', fundo: 'grama' }, { id: 't10', pk: 'oddish', fundo: 'grama' },
    { id: 't11', pk: 'bulbasaur', fundo: 'mar' }, { id: 't12', pk: 'growlithe', fundo: 'mar' },
  ],
  // prova com 6 fotos que ela nunca viu (cor e fundo enganam juntos)
  teste: [
    { pk: 'krabby', fundo: 'grama' }, { pk: 'squirtle', fundo: 'vulcao' },
    { pk: 'charmander', fundo: 'mar' }, { pk: 'oddish', fundo: 'mar' },
    { pk: 'ponyta', fundo: 'grama' }, { pk: 'psyduck', fundo: 'vulcao' },
  ],
};
TREINO.pool = TREINO.pool.filter((c) => !TREINO.teste.some((t) => t.pk === c.pk && t.fundo === c.fundo));

// ---------- Atividade 5: Auditoria relâmpago ----------
const AUDITORIA = {
  limitMs: 12000,
  options: ['Atalho', 'Faltou representatividade', 'Aprendeu de verdade'],
  casos: [
    { text: 'Uma IA diz "lobo" para um husky deitado na neve.', correct: 0, why: 'Ela aprendeu "neve = lobo". O fundo virou atalho.' },
    { text: 'Uma IA de câncer de pele treinada quase só com pele clara erra mais em pacientes de pele negra.', correct: 1, why: 'Esses pacientes quase não estavam nos dados de treino. É o alerta da Conclusão do artigo.' },
    { text: 'Uma IA de raio-X acerta no hospital onde foi treinada e erra em outro: ela olhava a marca do hospital na imagem.', correct: 0, why: 'A marca do hospital era uma pista fácil, sem relação com o pulmão (Geirhos et al., 2020).' },
    { text: 'Treinada com fotos de várias UBSs, celulares, luzes e tons de pele, a IA acerta num hospital que nunca viu.', correct: 2, why: 'Dados variados obrigam a IA a aprender a lesão, não o detalhe.' },
    { text: 'Um sistema de reconhecimento facial erra muito mais em mulheres negras, que eram poucas nos dados de treino.', correct: 1, why: 'Grupo sub-representado nos dados = mais erro nesse grupo (Buolamwini e Gebru, 2018).' },
    { text: '⚡ Vale dobrado: lesões suspeitas eram fotografadas com uma régua ao lado. A IA passou a ver "régua = câncer".', correct: 0, why: 'A régua não tem nada a ver com a doença: é um atalho escondido na foto.', bonus: true },
  ],
};

// ---------- Atividade 6: Plano de dados ----------
const PLANO = {
  escolher: 4,
  minFrase: 30,
  pergunta: 'A IA de dermatologia vai chegar às UBSs do Brasil. Escolha as 4 ações mais importantes na coleta de dados.',
  opcoes: [
    { id: 'p1', text: 'Incluir fotos de todos os tons de pele, sobretudo pele parda e negra', boa: true, por: 'representatividade' },
    { id: 'p2', text: 'Juntar mais 10 mil fotos do mesmo hospital europeu', boa: false, por: 'Mais do mesmo não muda o que a IA vê.' },
    { id: 'p3', text: 'Coletar fotos de celular em UBSs, com luz e ângulos variados', boa: true, por: 'representatividade' },
    { id: 'p4', text: 'Comemorar 99% de acerto num teste feito com fotos do próprio treino', boa: false, por: 'Testar com o que ela já viu não mede nada.' },
    { id: 'p5', text: 'Tirar réguas, marcações de caneta e bordas das fotos de treino', boa: true, por: 'atalho' },
    { id: 'p6', text: 'Treinar só com fotos de estúdio, perfeitas e iguais entre si', boa: false, por: 'A UBS real não tem fotos de estúdio.' },
    { id: 'p7', text: 'Testar a IA em um hospital que ela nunca viu antes de liberar', boa: true, por: 'validação' },
    { id: 'p8', text: 'Baixar fotos da internet sem diagnóstico de um dermatologista', boa: false, por: 'Rótulo errado ensina errado.' },
    { id: 'p9', text: 'Incluir doenças raras e lesões em áreas curvas, como cotovelo e joelho', boa: true, por: 'representatividade' },
  ],
};

// ---------- Pontuação ----------
const POINTS = {
  detMarca: 10, detOlhou: 10, detRegra: 100, detTime: 50,
  pesquisaBase: 100, pesquisaTime: 50, norteadora: 100,
  treinoAcerto: 25, treinoPerfeito: 60, treinoPrevisao: 40,
  auditBase: 100, auditTime: 50,
  planoBoa: 40, planoFrase: 40,
};

module.exports = { STAGES, STAGE_TIMERS, DETETIVE, PESQUISA, POKEMON, FUNDOS, TREINO, AUDITORIA, PLANO, POINTS };
