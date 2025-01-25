import { motion } from 'framer-motion';
import Link from 'next/link';

import { MessageIcon, SparklesIcon } from './icons';

export const Overview = () => {
  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center max-w-xl">
        <p className="flex flex-row justify-center gap-4 items-center">
          <SparklesIcon size={32} />
          <span>+</span>
          <MessageIcon size={32} />
        </p>
        <p>
          Welcome to the Lacanian Tarot Bot, your guide to deep psychological insights through tarot readings.
          This AI-powered reader combines Lacanian psychoanalytic theory with traditional tarot interpretation
          for a unique and personalized reading experience.
        </p>
        <p>
          Start your journey by selecting a spread type or asking for a single card reading.
        </p>
      </div>
    </motion.div>
  );
};
