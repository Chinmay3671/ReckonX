import React, { useEffect, useRef } from 'react';

export const TelemetryChart: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const historyLength = 120;
    const dataX: number[] = new Array(historyLength).fill(0.24);
    const dataY: number[] = new Array(historyLength).fill(-0.08);
    const dataZ: number[] = new Array(historyLength).fill(9.80);

    const render = () => {
      dataX.shift();
      dataX.push(0.24 + (Math.random() - 0.5) * 0.1);

      dataY.shift();
      dataY.push(-0.08 + (Math.random() - 0.5) * 0.1);

      dataZ.shift();
      dataZ.push(9.80 + (Math.random() - 0.5) * 0.06);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Plain Light Gray Reference Grid
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;

      for (let y = 20; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      for (let x = 40; x < width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Minimal 1.5px solid line chart
      const drawLine = (data: number[], color: string, minVal: number, maxVal: number) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;

        const step = width / (data.length - 1);
        data.forEach((val, index) => {
          const x = index * step;
          const normalized = (val - minVal) / (maxVal - minVal);
          const y = height - normalized * (height - 20) - 10;
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      };

      drawLine(dataZ, '#64748B', 9.5, 10.1);
      drawLine(dataX, '#1D4ED8', -0.5, 0.8);
      drawLine(dataY, '#D97706', -0.5, 0.8);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-900">
          Rolling Linear Acceleration Waveform
        </span>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-blue-700">
            <span className="w-2 h-2 rounded-full bg-blue-700"></span> X-Axis
          </span>
          <span className="flex items-center gap-1 text-amber-600">
            <span className="w-2 h-2 rounded-full bg-amber-600"></span> Y-Axis
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span> Z-Axis
          </span>
        </div>
      </div>
      <div className="w-full h-32 bg-slate-50 border border-slate-200 rounded overflow-hidden">
        <canvas ref={canvasRef} width={400} height={128} className="w-full h-full block" />
      </div>
    </div>
  );
};
