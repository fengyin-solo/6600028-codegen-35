<script setup lang="ts">
import { computed } from 'vue'
import { useFluidStore } from '../store/fluid'
import { PRESETS, CHALLENGE_LEVELS } from '../utils/sph-engine'
import type { Preset, ChallengeLevel } from '../types'

const store = useFluidStore()

const panelMode = computed<'preset' | 'challenge'>(() => store.challengeMode ? 'challenge' : 'preset')

function selectPreset(preset: Preset) {
  store.disableChallengeMode()
  store.initSimulation(preset)
}

function selectLevel(level: ChallengeLevel) {
  store.enableChallengeMode(level)
}

function toggleRun() {
  if (store.challengeMode) {
    if (store.challengeStatus === 'running') {
      store.pauseChallenge()
    } else if (store.challengeStatus === 'paused') {
      store.resumeChallenge()
    } else {
      store.startChallenge()
    }
  } else {
    if (store.isRunning) {
      store.stop()
    } else {
      store.start()
    }
  }
}

function reset() {
  if (store.challengeMode) {
    store.resetChallenge()
  } else {
    store.reset()
  }
}

function stepOnce() {
  store.stepOnce()
}

function onGravity(e: Event) {
  store.updateParam('gravity', parseFloat((e.target as HTMLInputElement).value))
}
function onViscosity(e: Event) {
  store.updateParam('viscosity', parseFloat((e.target as HTMLInputElement).value))
}
function onSmoothingRadius(e: Event) {
  store.updateParam('smoothingRadius', parseFloat((e.target as HTMLInputElement).value))
}
function onParticleCount(e: Event) {
  store.particleCount = parseInt((e.target as HTMLInputElement).value)
}
function onDt(e: Event) {
  store.updateParam('dt', parseFloat((e.target as HTMLInputElement).value))
}

function switchToMode(mode: 'preset' | 'challenge') {
  if (mode === 'challenge' && !store.challengeMode) {
    store.enableChallengeMode(CHALLENGE_LEVELS[0])
  } else if (mode === 'preset' && store.challengeMode) {
    store.disableChallengeMode()
    store.initSimulation(PRESETS[0])
  }
}

function getChallengeBtnLabel() {
  switch (store.challengeStatus) {
    case 'ready': return '▶ 开始挑战'
    case 'running': return '⏸ 暂停'
    case 'paused': return '▶ 继续'
    case 'finished': return '🔄 重新挑战'
    default: return '开始'
  }
}

const difficultyBadge = (d: string) => {
  const map: Record<string, string> = {
    easy: 'bg-green-900 text-green-300',
    medium: 'bg-yellow-900 text-yellow-300',
    hard: 'bg-red-900 text-red-300',
  }
  return map[d] || 'bg-gray-700 text-gray-300'
}

const difficultyLabel = (d: string) => {
  const map: Record<string, string> = { easy: '简单', medium: '中等', hard: '困难' }
  return map[d] || d
}
</script>

<template>
  <div class="w-80 bg-gray-800 rounded-lg border border-gray-700 p-4 flex flex-col gap-3 overflow-auto h-full max-h-[calc(100vh-180px)]">
    <!-- Mode Switch -->
    <div class="flex gap-1 bg-gray-900 rounded-lg p-1">
      <button
        @click="switchToMode('preset')"
        class="flex-1 py-2 rounded text-xs font-medium transition"
        :class="panelMode === 'preset' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'"
      >
        🔬 自由模拟
      </button>
      <button
        @click="switchToMode('challenge')"
        class="flex-1 py-2 rounded text-xs font-medium transition"
        :class="panelMode === 'challenge' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'"
      >
        🏆 挑战模式
      </button>
    </div>

    <!-- Preset / Challenge Levels -->
    <div v-if="!store.challengeMode">
      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">预设场景</h3>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="preset in PRESETS"
          :key="preset.name"
          @click="selectPreset(preset)"
          class="text-xs px-2 py-2 rounded transition text-left"
          :class="store.currentPreset.name === preset.name
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
        >
          {{ preset.label }}
        </button>
      </div>
      <p class="text-xs text-gray-500 mt-1">{{ store.currentPreset.description }}</p>
    </div>

    <div v-else>
      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">挑战关卡</h3>
      <div class="flex flex-col gap-2">
        <button
          v-for="level in CHALLENGE_LEVELS"
          :key="level.id"
          @click="selectLevel(level)"
          class="text-xs px-2 py-2 rounded transition text-left"
          :class="store.currentLevel.id === level.id
            ? 'bg-amber-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
        >
          <div class="flex items-center justify-between">
            <span class="font-medium">{{ level.name }}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded" :class="difficultyBadge(level.difficulty)">
              {{ difficultyLabel(level.difficulty) }}
            </span>
          </div>
          <p class="text-[10px] opacity-80 mt-0.5 truncate">{{ level.description }}</p>
        </button>
      </div>
    </div>

    <!-- Challenge Info (only challenge mode) -->
    <div v-if="store.challengeMode" class="bg-gray-900 rounded-lg p-3 border border-gray-700">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold text-amber-400">{{ store.currentLevel.name }}</span>
        <span class="text-[10px] px-2 py-0.5 rounded" :class="difficultyBadge(store.currentLevel.difficulty)">
          {{ store.difficultyLabel }}
        </span>
      </div>
      <p class="text-[11px] text-gray-400 mb-2">{{ store.currentLevel.description }}</p>
      <div class="grid grid-cols-2 gap-2 text-[10px]">
        <div class="bg-gray-800 rounded px-2 py-1">
          <span class="text-gray-500">时间限制</span>
          <p class="text-cyan-400 font-mono text-sm">{{ store.currentLevel.timeLimit }}s</p>
        </div>
        <div class="bg-gray-800 rounded px-2 py-1">
          <span class="text-gray-500">目标阈值</span>
          <p class="text-green-400 font-mono text-sm">≥{{ store.currentLevel.successThreshold }}%</p>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex gap-2">
      <button
        @click="toggleRun"
        class="flex-1 py-2 rounded text-sm font-medium transition"
        :class="store.challengeMode
          ? (store.challengeStatus === 'running'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white')
          : (store.isRunning
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white')"
      >
        {{ store.challengeMode ? getChallengeBtnLabel() : (store.isRunning ? '暂停' : '开始') }}
      </button>
      <button
        @click="reset"
        class="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 py-2 rounded text-sm transition"
      >
        {{ store.challengeMode ? '重置关卡' : '重置' }}
      </button>
      <button
        @click="stepOnce"
        :disabled="store.isRunning || (store.challengeMode && store.challengeStatus === 'running')"
        class="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-200 py-2 rounded text-sm transition"
      >
        单步
      </button>
    </div>

    <!-- Challenge Zone Progress (only challenge mode) -->
    <div v-if="store.challengeMode && store.targetZones.length > 0" class="bg-gray-900 rounded-lg p-3 border border-gray-700 space-y-2">
      <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">目标容器进度</h4>
      <div
        v-for="zone in store.targetZones"
        :key="zone.id"
        class="space-y-1"
      >
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-sm" :style="{ background: zone.color }"></span>
            <span class="text-gray-300">{{ zone.label }}</span>
          </div>
          <span class="font-mono" :class="(store.zoneStats.find(s => s.zoneId === zone.id)?.completed ?? false) ? 'text-green-400' : 'text-gray-400'">
            {{ (store.zoneStats.find(s => s.zoneId === zone.id)?.currentCount ?? 0) }} / {{ zone.targetCount }}
          </span>
        </div>
        <div class="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300"
            :style="{
              width: Math.min(100, store.zoneStats.find(s => s.zoneId === zone.id)?.percentage ?? 0) + '%',
              background: zone.color,
            }"
          ></div>
        </div>
      </div>
      <div class="pt-2 mt-2 border-t border-gray-700">
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="text-gray-400">总进度</span>
          <span class="font-mono" :class="store.overallPercentage >= store.currentLevel.successThreshold ? 'text-green-400' : 'text-amber-400'">
            {{ store.overallPercentage.toFixed(1) }}% / {{ store.currentLevel.successThreshold }}%
          </span>
        </div>
        <div class="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300"
            :class="store.overallPercentage >= store.currentLevel.successThreshold ? 'bg-green-500' : 'bg-amber-500'"
            :style="{ width: Math.min(100, store.overallPercentage) + '%' }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Challenge Result -->
    <div v-if="store.challengeMode && store.challengeResult" class="rounded-lg p-3 border space-y-2"
      :class="store.challengeResult.success ? 'bg-green-950 border-green-800' : 'bg-red-950 border-red-800'">
      <div class="flex items-center gap-2">
        <span class="text-lg">{{ store.challengeResult.success ? '🎉' : '💔' }}</span>
        <span class="text-sm font-bold" :class="store.challengeResult.success ? 'text-green-400' : 'text-red-400'">
          {{ store.challengeResult.success ? '挑战成功！' : '挑战失败' }}
        </span>
      </div>
      <div class="grid grid-cols-2 gap-1.5 text-[10px]">
        <div class="bg-black/30 rounded px-2 py-1">
          <span class="text-gray-500">总进度</span>
          <p class="font-mono text-sm" :class="store.challengeResult.success ? 'text-green-400' : 'text-red-400'">
            {{ store.challengeResult.overallPercentage.toFixed(1) }}%
          </p>
        </div>
        <div class="bg-black/30 rounded px-2 py-1">
          <span class="text-gray-500">用时</span>
          <p class="font-mono text-sm text-cyan-400">{{ store.challengeResult.timeUsed.toFixed(1) }}s</p>
        </div>
      </div>
    </div>

    <!-- Parameters -->
    <div class="space-y-3">
      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">模拟参数</h3>

      <div>
        <label class="flex justify-between text-xs text-gray-400 mb-1">
          <span>重力</span>
          <span class="text-gray-300">{{ store.params.gravity.toFixed(1) }}</span>
        </label>
        <input
          type="range" min="0" max="20" step="0.1"
          :value="store.params.gravity"
          @input="onGravity"
          class="w-full accent-blue-500 h-1.5"
        />
      </div>

      <div>
        <label class="flex justify-between text-xs text-gray-400 mb-1">
          <span>粘性</span>
          <span class="text-gray-300">{{ store.params.viscosity.toFixed(1) }}</span>
        </label>
        <input
          type="range" min="0" max="5" step="0.1"
          :value="store.params.viscosity"
          @input="onViscosity"
          class="w-full accent-blue-500 h-1.5"
        />
      </div>

      <div>
        <label class="flex justify-between text-xs text-gray-400 mb-1">
          <span>光滑半径</span>
          <span class="text-gray-300">{{ store.params.smoothingRadius.toFixed(0) }}</span>
        </label>
        <input
          type="range" min="10" max="50" step="1"
          :value="store.params.smoothingRadius"
          @input="onSmoothingRadius"
          class="w-full accent-blue-500 h-1.5"
        />
      </div>

      <div>
        <label class="flex justify-between text-xs text-gray-400 mb-1">
          <span>粒子数量</span>
          <span class="text-gray-300">{{ store.particleCount }}</span>
        </label>
        <input
          type="range" min="200" max="2000" step="50"
          :value="store.particleCount"
          @input="onParticleCount"
          class="w-full accent-blue-500 h-1.5"
        />
        <p class="text-xs text-gray-600 mt-0.5">重置后生效</p>
      </div>

      <div>
        <label class="flex justify-between text-xs text-gray-400 mb-1">
          <span>时间步长</span>
          <span class="text-gray-300">{{ store.params.dt.toFixed(4) }}</span>
        </label>
        <input
          type="range" min="0.001" max="0.02" step="0.001"
          :value="store.params.dt"
          @input="onDt"
          class="w-full accent-blue-500 h-1.5"
        />
      </div>
    </div>

    <!-- Stats -->
    <div class="mt-auto pt-3 border-t border-gray-700">
      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">运行状态</h3>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="bg-gray-900 rounded px-2 py-1.5">
          <span class="text-gray-500">FPS</span>
          <p class="text-green-400 font-mono text-sm">{{ store.fps }}</p>
        </div>
        <div class="bg-gray-900 rounded px-2 py-1.5">
          <span class="text-gray-500">粒子数</span>
          <p class="text-blue-400 font-mono text-sm">{{ store.particleArray.length }}</p>
        </div>
        <div class="bg-gray-900 rounded px-2 py-1.5">
          <span class="text-gray-500">平均密度</span>
          <p class="text-yellow-400 font-mono text-sm">{{ store.avgDensity.toFixed(0) }}</p>
        </div>
        <div class="bg-gray-900 rounded px-2 py-1.5">
          <span class="text-gray-500">最大速度</span>
          <p class="text-red-400 font-mono text-sm">{{ store.maxVelocity.toFixed(1) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
