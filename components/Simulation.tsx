'use client';

import React, { useState, useRef, useEffect } from 'react';

// ==========================================
// ⚙️ 設定エリア（カスタマイズしやすい項目）
// ==========================================
const CONFIG = {
  // 描画範囲（キャンバスのサイズ）
  canvas: {
    width: 500,
    height: 400,
    backgroundColor: '#121214',
  },
  // シミュレーション（磁力線の計算・描画設定）
  simulation: {
    stepSize: 4,        // 1歩の長さ（大きいほど遠くまで伸びるがカクつく）
    maxSteps: 1000,      // 1本の線の最大ステップ数（遠くまで伸ばす場合は増やす）
    baseLines: 8,       // 磁力が0に近い時に出る最低限の線の数
    strengthFactor: 40, // 磁力100の時に増える線の数（最大本数 = baseLines + strengthFactor）
  },
  // 電磁石の見た目
  magnet: {
    size: 30,           // 電磁石のサイズ（縦横のサイズ。正方形）
    coilColor: '#cd7f32', // コイル（銅線）の色
    coreColor: '#333',    // 鉄心の色
  }
};

// 電磁石のデータ型
interface Magnet {
  id: string;
  x: number;
  y: number;
  angle: number;    // 向き（ラジアン: 0で右向き、Math.PI/2で下向きなど）
  length: number;   // 磁石のサイズ (内部的に使用)
  strength: number; // 磁力の強さ（-100〜100）
}

// 電磁石の初期配置（数、位置、角度、強さを自由に追加・変更可能）
const INITIAL_MAGNETS: Magnet[] = [
  { id: 'm1', x: 150, y: 200, angle: 0, length: CONFIG.magnet.size, strength: 50 }, // 左側の磁石
  { id: 'm2', x: 350, y: 200, angle: Math.PI, length: CONFIG.magnet.size, strength: -80 }, // 右側の斜めの磁石
  { id: 'm3', x: 250, y: 300, angle: Math.PI / 2, length: CONFIG.magnet.size, strength: -80 }, // 右側の斜めの磁石
];
// ==========================================

export default function Simulation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 電磁石のState
  const [magnets, setMagnets] = useState<Magnet[]>(INITIAL_MAGNETS);

  // 指定した座標 (x, y) における磁場ベクトルを計算する関数
  const getFieldVector = (x: number, y: number) => {
    let bx = 0;
    let by = 0;
    const eps = 150; // ゼロ除算・特異点でのフリーズ防止

    magnets.forEach((m) => {
      const nx = m.x + (m.length / 2) * Math.cos(m.angle);
      const ny = m.y + (m.length / 2) * Math.sin(m.angle);
      const sx = m.x - (m.length / 2) * Math.cos(m.angle);
      const sy = m.y - (m.length / 2) * Math.sin(m.angle);

      const r2_n = (x - nx) ** 2 + (y - ny) ** 2 + eps;
      const r3_n = Math.sqrt(r2_n) * r2_n;
      bx += (m.strength * (x - nx)) / r3_n;
      by += (m.strength * (y - ny)) / r3_n;

      const r2_s = (x - sx) ** 2 + (y - sy) ** 2 + eps;
      const r3_s = Math.sqrt(r2_s) * r2_s;
      bx -= (m.strength * (x - sx)) / r3_s;
      by -= (m.strength * (y - sy)) / r3_s;
    });

    return { bx, by };
  };

  // スライダの変更ハンドラ
  const handleStrengthChange = (id: string, value: number) => {
    setMagnets((prev) =>
      prev.map((m) => (m.id === id ? { ...m, strength: value } : m))
    );
  };

  // 描画処理
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 描画クリアと背景塗りつぶし
    ctx.fillStyle = CONFIG.canvas.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- 1. 磁力線のトレースと描画 ---
    ctx.lineWidth = 1.5;
    const { stepSize, maxSteps, baseLines, strengthFactor } = CONFIG.simulation;

    magnets.forEach((m) => {
      const absStrength = Math.abs(m.strength);
      if (absStrength === 0) return; // 磁力0の時は線を描かない

      // プラスかマイナスかで、磁力線がスタートする「実質的なN極」の位置が変わる
      const physicalNX = m.x + (m.length / 2) * Math.cos(m.angle);
      const physicalNY = m.y + (m.length / 2) * Math.sin(m.angle);
      const physicalSX = m.x - (m.length / 2) * Math.cos(m.angle);
      const physicalSY = m.y - (m.length / 2) * Math.sin(m.angle);

      const effectiveNX = m.strength > 0 ? physicalNX : physicalSX;
      const effectiveNY = m.strength > 0 ? physicalNY : physicalSY;

      const linesPerMagnet = baseLines + Math.floor((absStrength / 100) * strengthFactor);

      for (let i = 0; i < linesPerMagnet; i++) {
        const startAngle = (i * 2 * Math.PI) / linesPerMagnet;
        let curX = effectiveNX + 12 * Math.cos(startAngle);
        let curY = effectiveNY + 12 * Math.sin(startAngle);

        ctx.beginPath();
        ctx.moveTo(curX, curY);

        const alpha = Math.min(0.2 + absStrength / 70, 0.7);
        ctx.strokeStyle = `rgba(0, 220, 255, ${alpha})`;

        for (let step = 0; step < maxSteps; step++) {
          const { bx, by } = getFieldVector(curX, curY);
          const mag = Math.sqrt(bx * bx + by * by);
          if (mag < 0.005) break;

          curX += (bx / mag) * stepSize;
          curY += (by / mag) * stepSize;
          ctx.lineTo(curX, curY);

          // 画面外に出たら終了
          if (curX < 0 || curX > canvas.width || curY < 0 || curY > canvas.height) break;

          // 「実質的なS極」に近づいたらループを終了（無限ループ・めり込み対策）
          let nearS = false;
          magnets.forEach((otherM) => {
            if (otherM.strength === 0) return;
            const otherPNX = otherM.x + (otherM.length / 2) * Math.cos(otherM.angle);
            const otherPNY = otherM.y + (otherM.length / 2) * Math.sin(otherM.angle);
            const otherPSX = otherM.x - (otherM.length / 2) * Math.cos(otherM.angle);
            const otherPSY = otherM.y - (otherM.length / 2) * Math.sin(otherM.angle);

            const targetSX = otherM.strength > 0 ? otherPSX : otherPNX;
            const targetSY = otherM.strength > 0 ? otherPSY : otherPNY;

            const dist = Math.sqrt((curX - targetSX) ** 2 + (curY - targetSY) ** 2);
            if (dist < 15) nearS = true;
          });
          if (nearS) break;
        }
        ctx.stroke();
      }
    });

    // --- 2. 電磁石（本体）の描画 ---
    magnets.forEach((m) => {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.angle);

      const half = m.length / 2;

      // 鉄心（コア）の描画
      ctx.fillStyle = CONFIG.magnet.coreColor;
      ctx.fillRect(-half, -half, m.length, m.length);

      // 銅線（コイル）の描画
      ctx.strokeStyle = CONFIG.magnet.coilColor;
      ctx.lineWidth = 3;
      for (let i = -half + 6; i <= half - 6; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, -half);
        ctx.lineTo(i, half);
        ctx.stroke();
      }

      // 極性ラベル（通電時のみ表示、マイナスなら反転）
      if (m.strength !== 0) {
        const isPositive = m.strength > 0;
        const labelW = 12;
        const labelH = 20;
        const yOff = -10;

        // 右側の端
        ctx.fillStyle = isPositive ? '#ff4d4d' : '#3b82f6';
        ctx.fillRect(half - labelW, yOff, labelW, labelH);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(isPositive ? 'N' : 'S', half - labelW + 2, 5);

        // 左側の端
        ctx.fillStyle = isPositive ? '#3b82f6' : '#ff4d4d';
        ctx.fillRect(-half, yOff, labelW, labelH);
        ctx.fillStyle = '#fff';
        ctx.fillText(isPositive ? 'S' : 'N', -half + 2, 5);
      } else {
        // オフ状態（磁力0）
        ctx.fillStyle = '#111';
        ctx.fillRect(-15, -10, 30, 20);
        ctx.fillStyle = '#888';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('OFF', -10, 4);
      }

      ctx.restore();
    });
  }, [magnets]);

  // UI用ヘルパー（文字色決定用）
  const getStrengthColor = (val: number) => {
    if (val > 0) return '#ff4d4d'; // プラスは赤
    if (val < 0) return '#3b82f6'; // マイナスは青
    return '#888'; // ゼロはグレー
  };

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px', background: '#1e1e24', color: '#fff', borderRadius: '12px', fontFamily: 'sans-serif' }}>
      {/* 左側: シミュレーション画面 */}
      <div>
        <canvas
          ref={canvasRef}
          width={CONFIG.canvas.width}
          height={CONFIG.canvas.height}
          style={{ border: '1px solid #3f3f46', borderRadius: '8px', display: 'block' }}
        />
        <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '8px', textAlign: 'center' }}>
          コード上部の CONFIG および INITIAL_MAGNETS を変更することで設定を変えられます。
        </div>
      </div>

      {/* 右側: 操作パネル */}
      <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ fontSize: '18px', margin: 0 }}>電磁石コントロール</h2>
        <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '0 0 10px 0', lineHeight: 1.4 }}>
          マイナスにすると極性が反転します。<br />
          ゼロ(0)にすると電源オフになります。
        </p>

        {magnets.map((m, index) => (
          <div key={m.id} style={{ background: '#27272a', padding: '15px', borderRadius: '8px', border: '1px solid #3f3f46' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: 'bold' }}>
              電磁石 {index + 1}
            </label>
            <input
              type="range"
              min="-100"
              max="100"
              value={m.strength}
              onChange={(e) => handleStrengthChange(m.id, Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ fontSize: '12px', color: '#a1a1aa' }}>-100</span>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: getStrengthColor(m.strength) }}>
                {m.strength}
              </span>
              <span style={{ fontSize: '12px', color: '#a1a1aa' }}>100</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
