import { defineStore } from 'pinia'
import { SPHEngine, DEFAULT_PARAMS, PRESETS, CHALLENGE_LEVELS } from '../utils/sph-engine'
import type { SimParams, Preset, Particle, ChallengeLevel, TargetZone, ZoneStats, ChallengeResult, ChallengeStatus } from '../types'

export const useFluidStore = defineStore('fluid', {
  state: () => ({
    engine: null as SPHEngine | null,
    isRunning: false,
    particleCount: 800,
    currentPreset: PRESETS[0],
    params: { ...DEFAULT_PARAMS } as SimParams,
    fps: 0,
    frameCount: 0,
    _animId: null as number | null,
    _lastTime: 0,
    _fpsAccum: 0,
    _fpsFrames: 0,
    challengeMode: false,
    currentLevel: CHALLENGE_LEVELS[0],
    targetZones: [] as TargetZone[],
    challengeStatus: 'idle' as ChallengeStatus,
    timeRemaining: 0,
    startTime: 0,
    elapsedTime: 0,
    _timerId: null as ReturnType<typeof setInterval> | null,
    zoneStats: [] as ZoneStats[],
    challengeResult: null as ChallengeResult | null,
  }),
  getters: {
    particleArray: (state) => state.engine?.particles ?? [],
    avgDensity: (state) => {
      if (!state.engine || state.engine.particles.length === 0) return 0
      const sum = state.engine.particles.reduce((s, p) => s + p.density, 0)
      return sum / state.engine.particles.length
    },
    maxVelocity: (state) => {
      if (!state.engine || state.engine.particles.length === 0) return 0
      return Math.max(...state.engine.particles.map(p => Math.sqrt(p.vx * p.vx + p.vy * p.vy)))
    },
    totalCollectedParticles: (state) => {
      return state.zoneStats.reduce((sum, zs) => sum + zs.currentCount, 0)
    },
    overallPercentage: (state) => {
      const total = state.engine?.particles.length || 0
      if (total === 0) return 0
      const collected = state.zoneStats.reduce((sum, zs) => sum + zs.currentCount, 0)
      return (collected / total) * 100
    },
    difficultyLabel: (state) => {
      const map: Record<string, string> = {
        easy: '简单',
        medium: '中等',
        hard: '困难',
      }
      return map[state.currentLevel.difficulty]
    },
    difficultyColor: (state) => {
      const map: Record<string, string> = {
        easy: 'text-green-400',
        medium: 'text-yellow-400',
        hard: 'text-red-400',
      }
      return map[state.currentLevel.difficulty]
    },
  },
  actions: {
    initSimulation(preset?: Preset) {
      if (preset) {
        this.currentPreset = preset
        this.params = { ...DEFAULT_PARAMS, ...preset.params }
        this.particleCount = preset.particleCount
      }
      const canvas = { width: 800, height: 500 }
      this.engine = new SPHEngine(this.particleCount, canvas.width, canvas.height, this.params)
      this.engine.initParticles(this.currentPreset.initialConfig, this.particleCount)
      this.frameCount = 0
      this.fps = 0
      this.updateZoneStats()
    },
    start() {
      if (this.isRunning || !this.engine) return
      this.isRunning = true
      this._lastTime = performance.now()
      this._fpsAccum = 0
      this._fpsFrames = 0
      const loop = (now: number) => {
        if (!this.isRunning || !this.engine) return
        const elapsed = now - this._lastTime
        this._lastTime = now
        this._fpsAccum += elapsed
        this._fpsFrames++
        if (this._fpsAccum >= 500) {
          this.fps = Math.round(this._fpsFrames / (this._fpsAccum / 1000))
          this._fpsAccum = 0
          this._fpsFrames = 0
        }
        const subSteps = 3
        for (let s = 0; s < subSteps; s++) {
          this.engine.step()
        }
        this.frameCount++
        if (this.challengeMode && this.challengeStatus === 'running') {
          this.updateZoneStats()
        }
        this._animId = requestAnimationFrame(loop)
      }
      this._animId = requestAnimationFrame(loop)
    },
    stop() {
      this.isRunning = false
      if (this._animId !== null) {
        cancelAnimationFrame(this._animId)
        this._animId = null
      }
    },
    reset() {
      this.stop()
      this.initSimulation(this.currentPreset)
    },
    stepOnce() {
      if (!this.engine || this.isRunning) return
      const subSteps = 3
      for (let s = 0; s < subSteps; s++) {
        this.engine.step()
      }
      this.frameCount++
      this.updateZoneStats()
    },
    updateParam(key: keyof SimParams, value: number) {
      this.params[key] = value
      if (this.engine) {
        this.engine.params[key] = value
        if (key === 'smoothingRadius') {
          this.engine['cellSize'] = value
        }
      }
    },
    enableChallengeMode(level: ChallengeLevel) {
      this.challengeMode = true
      this.currentLevel = level
      this.targetZones = level.targetZones
      this.timeRemaining = level.timeLimit
      this.challengeStatus = 'ready'
      this.challengeResult = null
      this.elapsedTime = 0
      const preset = PRESETS.find(p => p.name === level.presetName) || PRESETS[0]
      this.initSimulation(preset)
      this.zoneStats = level.targetZones.map(z => ({
        zoneId: z.id,
        currentCount: 0,
        percentage: 0,
        completed: false,
      }))
    },
    disableChallengeMode() {
      this.stopChallengeTimer()
      this.challengeMode = false
      this.challengeStatus = 'idle'
      this.targetZones = []
      this.zoneStats = []
      this.challengeResult = null
    },
    startChallenge() {
      if (this.challengeStatus === 'idle') return
      if (this.challengeStatus === 'finished') {
        this.resetChallenge()
      }
      this.challengeStatus = 'running'
      this.startTime = Date.now()
      this.startChallengeTimer()
      this.start()
    },
    pauseChallenge() {
      if (this.challengeStatus !== 'running') return
      this.challengeStatus = 'paused'
      this.stopChallengeTimer()
      this.stop()
    },
    resumeChallenge() {
      if (this.challengeStatus !== 'paused') return
      this.challengeStatus = 'running'
      this.startChallengeTimer()
      this.start()
    },
    resetChallenge() {
      this.stopChallengeTimer()
      this.enableChallengeMode(this.currentLevel)
    },
    startChallengeTimer() {
      if (this._timerId) return
      this._timerId = setInterval(() => {
        if (this.challengeStatus !== 'running') return
        const now = Date.now()
        this.elapsedTime = (now - this.startTime) / 1000
        this.timeRemaining = Math.max(0, this.currentLevel.timeLimit - this.elapsedTime)
        if (this.timeRemaining <= 0) {
          this.finishChallenge()
        }
      }, 100)
    },
    stopChallengeTimer() {
      if (this._timerId) {
        clearInterval(this._timerId)
        this._timerId = null
      }
    },
    updateZoneStats() {
      if (!this.engine || this.targetZones.length === 0) return
      const total = this.engine.particles.length
      this.zoneStats = this.targetZones.map(zone => {
        let count = 0
        for (const p of this.engine.particles) {
          if (p.x >= zone.x && p.x <= zone.x + zone.width &&
              p.y >= zone.y && p.y <= zone.y + zone.height) {
            count++
          }
        }
        const percentage = total > 0 ? (count / zone.targetCount) * 100 : 0
        return {
          zoneId: zone.id,
          currentCount: count,
          percentage,
          completed: percentage >= 100,
        }
      })
      if (this.challengeStatus === 'running') {
        this.checkChallengeComplete()
      }
    },
    checkChallengeComplete() {
      const threshold = this.currentLevel.successThreshold
      const total = this.engine?.particles.length || 0
      const collected = this.zoneStats.reduce((sum, zs) => sum + zs.currentCount, 0)
      const overallPct = total > 0 ? (collected / total) * 100 : 0
      const allZonesMet = this.zoneStats.every(zs => {
        const zone = this.targetZones.find(z => z.id === zs.zoneId)
        if (!zone) return false
        return zs.currentCount >= zone.targetCount
      })
      if (allZonesMet && overallPct >= threshold) {
        this.finishChallenge()
      }
    },
    finishChallenge() {
      this.challengeStatus = 'finished'
      this.stopChallengeTimer()
      this.stop()
      const total = this.engine?.particles.length || 0
      const collected = this.zoneStats.reduce((sum, zs) => sum + zs.currentCount, 0)
      const overallPct = total > 0 ? (collected / total) * 100 : 0
      const allZonesMet = this.zoneStats.every(zs => {
        const zone = this.targetZones.find(z => z.id === zs.zoneId)
        if (!zone) return false
        return zs.currentCount >= zone.targetCount
      })
      const success = allZonesMet && overallPct >= this.currentLevel.successThreshold
      this.challengeResult = {
        success,
        totalParticles: total,
        collectedParticles: collected,
        overallPercentage: overallPct,
        timeUsed: this.elapsedTime,
        zoneResults: [...this.zoneStats],
      }
    },
    getZoneById(id: string): TargetZone | undefined {
      return this.targetZones.find(z => z.id === id)
    },
  },
})
