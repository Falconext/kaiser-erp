import { AnimatePresence, motion } from 'framer-motion';
import {
  type ApiculturaVariantData,
  optionValueAvailable,
} from './variantUtils';
import { honeyCard, honeyStagger, honeyTap } from './motion';

export default function ApiculturaVariantSelector({
  data,
  selection,
  onChange,
  cp,
}: {
  data: ApiculturaVariantData;
  selection: Record<string, string>;
  onChange: (selection: Record<string, string>) => void;
  cp: string;
}) {
  if (data.options.length === 0) return null;

  return (
    <motion.div variants={honeyStagger} initial="hidden" animate="show" className="mt-7 space-y-5">
      {data.options.map((option) => (
        <motion.div key={option.name} variants={honeyCard} layout>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-black text-black">{option.name}</p>
            <AnimatePresence mode="wait">
              {selection[option.name] && (
                <motion.span
                  key={selection[option.name]}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="text-xs font-bold text-gray-500"
                >
                  {selection[option.name]}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const selected = selection[option.name] === value.label;
              const disabled = !optionValueAvailable(data.choices, selection, option.name, value.label);

              if (option.type === 'color') {
                return (
                  <motion.button
                    key={value.label}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ ...selection, [option.name]: value.label })}
                    className="group flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ borderColor: selected ? cp : '#E5E7EB', backgroundColor: selected ? '#FFF7CC' : '#fff' }}
                    title={value.label}
                    whileHover={disabled ? undefined : { y: -2, scale: 1.03 }}
                    whileTap={disabled ? undefined : honeyTap}
                    layout
                  >
                    <motion.span
                      className="h-5 w-5 rounded-full border border-black/10"
                      style={{ background: value.hex || '#FACC15' }}
                      animate={selected ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                      transition={{ duration: 0.28 }}
                    />
                    {value.label}
                  </motion.button>
                );
              }

              return (
                <motion.button
                  key={value.label}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ ...selection, [option.name]: value.label })}
                  className="min-h-10 rounded-full border px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ borderColor: selected ? cp : '#E5E7EB', backgroundColor: selected ? '#FFF7CC' : '#fff', color: '#111827' }}
                  whileHover={disabled ? undefined : { y: -2, scale: 1.03 }}
                  whileTap={disabled ? undefined : honeyTap}
                  layout
                >
                  {value.label}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
