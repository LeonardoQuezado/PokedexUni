# Dayonmon

Pokédex para criaturas personalizadas — todo o projeto roda em Docker.

## Como rodar

Pré-requisito: Docker e Docker Compose instalados.

```bash
docker compose up --build
```

- Frontend (a Dayonmon): http://localhost:8080 — a primeira tela é sempre login/cadastro,
  não dá pra ver nada sem entrar.
- API: http://localhost:4000/api/creatures

Os dados (criaturas e fotos enviadas) ficam salvos em volumes Docker (`backend_data` e
`backend_uploads`), então persistem entre reinicializações. Para zerar tudo e voltar às
4 criaturas iniciais:

```bash
docker compose down -v
```

## Criaturas iniciais

| Nº | Nome | Tipo | Categoria |
|----|------|------|-----------|
| 0001 | **Dayon** | Ogro / Dumb | Primordial |
| 0002 | Terrion | Pedra / Terra | Fragmento |
| 0003 | Nimbukin | Ar / Normal | Nuvem |
| 0004 | Ignivox | Fogo / Sombrio | Duende |

Dayon é "o primordial do mal", o esmagador de pedras, referência universal de força
entre as criaturas — os ataques dele (e das outras) ficaram propositalmente em branco,
prontos para você cadastrar pela tela de edição quando definir o moveset.

Terrion, Nimbukin e Ignivox são criaturas de exemplo só para preencher a Dayonmon inicial.
Edite ou apague-as à vontade pela própria interface.

## Adicionando/editando criaturas

Tudo pode ser feito pela interface, sem mexer em código:

- **+ Nova criatura** (cabeçalho ou lista): cadastra nome, tipos, categoria, descrição,
  altura, peso, habilidades, fraquezas, ataques e estatísticas (PS/Ataque/Defesa/Atq.
  Especial/Def. Especial/Velocidade).
- **Editar** (na página de detalhes): altera qualquer campo de uma criatura existente.
- **Adicionar / trocar foto** (na página de detalhes): envia uma imagem (PNG, JPG, WEBP
  ou GIF, até 10 MB) para a criatura. Enquanto não há foto, aparece um retrato provisório
  com a inicial do nome.

Tipos e fraquezas são livres — digite qualquer nome (ex: "Ogro", "Dumb") e a interface
gera uma cor consistente automaticamente para o rótulo.

## Evoluções

Para montar uma linha evolutiva: primeiro cadastre cada criatura normalmente (ex: cria
o "estágio 1" e depois o "estágio 2" como criaturas separadas). Depois, abra a tela de
**Editar** do estágio anterior e escolha o próximo estágio no campo **"Evolui para"**.

A partir daí, a seção "Evoluções" aparece automaticamente na página de detalhes de
**todos** os estágios da linha (não só de um deles), mostrando a cadeia inteira com o
estágio atual destacado. Algumas regras:

- Uma criatura só pode ter **um** próximo estágio, e só pode ser o "próximo estágio" de
  **uma** criatura anterior (sem bifurcação nem ciclos).
- Apagar uma criatura do meio da cadeia quebra o link automaticamente, sem deixar
  referência quebrada.

## Login obrigatório e Home

Toda a Dayonmon fica atrás de login — sem conta, a única coisa acessível é a tela de
**Entrar**/**Cadastrar**. Depois de logar, a página inicial (`/`) vira um painel com:

- **Fundo em slideshow**: cicla pelas fotos das criaturas que já têm foto cadastrada
  (busca via `/api/creatures`). Sem nenhuma foto ainda, mostra um gradiente roxo de
  fundo em vez de tela em branco.
- **Acesso rápido**: atalhos para Pokédex, Arena, Aventura e perfil.
- **Novidades**: lista de patch notes (hoje um array fixo em `HomePage.jsx`, refletindo
  o histórico real de versões do projeto — dá pra editar/adicionar entradas ali mesmo).

A Pokédex (busca, grid, detalhes) mudou de lugar: agora fica em **`/dex`**, não mais na
raiz do site.

## Contas e Arena

- **Criar conta** (tela de cadastro): usuário, e-mail e senha. Ainda não mandamos e-mail
  de verdade — ao cadastrar, o link de confirmação aparece direto na tela (e pode ser
  gerado de novo na tela de login, caso se perca). Depois de confirmar, é só entrar.
- Toda conta nova ganha automaticamente um **Dayon (Nº 0001)** e **10 Dayonballs**
  para capturar outros na Aventura (veja abaixo).
- **Arena** (botão roxo no cabeçalho, só aparece logado): mostra quem mais está com a
  Arena aberta agora, em tempo real (via WebSocket), com botão **Desafiar**. A pessoa
  desafiada recebe um convite na hora para aceitar ou recusar.
- Ao aceitar, os dois caem numa **sala de batalha** com o combate real: HP, turnos e
  os 4 ataques de cada um.
- O mapa da Arena hoje é um placeholder roxo original (gerado em SVG). Quando você
  mandar o arquivo de imagem definitivo, é só trocar `ArenaBackground.jsx` pela imagem.

Variáveis de ambiente relevantes (já com valores padrão em `docker-compose.yml`):
`JWT_SECRET` (assina a sessão de login) e `COOKIE_SECURE` (deixe `false` em `http://localhost`;
mude para `true` só se um dia servir a Dayonmon com HTTPS de verdade).

## Ataques e combate

Na tela de **Editar** de uma criatura, cada ataque tem: nome, tipo (livre, igual aos
tipos da criatura), categoria (Físico ou Especial), Poder e Precisão. Máximo de 4
ataques por criatura.

Na batalha (dentro da sala da Arena):

- Os dois jogadores escolhem um ataque por turno ao mesmo tempo; quem tem mais
  **Velocidade** resolve primeiro.
- Dano = Poder do ataque × (Ataque ou Atq. Especial de quem bate ÷ Defesa ou Def.
  Especial de quem apanha), com uma variação aleatória de 85%-100%. Se o tipo do
  ataque bater com uma das **Fraquezas** cadastradas no alvo, o dano sobe 1.5x.
- A Precisão do ataque é a chance de acertar — errar não gasta o efeito, só o uso.
- Cada ataque só pode ser usado **3 vezes por combate**. Se os 4 se esgotarem, libera
  um golpe de emergência ("Investida Desesperada", uso ilimitado, dano baixo) pra
  batalha não travar.
- Ataques de status (paralisar, queimar, etc.) ainda não existem — fica para depois.

## Aventura

Botão verde **Aventura** no cabeçalho (só aparece logado) abre um mapa-múndi
(`frontend/public/aventura/mapa-campus.jpg`) com locais que podem ser explorados.
Hoje só o **Bloco D** está disponível — passe o mouse para ver o contorno roxo, clique
para entrar.

Dentro do Bloco D é uma grade de exploração 20×20 (tiles de 30px, 600×600px no total).
Use as **setas do teclado ou WASD** para andar. A cada passo há **5% de chance** de um
Dayon selvagem aparecer, abrindo uma batalha:

- **Lutar**: usa os ataques normais (mesmas regras da Arena).
- **Dayonball**: tenta capturar. Chance = 30% base + até 20% extra conforme o HP do
  Dayon selvagem cai (quanto mais fraco, mais fácil capturar). Cada conta começa com
  10 bolas; uma tentativa falha ainda consome a bola e dá a vez pro selvagem atacar.
- **Fugir**: sai do encontro sem gastar Dayonball.

Capturar adiciona o Dayon à sua coleção (visível em **Meu perfil**). Vencer sem capturar
não dá nada — o selvagem "foge assustado".

Para adicionar novos locais no mapa depois: edite o array `LOCATIONS` em
`frontend/src/pages/AdventurePage.jsx` (posição em % sobre a imagem + `available: true`).

## Estrutura do projeto

```
backend/    API em Node.js/Express. Dados guardados em JSON (backend/data/db.json,
            criado a partir de backend/seed/seed.json no primeiro start). Uploads em
            backend/uploads/. Socket.io no mesmo servidor HTTP para a Arena.
frontend/   React + Vite. Em produção é servido por Nginx, que também repassa /api,
            /uploads e /socket.io para o backend (mesma origem, sem CORS).
docker-compose.yml   Sobe backend (porta 4000) e frontend (porta 8080).
```

### Rodando sem Docker (desenvolvimento)

```bash
# Terminal 1
cd backend && npm install && npm run dev

# Terminal 2
cd frontend && npm install && npm run dev
```

O Vite (`http://localhost:5173`) já vem configurado para repassar `/api` e `/uploads`
para `http://localhost:4000`.
