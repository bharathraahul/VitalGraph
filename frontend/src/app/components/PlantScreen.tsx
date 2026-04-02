import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, Sun } from 'lucide-react';
import { PlantBottomSheet } from './PlantBottomSheet';

type PlantPart = 'leaves' | 'roots' | 'flower' | 'sun' | 'clouds' | null;

interface HealthData {
  leaves: 'healthy' | 'low';
  roots: 'healthy' | 'weak';
  flower: 'open' | 'closed';
  sun: 'calm' | 'stressed';
  clouds: 'clear' | 'cloudy';
}

export function PlantScreen() {
  const [selectedPart, setSelectedPart] = useState<PlantPart>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [completedRecommendations, setCompletedRecommendations] = useState<number[]>([]);
  const [selectedLeafIndex, setSelectedLeafIndex] = useState<number | null>(null);

  // Mock health data - in real app, this would come from health tracking
  const [healthData, setHealthData] = useState<HealthData>({
    leaves: 'low',
    roots: 'healthy',
    flower: 'closed',
    sun: 'stressed',
    clouds: 'clear'
  });

  
  useEffect(() => {
      fetch('http://localhost:8000/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.healthData) setHealthData(data.healthData);
        if (data.recommendations) setRecommendations(data.recommendations);
      })
      .catch(err => console.error("Error fetching health data:", err));
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Sky Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#a8d5ff] via-[#d4e9ff] to-[#ffe8d6]" />

      {/* Animated Clouds - Clickable */}
      <motion.div
        className="absolute top-12 left-[-10%] cursor-pointer z-30"
        animate={{ x: ['0%', '120%'] }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setSelectedPart('clouds')}
      >
        <Cloud className="w-20 h-20 text-white/60 fill-white/60" />
      </motion.div>

      <motion.div
        className="absolute top-32 right-[-15%] cursor-pointer z-30"
        animate={{ x: ['0%', '-120%'] }}
        transition={{ duration: 80, repeat: Infinity, ease: 'linear', delay: 5 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setSelectedPart('clouds')}
      >
        <Cloud className="w-24 h-24 text-white/50 fill-white/50" />
      </motion.div>

      {/* Sun - Interactive */}
      <motion.div
        className="absolute top-12 right-12 w-20 h-20 cursor-pointer z-10"
        animate={{
          scale: healthData.sun === 'calm' ? [1, 1.1, 1] : [0.95, 1.05, 0.95],
          opacity: healthData.sun === 'calm' ? [0.8, 1, 0.8] : [0.9, 1, 0.9]
        }}
        transition={{ duration: healthData.sun === 'calm' ? 6 : 3, repeat: Infinity, ease: 'easeInOut' }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setSelectedPart('sun')}
      >
        <div className={`w-full h-full rounded-full blur-2xl ${healthData.sun === 'calm' ? 'bg-yellow-200' : 'bg-orange-300'}`} />
        <div className={`absolute inset-2 rounded-full blur-md ${healthData.sun === 'calm' ? 'bg-yellow-100' : 'bg-amber-200'}`} />
      </motion.div>

      {/* Main Plant Container */}
      <div className="relative h-full flex items-end justify-center pb-16">
        <div className="relative" style={{ width: '280px', height: '400px' }}>

          {/* Flower - Interactive */}
          <motion.div
            className="absolute top-0 left-1/2 -translate-x-1/2 cursor-pointer z-20"
            animate={{
              rotate: [-2, 2, -2],
              y: [0, -3, 0]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedPart('flower')}
          >
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              {/* Back Center */}
              <circle cx="40" cy="44" r="12" fill="#FDD835" stroke="#F9A825" strokeWidth="1.5" />
              
              {/* Petals radiating from center */}
              {[
                { cx: 40, cy: 20, rotate: 0 },
                { cx: 57, cy: 27, rotate: 45 },
                { cx: 64, cy: 44, rotate: 90 },
                { cx: 57, cy: 61, rotate: 135 },
                { cx: 40, cy: 68, rotate: 180 },
                { cx: 23, cy: 61, rotate: -135 },
                { cx: 16, cy: 44, rotate: -90 },
                { cx: 23, cy: 27, rotate: -45 }
              ].map((petal, i) => {
                const progress = recommendations.length > 0 ? (completedRecommendations.length / recommendations.length) : 0;
                
                // Closed state coordinates pull tightly to the center
                const startCx = 40 + (petal.cx - 40) * 0.3;
                const startCy = 44 + (petal.cy - 44) * 0.3;
                
                const currentCx = startCx + (petal.cx - startCx) * progress;
                const currentCy = startCy + (petal.cy - startCy) * progress;
                const currentRx = 5 + 5 * progress;
                const currentRy = 7 + 7 * progress;
                
                return (
                  <motion.g
                    key={i}
                    animate={{
                      x: currentCx - petal.cx,
                      y: currentCy - petal.cy
                    }}
                    transition={{ duration: 1, type: 'spring', bounce: 0.3 }}
                  >
                    <ellipse
                      cx={petal.cx}
                      cy={petal.cy}
                      rx={currentRx}
                      ry={currentRy}
                      fill="#E91E63"
                      stroke="#C2185B"
                      strokeWidth="1.5"
                      transform={`rotate(${petal.rotate} ${petal.cx} ${petal.cy})`}
                      style={{ transition: 'rx 0.8s ease-out, ry 0.8s ease-out' }}
                    />
                  </motion.g>
                );
              })}
              
              {/* Front Center */}
              <circle cx="40" cy="44" r="10" fill="#FDD835" />
            </svg>
          </motion.div>

          {/* Stem */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-3 h-48 bg-gradient-to-b from-[#7CB342] to-[#558B2F] rounded-full" />

          {/* Leaves - Iteratively Rendered */}
          {recommendations.map((rec, idx) => {
            const isCompleted = completedRecommendations.includes(idx);
            const isLeft = idx % 2 === 0;
            const positioning = [
              "top-24 left-4",
              "top-28 right-4",
              "top-36 left-6",
              "top-40 right-2"
            ][idx % 4];

            return (
              <motion.div
                key={`leaf-${idx}`}
                className={`absolute ${positioning} cursor-pointer z-10`}
                animate={{
                  rotate: isLeft ? [-5, 5, -5] : [5, -5, 5],
                  y: [0, -2, 0],
                  opacity: isCompleted ? 0.6 : 1
                }}
                transition={{ duration: isLeft ? 3 : 3.5, repeat: Infinity }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedPart('leaves');
                  setSelectedLeafIndex(idx);
                }}
              >
                <svg width="90" height="70" viewBox="0 0 90 70" fill="none">
                  <ellipse
                    cx={isLeft ? "45" : "40"}
                    cy={isLeft ? "35" : "30"}
                    rx={isLeft ? "38" : "34"}
                    ry={isLeft ? "28" : "24"}
                    fill={isCompleted ? "#8BC34A" : "#4CAF50"}
                    stroke={isCompleted ? "#689F38" : "#388E3C"}
                    strokeWidth="2"
                  />
                  <path
                    d={isLeft ? "M 45 7 Q 45 35 45 63" : "M 40 6 Q 40 30 40 54"}
                    stroke={isCompleted ? "#558B2F" : "#2E7D32"}
                    strokeWidth="2.5"
                  />
                </svg>
              </motion.div>
            );
          })}

          {/* Pot - Interactive */}
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-32 cursor-pointer z-20"
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedPart('roots')}
          >
            <svg width="192" height="128" viewBox="0 0 192 128" fill="none">
              {/* Pot body */}
              <path
                d="M 50 10 L 42 105 Q 42 118 54 118 L 138 118 Q 150 118 150 105 L 142 10 Z"
                fill="#D2691E"
                stroke="#8B4513"
                strokeWidth="2"
              />
              {/* Highlight on pot */}
              <path
                d="M 70 15 L 65 100 Q 65 110 72 110 L 80 110 L 85 15 Z"
                fill="#FFFFFF"
                opacity="0.25"
              />
              {/* Shadow on pot */}
              <path
                d="M 122 15 L 127 100 Q 127 110 120 110 L 112 110 L 107 15 Z"
                fill="#000000"
                opacity="0.15"
              />
              {/* Pot rim (top) */}
              <ellipse cx="96" cy="10" rx="52" ry="10" fill="#CD853F" stroke="#8B4513" strokeWidth="2" />
              {/* Pot rim highlight */}
              <ellipse cx="96" cy="9" rx="52" ry="8" fill="#DEB887" opacity="0.4" />
            </svg>
            
            {/* Soil - Interactive for Roots */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-16">
              <div className="w-full h-full rounded-full bg-[#6D4C41] opacity-70" />
            </div>
          </motion.div>

          {/* Hidden Roots Visualization (shows health state) */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-none">
            <svg width="120" height="60" viewBox="0 0 120 60" fill="none" opacity="0.3">
              <path
                d="M 60 0 Q 50 20 40 40 Q 35 50 30 60"
                stroke={healthData.roots === 'healthy' ? '#6D4C41' : '#A1887F'}
                strokeWidth={healthData.roots === 'healthy' ? '4' : '2'}
              />
              <path
                d="M 60 0 Q 70 20 80 40 Q 85 50 90 60"
                stroke={healthData.roots === 'healthy' ? '#6D4C41' : '#A1887F'}
                strokeWidth={healthData.roots === 'healthy' ? '4' : '2'}
              />
              <path
                d="M 60 0 Q 55 25 50 50"
                stroke={healthData.roots === 'healthy' ? '#6D4C41' : '#A1887F'}
                strokeWidth={healthData.roots === 'healthy' ? '3' : '2'}
              />
              <path
                d="M 60 0 Q 65 25 70 50"
                stroke={healthData.roots === 'healthy' ? '#6D4C41' : '#A1887F'}
                strokeWidth={healthData.roots === 'healthy' ? '3' : '2'}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom Sheet */}
      <AnimatePresence>
        {selectedPart && (
          <PlantBottomSheet
            plantPart={selectedPart}
            healthData={healthData}
            onClose={() => {
              setSelectedPart(null);
              setSelectedLeafIndex(null);
            }}
            aiRecommendation={selectedLeafIndex !== null ? recommendations[selectedLeafIndex] : undefined}
            onComplete={() => {
              if (selectedLeafIndex !== null && !completedRecommendations.includes(selectedLeafIndex)) {
                setCompletedRecommendations(prev => [...prev, selectedLeafIndex]);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
