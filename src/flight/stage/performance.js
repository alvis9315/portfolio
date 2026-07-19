const COMPACT_VIEWPORT = 768

/**
 * 將裝置差異收斂成 Stage 可使用的渲染預算。
 * 桌面值維持既有視覺；手機只降低昂貴的像素工作，不改鏡頭或場景時間軸。
 */
export function createStagePerformanceProfile({
  width = window.innerWidth,
  pixelRatio = window.devicePixelRatio,
  coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false,
} = {}) {
  const compact = width <= COMPACT_VIEWPORT || coarsePointer

  return Object.freeze({
    compact,
    pixelRatio: Math.min(pixelRatio || 1, compact ? 1.35 : 2),
    reflectorSize: compact ? 512 : 1024,
    bloom: Object.freeze({
      strength: compact ? 0.72 : 0.9,
      radius: compact ? 0.5 : 0.55,
      threshold: compact ? 0.68 : 0.6,
    }),
  })
}
