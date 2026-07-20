# Unidex

Pokédex para criaturas personalizadas — todo o projeto roda em Docker.

## Como rodar

Pré-requisito: Docker e Docker Compose instalados.

```bash
docker compose up --build
```

- Frontend (a Unidex): http://localhost:8080
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

Terrion, Nimbukin e Ignivox são criaturas de exemplo só para preencher a Unidex inicial.
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

## Contas e Arena

- **Criar conta** (cabeçalho): usuário, e-mail e senha. Ainda não mandamos e-mail de
  verdade — ao cadastrar, o link de confirmação aparece direto na tela (e pode ser
  gerado de novo na tela de login, caso se perca). Depois de confirmar, é só entrar.
- Toda conta nova ganha automaticamente um **Dayon (Nº 0001)** — a estrutura já está
  pronta para no futuro dar suporte a "capturar" outras criaturas, mas esse mecanismo
  ainda não existe.
- **Arena** (botão roxo no cabeçalho, só aparece logado): mostra quem mais está com a
  Arena aberta agora, em tempo real (via WebSocket), com botão **Desafiar**. A pessoa
  desafiada recebe um convite na hora para aceitar ou recusar.
- Ao aceitar, os dois caem numa **sala de batalha** com o combate real: HP, turnos e
  os 4 ataques de cada um.
- O mapa da Arena hoje é um placeholder roxo original (gerado em SVG). Quando você
  mandar o arquivo de imagem definitivo, é só trocar `ArenaBackground.jsx` pela imagem.

Variáveis de ambiente relevantes (já com valores padrão em `docker-compose.yml`):
`JWT_SECRET` (assina a sessão de login) e `COOKIE_SECURE` (deixe `false` em `http://localhost`;
mude para `true` só se um dia servir a Unidex com HTTPS de verdade).

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
