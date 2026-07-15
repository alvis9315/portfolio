/**
 * Easing：鏡頭「變速」的來源，電影感的關鍵。
 * 每個 shot 各自指定 easing（在 composeShots 的 segment 上），不要全域套一條。
 * 慣例：
 *  - 逼近目標收尾   → easeOutCubic / easeOutQuint（進站減速，像鏡頭「停穩」）
 *  - 中段巡航       → easeInOutSine（起訖都柔和）
 *  - 離場加速       → easeInCubic
 *  - 等速穿越       → linear（fly-through 內部曲線本身已有節奏時）
 */
export const clamp01 = (t) => Math.min(Math.max(t, 0), 1)

export const linear = (t) => t
export const easeInCubic = (t) => t * t * t
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
export const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5)
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2
