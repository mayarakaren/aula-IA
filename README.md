# Da API à IA · "A IA só aprende o que os dados mostram"

Plataforma da 2ª avaliação (Educação em Computação, Unesp 2026). Aula online de ~24 min com 6 atividades, ranking coletivo e etapas liberadas pela professora.

- Alunos: `/` (entram com apelido)
- Professora: `/professora` (senha da variável `HOST_PASSWORD`)

## Rodar no computador

```
npm run dev
```
Abra http://localhost:3000 (alunos) e http://localhost:3000/professora (senha: `teste`). Os dados ficam na memória.

## Publicar na Vercel

1. Importe o repositório como **projeto novo** na Vercel (Add New → Project).
2. Em **Storage**, conecte o banco Upstash (pode ser o mesmo das outras aulas: esta usa chaves `ia2:` e não mistura nada). Clique em *Connect Project*.
3. Em **Settings → Environment Variables**, crie `HOST_PASSWORD` com uma senha só sua.
4. Faça um novo deploy (Deployments → Redeploy).
5. Em **Settings → Deployment Protection**, desative a proteção para os colegas entrarem sem login.

## Teste de carga (NUNCA durante a aula: ele zera a sala)

PowerShell:
```
$env:BASE_URL="https://SEU-SITE.vercel.app"; $env:HOST_PASSWORD="SUA_SENHA"; $env:PLAYERS="40"; $env:SPEED="0.3"; npm run loadtest
```
Depois, no painel: ⚙ → Reiniciar aula.

## Ordem da aula (~24 min)

| Tela do painel | Tempo |
| --- | --- |
| 1 Abertura "Da API à IA" | 0:45 |
| 2 Objetivos (Bloom) + link | 0:45 |
| 3 Detetive de dados → Liberar | 3:30 |
| Ranking + painel | 0:30 |
| 4 Explicação (2 telas, fecha a etapa anterior) | 3:00 |
| 5 Pesquisa no artigo → Liberar | 4:00 |
| Mural da pergunta norteadora | 0:30 |
| 6 Treinador (fecha a pesquisa) → Liberar | 4:00 |
| Ranking + painel | 0:30 |
| 7 Auditoria relâmpago → Liberar | 2:00 |
| Ranking | 0:15 |
| 8 Plano de dados → Liberar | 2:30 |
| Mural do plano | 0:45 |
| Ranking final | 0:15 |
| 9 Fechamento | 1:00 |

## Onde mudar as coisas

Tudo fica em `lib/content.js`: fotos, perguntas, casos, opções, pontos e tempos (`STAGE_TIMERS`, em milissegundos).

## Créditos

- Artigo: Silva DLF et al. An Bras Dermatol. 2025;100(5):501164 (CC BY), em `public/artigo.pdf`.
- Fotos de cães e lobos: amostras do ImageNet (Deng et al., 2009), uso educacional. Os mapas de calor são simulados para a aula.
- Imagens de Pokémon: PokéAPI (uso educacional, sem fins comerciais).
