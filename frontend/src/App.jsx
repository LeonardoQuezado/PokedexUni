import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import ListPage from './pages/ListPage';
import DetailPage from './pages/DetailPage';
import CreatureFormPage from './pages/CreatureFormPage';

export default function App() {
  return (
    <div className="app">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<ListPage />} />
          <Route path="/nova" element={<CreatureFormPage />} />
          <Route path="/criatura/:idOrNumber" element={<DetailPage />} />
          <Route path="/criatura/:idOrNumber/editar" element={<CreatureFormPage />} />
        </Routes>
      </main>
    </div>
  );
}
