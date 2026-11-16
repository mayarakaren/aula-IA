// Conteúdo da aula "A IA adora colar" (EDITE AQUI). Respostas certas ficam só no servidor.

const STAGES = ['lobby', 'misterio', 'pesquisa', 'treino', 'colou', 'conserte', 'closed', 'final'];

// Prazo global de cada etapa (ms). A etapa fecha sozinha pra todos. 60000 = 1 min.
const STAGE_TIMERS = { misterio: 180000, pesquisa: 180000, treino: 180000, colou: 90000, conserte: 150000 };

// ---------- Catálogo ----------
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
const TIPOS = ['Fogo', 'Água', 'Planta'];
// a Pokédex "original" foi treinada só com isto (é daqui que vêm os atalhos)
const VICIO = { Fogo: { cor: 'laranja', fundo: 'vulcao' }, 'Água': { cor: 'azul', fundo: 'mar' }, Planta: { cor: 'verde', fundo: 'grama' } };

// ---------- Atividade 1: A Pokédex que errou ----------
// guess = o palpite da IA. A "ficha da PokéAPI" mostra o tipo real (é público).
const MISTERIO = {
  cards: [
    { pk: 'charmander', fundo: 'vulcao', guess: 'Fogo' },
    { pk: 'magikarp', fundo: 'mar', guess: 'Fogo' },
    { pk: 'squirtle', fundo: 'mar', guess: 'Água' },
    { pk: 'squirtle', fundo: 'grama', guess: 'Planta' },
    { pk: 'bulbasaur', fundo: 'grama', guess: 'Planta' },
    { pk: 'oddish', fundo: 'grama', guess: 'Água' },
    { pk: 'krabby', fundo: 'mar', guess: 'Fogo' },
    { pk: 'charmander', fundo: 'mar', guess: 'Água' },
  ],
  pistas: ['forma', 'cor', 'fundo', 'tamanho'], // o que a IA estava olhando?
  certas: ['cor', 'fundo'],
};

// ---------- Atividade 3: Pesquisa no artigo (Geirhos et al., 2020) ----------
const PESQUISA = {
  citacao: 'Geirhos, R. et al. (2020). Shortcut learning in deep neural networks. Nature Machine Intelligence, 2(11), 665–673.',
  url: 'https://arxiv.org/abs/2004.07780',
  questions: [
    { prompt: 'Uma IA reconhecia vacas muito bem… mas errava quando a vaca aparecia fora de qual paisagem?', accept: [['grama'], ['grass'], ['pasto'], ['campo'], ['gramado']] },
    { prompt: 'A IA que detectava pneumonia no raio-X olhava o quê, em vez do pulmão?', accept: [['token'], ['marca'], ['hospital'], ['metal'], ['ficha'], ['etiqueta'], ['simbolo']] },
    { prompt: 'Com quem o artigo compara a IA que "cola"? (dica: seção 2, sobre aprendizado em seres vivos)', accept: [['estudante'], ['aluno'], ['student'], ['rato'], ['rat']] },
  ],
};

// ---------- Atividade 4: Treinador da Pokédex ----------
const TREINO = {
  escolher: 6,
  pool: [
    { id: 't1', pk: 'charmander', fundo: 'vulcao' }, { id: 't2', pk: 'growlithe', fundo: 'vulcao' },
    { id: 't3', pk: 'ponyta', fundo: 'vulcao' }, { id: 't4', pk: 'charmander', fundo: 'grama' },
    { id: 't5', pk: 'squirtle', fundo: 'mar' }, { id: 't6', pk: 'psyduck', fundo: 'mar' },
    { id: 't7', pk: 'magikarp', fundo: 'mar' }, { id: 't8', pk: 'squirtle', fundo: 'grama' },
    { id: 't9', pk: 'bulbasaur', fundo: 'grama' }, { id: 't10', pk: 'oddish', fundo: 'grama' },
    { id: 't11', pk: 'bulbasaur', fundo: 'mar' }, { id: 't12', pk: 'growlithe', fundo: 'mar' },
  ],
  // prova com fotos que ela nunca viu
  teste: [
    { pk: 'krabby', fundo: 'grama' }, { pk: 'squirtle', fundo: 'vulcao' },
    { pk: 'charmander', fundo: 'mar' }, { pk: 'oddish', fundo: 'mar' },
  ],
};
// sem colisão: a prova não pode estar no banco de treino
TREINO.pool = TREINO.pool.filter((c) => !TREINO.teste.some((t) => t.pk === c.pk && t.fundo === c.fundo));

// ---------- Atividade 5: Aprendeu ou colou? ----------
const COLOU = {
  limitMs: 10000,
  options: ['Aprendeu de verdade', 'Colou (atalho)'],
  situations: [
    { text: 'A Pokédex acerta o Magikarp no mar, no vulcão e na grama, mesmo ele sendo laranja.', correct: 0, why: 'Acertou em fundos e cores diferentes: aprendeu o Pokémon, não o atalho.' },
    { text: 'A IA reconhece vacas… mas só quando elas estão na grama.', correct: 1, why: 'Ela aprendeu "grama = vaca". É o exemplo do artigo!' },
    { text: 'A IA do raio-X acerta tudo no hospital A e erra quase tudo no hospital B.', correct: 1, why: 'Ela olhava a marca do hospital, não o pulmão.' },
    { text: 'Treinada com Pokémon de várias cores e fundos, a IA acerta fotos que nunca viu.', correct: 0, why: 'Dados variados obrigam a IA a aprender o que importa.' },
    { text: 'A Pokédex diz que todo Pokémon azul é do tipo Água.', correct: 1, why: 'Cor não é tipo: o Oddish é azul e é Planta.' },
    { text: '⚡ Relâmpago (vale dobrado): um aluno só tira 10 quando a prova é igual à lista de exercícios.', correct: 1, why: 'Decorou em vez de entender: é a comparação que o próprio artigo faz.', bonus: true },
  ],
};

// ---------- Atividade 6: Conserte a Pokédex ----------
const CONSERTE = { exemplos: 2, minFrase: 10 };

// ---------- Pontuação ----------
const POINTS = {
  misterioMarca: 10, misterioPista: 100, misterioPistaParcial: 50, misterioTime: 50,
  pesquisaBase: 100, pesquisaTime: 50,
  treinoAcerto: 40, treinoPerfeito: 60,
  colouBase: 100, colouTime: 50,
  conserteCor: 60, conserteFundo: 60, conserteFrase: 30,
};

module.exports = { STAGES, STAGE_TIMERS, POKEMON, FUNDOS, TIPOS, VICIO, MISTERIO, PESQUISA, TREINO, COLOU, CONSERTE, POINTS };
