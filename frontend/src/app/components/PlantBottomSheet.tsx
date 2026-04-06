import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Leaf, Waves, Flower, Sun, Cloud } from 'lucide-react';
import { SuccessAnimation } from './SuccessAnimation';
import type { Suggestion } from './PlantScreen';

type PlantPart = 'leaves' | 'roots' | 'flower' | 'sun' | 'clouds';

interface HealthData {
  leaves: 'healthy' | 'low';
  roots: 'healthy' | 'weak';
  flower: 'open' | 'closed';
  sun: 'calm' | 'stressed';
  clouds: 'clear' | 'cloudy';
}

interface PlantBottomSheetProps {
  plantPart: PlantPart;
  healthData: HealthData;
  onClose: () => void;
  suggestion?: Suggestion | null;
  onComplete?: () => void;
}

const content = {
  leaves: {
    healthy: {
      icon: Leaf,
      title: 'Your leaves are standing tall.',
      recommendation: 'Keep moving! Try a short walk after meals.',
      action: 'Log a walk',
    },
    low: {
      icon: Leaf,
      title: 'Your leaves need a bit of attention.',
      recommendation: 'Walk for 10 minutes after lunch.',
      action: 'Start walking',
    },
  },
  roots: {
    healthy: {
      icon: Waves,
      title: 'Your roots are strong and deep.',
      recommendation: 'Great balance! Keep eating mindfully.',
      action: 'Log meal',
    },
    weak: {
      icon: Waves,
      title: 'Your roots need care.',
      recommendation: 'Reduce sugar today. Drink more water.',
      action: 'Track food',
    },
  },
  flower: {
    open: {
      icon: Flower,
      title: 'Your flower is fully open.',
      recommendation: 'You slept well! Keep your bedtime consistent.',
      action: 'Set reminder',
    },
    closed: {
      icon: Flower,
      title: "Your flower didn't fully open.",
      recommendation: 'Sleep before 11:30 PM tonight.',
      action: 'Set bedtime',
    },
  },
  sun: {
    calm: {
      icon: Sun,
      title: 'Your sun is gentle and warm.',
      recommendation: "You're doing well. Take time to breathe.",
      action: 'Breathe now',
    },
    stressed: {
      icon: Sun,
      title: 'Your sun is shining too bright.',
      recommendation: 'Take 5 deep breaths. Find a quiet moment.',
      action: 'Start breathing',
    },
  },
  clouds: {
    clear: {
      icon: Cloud,
      title: 'Your sky is clear and bright.',
      recommendation: 'Great mood! Share positivity with someone today.',
      action: 'Share joy',
    },
    cloudy: {
      icon: Cloud,
      title: 'Your sky has some clouds.',
      recommendation: 'Connect with a friend or loved one today.',
      action: 'Reach out',
    },
  },
};

/**
 * Circular score indicator component.
 */
function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 70 ? '#43A047' : score >= 40 ? '#FFA726' : '#EF5350';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="5"
        />
        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold" style={{ color }}>
          {Math.round(score)}
        </span>
      </div>
    </div>
  );
}

/**
 * Format metric keys for display.
 */
function formatMetricName(key: string): string {
  const names: Record<string, string> = {
    glucose_fasting: 'Fasting Glucose',
    hba1c: 'HbA1c',
    diet_score: 'Diet Score',
    bmi: 'BMI',
    physical_activity_minutes_per_week: 'Activity (min/week)',
    heart_rate: 'Heart Rate',
    sleep_hours_per_day: 'Sleep (hrs/day)',
    systolic_bp: 'Systolic BP',
    diastolic_bp: 'Diastolic BP',
    diabetes_risk_score: 'Risk Score',
  };
  return names[key] || key.replace(/_/g, ' ');
}

function formatMetricValue(key: string, value: number): string {
  const units: Record<string, string> = {
    glucose_fasting: 'mg/dL',
    hba1c: '%',
    bmi: '',
    heart_rate: 'bpm',
    systolic_bp: 'mmHg',
    diastolic_bp: 'mmHg',
    physical_activity_minutes_per_week: 'min',
    sleep_hours_per_day: 'hrs',
    diet_score: '/10',
    diabetes_risk_score: '/100',
  };
  const unit = units[key] || '';
  const val = typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value;
  return `${val}${unit ? ' ' + unit : ''}`;
}

export function PlantBottomSheet({
  plantPart,
  healthData,
  onClose,
  suggestion,
  onComplete,
}: PlantBottomSheetProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleDone = () => {
    setShowSuccess(true);
  };

  const handleAnimationComplete = () => {
    setShowSuccess(false);
    onClose();
    if (onComplete) onComplete();
  };

  // ── If a suggestion leaf is selected, render the enhanced suggestion view ──
  const isSuggestionLeaf = plantPart === 'leaves' && suggestion;

  // Fallback content for non-leaf parts
  const state = healthData[plantPart];
  const fallbackData = (content as any)[plantPart]?.[state];
  const Icon = isSuggestionLeaf ? Leaf : (fallbackData?.icon || Leaf);

  return (
    <>
      {showSuccess && <SuccessAnimation onComplete={handleAnimationComplete} />}

      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/30 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-50 shadow-2xl"
        style={{ height: '75vh', maxWidth: '100%' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        {/* Handle Bar */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        {/* Content */}
        <div className="px-8 py-4 flex flex-col h-full overflow-y-auto">
          {isSuggestionLeaf ? (
            /* ── Suggestion Leaf View ────────────────────────────────────────── */
            <>
              {/* Header: icon + title + score ring */}
              <div className="flex items-center gap-5 mb-6">
                <div className="text-4xl">{suggestion.icon}</div>
                <div className="flex-1">
                  <h2 className="text-[20px] font-semibold leading-tight">{suggestion.title}</h2>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      suggestion.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : suggestion.priority === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {suggestion.priority} priority
                  </span>
                </div>
                <ScoreRing score={suggestion.score} />
              </div>

              {/* Metrics cards */}
              {Object.keys(suggestion.metrics).length > 0 && (
                <div className="mb-5">
                  <p className="text-gray-500 text-sm mb-2">Your numbers</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(suggestion.metrics).map(([key, value]) => (
                      <div
                        key={key}
                        className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100"
                      >
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">
                          {formatMetricName(key)}
                        </p>
                        <p className="text-[17px] font-semibold text-gray-800 mt-0.5">
                          {formatMetricValue(key, value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ML Model Insight */}
              {(suggestion.risk_share != null || suggestion.top_driver) && (
                <div className="mb-5 bg-indigo-50 rounded-2xl px-4 py-3 border border-indigo-100">
                  <p className="text-[11px] text-indigo-400 uppercase tracking-wide font-medium mb-1.5">
                    🤖 ML Model Insight
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {suggestion.risk_share != null && (
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              suggestion.risk_share > 30
                                ? '#EF5350'
                                : suggestion.risk_share > 15
                                  ? '#FFA726'
                                  : '#66BB6A',
                          }}
                        />
                        <span className="text-sm text-gray-700">
                          <span className="font-semibold">{suggestion.risk_share}%</span> risk
                          contribution
                        </span>
                      </div>
                    )}
                    {suggestion.top_driver && (
                      <span className="text-sm text-gray-500">
                        · top driver:{' '}
                        <span className="font-medium text-gray-700">
                          {formatMetricName(suggestion.top_driver.feature)}
                        </span>{' '}
                        <span
                          className={
                            suggestion.top_driver.direction === 'risk-increasing'
                              ? 'text-red-500'
                              : 'text-green-500'
                          }
                        >
                          ({suggestion.top_driver.direction === 'risk-increasing' ? '↑ risk' : '↓ risk'})
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* AI Recommendation */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-5 mb-5 border-2 border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-0.5">💡</div>
                  <div className="flex-1">
                    <p className="text-xs text-blue-500 font-medium mb-1">AI Recommendation</p>
                    <p className="text-[17px] leading-relaxed whitespace-pre-wrap">{suggestion.text}</p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-auto pb-8">
                <motion.button
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full h-14 text-[18px] font-medium shadow-lg"
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDone}
                >
                  ✓ Mark as Done
                </motion.button>
              </div>
            </>
          ) : (
            /* ── Fallback: generic plant-part view ──────────────────────────── */
            <>
              <div className="flex flex-col items-center text-center mb-8">
                <div
                  className={`p-4 rounded-full mb-4 ${
                    state === 'healthy' || state === 'open' || state === 'calm' || state === 'clear'
                      ? 'bg-green-100'
                      : 'bg-amber-100'
                  }`}
                >
                  <Icon
                    className={`w-12 h-12 ${
                      state === 'healthy' || state === 'open' || state === 'calm' || state === 'clear'
                        ? 'text-green-600'
                        : 'text-amber-600'
                    }`}
                  />
                </div>
                <h2 className="text-[22px] leading-relaxed max-w-md">
                  {fallbackData?.title || 'Looking good!'}
                </h2>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-6 mb-6 border-2 border-blue-100">
                <div className="flex items-start gap-3 mb-4">
                  <div className="text-2xl mt-1">💡</div>
                  <p className="text-[20px] leading-relaxed flex-1 whitespace-pre-wrap">
                    {fallbackData?.recommendation || 'Keep taking care of yourself!'}
                  </p>
                </div>
              </div>

              <div className="mt-auto pb-8">
                <motion.button
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full h-16 text-[20px] shadow-lg"
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDone}
                >
                  DONE
                </motion.button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}
