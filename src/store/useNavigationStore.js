import { create } from 'zustand';

export const useNavigationStore = create((set) => ({
  // Estado inicial dos filtros da Home
  homeFilters: {
    make: '',
    model: '',
    state: 'all',
    minPrice: '',
    maxPrice: '',
    minYear: '',
    maxYear: '',
    sort: 'recent'
  },
  // Função para atualizar os filtros
  setHomeFilters: (newFilters) => 
    set((state) => ({ homeFilters: { ...state.homeFilters, ...newFilters } })),
  
  // Função para limpar filtros
  resetHomeFilters: () => set({ homeFilters: {
    make: '', model: '', state: 'all', minPrice: '', maxPrice: '', minYear: '', maxYear: '', sort: 'recent'
  }})
}));