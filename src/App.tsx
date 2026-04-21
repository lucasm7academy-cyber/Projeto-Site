import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getDDRVersion } from "./api/riot";

// Primes the DDragon version cache at startup so all profile icon URLs use the correct patch
getDDRVersion();
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Layout from "./components/Layout";
import Lobby from "./pages/Lobby";
import Vincular from "./pages/Vincular";
import Perfil from "./pages/perfil";
import Equipes from "./pages/equipes";
import { VerificacaoProvider } from './contexts/VerificacaoContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import VerificacaoStatus from './components/VerificacaoStatus';
import ResetHandler from "./pages/ResetHandler";
import Players from "./pages/players";
import Jogar from "./pages/Jogar";
import TimePage from "./pages/TimePage";
import SalaPage from "./pages/SalaPage";
import Admin from "./pages/Admin";
import AdminCargos from "./pages/AdminCargos";
import Streamers from "./pages/Streamers";
import Politicas from "./pages/Politicas";
import Tutorial from "./pages/Tutorial";
import Campeonatos from './pages/campeonatos';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-primary">Carregando...</div>;
  }

  if (!user) {
    console.log('❌ PrivateRoute - Usuário não autenticado, redirecionando para login');
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <VerificacaoProvider>
        <BrowserRouter>
          <VerificacaoStatus />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/reset-password" element={<ResetHandler />} />
            <Route path="/resetpassword" element={<ResetPassword />} />
            <Route path="/tutorial" element={<PrivateRoute><Tutorial /></PrivateRoute>} />

            <Route element={<Layout />}>
              <Route path="/lobby" element={<PrivateRoute><Lobby /></PrivateRoute>} />
              <Route path="/jogar" element={<PrivateRoute><Jogar /></PrivateRoute>} />
              <Route path="/estatisticas" element={<PrivateRoute><div>Estatísticas</div></PrivateRoute>} />
              <Route path="/historico" element={<PrivateRoute><div>Histórico</div></PrivateRoute>} />
              <Route path="/perfil" element={<PrivateRoute><Perfil /></PrivateRoute>} />
              <Route path="/partidas" element={<PrivateRoute><div>Partidas</div></PrivateRoute>} />
              <Route path="/times" element={<PrivateRoute><Equipes /></PrivateRoute>} />
              <Route path="/vincular" element={<PrivateRoute><Vincular /></PrivateRoute>} />
              <Route path="/configuracoes" element={<PrivateRoute><div>Configurações</div></PrivateRoute>} />
              <Route path="/políticas" element={<PrivateRoute><Politicas /></PrivateRoute>} />
              <Route path="/sejavip" element={<PrivateRoute><div>Seja VIP</div></PrivateRoute>} />
              <Route path="/suporte" element={<PrivateRoute><div>Suporte</div></PrivateRoute>} />
              <Route path="/players" element={<PrivateRoute><Players /></PrivateRoute>} />
              <Route path="/campeonatos" element={<PrivateRoute><Campeonatos /></PrivateRoute>} />
              <Route path="/streamers" element={<PrivateRoute><Streamers /></PrivateRoute>} />
              <Route path="/times/:id" element={<PrivateRoute><TimePage /></PrivateRoute>} />
              <Route path="/sala/:id"  element={<PrivateRoute><SalaPage /></PrivateRoute>} />
              <Route path="/admin"    element={<PrivateRoute><Admin /></PrivateRoute>} />
              <Route path="/admin/cargos"    element={<PrivateRoute><AdminCargos /></PrivateRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </VerificacaoProvider>
    </AuthProvider>
  );
}