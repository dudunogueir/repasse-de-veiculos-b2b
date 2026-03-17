// src/store/useNavigationStore.js
import { useState, useEffect } from 'react';

// Esta variável fica fora do componente, por isso não é destruída 
// quando você muda de aba (essencial para o "Stack Preservation").
let globalHomeFilters = {
  make: '',
  model: '',
  state: 'all',
  minPrice: '',
  maxPrice: '',
  minYear: '',
  maxYear: '',
  sort: 'recent'
};

// Lista de funções para avisar os componentes quando os dados mudam
let listeners = [];

export const useNavigationStore = () => {
  const [state, setState] = useState(globalHomeFilters);

  useEffect(() => {
    // Quando o componente (Home) carrega, ele se inscreve para ouvir mudanças
    listeners.push(setState);
    return () => {
      // Quando sai da página, ele se desinscreve
      listeners = listeners.filter(l => l !== setState);
    };
  }, []);

  const setHomeFilters = (newFilters) => {
    // Atualiza o valor global
    globalHomeFilters = { ...globalHomeFilters, ...newFilters };
    // Avisa todos os componentes interessados (re-render)
    listeners.forEach(listener => listener(globalHomeFilters));
  };

  const resetHomeFilters = () => {
    globalHomeFilters = {
      make: '',
      model: '',
      state: 'all',
      minPrice: '',
      maxPrice: '',
      minYear: '',
      maxYear: '',
      sort: 'recent'
    };
    listeners.forEach(listener => listener(globalHomeFilters));
  };

  return { 
    homeFilters: state, 
    setHomeFilters, 
    resetHomeFilters 
  };
};