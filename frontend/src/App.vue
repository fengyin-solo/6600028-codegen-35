<script setup lang="ts">
import { onMounted } from 'vue'
import { useFluidStore } from './store/fluid'
import { PRESETS } from './utils/sph-engine'
import FluidCanvas from './components/FluidCanvas.vue'
import ControlPanel from './components/ControlPanel.vue'

const store = useFluidStore()

onMounted(() => {
  store.initSimulation(PRESETS[0])
})
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
    <!-- Header -->
    <header class="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-xl font-bold text-white tracking-wide">
              {{ store.challengeMode ? '🏆 流体目标容器挑战' : '流体力学 SPH 粒子模拟器' }}
            </h1>
            <span
              v-if="store.challengeMode"
              class="text-xs px-2 py-0.5 rounded-full font-medium"
              :class="store.difficultyColor + ' bg-gray-900'"
            >
              {{ store.difficultyLabel }}
            </span>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            {{ store.challengeMode
              ? '调参 + 点击施加冲量，引导流体进入目标区域'
              : 'Smoothed Particle Hydrodynamics — 点击画布施加冲量' }}
          </p>
        </div>
        <div v-if="store.challengeMode" class="flex items-center gap-4">
          <div class="text-center">
            <p class="text-[10px] text-gray-500 uppercase tracking-wider">倒计时</p>
            <p
              class="text-2xl font-mono font-bold"
              :class="store.timeRemaining <= 10 ? 'text-red-400 animate-pulse' :
                       store.timeRemaining <= 20 ? 'text-yellow-400' : 'text-cyan-400'"
            >
              {{ Math.floor(store.timeRemaining / 60).toString().padStart(2, '0') }}:{{
                 Math.floor(store.timeRemaining % 60).toString().padStart(2, '0') }}
            </p>
          </div>
          <div class="text-center">
            <p class="text-[10px] text-gray-500 uppercase tracking-wider">总进度</p>
            <p
              class="text-2xl font-mono font-bold"
              :class="store.overallPercentage >= store.currentLevel.successThreshold ? 'text-green-400' : 'text-amber-400'"
            >
              {{ store.overallPercentage.toFixed(0) }}%
            </p>
          </div>
          <div class="text-center">
            <p class="text-[10px] text-gray-500 uppercase tracking-wider">状态</p>
            <p class="text-sm font-bold mt-1">
              <span
                v-if="store.challengeStatus === 'ready'"
                class="text-blue-400"
              >准备就绪</span>
              <span
                v-else-if="store.challengeStatus === 'running'"
                class="text-green-400"
              >进行中</span>
              <span
                v-else-if="store.challengeStatus === 'paused'"
                class="text-yellow-400"
              >已暂停</span>
              <span
                v-else-if="store.challengeStatus === 'finished'"
                :class="store.challengeResult?.success ? 'text-green-400' : 'text-red-400'"
              >{{ store.challengeResult?.success ? '挑战成功' : '挑战失败' }}</span>
            </p>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex flex-1 overflow-hidden p-4 gap-4">
      <!-- Left: Canvas -->
      <div class="flex-1 flex flex-col items-start gap-2">
        <FluidCanvas />
        <!-- Challenge quick tips -->
        <div v-if="store.challengeMode" class="text-xs text-gray-500 flex gap-4 flex-wrap">
          <span>💡 <span class="text-gray-400">调参提示:</span> 调大重力可加速下沉，减小粘性可让流体更流畅</span>
          <span>🎯 <span class="text-gray-400">操作:</span> 点击画布在该位置向外施加冲量推开流体</span>
          <span>⏱ <span class="text-gray-400">时限:</span> 在 {{ store.currentLevel.timeLimit }} 秒内完成 ≥{{ store.currentLevel.successThreshold }}% 进度</span>
        </div>
      </div>

      <!-- Right: Controls -->
      <div class="flex-shrink-0">
        <ControlPanel />
      </div>
    </div>

    <!-- Bottom Stats Bar -->
    <footer class="bg-gray-800 border-t border-gray-700 px-6 py-2 flex items-center gap-6 text-xs">
      <div class="flex items-center gap-2">
        <span class="text-gray-500">FPS:</span>
        <span class="text-green-400 font-mono">{{ store.fps }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-gray-500">粒子:</span>
        <span class="text-blue-400 font-mono">{{ store.particleArray.length }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-gray-500">平均密度:</span>
        <span class="text-yellow-400 font-mono">{{ store.avgDensity.toFixed(1) }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-gray-500">最大速度:</span>
        <span class="text-red-400 font-mono">{{ store.maxVelocity.toFixed(1) }}</span>
      </div>
      <div v-if="store.challengeMode" class="flex items-center gap-2">
        <span class="text-gray-500">已收集:</span>
        <span class="text-purple-400 font-mono">
          {{ store.totalCollectedParticles }} / {{ store.particleArray.length }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-gray-500">{{ store.challengeMode ? '当前关卡' : '当前预设' }}:</span>
        <span class="text-purple-400">
          {{ store.challengeMode ? store.currentLevel.name : store.currentPreset.label }}
        </span>
      </div>
      <div class="flex items-center gap-2 ml-auto">
        <span class="text-gray-500">帧数:</span>
        <span class="text-gray-300 font-mono">{{ store.frameCount }}</span>
      </div>
    </footer>
  </div>
</template>
