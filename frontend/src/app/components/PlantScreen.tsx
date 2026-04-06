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

export interface Suggestion {
  id: string;
  icon: string;
  title: string;
  text: string;
  score: number;
  priority: 'high' | 'medium' | 'low';
  risk_share: number;
  top_driver?: {
    feature: string;
    contribution: number;
    direction: string;
  };
  metrics: Record<string, number>;
}

/**
 * Map a health score (0-100) to a leaf fill color.
 * High score → vibrant green, low score → amber/yellow.
 */
function scoreToLeafColor(score: number): { fill: string; stroke: string; vein: string } {
  if (score >= 80) return { fill: '#43A047', stroke: '#2E7D32', vein: '#1B5E20' };
  if (score >= 60) return { fill: '#66BB6A', stroke: '#388E3C', vein: '#2E7D32' };
  if (score >= 40) return { fill: '#9CCC65', stroke: '#689F38', vein: '#558B2F' };
  if (score >= 20) return { fill: '#DCE775', stroke: '#AFB42B', vein: '#9E9D24' };
  return { fill: '#FFD54F', stroke: '#FFA000', vein: '#FF8F00' };
}

/**
 * Compute leaf position along the stem.
 * Leaves alternate left/right and are spaced evenly.
 */
function getLeafPosition(index: number, total: number) {
  const isLeft = index % 2 === 0;
  // Vertical range: from top=80px to top=240px (spread out along the stem)
  const minTop = 80;
  const maxTop = 240;
  const step = total > 1 ? (maxTop - minTop) / (total - 1) : 0;
  const top = minTop + index * step;

  return {
    isLeft,
    top,
    left: isLeft ? 8 : undefined,
    right: isLeft ? undefined : 8,
  };
}

export function PlantScreen() {
  const [selectedPart, setSelectedPart] = useState<PlantPart>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [completedSuggestions, setCompletedSuggestions] = useState<string[]>([]);
  const [selectedLeafIndex, setSelectedLeafIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [healthData, setHealthData] = useState<HealthData>({
    leaves: 'low',
    roots: 'healthy',
    flower: 'closed',
    sun: 'stressed',
    clouds: 'clear',
  });

  useEffect(() => {
    fetch('http://localhost:8000/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.healthData) setHealthData(data.healthData);
        if (data.suggestions) setSuggestions(data.suggestions);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching health data:', err);
        setLoading(false);
      });
  }, []);

  // Flower bloom progress based on completed suggestions
  const bloomProgress = suggestions.length > 0 ? completedSuggestions.length / suggestions.length : 0;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Sky Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#a8d5ff] via-[#d4e9ff] to-[#ffe8d6]" />

      {/* Animated Clouds */}
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

      {/* Sun */}
      <motion.div
        className="absolute top-12 right-12 w-20 h-20 cursor-pointer z-10"
        animate={{
          scale: healthData.sun === 'calm' ? [1, 1.1, 1] : [0.95, 1.05, 0.95],
          opacity: healthData.sun === 'calm' ? [0.8, 1, 0.8] : [0.9, 1, 0.9],
        }}
        transition={{ duration: healthData.sun === 'calm' ? 6 : 3, repeat: Infinity, ease: 'easeInOut' }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setSelectedPart('sun')}
      >
        <div
          className={`w-full h-full rounded-full blur-2xl ${healthData.sun === 'calm' ? 'bg-yellow-200' : 'bg-orange-300'}`}
        />
        <div
          className={`absolute inset-2 rounded-full blur-md ${healthData.sun === 'calm' ? 'bg-yellow-100' : 'bg-amber-200'}`}
        />
      </motion.div>

      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-40">
          <motion.div
            className="text-lg text-green-800/60 font-medium"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Growing your plant…
          </motion.div>
        </div>
      )}

      {/* Main Plant Container */}
      <div className="relative h-full flex items-end justify-center pb-16">
        <div className="relative" style={{ width: '280px', height: '400px' }}>
          {/* Flower — bloom state driven by completed suggestions */}
          <motion.div
            className="absolute top-0 left-1/2 -translate-x-1/2 cursor-pointer z-20"
            animate={{ rotate: [-2, 2, -2], y: [0, -3, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedPart('flower')}
          >
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              {/* Back Center */}
              <circle cx="40" cy="44" r="12" fill="#FDD835" stroke="#F9A825" strokeWidth="1.5" />

              {/* Petals — bloom based on completion progress */}
              {[
                { cx: 40, cy: 20, rotate: 0 },
                { cx: 57, cy: 27, rotate: 45 },
                { cx: 64, cy: 44, rotate: 90 },
                { cx: 57, cy: 61, rotate: 135 },
                { cx: 40, cy: 68, rotate: 180 },
                { cx: 23, cy: 61, rotate: -135 },
                { cx: 16, cy: 44, rotate: -90 },
                { cx: 23, cy: 27, rotate: -45 },
              ].map((petal, i) => {
                const startCx = 40 + (petal.cx - 40) * 0.3;
                const startCy = 44 + (petal.cy - 44) * 0.3;
                const currentCx = startCx + (petal.cx - startCx) * bloomProgress;
                const currentCy = startCy + (petal.cy - startCy) * bloomProgress;
                const currentRx = 5 + 5 * bloomProgress;
                const currentRy = 7 + 7 * bloomProgress;

                return (
                  <motion.g
                    key={i}
                    animate={{ x: currentCx - petal.cx, y: currentCy - petal.cy }}
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

          {/* ── Dynamic Leaves — one per suggestion ─────────────────────────── */}
          {suggestions.map((suggestion, idx) => {
            const isCompleted = completedSuggestions.includes(suggestion.id);
            const pos = getLeafPosition(idx, suggestions.length);
            const colors = scoreToLeafColor(suggestion.score);

            return (
              <motion.div
                key={`leaf-${suggestion.id}`}
                className="absolute cursor-pointer z-10"
                style={{
                  top: `${pos.top}px`,
                  ...(pos.isLeft ? { left: `${pos.left}px` } : { right: `${pos.right}px` }),
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: 1,
                  rotate: pos.isLeft ? [-5, 5, -5] : [5, -5, 5],
                  y: [0, -2, 0],
                  opacity: isCompleted ? 0.5 : 1,
                }}
                transition={{
                  scale: { duration: 0.5, delay: idx * 0.12 },
                  rotate: { duration: pos.isLeft ? 3 : 3.5, repeat: Infinity },
                  y: { duration: pos.isLeft ? 3 : 3.5, repeat: Infinity },
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedPart('leaves');
                  setSelectedLeafIndex(idx);
                }}
              >
                <svg
                  width="100"
                  height="70"
                  viewBox="0 0 100 70"
                  fill="none"
                  style={{ transform: pos.isLeft ? 'scaleX(1)' : 'scaleX(-1)' }}
                >
                  {/* Leaf shape */}
                  <ellipse
                    cx="48"
                    cy="32"
                    rx="38"
                    ry="24"
                    fill={isCompleted ? '#8BC34A' : colors.fill}
                    stroke={isCompleted ? '#689F38' : colors.stroke}
                    strokeWidth="2"
                  />
                  {/* Central vein */}
                  <path
                    d="M 48 8 Q 48 32 48 56"
                    stroke={isCompleted ? '#558B2F' : colors.vein}
                    strokeWidth="2"
                  />
                  {/* Side veins */}
                  <path d="M 48 20 Q 60 18 72 22" stroke={colors.vein} strokeWidth="1" opacity="0.4" />
                  <path d="M 48 32 Q 63 28 78 32" stroke={colors.vein} strokeWidth="1" opacity="0.4" />
                  <path d="M 48 44 Q 60 42 70 46" stroke={colors.vein} strokeWidth="1" opacity="0.4" />
                  <path d="M 48 20 Q 36 18 24 22" stroke={colors.vein} strokeWidth="1" opacity="0.4" />
                  <path d="M 48 32 Q 33 28 18 32" stroke={colors.vein} strokeWidth="1" opacity="0.4" />
                  <path d="M 48 44 Q 36 42 26 46" stroke={colors.vein} strokeWidth="1" opacity="0.4" />

                  {/* Completed checkmark */}
                  {isCompleted && (
                    <g>
                      <circle cx="48" cy="32" r="10" fill="white" opacity="0.85" />
                      <path
                        d="M 42 32 L 46 36 L 54 28"
                        stroke="#2E7D32"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </g>
                  )}
                </svg>

                {/* Category icon badge */}
                <div
                  className="absolute -top-1 text-sm select-none pointer-events-none"
                  style={{
                    [pos.isLeft ? 'right' : 'left']: '8px',
                  }}
                >
                  {suggestion.icon}
                </div>
              </motion.div>
            );
          })}

          {/* Pot */}
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-32 cursor-pointer z-20"
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedPart('roots')}
          >
            <svg width="192" height="128" viewBox="0 0 192 128" fill="none">
              <path
                d="M 50 10 L 42 105 Q 42 118 54 118 L 138 118 Q 150 118 150 105 L 142 10 Z"
                fill="#D2691E"
                stroke="#8B4513"
                strokeWidth="2"
              />
              <path d="M 70 15 L 65 100 Q 65 110 72 110 L 80 110 L 85 15 Z" fill="#FFFFFF" opacity="0.25" />
              <path
                d="M 122 15 L 127 100 Q 127 110 120 110 L 112 110 L 107 15 Z"
                fill="#000000"
                opacity="0.15"
              />
              <ellipse cx="96" cy="10" rx="52" ry="10" fill="#CD853F" stroke="#8B4513" strokeWidth="2" />
              <ellipse cx="96" cy="9" rx="52" ry="8" fill="#DEB887" opacity="0.4" />
            </svg>

            {/* Soil */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-16">
              <div className="w-full h-full rounded-full bg-[#6D4C41] opacity-70" />
            </div>
          </motion.div>

          {/* Hidden Roots */}
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

      {/* Suggestion count badge */}
      {suggestions.length > 0 && (
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg text-sm text-gray-600 z-30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <span className="font-semibold text-green-700">{completedSuggestions.length}</span>
          <span> / {suggestions.length} tasks done</span>
          {completedSuggestions.length === suggestions.length && suggestions.length > 0 && (
            <span className="ml-2">🌸</span>
          )}
        </motion.div>
      )}

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
            suggestion={selectedLeafIndex !== null ? suggestions[selectedLeafIndex] : undefined}
            onComplete={() => {
              if (selectedLeafIndex !== null) {
                const sid = suggestions[selectedLeafIndex]?.id;
                if (sid && !completedSuggestions.includes(sid)) {
                  setCompletedSuggestions((prev) => [...prev, sid]);
                }
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
