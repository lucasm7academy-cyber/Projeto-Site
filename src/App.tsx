import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
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
import VerificacaoStatus from './components/VerificacaoStatus';
import ResetHandler from "./pages/ResetHandler";
import Players from "./pages/players";
import Jogar from "./pages/Jogar";
import TimePage from "./pages/TimePage";
import SalaPage from "./pages/SalaPage";
import Admin from "./pages/Admin";
import AdminCargos from "./pages/AdminCargos";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 PrivateRoute - Sessão:', session?.user?.email);
      setUser(session?.user || null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('📡 PrivateRoute - Auth mudou:', _event, session?.user?.email);
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-primary">Carregando...</div>;
  }

  if (!user) {
    console.log('❌ PrivateRoute - Usuário não autenticado, redirecionando para login');
    return <Navigate to="/" replace />;
  }

  console.log('✅ PrivateRoute - Usuário autenticado, renderizando conteúdo');
  return children;
}

export default function App() {
  return (
    <VerificacaoProvider>
      <BrowserRouter>
        <VerificacaoStatus />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/reset-password" element={<ResetHandler />} />
          <Route path="/resetpassword" element={<ResetPassword />} />
          
          <Route element={<Layout />}>
            <Route path="/lobby" element={<PrivateRoute><Lobby /></PrivateRoute>} />
            <Route path="/jogar" element={<PrivateRoute><Jogar /></PrivateRoute>} />
            <Route path="/campeonatos" element={<PrivateRoute><div>Campeonatos</div></PrivateRoute>} />
            <Route path="/estatisticas" element={<PrivateRoute><div>Estatísticas</div></PrivateRoute>} />
            <Route path="/historico" element={<PrivateRoute><div>Histórico</div></PrivateRoute>} />
            <Route path="/perfil" element={<PrivateRoute><Perfil /></PrivateRoute>} />
            <Route path="/partidas" element={<PrivateRoute><div>Partidas</div></PrivateRoute>} />
            <Route path="/times" element={<PrivateRoute><Equipes /></PrivateRoute>} />
            <Route path="/vincular" element={<PrivateRoute><Vincular /></PrivateRoute>} />
            <Route path="/configuracoes" element={<PrivateRoute><div>Configurações</div></PrivateRoute>} />
            <Route path="/politicas" element={<PrivateRoute><div>Políticas</div></PrivateRoute>} />
            <Route path="/suporte" element={<PrivateRoute><div>Suporte</div></PrivateRoute>} />
            <Route path="/players" element={<PrivateRoute><Players /></PrivateRoute>} />
            <Route path="/times/:id" element={<PrivateRoute><TimePage /></PrivateRoute>} />
            <Route path="/sala/:id"  element={<PrivateRoute><SalaPage /></PrivateRoute>} />
            <Route path="/admin"    element={<PrivateRoute><Admin /></PrivateRoute>} />
            <Route path="/admin/cargos"    element={<PrivateRoute><AdminCargos /></PrivateRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </VerificacaoProvider>
  );
}