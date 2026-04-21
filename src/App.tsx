import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getDDRVersion } from "./api/riot";

// Primes the DDragon version cache at startup so all profile icon URLs use the correct patch
getDDRVersion();
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Layout from "./components/Layout";
import Lobby from "./pages/Lobby";
import Jogar from "./pages/Jogar";
import SalaPage from "./pages/SalaPage";
import { VerificacaoProvider } from './contexts/VerificacaoContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import VerificacaoStatus from './components/VerificacaoStatus';
import ResetHandler from "./pages/ResetHandler";

const Vincular = lazy(() => import("./pages/Vincular"));
const Perfil = lazy(() => import("./pages/perfil"));
const Equipes = lazy(() => import("./pages/equipes"));
const Players = lazy(() => import("./pages/players"));
const TimePage = lazy(() => import("./pages/TimePage"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminCargos = lazy(() => import("./pages/AdminCargos"));
const Streamers = lazy(() => import("./pages/Streamers"));
const Politicas = lazy(() => import("./pages/Politicas"));
const Tutorial = lazy(() => import("./pages/Tutorial"));
const Campeonatos = lazy(() => import('./pages/campeonatos'));

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

function RouteWithSuspense({ element }: { element: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black text-primary">Carregando...</div>}>{element}</Suspense>;
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
              <Route path="/perfil" element={<PrivateRoute><RouteWithSuspense element={<Perfil />} /></PrivateRoute>} />
              <Route path="/partidas" element={<PrivateRoute><div>Partidas</div></PrivateRoute>} />
              <Route path="/times" element={<PrivateRoute><RouteWithSuspense element={<Equipes />} /></PrivateRoute>} />
              <Route path="/vincular" element={<PrivateRoute><RouteWithSuspense element={<Vincular />} /></PrivateRoute>} />
              <Route path="/configuracoes" element={<PrivateRoute><div>Configurações</div></PrivateRoute>} />
              <Route path="/políticas" element={<PrivateRoute><RouteWithSuspense element={<Politicas />} /></PrivateRoute>} />
              <Route path="/sejavip" element={<PrivateRoute><div>Seja VIP</div></PrivateRoute>} />
              <Route path="/suporte" element={<PrivateRoute><div>Suporte</div></PrivateRoute>} />
              <Route path="/players" element={<PrivateRoute><RouteWithSuspense element={<Players />} /></PrivateRoute>} />
              <Route path="/campeonatos" element={<PrivateRoute><RouteWithSuspense element={<Campeonatos />} /></PrivateRoute>} />
              <Route path="/streamers" element={<PrivateRoute><RouteWithSuspense element={<Streamers />} /></PrivateRoute>} />
              <Route path="/times/:id" element={<PrivateRoute><RouteWithSuspense element={<TimePage />} /></PrivateRoute>} />
              <Route path="/sala/:id"  element={<PrivateRoute><SalaPage /></PrivateRoute>} />
              <Route path="/admin"    element={<PrivateRoute><RouteWithSuspense element={<Admin />} /></PrivateRoute>} />
              <Route path="/admin/cargos"    element={<PrivateRoute><RouteWithSuspense element={<AdminCargos />} /></PrivateRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </VerificacaoProvider>
    </AuthProvider>
  );
}