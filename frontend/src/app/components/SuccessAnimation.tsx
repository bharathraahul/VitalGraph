import { motion } from 'motion/react';
import { useEffect } from 'react';

interface SuccessAnimationProps {
  onComplete: () => void;
}

export function SuccessAnimation({ onComplete }: SuccessAnimationProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center">
      {/* Water drops */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{
            x: 0,
            y: -100,
            scale: 0,
            opacity: 0
          }}
          animate={{
            x: (Math.random() - 0.5) * 200,
            y: [0, 100, 200],
            scale: [0, 1, 0],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 1.5,
            delay: i * 0.1,
            ease: 'easeOut'
          }}
        >
          <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
            <path
              d="M10 0C10 0 0 10 0 16C0 20.4183 4.47715 24 10 24C15.5228 24 20 20.4183 20 16C20 10 10 0 10 0Z"
              fill="#4FC3F7"
              opacity="0.8"
            />
          </svg>
        </motion.div>
      ))}

      {/* Checkmark */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-green-500 rounded-full p-6 shadow-2xl"
      >
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <motion.path
            d="M 8 24 L 18 34 L 40 12"
            stroke="white"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          />
        </svg>
      </motion.div>

      {/* Text */}
      <motion.div
        className="absolute bottom-1/3 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <p className="text-[24px] text-green-600">Great job!</p>
      </motion.div>
    </div>
  );
}
