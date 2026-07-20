# Dex Uni

Pokédex para criaturas personalizadas — todo o projeto roda em Docker.

## Como rodar

Pré-requisito: Docker e Docker Compose instalados.

```bash
docker compose up --build
```

- Frontend (a Dex): http://localhost:8080
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

Terrion, Nimbukin e Ignivox são criaturas de exemplo só para preencher a Dex inicial.
Edite ou apague-as à vontade pela própria interface.

## Adicionando/editando criaturas

Tudo pode ser feito pela interface, sem mexer em código:

- **+ Nova criatura** (cabeçalho ou lista): cadastra nome, tipos, categoria, descrição,
  altura, peso, habilidades, fraquezas, ataques e estatísticas (PS/Ataque/Defesa/Atq.
  Especial/Def. Especial/Velocidade).
- **Editar** (na página de detalhes): altera qualquer campo de uma criatura existente.
- **Adicionar / trocar foto** (na página de detalhes): envia uma imagem (PNG, JPG, WEBP
  ou GIF, até 5 MB) para a criatura. Enquanto não há foto, aparece um retrato provisório
  com a inicial do nome.

Tipos e fraquezas são livres — digite qualquer nome (ex: "Ogro", "Dumb") e a interface
gera uma cor consistente automaticamente para o rótulo.

## Estrutura do projeto

```
backend/    API em Node.js/Express. Dados guardados em JSON (backend/data/db.json,
            criado a partir de backend/seed/seed.json no primeiro start). Uploads em
            backend/uploads/.
frontend/   React + Vite. Em produção é servido por Nginx, que também repassa /api e
            /uploads para o backend (mesma origem, sem CORS).
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
