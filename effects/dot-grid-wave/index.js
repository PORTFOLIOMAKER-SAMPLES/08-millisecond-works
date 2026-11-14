/**
 * dot-grid-wave — 3D 파동 도트 그리드
 * ───────────────────────────────────────────────────────────
 * 티어 T1 · 추가 용량 0KB(Canvas 2D) · WebGL 불필요 · 모든 환경에서 동작
 *
 * 점 격자가 파도처럼 앞뒤로 물결칩니다. 커서 주변은 밀려납니다.
 *
 * WebGL을 안 쓴 이유:
 *   점 몇천 개를 그리는 데 WebGL 컨텍스트를 하나 잡는 건 과합니다.
 *   컨텍스트는 브라우저당 8~16개 한도이고, 셰이더 컴파일 비용도 있습니다.
 *   Canvas 2D는 의존성 0, 컨텍스트 제한 없음, 구형 기기 포함 100% 동작.
 *
 * 진짜 3D인 이유:
 *   점 크기만 키웠다 줄이면 "깜빡이는 점"으로 보입니다.
 *   여기서는 파동을 Z축 변위로 쓰고 원근 투영을 직접 계산합니다.
 *       k = focal / (focal - z)
 *       화면좌표 = 중심 + (격자좌표 - 중심) × k
 *       반지름   = 기본반지름 × k
 *   → 앞으로 나온 점은 커지면서 화면 바깥으로 퍼지고,
 *     뒤로 간 점은 작아지면서 중심으로 모입니다. 이게 실제 원근입니다.
 *
 * 성능 설계:
 *   점 2,600개를 개별 fill 하면 draw call이 2,600번입니다.
 *   Path2D 하나에 arc를 전부 모아 fill을 딱 1번만 호출합니다.
 */

import {
  defineEffect,
  createVisibleLoop,
  observeResize,
  clamp,
  damp,
  dprCap,
  fpsCap,
} from '../_core/index.js';

const TAU = Math.PI * 2;

/** 0~1 구간 S커브. 커서 반발의 경계를 눈에 안 보이게 합니다. */
const smoothstep = (t) => t * t * (3 - 2 * t);

export const mount = defineEffect({
  name: 'dot-grid-wave',

  defaults: {
    /** 점 사이 간격(px). 22~34가 적당합니다. 작을수록 촘촘하고 무겁습니다. */
    spacing: 28,
    /** 점 기본 반지름(px) */
    radius: 1.7,
    /** 점 색. null이면 CSS 변수 --fx-dot-color → 요소의 color 순으로 읽습니다. */
    color: null,
    /** 전체 불투명도 */
    opacity: 0.55,

    /** 파동이 밀어내는 Z 거리(px). 이게 클수록 입체감이 큽니다. */
    depth: 38,
    /** 원근 초점 거리(px). 작을수록 왜곡이 강합니다. */
    focal: 420,
    /** 파동 속도 */
    speed: 1.0,
    /** 파동의 공간 주파수. 작을수록 파장이 깁니다. */
    frequency: 0.022,
    /** 파동 진행 방향(도). 0=오른쪽, 45=대각선 */
    angle: 38,
    /** 중심에서 퍼지는 원형 파동을 섞는 비율(0~1) */
    ripple: 0.35,

    /** 커서 반응 */
    pointer: true,
    /** 커서 영향 반경(px) */
    pointerRadius: 140,
    /** 커서가 점을 밀어내는 거리(px). 음수면 끌어당깁니다. */
    pointerPush: 18,
    /** 커서 주변에서 점이 앞으로 나오는 정도(px) */
    pointerLift: 26,

    /** 프레임 상한. 0이면 기기 등급에 따라 자동 */
    fps: 0,
    /** 렌더 해상도 배율 상한. 점은 작아서 2가 필요합니다. */
    dpr: 2,
    /**
     * 점 개수 상한. 넘으면 spacing을 자동으로 늘립니다.
     * 4K 모니터에서 spacing 28이면 3만 개가 넘어갑니다.
     */
    maxDots: 7000,
  },

  guard: {
    motion: 'skip',
    pointer: 'any', // 파동 자체는 터치 기기에서도 유효합니다
  },

  setup({ el, opts, on, addCleanup, emit }) {
    /* --- 1. 캔버스 --------------------------------------------------- */

    if (getComputedStyle(el).position === 'static') {
      el.style.position = 'relative';
      addCleanup(() => {
        el.style.position = '';
      });
    }

    const canvas = document.createElement('canvas');
    /* fx-layer — 배경 레이어 공용 표식(다른 팩이 콘텐츠로 착각하지 않게). */
    canvas.className = 'fx-dot-grid-wave__canvas fx-layer';
    canvas.setAttribute('aria-hidden', 'true');
    el.prepend(canvas);
    addCleanup(() => canvas.remove());

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      console.warn('[fx:dot-grid-wave] Canvas 2D 컨텍스트를 만들 수 없습니다.');
      canvas.remove();
      return;
    }

    /* --- 2. 색 결정 --------------------------------------------------- */

    const resolveColor = () => {
      if (opts.color) return opts.color;
      const cs = getComputedStyle(el);
      const v = cs.getPropertyValue('--fx-dot-color').trim();
      return v || cs.color || '#888';
    };
    let color = resolveColor();

    /* --- 3. 그리드 계산 ----------------------------------------------- */

    let dpr = 1;
    let W = 0;
    let H = 0;        // CSS 픽셀 기준 크기
    let cols = 0;
    let rows = 0;
    let step = opts.spacing;
    let offX = 0;
    let offY = 0;
    let cx = 0;
    let cy = 0;

    const layout = () => {
      W = el.clientWidth || 1;
      H = el.clientHeight || 1;
      dpr = Math.min(dprCap(3), opts.dpr);

      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;

      // 점 개수가 상한을 넘으면 간격을 넓혀서 방어합니다.
      step = opts.spacing;
      let count = Math.ceil(W / step) * Math.ceil(H / step);
      if (count > opts.maxDots) {
        step = Math.sqrt((W * H) / opts.maxDots);
        count = Math.ceil(W / step) * Math.ceil(H / step);
      }

      cols = Math.ceil(W / step) + 2; // 화면 밖으로 한 줄씩 여유 (원근으로 퍼져도 안 비게)
      rows = Math.ceil(H / step) + 2;
      offX = (W - (cols - 1) * step) / 2;
      offY = (H - (rows - 1) * step) / 2;
      cx = W / 2;
      cy = H / 2;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      color = resolveColor();
    };

    const stopResize = observeResize(el, layout);
    addCleanup(() => stopResize());
    layout();

    /* --- 4. 커서 ----------------------------------------------------- */

    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: 0, tActive: 0 };

    if (opts.pointer) {
      on(
        el,
        'pointermove',
        (event) => {
          const rect = el.getBoundingClientRect();
          pointer.tx = event.clientX - rect.left;
          pointer.ty = event.clientY - rect.top;
          pointer.tActive = 1;
          // 커서가 처음 들어온 순간 순간이동하지 않도록 초기 위치를 맞춥니다.
          if (pointer.x < -9000) {
            pointer.x = pointer.tx;
            pointer.y = pointer.ty;
          }
        },
        { passive: true }
      );
      on(el, 'pointerleave', () => {
        pointer.tActive = 0;
      });
    }

    /* --- 5. 렌더 ----------------------------------------------------- */

    const rad = (opts.angle * Math.PI) / 180;
    const dirX = Math.cos(rad);
    const dirY = Math.sin(rad);
    const zClamp = opts.focal * 0.6; // k가 폭주하지 않도록

    let time = 0;

    const render = (dt) => {
      time += dt * opts.speed;

      pointer.x = damp(pointer.x, pointer.tx, 14, dt);
      pointer.y = damp(pointer.y, pointer.ty, 14, dt);
      pointer.active = damp(pointer.active, pointer.tActive, 8, dt);

      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = opts.opacity;
      ctx.fillStyle = color;

      const path = new Path2D();
      const pr = opts.pointerRadius;
      const usePointer = opts.pointer && pointer.active > 0.01;

      for (let j = 0; j < rows; j++) {
        const gy = offY + j * step;

        for (let i = 0; i < cols; i++) {
          const gx = offX + i * step;

          // ── 파동: 방향파 + 중심에서 퍼지는 원형파를 섞습니다
          const linear = (gx * dirX + gy * dirY) * opts.frequency;
          let phase = linear - time * 2.2;

          if (opts.ripple > 0) {
            const dxc = gx - cx;
            const dyc = gy - cy;
            const dist = Math.sqrt(dxc * dxc + dyc * dyc);
            phase = phase * (1 - opts.ripple) +
                    (dist * opts.frequency - time * 2.2) * opts.ripple;
          }

          let z = Math.sin(phase) * opts.depth;
          let px = gx;
          let py = gy;

          // ── 커서 반발
          if (usePointer) {
            const dx = gx - pointer.x;
            const dy = gy - pointer.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < pr * pr) {
              const d = Math.sqrt(d2) || 0.0001;
              const f = smoothstep(1 - d / pr) * pointer.active;
              px += (dx / d) * opts.pointerPush * f;
              py += (dy / d) * opts.pointerPush * f;
              z += opts.pointerLift * f;
            }
          }

          // ── 원근 투영
          if (z > zClamp) z = zClamp;
          const k = opts.focal / (opts.focal - z);
          const sx = cx + (px - cx) * k;
          const sy = cy + (py - cy) * k;
          const r = opts.radius * k;

          if (r <= 0.05) continue;
          // 화면 밖 점은 건너뜁니다(원근으로 퍼져나간 점들)
          if (sx < -8 || sx > W + 8 || sy < -8 || sy > H + 8) continue;

          // arc 앞에 moveTo가 없으면 이전 원과 직선으로 이어집니다.
          path.moveTo(sx + r, sy);
          path.arc(sx, sy, r, 0, TAU);
        }
      }

      // 수천 개의 점을 fill 한 번으로. 이게 이 효과가 가벼운 이유입니다.
      ctx.fill(path);
      ctx.globalAlpha = 1;
    };

    /* --- 6. 루프 ----------------------------------------------------- */

    const loop = createVisibleLoop(el, render, {
      fps: opts.fps || fpsCap(),
      rootMargin: '120px',
    });
    addCleanup(() => loop.destroy());

    // 색 테마가 바뀌면(다크모드 토글 등) 다시 읽습니다.
    const mqDark = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (mqDark?.addEventListener) {
      const onScheme = () => {
        color = resolveColor();
      };
      mqDark.addEventListener('change', onScheme);
      addCleanup(() => mqDark.removeEventListener('change', onScheme));
    }

    emit('ready', { cols, rows, step });

    return {
      /** 색/레이아웃을 다시 읽습니다(테마 토글 후 호출) */
      refresh: () => layout(),
      get dots() {
        return cols * rows;
      },
    };
  },
});

export default mount;
