import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
  const [startY, setStartY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const handleTouchStart = (e) => {
    // Só permite puxar se estiver no topo da página
    if (window.scrollY === 0) {
      setStartY(e.touches[0].pageY);
    }
  };

  const handleTouchMove = (e) => {
    if (startY === 0 || refreshing) return;

    const currentY = e.touches[0].pageY;
    const distance = currentY - startY;

    if (distance > 0) {
      // Adiciona uma resistência ao puxar (fator 0.4) para parecer nativo
      setPullDistance(Math.min(distance * 0.4, 80));
    }
  };

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 60 && !refreshing) {
      setRefreshing(true);
      setPullDistance(40); // Fica parado na posição de "carregando"
      
      try {
        await onRefresh();
      } finally {
        // Suaviza a volta para o topo
        setTimeout(() => {
          setRefreshing(false);
          setPullDistance(0);
          setStartY(0);
        }, 500);
      }
    } else {
      setPullDistance(0);
      setStartY(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative transition-transform duration-200"
      style={{ transform: `translateY(${pullDistance}px)` }}
    >
      {pullDistance > 10 && (
        <div className="absolute -top-10 left-0 right-0 flex justify-center items-center h-10">
          <Loader2 className={`h-6 w-6 text-indigo-600 ${refreshing ? 'animate-spin' : ''}`} 
            style={{ opacity: pullDistance / 60, transform: `rotate(${pullDistance * 2}deg)` }}
          />
        </div>
      )}
      {children}
    </div>
  );
}