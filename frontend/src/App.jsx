import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Header from './components/Header';
import ListPage from './pages/ListPage';
import DetailPage from './pages/DetailPage';
import CreatureFormPage from './pages/CreatureFormPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ProfilePage from './pages/ProfilePage';
import ArenaPage from './pages/ArenaPage';
import BattleRoomPage from './pages/BattleRoomPage';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <div className="app">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<ListPage />} />
              <Route path="/nova" element={<CreatureFormPage />} />
              <Route path="/criatura/:idOrNumber" element={<DetailPage />} />
              <Route path="/criatura/:idOrNumber/editar" element={<CreatureFormPage />} />
              <Route path="/cadastrar" element={<RegisterPage />} />
              <Route path="/entrar" element={<LoginPage />} />
              <Route path="/verificar" element={<VerifyEmailPage />} />
              <Route path="/perfil" element={<ProfilePage />} />
              <Route path="/arena" element={<ArenaPage />} />
              <Route path="/arena/batalha/:roomId" element={<BattleRoomPage />} />
            </Routes>
          </main>
        </div>
      </SocketProvider>
    </AuthProvider>
  );
}
