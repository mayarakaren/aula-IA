// Conteúdo da aula "A IA só aprende o que os dados mostram" (EDITE AQUI). Respostas certas ficam só no servidor.

const STAGES = ['lobby', 'detetive', 'pesquisa', 'treino', 'auditoria', 'plano', 'closed', 'final'];

// Prazo global de cada etapa (ms). A etapa fecha sozinha pra todos. 60000 = 1 min.
const STAGE_TIMERS = { detetive: 210000, pesquisa: 240000, treino: 240000, auditoria: 150000, plano: 150000 };

// ---------- Atividade 1: Detetive de dados (IA de pintas de pele) ----------
// Um hospital treinou uma IA para dizer se uma pinta é "Suspeita" (pode ser câncer) ou "Benigna".
// Nas fotos de treino, as pintas suspeitas quase sempre tinham uma RÉGUA ao lado (o médico media a lesão).
// tom = tom de pele da ilustração (1 a 6) · lesao = como a pinta é de verdade · regua = tem régua na foto
// olhou = onde a IA realmente olhou (mapa de calor): 'lesao' ou 'fora' (fora da pinta: na régua ou na borda)
const DETETIVE = {
  fotos: [
    { id: 's1', tom: 1, lesao: 'suspeita', regua: true, real: 'Suspeita', ia: 'Suspeita', conf: 97, olhou: 'fora' },
    { id: 's2', tom: 4, lesao: 'benigna', regua: true, real: 'Benigna', ia: 'Suspeita', conf: 94, olhou: 'fora' },
    { id: 's3', tom: 2, lesao: 'suspeita', regua: false, real: 'Suspeita', ia: 'Benigna', conf: 89, olhou: 'fora' },
    { id: 's4', tom: 5, lesao: 'benigna', regua: false, real: 'Benigna', ia: 'Benigna', conf: 90, olhou: 'lesao' },
    { id: 's5', tom: 3, lesao: 'suspeita', regua: true, real: 'Suspeita', ia: 'Suspeita', conf: 95, olhou: 'fora' },
    { id: 's6', tom: 6, lesao: 'benigna', regua: true, real: 'Benigna', ia: 'Suspeita', conf: 92, olhou: 'fora' },
  ],
  regras: ['Tem régua na foto = suspeita', 'Pinta escura e irregular = suspeita', 'Pinta grande = suspeita', 'Pele clara = suspeita'],
  regraCerta: 0,
};

// ---------- Atividade 3: Pesquisa no artigo (Anais Brasileiros de Dermatologia, 2025) ----------
// busca = palavra para procurar com Ctrl+F no PDF · onde = seção e página
const PESQUISA = {
  citacao: 'Silva DLF, Rubinho R, Denofre A, Avila S, Magalhães RF. Inteligência artificial em dermatoses inflamatórias: onde estamos e para onde vamos? An Bras Dermatol. 2025;100(5):501164.',
  url: '/artigo.pdf',
  site: 'https://www.anaisdedermatologia.org.br/en-inteligencia-artificial-em-dermatoses-inflamatorias-articulo-S2666275225001237',
  questions: [
    { prompt: 'Com quais tons de pele a maioria dos algoritmos é treinada?', onde: 'Conclusão · p. 6', busca: 'algoritmos é treinada', dica: 'São dois tons. Leia a frase logo depois de "algoritmos é treinada com indivíduos de pele...".', accept: [['branc', 'asiat'], ['clar', 'asiat']] },
    { prompt: 'Para treinar um modelo de aprendizado profundo, o ideal é usar mais de quantas imagens?', onde: 'Psoríase · p. 2', busca: 'idealmente', dica: 'É um número redondo, em milhares. Está na frase que começa com "idealmente".', accept: [['10 000'], ['10000'], ['dez mil'], ['10 mil']] },
    { prompt: 'Em quais regiões do mundo foi criada a maioria dos modelos de IA?', onde: 'Outras dermatoses · p. 5', busca: 'maioria dos modelos', dica: 'São duas regiões: um continente e uma parte da Ásia.', accept: [['europa', 'asi'], ['europa', 'leste']] },
  ],
  norteadora: 'Uma IA de dermatologia treinada na Europa e na Ásia vai ser usada numa UBS no Brasil. O que pode dar errado, e que dados você exigiria antes de confiar nela?',
  minNorteadora: 40,
};

// ---------- Atividade 4: Treinador de IA (Pokémon) ----------
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
  limitMs: 15000,
  options: ['Atalho', 'Faltou representatividade', 'Aprendeu de verdade'],
  casos: [
    { text: 'Uma IA de pintas diz "suspeita" sempre que a pele tem uma marcação de caneta feita pelo médico.', correct: 0, why: 'A caneta não tem nada a ver com a doença: é um atalho na foto (Winkler et al., 2019).' },
    { text: 'Uma IA de câncer de pele treinada quase só com pele branca e asiática erra mais em pacientes de pele negra e parda.', correct: 1, why: 'Esses pacientes quase não estavam nos dados. É o alerta da Conclusão do artigo (p. 6).' },
    { text: 'Uma IA de raio-X acerta no hospital onde foi treinada e erra em outro: ela olhava a marca do hospital na imagem.', correct: 0, why: 'A marca do hospital era uma pista fácil, sem relação com o pulmão (Geirhos et al., 2020).' },
    { text: 'Treinada com fotos de várias UBSs, celulares, luzes e tons de pele, a IA acerta num hospital que nunca viu.', correct: 2, why: 'Dados variados obrigam a IA a aprender a lesão, não o detalhe da foto.' },
    { text: 'Uma IA de psoríase quase não viu fotos de cotovelos e joelhos no treino e erra justamente nessas áreas.', correct: 1, why: 'O artigo cita essa limitação: áreas curvas, como cotovelos e joelhos (p. 3).' },
    { text: '⚡ Vale dobrado: a IA diz "grave" para fotos feitas com o aparelho do hospital especializado e "leve" para fotos de celular.', correct: 0, why: 'Ela aprendeu o tipo de foto, não a doença. Por isso o artigo fala em padronizar fotos e iluminação (p. 5).', bonus: true },
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
