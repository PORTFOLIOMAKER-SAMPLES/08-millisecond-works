/**
 * magnetic-button — 커서를 끌어당기는 자석 버튼
 * ───────────────────────────────────────────────────────────
 * 티어 T1 · 추가 용량 0KB · 마우스 환경 전용
 *
 * 커서가 일정 거리 안에 들어오면 버튼이 마중 나가고,
 * 안의 라벨은 버튼보다 더/덜 움직여서 두께감을 만듭니다.
 * 여기에 아주 약한 rotateX/Y를 얹어 3D 감각을 더합니다.
 *
 * 왜 hover가 아니라 "거리"인가:
 *   hover 기반이면 커서가 버튼에 닿는 순간 뚝 하고 반응이 시작됩니다.
 *   자석은 닿기 전부터 서서히 끌려와야 자석처럼 느껴집니다.
 *   그래서 버튼 경계가 아니라 중심으로부터의 거리로 계산합니다.
 *
 * 감쇠(falloff)에 smoothstep을 쓰는 이유:
 *   선형 감쇠는 반경 경계에서 미분이 끊겨 "툭" 하고 끊기는 느낌이 납니다.
 *   smoothstep은 양 끝에서 기울기가 0이라 경계가 보이지 않습니다.
 */

import { defineEffect, damp, clamp, round, createLoop } from '../_core/index.js';

/** 0~1 구간을 부드러운 S자 커브로. 양 끝의 기울기가 0입니다. */
const smoothstep = (t) => t * t * (3 - 2 * t);

export const mount = defineEffect({
  name: 'magnetic-button',

  defaults: {
    /** 커서 쪽으로 따라가는 비율(0~1). 0.3~0.45가 자연스럽습니다. */
    strength: 0.35,
    /** 버튼 경계 바깥으로 몇 px까지 자력이 미치는지 */
    radius: 110,
    /** 라벨이 버튼 대비 추가로 움직이는 비율. 1보다 크면 라벨이 앞서갑니다. */
    labelFactor: 0.5,
    /** 자력 범위 안일 때 확대 배율 */
    scale: 1.04,
    /** 최대 기울기(도). 0이면 평면 이동만. 4~8이 은은합니다. */
    rotate: 6,
    /** 따라오는 속도(감쇠 계수) */
    speed: 11,
    /** 커서 위치를 따라가는 빛 번짐 */
    glow: true,
    /** 버튼에서 커서가 완전히 벗어나면 제자리로 */
    resetOnLeave: true,
  },

  guard: {
    motion: 'skip',
    pointer: 'fine', // 터치에는 "가까이 오는" 개념이 없습니다
  },

  setup({ el, opts, on, addCleanup, setVar, emit }) {
    /* --- 1. DOM 준비 ------------------------------------------------- */

    if (getComputedStyle(el).position === 'static') {
      el.style.position = 'relative';
      addCleanup(() => {
        el.style.position = '';
      });
    }

    // 라벨이 지정되지 않았으면 자동으로 감싸지 않습니다(마크업을 건드리지 않기 위해).
    // 대신 있으면 쓰고, 없으면 라벨 시차 없이 동작합니다.
    const label = el.querySelector('[data-fx-label]');
    if (!label) {
      // 조용히 넘어가되, 개발 중에 눈치챌 수 있게 표시만 남깁니다.
      el.dataset.fxMagLabel = 'none';
      addCleanup(() => delete el.dataset.fxMagLabel);
    }

    let glowEl = null;
    if (opts.glow) {
      glowEl = document.createElement('span');
      glowEl.className = 'fx-magnetic-button__glow';
      glowEl.setAttribute('aria-hidden', 'true');
      el.appendChild(glowEl);
      addCleanup(() => glowEl.remove());
    }

    setVar('--fx-mag-lf', opts.labelFactor);

    /* --- 2. 상태 ----------------------------------------------------- */

    const s = { x: 0, y: 0, rx: 0, ry: 0, sc: 1, g: 0, px: 50, py: 50 };
    const t = { x: 0, y: 0, rx: 0, ry: 0, sc: 1, g: 0, px: 50, py: 50 };
    const KEYS = ['x', 'y', 'rx', 'ry', 'sc', 'g', 'px', 'py'];

    let rect = null;
    let engaged = false;

    const invalidate = () => {
      rect = null;
    };
    on(window, 'scroll', invalidate, { passive: true });
    on(window, 'resize', invalidate, { passive: true });

    const apply = () => {
      setVar('--fx-mag-x', `${round(s.x, 2)}px`);
      setVar('--fx-mag-y', `${round(s.y, 2)}px`);
      setVar('--fx-mag-rx', `${round(s.rx, 2)}deg`);
      setVar('--fx-mag-ry', `${round(s.ry, 2)}deg`);
      setVar('--fx-mag-scale', round(s.sc, 4));
      if (glowEl) {
        setVar('--fx-mag-px', `${round(s.px, 1)}%`);
        setVar('--fx-mag-py', `${round(s.py, 1)}%`);
        setVar('--fx-mag-glow', round(s.g, 3));
      }
    };

    /* --- 3. 루프 ----------------------------------------------------- */

    const settled = () => KEYS.every((k) => Math.abs(s[k] - t[k]) < 0.01);

    const loop = createLoop((dt) => {
      for (const k of KEYS) s[k] = damp(s[k], t[k], opts.speed, dt);
      apply();
      if (!engaged && settled()) {
        for (const k of KEYS) s[k] = t[k];
        apply();
        loop.stop();
        el.dataset.fxMagnetic = '0';
      }
    });
    addCleanup(() => loop.stop());

    const wake = () => {
      el.dataset.fxMagnetic = '1';
      loop.start();
    };

    const release = () => {
      if (!engaged) return;
      engaged = false;
      t.x = 0;
      t.y = 0;
      t.rx = 0;
      t.ry = 0;
      t.sc = 1;
      t.g = 0;
      t.px = 50;
      t.py = 50;
      emit('leave');
    };

    /* --- 4. 자력 계산 ------------------------------------------------- */

    on(
      window,
      'pointermove',
      (event) => {
        if (event.pointerType === 'touch') return;
        if (!rect) rect = el.getBoundingClientRect();
        if (!rect.width) return;

        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = event.clientX - cx;
        const dy = event.clientY - cy;

        // 버튼 반경 + 여유 반경까지가 자력 범위
        const reach = Math.max(rect.width, rect.height) / 2 + opts.radius;
        const dist = Math.hypot(dx, dy);

        if (dist > reach) {
          release();
          return;
        }

        // 가까울수록 1, 경계에서 0. 경계에서 기울기도 0이라 끊김이 없습니다.
        const falloff = smoothstep(1 - dist / reach);

        if (!engaged) {
          engaged = true;
          emit('enter');
        }

        t.x = dx * opts.strength * falloff;
        t.y = dy * opts.strength * falloff;
        t.sc = 1 + (opts.scale - 1) * falloff;
        t.g = falloff;

        if (opts.rotate) {
          // 커서가 오른쪽이면 오른쪽이 들리도록(=Y축 양의 회전)
          const nx = clamp(dx / (rect.width / 2 + opts.radius), -1, 1);
          const ny = clamp(dy / (rect.height / 2 + opts.radius), -1, 1);
          t.ry = nx * opts.rotate * falloff;
          t.rx = -ny * opts.rotate * falloff;
        }

        // 글로우는 버튼 안에서의 커서 위치(0~100%)
        t.px = clamp(((event.clientX - rect.left) / rect.width) * 100, -20, 120);
        t.py = clamp(((event.clientY - rect.top) / rect.height) * 100, -20, 120);

        wake();
      },
      { passive: true }
    );

    // 커서가 창 밖으로 나가면 확실히 되돌립니다.
    on(document, 'pointerleave', () => {
      release();
      wake();
    });

    if (opts.resetOnLeave) {
      on(window, 'blur', () => {
        release();
        wake();
      });
    }

    // 키보드 포커스 시에도 살짝 반응 — 이동 없이 확대와 글로우만
    on(el, 'focusin', () => {
      t.sc = opts.scale;
      t.g = 1;
      wake();
    });
    on(el, 'focusout', () => {
      if (!engaged) {
        t.sc = 1;
        t.g = 0;
      }
    });

    /* --- 5. 정리 ----------------------------------------------------- */

    apply();

    addCleanup(() => {
      for (const prop of [
        '--fx-mag-x', '--fx-mag-y', '--fx-mag-rx', '--fx-mag-ry',
        '--fx-mag-scale', '--fx-mag-px', '--fx-mag-py',
        '--fx-mag-glow', '--fx-mag-lf',
      ]) {
        el.style.removeProperty(prop);
      }
      delete el.dataset.fxMagnetic;
    });
  },
});

export default mount;
