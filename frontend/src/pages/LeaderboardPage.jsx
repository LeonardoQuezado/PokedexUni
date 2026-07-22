import { useEffect, useState } from 'react';
import { fetchLeaderboard } from '../api';

export default function LeaderboardPage() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboard()
      .then(setRanking)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="status-msg">Carregando...</p>;
  if (error) return <p className="status-msg error">Erro: {error}</p>;

  return (
    <div className="page leaderboard-page">
      <h1>Ranking de Treinadores</h1>
      <p className="hint">Classificação com base nas vitórias na Arena.</p>

      {ranking.length === 0 ? (
        <p className="status-msg">Ninguém venceu uma batalha na Arena ainda.</p>
      ) : (
        <ol className="leaderboard-list">
          {ranking.map((entry, i) => (
            <li key={entry.username} className="leaderboard-row">
              <span className="leaderboard-rank">{i + 1}º</span>
              {entry.photoUrl ? (
                <img src={entry.photoUrl} alt={entry.username} className="leaderboard-photo" />
              ) : (
                <div className="leaderboard-photo leaderboard-photo-placeholder">
                  {entry.username.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="leaderboard-name">{entry.username}</span>
              <span className="leaderboard-wins">🏆 {entry.arenaWins}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
