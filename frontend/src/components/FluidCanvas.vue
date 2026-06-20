<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useFluidStore } from '../store/fluid'

const store = useFluidStore()
const canvas = ref<HTMLCanvasElement | null>(null)

const W = 800
const H = 500

function velocityToColor(speed: number): string {
  const maxSpeed = 200
  const t = Math.min(speed / maxSpeed, 1)
  const hue = (1 - t) * 240
  const sat = 80
  const light = 40 + t * 20
  return `hsl(${hue}, ${sat}%, ${light}%)`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null
}

function drawTargetZones(ctx: CanvasRenderingContext2D) {
  if (!store.challengeMode || store.targetZones.length === 0) return
  for (const zone of store.targetZones) {
    const stats = store.zoneStats.find(zs => zs.zoneId === zone.id)
    const currentCount = stats?.currentCount ?? 0
    const percentage = stats?.percentage ?? 0
    const completed = stats?.completed ?? false
    const rgb = hexToRgb(zone.color)
    if (!rgb) continue
    const fillAlpha = completed ? 0.35 : 0.15 + (percentage / 100) * 0.15
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${fillAlpha})`
    ctx.fillRect(zone.x, zone.y, zone.width, zone.height)
    ctx.strokeStyle = zone.color
    ctx.lineWidth = completed ? 4 : 2
    if (completed) {
      ctx.setLineDash([])
    } else {
      ctx.setLineDash([8, 4])
    }
    ctx.strokeRect(zone.x, zone.y, zone.width, zone.height)
    ctx.setLineDash([])
    const labelY = zone.y < 30 ? zone.y + zone.height + 18 : zone.y - 8
    ctx.fillStyle = zone.color
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(zone.label, zone.x, labelY)
    ctx.font = '11px monospace'
    ctx.fillStyle = completed ? '#22c55e' : '#e2e8f0'
    const progressText = `${currentCount} / ${zone.targetCount} (${percentage.toFixed(0)}%)`
    ctx.fillText(progressText, zone.x, labelY + 14)
    const barWidth = zone.width
    const barHeight = 4
    const barY = zone.y + zone.height + 2
    if (barY < H - 10) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(zone.x, barY, barWidth, barHeight)
      const progressWidth = Math.min(barWidth, barWidth * (percentage / 100))
      ctx.fillStyle = zone.color
      ctx.fillRect(zone.x, barY, progressWidth, barHeight)
    }
  }
}

function drawChallengeHUD(ctx: CanvasRenderingContext2D) {
  if (!store.challengeMode) return
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
  ctx.fillRect(5, 5, 240, 80)
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 1
  ctx.strokeRect(5, 5, 240, 80)
  ctx.fillStyle = '#fbbf24'
  ctx.font = 'bold 13px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`🏆 ${store.currentLevel.name}`, 15, 25)
  ctx.fillStyle = '#94a3b8'
  ctx.font = '10px sans-serif'
  ctx.fillText(`难度: `, 15, 42)
  const diffText = store.difficultyLabel
  const diffColor = store.currentLevel.difficulty === 'easy' ? '#22c55e' :
                    store.currentLevel.difficulty === 'medium' ? '#f59e0b' : '#ef4444'
  ctx.fillStyle = diffColor
  ctx.font = 'bold 10px sans-serif'
  ctx.fillText(diffText, 50, 42)
  ctx.fillStyle = '#e2e8f0'
  ctx.font = '11px monospace'
  const timeColor = store.timeRemaining <= 10 ? '#ef4444' :
                    store.timeRemaining <= 20 ? '#f59e0b' : '#22c55e'
  ctx.fillStyle = timeColor
  const min = Math.floor(store.timeRemaining / 60)
  const sec = Math.floor(store.timeRemaining % 60)
  ctx.fillText(`⏱ ${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`, 15, 60)
  ctx.fillStyle = '#e2e8f0'
  ctx.fillText(`总进度: ${store.overallPercentage.toFixed(1)}%`, 110, 60)
  ctx.fillStyle = '#cbd5e1'
  ctx.font = '10px sans-serif'
  const target = store.currentLevel.successThreshold
  ctx.fillText(`目标: ≥${target}% | 粒子 ${store.totalCollectedParticles}/${store.particleArray.length}`, 15, 77)
  if (store.challengeStatus === 'ready') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 28px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('🎯 点击「开始挑战」开始游戏', W / 2, H / 2 - 30)
    ctx.fillStyle = '#94a3b8'
    ctx.font = '14px sans-serif'
    ctx.fillText(store.currentLevel.description, W / 2, H / 2 + 5)
    ctx.fillStyle = '#64748b'
    ctx.font = '12px sans-serif'
    ctx.fillText('提示：调节参数 + 点击画布施加冲量引导流体', W / 2, H / 2 + 35)
  }
  if (store.challengeStatus === 'paused') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#fbbf24'
    ctx.font = 'bold 32px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('⏸ 挑战已暂停', W / 2, H / 2)
    ctx.fillStyle = '#94a3b8'
    ctx.font = '14px sans-serif'
    ctx.fillText('点击「继续挑战」恢复', W / 2, H / 2 + 30)
  }
  if (store.challengeStatus === 'finished' && store.challengeResult) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
    ctx.fillRect(0, 0, W, H)
    const result = store.challengeResult
    ctx.textAlign = 'center'
    if (result.success) {
      ctx.fillStyle = '#22c55e'
      ctx.font = 'bold 36px sans-serif'
      ctx.fillText('🎉 挑战成功！', W / 2, H / 2 - 80)
    } else {
      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold 36px sans-serif'
      ctx.fillText('💔 挑战失败', W / 2, H / 2 - 80)
    }
    ctx.fillStyle = '#e2e8f0'
    ctx.font = '16px sans-serif'
    ctx.fillText(`总进度: ${result.overallPercentage.toFixed(1)}%  |  目标: ≥${store.currentLevel.successThreshold}%`, W / 2, H / 2 - 45)
    ctx.font = '14px monospace'
    ctx.fillText(`收集粒子: ${result.collectedParticles} / ${result.totalParticles}`, W / 2, H / 2 - 20)
    ctx.fillText(`用时: ${result.timeUsed.toFixed(1)} 秒  |  限: ${store.currentLevel.timeLimit} 秒`, W / 2, H / 2)
    let yOff = H / 2 + 35
    ctx.font = '13px sans-serif'
    for (const zr of result.zoneResults) {
      const zone = store.getZoneById(zr.zoneId)
      if (!zone) continue
      const zoneOk = zr.completed
      ctx.fillStyle = zoneOk ? '#22c55e' : '#ef4444'
      const icon = zoneOk ? '✓' : '✗'
      ctx.fillText(`${icon} ${zone.label}: ${zr.currentCount}/${zone.targetCount} (${zr.percentage.toFixed(0)}%)`, W / 2, yOff)
      yOff += 22
    }
    ctx.fillStyle = '#64748b'
    ctx.font = '12px sans-serif'
    ctx.fillText('在右侧面板点击「重新挑战」或选择其他关卡', W / 2, yOff + 15)
  }
}

function draw() {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#0c1222'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 3
  ctx.strokeRect(2, 2, W - 4, H - 4)
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 0.3
  for (let x = 0; x < W; x += 50) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H)
    ctx.stroke()
  }
  for (let y = 0; y < H; y += 50) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }
  drawTargetZones(ctx)
  if (!store.engine) {
    drawChallengeHUD(ctx)
    return
  }
  const gridSize = 20
  const gw = Math.ceil(W / gridSize)
  const gh = Math.ceil(H / gridSize)
  const densityGrid = new Float32Array(gw * gh)
  for (const p of store.engine.particles) {
    const gx = Math.floor(p.x / gridSize)
    const gy = Math.floor(p.y / gridSize)
    if (gx >= 0 && gx < gw && gy >= 0 && gy < gh) {
      densityGrid[gy * gw + gx] += p.density
    }
  }
  const maxDens = Math.max(...densityGrid, 1)
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const d = densityGrid[gy * gw + gx]
      if (d > 0) {
        const alpha = Math.min(d / maxDens * 0.15, 0.15)
        ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`
        ctx.fillRect(gx * gridSize, gy * gridSize, gridSize, gridSize)
      }
    }
  }
  const particles = store.engine.particles
  for (const p of particles) {
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
    const color = velocityToColor(speed)
    const radius = 4
    ctx.beginPath()
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.fillRect(W - 80, 5, 75, 22)
  ctx.fillStyle = '#22c55e'
  ctx.font = 'bold 12px monospace'
  ctx.fillText(`FPS: ${store.fps}`, W - 74, 20)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.fillRect(W - 120, 30, 115, 22)
  ctx.fillStyle = '#94a3b8'
  ctx.font = '11px monospace'
  ctx.fillText(`Frame: ${store.frameCount}`, W - 114, 44)
  drawChallengeHUD(ctx)
}

let raf: number | null = null
function animate() {
  draw()
  raf = requestAnimationFrame(animate)
}

function onClick(e: MouseEvent) {
  if (!store.engine || !canvas.value) return
  if (store.challengeMode && (store.challengeStatus === 'ready' || store.challengeStatus === 'finished')) return
  const rect = canvas.value.getBoundingClientRect()
  const scaleX = W / rect.width
  const scaleY = H / rect.height
  const x = (e.clientX - rect.left) * scaleX
  const y = (e.clientY - rect.top) * scaleY
  store.engine.applyImpulse(x, y, 300)
}

onMounted(() => {
  animate()
})

onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
})
</script>

<template>
  <div class="relative">
    <canvas
      ref="canvas"
      :width="W"
      :height="H"
      class="rounded-lg border border-gray-700 cursor-crosshair w-full max-w-[800px]"
      @click="onClick"
    />
  </div>
</template>
