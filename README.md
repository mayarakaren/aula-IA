# A IA adora colar — plataforma da aula (2ª avaliação)

Projeto SEPARADO da aula de API (link próprio). Mesmo jeito de usar.

| Página | Quem usa | O que faz |
|---|---|---|
| `/` | alunos | apelido, etapas liberadas por você, 6 atividades, pontuação, ranking na espera |
| `/professora` | você | slides + 🔓 Liberar + cronômetro (+30s / Encerrar) + rankings + painéis + mural |

## 0. Ver no computador
Na pasta, terminal do VS Code: `npm run dev` → `http://localhost:3000` (alunos) e `http://localhost:3000/professora` (senha `teste`).
Vários alunos: janelas anônimas ou celular na mesma rede. Dados ficam na memória e somem ao parar (Ctrl+C).

## 1. Publicar na Vercel (projeto NOVO)
```
vercel          ← "Link to existing project?" N · nome: aula-ia-atalhos (minúsculo)
```
**Banco:** use o MESMO Upstash da aula de API. Vercel → Storage → `upstash-kv-…` → **Connect Project** → escolha o projeto novo.
As chaves deste projeto começam com `ia:`, então não misturam com a aula de API.
**Senha:** Settings → Environment Variables → `HOST_PASSWORD`.
```
vercel --prod
```
Abra numa janela anônima. Se pedir login da Vercel: Settings → Deployment Protection → Vercel Authentication → Disabled.

## 2. Teste de carga (véspera, UMA vez, nunca durante uma aula — ele zera a sala)
PowerShell:
```
$env:BASE_URL="https://SEU-SITE.vercel.app"; $env:HOST_PASSWORD="SUA_SENHA"; $env:PLAYERS="40"; $env:SPEED="0.3"; node scripts/loadtest.js
```
Tem que dar "concluíram=40" nas 5 etapas e ✅ PASSOU. Depois: ⚙ → Reiniciar aula.

## 3. Ordem da aula (~21 min)
1 Abertura "Da API à IA" → 2 Objetivos de Bloom (+ endereço pra entrar) → 3 **Mistério** (3:00) → ranking + painel →
4 **Explicação** (fecha a etapa sozinha) → 5 **Pesquisa** no artigo (3:00) → 6 **Treinador** (3:00) → ranking + painel →
7 **Aprendeu ou colou?** (1:30) → ranking → 8 **Conserte** (2:30) → **mural** ao vivo → ranking final → 9 Fechamento.
Tempos editáveis em `lib/content.js` → `STAGE_TIMERS`.

## 4. Como cada atividade funciona
- **Mistério:** 8 fotos com o palpite da IA; botão "ver ficha" mostra o tipo real. Aluno marca acertou/errou e escolhe o que a IA olhava. Resposta: **cor E fundo**.
- **Pesquisa:** Geirhos et al. (2020), *Nature Machine Intelligence* — link aberto do arXiv. Respostas: grama · marca/ficha do hospital · estudantes (ou ratos).
- **Treinador:** escolhe 6 de 12 fotos; a IA faz prova com 4 fotos novas. Se cor ou fundo explicam sozinhos os exemplos, ela cola. Exemplo de solução 4/4: Charmander vulcão, Charmander grama, Squirtle mar, Magikarp mar, Squirtle grama, Bulbasaur grama.
- **Aprendeu ou colou?:** 6 situações, 10 s cada, a última vale dobrado.
- **Conserte:** 2 fotos novas (Pokémon + fundo) + frase. Pontua se quebrar o atalho da cor e/ou do fundo. Vai pro mural da sua tela.

## 5. Editar
Tudo em `lib/content.js` (fotos, palpites, perguntas, situações, pontos, tempos). Imagens em `public/img/`.

## 6. Testado
✅ 40 alunos simultâneos (0 erros) · fluxo completo no Chrome (computador 1366×768 e celular 390 px) · telas da professora conferidas.
⚠️ Não testado: Vercel/Upstash de verdade (rode o teste de carga) e outros navegadores.
