import { motion, useReducedMotion } from "motion/react";

export interface EtcdRingProps {
  joined: number;
  total: number;
}

const SIZE = 64;
const RADIUS = 24;
const CENTER = SIZE / 2;

export function EtcdRing({ joined, total }: EtcdRingProps) {
  const prefersReducedMotion = useReducedMotion();
  if (total === 0) return null;

  const points = Array.from({ length: total }, (_, i) => {
    const angle = (2 * Math.PI * i) / total - Math.PI / 2;
    return { x: CENTER + RADIUS * Math.cos(angle), y: CENTER + RADIUS * Math.sin(angle), memberIndex: i };
  });

  return (
    <div className="flex items-center gap-2 rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-xs text-(--text-muted)">
      <svg width={SIZE} height={SIZE} role="img" aria-label={`etcd ${joined} of ${total} members joined`}>
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#334155" strokeWidth={1.5} />
        {points.map((p, i) => {
          const isJoined = i < joined;
          return (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={5}
              fill={isJoined ? "#06b6d4" : "#1e293b"}
              stroke={isJoined ? "#67e8f9" : "#475569"}
              strokeWidth={1.5}
              animate={
                prefersReducedMotion
                  ? undefined
                  : isJoined
                    ? { scale: [0.6, 1.15, 1] }
                    : { scale: 1 }
              }
              transition={{ duration: 0.4 }}
            />
          );
        })}
      </svg>
      <div>
        <div className="font-semibold text-cyan-400">etcd</div>
        <div>
          {joined}/{total} members
        </div>
      </div>
    </div>
  );
}
