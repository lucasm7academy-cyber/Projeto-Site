// src/pages/lobby.tsx
// Lobby simples com imagem central do League of Legends

import React from 'react';

const Lobby = () => {
  return (
    <div className="min-h-screen bg- to-black flex flex-col items-center justify-top p-6">
      
      {/* Logo/Imagem Central */}
      <div className="flex flex-col items-top justify-center text-center">
        {/* Texto opcional */}
        <h1 className="text-white font-black text-3xl mt-6 mb-2">Arena</h1>
        <p className="text-white/40 text-lg">Escolha um modo para começar</p>
        <img 
          src="https://www.adrenaline.com.br/wp-content/uploads/2023/11/League-of-Legends-vai-mudar-seu-mapa-central-na-proxima-temporada-912x569.jpg"
          alt="League of Legends"
          className="w-full max-w-4xl rounded-[26.5px] shadow-2xl border border-white/10"
        />
        
      </div>
      
    </div>
  );
};

export default Lobby;