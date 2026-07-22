import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Header from './components/Header';
import RequireAuth from './components/RequireAuth';
import RequireAdmin from './components/RequireAdmin';
import HomePage from './pages/HomePage';
import ListPage from './pages/ListPage';
import DetailPage from './pages/DetailPage';
import CreatureFormPage from './pages/CreatureFormPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ProfilePage from './pages/ProfilePage';
import ArenaPage from './pages/ArenaPage';
import BattleRoomPage from './pages/BattleRoomPage';
import AdventurePage from './pages/AdventurePage';
import ExploreBlockDPage from './pages/ExploreBlockDPage';
import WildBattlePage from './pages/WildBattlePage';
import ShopPage from './pages/ShopPage';
import LeaderboardPage from './pages/LeaderboardPage';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <div className="app">
          <Header />
          <main>
            <Routes>
              <Route path="/cadastrar" element={<RegisterPage />} />
              <Route path="/entrar" element={<LoginPage />} />
              <Route path="/verificar" element={<VerifyEmailPage />} />

              <Route
                path="/"
                element={
                  <RequireAuth>
                    <HomePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/dex"
                element={
                  <RequireAuth>
                    <ListPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/nova"
                element={
                  <RequireAdmin>
                    <CreatureFormPage />
                  </RequireAdmin>
                }
              />
              <Route
                path="/criatura/:idOrNumber"
                element={
                  <RequireAuth>
                    <DetailPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/criatura/:idOrNumber/editar"
                element={
                  <RequireAdmin>
                    <CreatureFormPage />
                  </RequireAdmin>
                }
              />
              <Route
                path="/perfil"
                element={
                  <RequireAuth>
                    <ProfilePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/arena"
                element={
                  <RequireAuth>
                    <ArenaPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/arena/batalha/:roomId"
                element={
                  <RequireAuth>
                    <BattleRoomPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/aventura"
                element={
                  <RequireAuth>
                    <AdventurePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/aventura/bloco-d"
                element={
                  <RequireAuth>
                    <ExploreBlockDPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/aventura/batalha/:roomId"
                element={
                  <RequireAuth>
                    <WildBattlePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/loja"
                element={
                  <RequireAuth>
                    <ShopPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/ranking"
                element={
                  <RequireAuth>
                    <LeaderboardPage />
                  </RequireAuth>
                }
              />
            </Routes>
          </main>
        </div>
      </SocketProvider>
    </AuthProvider>
  );
}
