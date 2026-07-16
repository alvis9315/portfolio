<script setup>
/**
 * 路線 B 的舞台：AI 影片 scrub（對照路線 A 的 src/flight/FlightStage.vue）。
 *
 * ⚠️ 這是「模組化占位（stub）」——尚未實作。保留成一個真實元件，讓兩條渲染
 *    路線在架構上對等、可互換。完整技術與管線見 docs/rendering-approaches.md。
 *
 * 契約（與 FlightStage 對齊，App.vue 可直接替換）：
 *   - progress: Ref<number>   驅動層 useScrollFlight 的 t，兩路線共用
 *   - manifest: 影片資產清單   { clips: [{ src, duration, sceneId }], connectors: [...] }
 *   - @select                  作品選取事件（路線 B 靠螢幕座標熱區，不是 3D raycaster）
 *
 * 要實作時的核心（詳見 docs）：
 *   1. 把 clips + connectors 接成一條邏輯時間軸，總長 = 各段長度和
 *   2. 每 frame：T = progress.value * totalDuration → 找出所在 clip →
 *      videoEl.currentTime = 局部時間（scrub，非 play）；跨段切換 src / 疊放 video
 *   3. 行動裝置：iOS seek 卡頓 → 考慮 FFmpeg 抽格成影格序列、改 canvas 逐格繪製
 *   4. UI/作品卡照樣疊在本元件外綁 progress；作品熱區用螢幕座標區間
 */
defineProps({
  progress: { type: Object, required: true },
  manifest: { type: Object, default: () => ({ clips: [], connectors: [] }) },
})
defineEmits(['select'])
</script>

<template>
  <!-- 占位畫面：提醒這條路線尚未建置，指向文件 -->
  <div class="video-stage-stub">
    <p>VideoStage（路線 B：AI 影片）尚未實作</p>
    <p class="hint">實作方法見 docs/rendering-approaches.md</p>
  </div>
</template>

<style scoped>
.video-stage-stub {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--bg);
  color: var(--dim);
  font-size: 13px;
  letter-spacing: 0.08em;
}
.hint { font-size: 11px; opacity: 0.7; }
</style>
