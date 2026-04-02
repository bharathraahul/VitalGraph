import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Leaf, Waves, Flower, Sun, Cloud } from 'lucide-react';
import { SuccessAnimation } from './SuccessAnimation';

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
  aiRecommendation?: string | null;
  onComplete?: () => void;
}

const content = {
  leaves: {
    healthy: {
      icon: Leaf,
      title: "Your leaves are standing tall.",
      history: [
        'https://images.unsplash.com/photo-1744750074905-0d2930a440f2?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1759063376831-5be614726082?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1744751578749-1a0a1fee5a72?w=300&h=300&fit=crop'
      ],
      recommendation: "Keep moving! Try a short walk after meals.",
      action: "Log a walk"
    },
    low: {
      icon: Leaf,
      title: "Your leaves are a little low.",
      history: [
        'https://images.unsplash.com/photo-1744750074905-0d2930a440f2?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1700991321335-4b0e251856ee?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1680924315005-5ee78cc334f3?w=300&h=300&fit=crop'
      ],
      recommendation: "Walk for 10 minutes after lunch.",
      action: "Start walking"
    }
  },
  roots: {
    healthy: {
      icon: Waves,
      title: "Your roots are strong and deep.",
      history: [
        'https://images.unsplash.com/photo-1743922166322-5c8456c73938?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1705419995497-9972091a8903?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1706736458477-067cc3ca2787?w=300&h=300&fit=crop'
      ],
      recommendation: "Great balance! Keep eating mindfully.",
      action: "Log meal"
    },
    weak: {
      icon: Waves,
      title: "Your roots need care.",
      history: [
        'https://images.unsplash.com/photo-1706736458477-067cc3ca2787?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1660656127704-a6151daa465e?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1660656127704-a6151daa465e?w=300&h=300&fit=crop'
      ],
      recommendation: "Reduce sugar today. Drink more water.",
      action: "Track food"
    }
  },
  flower: {
    open: {
      icon: Flower,
      title: "Your flower is fully open.",
      history: [
        'https://images.unsplash.com/photo-1771682972069-a38d102bc8ca?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1698753442093-670c4c161cc5?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1771682972069-a38d102bc8ca?w=300&h=300&fit=crop'
      ],
      recommendation: "You slept well! Keep your bedtime consistent.",
      action: "Set reminder"
    },
    closed: {
      icon: Flower,
      title: "Your flower didn't fully open.",
      history: [
        'https://images.unsplash.com/photo-1771682972069-a38d102bc8ca?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1698753442093-670c4c161cc5?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1765501745633-cdbdc587b301?w=300&h=300&fit=crop'
      ],
      recommendation: "Sleep before 11:30 PM tonight.",
      action: "Set bedtime"
    }
  },
  sun: {
    calm: {
      icon: Sun,
      title: "Your sun is gentle and warm.",
      history: [
        'https://images.unsplash.com/photo-1596411583810-c771f37cc308?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1594315590298-329f49c8dcb9?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1596411583810-c771f37cc308?w=300&h=300&fit=crop'
      ],
      recommendation: "You're doing well. Take time to breathe.",
      action: "Breathe now"
    },
    stressed: {
      icon: Sun,
      title: "Your sun is shining too bright.",
      history: [
        'https://images.unsplash.com/photo-1596411583810-c771f37cc308?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1752122094097-a27239f964cd?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1746032115101-31c774a86ce9?w=300&h=300&fit=crop'
      ],
      recommendation: "Take 5 deep breaths. Find a quiet moment.",
      action: "Start breathing"
    }
  },
  clouds: {
    clear: {
      icon: Cloud,
      title: "Your sky is clear and bright.",
      history: [
        'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1601297183305-6df142704ed2?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=300&h=300&fit=crop'
      ],
      recommendation: "Great mood! Share positivity with someone today.",
      action: "Share joy"
    },
    cloudy: {
      icon: Cloud,
      title: "Your sky has some clouds.",
      history: [
        'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1500740516770-92bd004b996e?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1611928482473-7b27d24eab80?w=300&h=300&fit=crop'
      ],
      recommendation: "Connect with a friend or loved one today.",
      action: "Reach out"
    }
  }
};

export function PlantBottomSheet({ plantPart, healthData, onClose, aiRecommendation, onComplete }: PlantBottomSheetProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const state = healthData[plantPart];
  const data = content[plantPart][state];
  const Icon = data.icon;

  const handleDone = () => {
    setShowSuccess(true);
  };

  const handleAnimationComplete = () => {
    setShowSuccess(false);
    onClose();
    if (onComplete) onComplete();
  };

  return (
    <>
      {/* Success Animation */}
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
        style={{ height: '70vh', maxWidth: '100%' }}
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
        <div className="px-8 py-6 flex flex-col h-full">

          {/* Current State Section */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className={`p-4 rounded-full mb-4 ${
              state === 'healthy' || state === 'open' || state === 'calm'
                ? 'bg-green-100'
                : 'bg-amber-100'
            }`}>
              <Icon className={`w-12 h-12 ${
                state === 'healthy' || state === 'open' || state === 'calm'
                  ? 'text-green-600'
                  : 'text-amber-600'
              }`} />
            </div>

            <h2 className="text-[22px] leading-relaxed max-w-md">
              {data.title}
            </h2>
          </div>

          {/* Micro History Section */}
          <div className="mb-8">
            <p className="text-center text-gray-500 mb-3">Last few days</p>
            <div className="flex justify-center items-center gap-4">
              {data.history.map((imageUrl, index) => (
                <motion.div
                  key={index}
                  className="relative"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
                    <img
                      src={imageUrl}
                      alt={`Day ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Arrow between images */}
                  {index < data.history.length - 1 && (
                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-gray-300 text-xl">
                      →
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recommendation Section */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-6 mb-6 border-2 border-blue-100">
            <div className="flex items-start gap-3 mb-4">
              <div className="text-2xl mt-1">💡</div>
              <p className="text-[20px] leading-relaxed flex-1 whitespace-pre-wrap">
                {aiRecommendation || data.recommendation}
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <div className="mt-auto pb-8">
            <motion.button
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full h-16 text-[20px] shadow-lg"
              whileTap={{ scale: 0.98 }}
              onClick={handleDone}
            >
              DONE
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
