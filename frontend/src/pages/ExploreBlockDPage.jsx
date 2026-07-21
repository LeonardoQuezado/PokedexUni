import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

const GRID_SIZE = 20;
const TILE_SIZE = 30;
const ENCOUNTER_CHANCE = 0.05;

const KEY_DELTAS = {
  ArrowUp: [0, -1],
  w: [0, -1],
  W: [0, -1],
  ArrowDown: [0, 1],
  s: [0, 1],
  S: [0, 1],
  ArrowLeft: [-1, 0],
  a: [-1, 0],
  A: [-1, 0],
  ArrowRight: [1, 0],
  d: [1, 0],
  D: [1, 0],
};

export default function ExploreBlockDPage() {
  const socket = useSocket();
  const navigate = useNavigate();
  const [pos, setPos] = useState({ x: 10, y: 10 });
  const [encountering, setEncountering] = useState(false);
  const encounteringRef = useRef(false);

  const tryEncounter = useCallback(() => {
    if (encounteringRef.current || !socket) return;
    if (Math.random() < ENCOUNTER_CHANCE) {
      encounteringRef.current = true;
      setEncountering(true);
      socket.emit('adventure:encounter', {}, (res) => {
        if (res?.roomId) {
          navigate(`/aventura/batalha/${res.roomId}`);
        } else {
          encounteringRef.current = false;
          setEncountering(false);
        }
      });
    }
  }, [socket, navigate]);

  useEffect(() => {
    function handleKey(e) {
      if (encounteringRef.current) return;
      const delta = KEY_DELTAS[e.key];
      if (!delta) return;
      e.preventDefault();

      setPos((p) => {
        const nx = Math.min(GRID_SIZE - 1, Math.max(0, p.x + delta[0]));
        const ny = Math.min(GRID_SIZE - 1, Math.max(0, p.y + delta[1]));
        if (nx !== p.x || ny !== p.y) {
          setTimeout(tryEncounter, 0);
          return { x: nx, y: ny };
        }
        return p;
      });
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [tryEncounter]);

  const tiles = [];
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const shade = (row + col) % 2 === 0 ? 'explore-tile-a' : 'explore-tile-b';
      tiles.push(<div key={`${row}-${col}`} className={`explore-tile ${shade}`} />);
    }
  }

  return (
    <div className="page explore-page">
      <h1>Bloco D</h1>
      <p className="hint">
        Use as setas do teclado (ou WASD) para andar. Cuidado: criaturas selvagens podem aparecer!
      </p>

      <div className="explore-grid" style={{ width: GRID_SIZE * TILE_SIZE, height: GRID_SIZE * TILE_SIZE }}>
        {tiles}
        <div
          className="explore-player"
          style={{
            width: TILE_SIZE,
            height: TILE_SIZE,
            transform: `translate(${pos.x * TILE_SIZE}px, ${pos.y * TILE_SIZE}px)`,
          }}
        />
      </div>

      {encountering && <p className="status-msg">Uma criatura selvagem apareceu...</p>}

      <Link to="/aventura" className="btn-secondary">
        ← Voltar para o mapa
      </Link>
    </div>
  );
}
