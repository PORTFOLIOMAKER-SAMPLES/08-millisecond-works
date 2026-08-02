/**
 * model-showcase — GLB 3D 모델 쇼케이스
 * ───────────────────────────────────────────────────────────
 * 티어 T3 · 추가 용량 약 150KB+(model-viewer, 화면 근처에서만 로드) · WebGL 필요
 *
 * ★ 이 팩에서 유일하게 "무거운" 효과입니다. 페이지당 1개만 쓰세요.
 *
 * three.js로 직접 씬을 짜지 않고 <model-viewer>를 쓰는 이유:
 *   포트폴리오에서 필요한 건 "모델 하나를 예쁘게 돌려 보여주기"입니다.
 *   three.js로 직접 하면 카메라·조명·환경맵·톤매핑·DRACO 디코더·
 *   AR·접근성·로딩 상태를 전부 직접 짜야 합니다. 300줄은 나옵니다.
 *   <model-viewer>는 그걸 전부 포함하고 태그 한 줄로 끝납니다.
 *   커스텀 셰이더가 필요해지는 순간에만 three.js로 내려가세요.
 *
 * 3단 로딩 전략:
 *   1. 포스터 이미지(HTML에 미리 존재) — 즉시 보임, 0KB 추가
 *   2. 화면 근처에 오면 model-viewer 스크립트 로드
 *   3. 모델 로드 완료 → 포스터 페이드아웃
 *
 *   → 방문자가 3D 섹션까지 스크롤하지 않으면 단 한 바이트도 내려받지 않습니다.
 */

import {
  defineEffect,
  loadModelViewer,
  observeVisibility,
  prefersReducedMotion,
} from '../_core/index.js';

/** null/undefined가 아닌 값만 속성으로 설정합니다. */
function setAttrs(node, attrs) {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    node.setAttribute(key, value === true ? '' : String(value));
  }
}

export const mount = defineEffect({
  name: 'model-showcase',

  defaults: {
    /** .glb 또는 .gltf 경로 (필수) */
    src: null,
    /** iOS AR용 .usdz 경로 (ar: true일 때만 의미 있음) */
    iosSrc: null,
    /** 스크린 리더용 모델 설명 (필수에 가깝습니다) */
    alt: '3D 모델',
    /** 포스터 이미지. null이면 컨테이너의 .fx-model__poster에서 읽습니다 */
    poster: null,

    /** 드래그로 회전 */
    cameraControls: true,
    /** 자동 회전 (동작 줄이기 사용자에게는 자동으로 꺼집니다) */
    autoRotate: true,
    /** 사용자 조작 후 자동 회전 재개까지의 시간(ms) */
    autoRotateDelay: 1500,
    /** 자동 회전 속도 */
    rotationPerSecond: '18deg',

    /**
     * 휠 줌 비활성화.
     * ★ 기본값 true인 이유: model-viewer는 휠 이벤트를 가로채 줌으로 씁니다.
     *   페이지 중간에 있는 모델 위에서 스크롤하면 페이지가 안 내려가고
     *   모델만 확대됩니다. 방문자는 "페이지가 멈췄다"고 느낍니다.
     *   포트폴리오에서 줌은 거의 필요 없습니다.
     */
    disableZoom: true,
    /** 두 손가락/우클릭 이동 비활성화 */
    disablePan: true,
    /** 세로 스와이프로 회전 비활성화(모바일 스크롤 방해 방지) */
    disableTap: false,

    /** AR 버튼 표시 */
    ar: false,
    /** 'webxr scene-viewer quick-look' 등 */
    arModes: 'webxr scene-viewer quick-look',

    /** 노출값. 1이 기본, 어두우면 1.2~1.6 */
    exposure: 1,
    /** 바닥 그림자 세기 0~1. 0.6~0.9가 자연스럽습니다 */
    shadowIntensity: 0.75,
    /** 그림자 부드러움 0~1 */
    shadowSoftness: 1,
    /** 'neutral' | 'legacy' | .hdr 경로 */
    environmentImage: 'neutral',
    /** 배경까지 환경맵으로 채울지(보통 false — 투명 배경 유지) */
    skybox: false,

    /** 초기 카메라 각도. 예: '25deg 75deg 105%' */
    cameraOrbit: null,
    /** 회전 범위 제한. 예: 'auto 60deg auto' */
    minCameraOrbit: null,
    maxCameraOrbit: null,
    /** 시야각. 예: '30deg' */
    fieldOfView: null,

    /**
     * 모델 파일에 담긴 애니메이션 재생.
     *
     * GLB에는 걷기·회전·조립 같은 동작이 함께 들어오는 일이 많습니다. 이 속성을
     * 넘기지 않으면 그게 있어도 첫 프레임에서 멈춰 있어, 가진 것을 못 쓰는 셈입니다.
     * 이름을 비워 두면 파일의 첫 번째 애니메이션을 씁니다.
     */
    autoplay: true,
    animationName: null,

    /**
     * 마우스를 향해 고개를 돌립니다(위치는 고정).
     *
     * followDecay가 클수록 느긋합니다. model-viewer의 interpolation-decay를
     * 그대로 씁니다 — 뷰어가 자기 렌더 루프에서 보간하므로 우리 rAF가 필요 없습니다.
     */
    follow: false,
    followDecay: 80,
    followYaw: 28,
    followPitch: 10,

    /** 'auto'면 첫 방문자에게 "돌려보세요" 손가락 힌트를 보여줍니다 */
    interactionPrompt: 'auto',

    /** 화면에서 이만큼 떨어졌을 때부터 미리 로드 시작 */
    preloadMargin: '300px',
  },

  guard: {
    // 동작 줄이기여도 모델은 보여줘야 합니다. 자동 회전만 끕니다(아래에서 처리).
    motion: 'ignore',
    webgl: true,
    pointer: 'any',
  },

  setup({ el, opts, addCleanup, setVar, emit }) {
    if (!opts.src) {
      console.warn('[fx:model-showcase] src 옵션(.glb 경로)이 필요합니다.');
      return;
    }

    /*
     * 빌더 캔버스는 iframe입니다. 이 모듈은 부모 창에서 로드되므로 전역
     * `window`는 **부모 창**이고, iframe 위에서 움직이는 포인터 이벤트는
     * 부모 창에 오지 않습니다 — 마우스 바라보기가 캔버스에서 무반응이던
     * 원인입니다. 요소가 속한 창을 기준으로 잡으면 어느 쪽에서든 맞습니다.
     */
    const win = el.ownerDocument?.defaultView ?? window;

    /*
     * 환경 이미지 정리. 빈 값이면 기본 조명('neutral')입니다.
     * skybox(배경까지 환경광)는 model-viewer의 `skybox-image` 속성인데,
     * 이 속성은 실제 이미지 URL만 받습니다 — 'neutral'/'legacy' 키워드는
     * environment-image 전용이라 skybox로는 쓸 수 없습니다.
     */
    let env = (typeof opts.environmentImage === 'string' && opts.environmentImage.trim()) || 'neutral';
    /*
     * .exr은 못 씁니다. model-viewer는 환경 이미지를 .hdr(HDRLoader) 아니면
     * gain-map JPEG로만 읽습니다 — .exr을 주면 JPEG 로더가 받아 "Gain map
     * metadata not found"로 실패하고, 그 오류가 뷰어까지 죽입니다(실측).
     * Poly Haven 등에서 받을 때 HDR 형식을 고르면 됩니다.
     */
    if (/\.exr([?#]|$)/i.test(env)) {
      console.warn(
        `[fx:model-showcase] .exr 환경 이미지는 model-viewer가 지원하지 않습니다: ${env}\n` +
          '.hdr(또는 .jpg)로 다시 받아 주세요. 기본 조명으로 대신합니다.'
      );
      env = 'neutral';
    }
    const skyboxSrc = opts.skybox && /[./]/.test(env) ? env : null;
    if (opts.skybox && !skyboxSrc) {
      console.warn(
        '[fx:model-showcase] skybox는 .hdr/.jpg 환경 이미지 URL이 있어야 켜집니다 — ' +
          "environmentImage가 기본 조명('neutral')이라 이번에는 무시합니다."
      );
    }

    const posterEl = el.querySelector('.fx-model__poster');
    const posterSrc = opts.poster || posterEl?.getAttribute('src') || null;

    let cancelled = false;
    let viewer = null;

    addCleanup(() => {
      cancelled = true;
      viewer?.remove();
      viewer = null;
      el.classList.remove('fx-model--loading', 'fx-model--loaded', 'fx-model--failed');
      el.style.removeProperty('--fx-model-progress');
    });

    /* --- 화면 근처에 올 때까지 아무것도 로드하지 않습니다 -------------- */

    const stopWatch = observeVisibility(el, {
      rootMargin: opts.preloadMargin,
      threshold: 0,
      onEnter: () => {
        stopWatch(); // 한 번만
        start();
      },
    });
    addCleanup(() => stopWatch());

    /* --- 실제 로드 ---------------------------------------------------- */

    async function start() {
      if (cancelled) return;
      el.classList.add('fx-model--loading');

      try {
        await loadModelViewer();
      } catch (err) {
        console.warn('[fx:model-showcase] model-viewer 로드 실패 — 포스터를 유지합니다.', err);
        el.classList.remove('fx-model--loading');
        el.classList.add('fx-model--failed');
        return;
      }
      if (cancelled) return;

      // 동작 줄이기 사용자에게 자동 회전은 그 자체로 문제입니다.
      // 모델은 보여주되 회전만 끕니다(드래그로는 여전히 돌릴 수 있습니다).
      /*
       * `follow`와 `auto-rotate`는 함께 쓸 수 없습니다.
       *
       * auto-rotate는 뷰어가 매 프레임 cameraOrbit의 좌우각을 스스로 증가시킵니다.
       * 그 위에 우리가 목표 각도를 써도 **다음 프레임에 즉시 덮어써져** 마우스에
       * 반응하지 않는 것처럼 보입니다. 마우스를 보게 했다면 자동 회전은 끄는 것이
       * 사용자의 의도에 맞습니다.
       */
      const autoRotate = opts.autoRotate && !opts.follow && !prefersReducedMotion();

      viewer = document.createElement('model-viewer');
      viewer.className = 'fx-model__viewer';

      setAttrs(viewer, {
        src: opts.src,
        'ios-src': opts.iosSrc,
        alt: opts.alt,
        poster: posterSrc,

        'camera-controls': opts.cameraControls,
        'auto-rotate': autoRotate,
        'auto-rotate-delay': opts.autoRotateDelay,
        'rotation-per-second': opts.rotationPerSecond,

        'disable-zoom': opts.disableZoom,
        'disable-pan': opts.disablePan,
        'disable-tap': opts.disableTap,

        ar: opts.ar,
        'ar-modes': opts.ar ? opts.arModes : null,

        exposure: opts.exposure,
        'shadow-intensity': opts.shadowIntensity,
        'shadow-softness': opts.shadowSoftness,
        'environment-image': env,
        /* 예전엔 `skybox` 속성에 넣었습니다 — model-viewer에 그런 속성은 없어
         * 조용히 무시됐습니다. 올바른 이름은 `skybox-image`입니다. */
        'skybox-image': skyboxSrc,

        'camera-orbit': opts.cameraOrbit,
        'min-camera-orbit': opts.minCameraOrbit,
        'max-camera-orbit': opts.maxCameraOrbit,
        'field-of-view': opts.fieldOfView,

        /* 파일에 담긴 애니메이션. autoplay가 없으면 첫 프레임에서 멈춰 있습니다. */
        autoplay: opts.autoplay,
        'animation-name': opts.animationName,

        'interaction-prompt': opts.interactionPrompt,
        loading: 'eager', // 이미 화면 근처이므로 즉시
        reveal: 'auto',
      });

      /* --- 진행률 / 완료 / 실패 ------------------------------------- */

      const onProgress = (event) => {
        const p = event.detail?.totalProgress ?? 0;
        setVar('--fx-model-progress', p);
        emit('progress', { progress: p });
      };

      const onLoad = () => {
        el.classList.remove('fx-model--loading');
        el.classList.add('fx-model--loaded');
        /*
         * 마우스 추적은 **로드가 끝난 뒤** 답니다. cameraOrbit은 씬과 카메라가
         * 준비된 뒤에야 의미가 있고, appendChild 직후에 걸면 첫 설정이 초기 각도
         * 계산에 먹혀 사라집니다.
         */
        startFollow(viewer);
        emit('load');
      };

      const onError = (event) => {
        console.warn(
          `[fx:model-showcase] 모델 로드 실패: ${opts.src}\n` +
            'GitHub Pages라면 base 경로 문제일 가능성이 높습니다. README 8번을 보세요.',
          event.detail ?? event
        );
        el.classList.remove('fx-model--loading');
        el.classList.add('fx-model--failed');
        viewer?.remove();
        viewer = null;
        emit('error', { src: opts.src });
      };

      viewer.addEventListener('progress', onProgress);
      viewer.addEventListener('load', onLoad, { once: true });
      viewer.addEventListener('error', onError, { once: true });

      el.appendChild(viewer);
      emit('mounted');
    }

    /**
     * 마우스를 향해 모델이 **고개를 돌립니다.** 위치는 그대로입니다.
     * 마우스가 쉬면(autoRotate가 켜져 있을 때) 기본 360° 회전으로 돌아가고,
     * 다시 움직이면 그 자리에서 마우스 쪽으로 시선을 맞춥니다.
     *
     * 왜 이 방식으로 바꿨는가
     *   처음에는 요소를 `translate`로 옮겼습니다. 그러려면 매 프레임 값을 계산해야
     *   해서 `requestAnimationFrame` 루프를 **쉬지 않고** 돌렸고, model-viewer가
     *   이미 무거운 탓에 페이지 전체가 눈에 띄게 느려졌습니다.
     *
     *   model-viewer에는 `interpolation-decay`가 있습니다. 목표 각도만 한 번
     *   지정하면 **뷰어가 자기 렌더 루프 안에서** 그 각도로 부드럽게 다가갑니다.
     *   그래서 우리 루프가 아예 필요 없습니다 — 마우스가 움직일 때만 목표를
     *   갱신하고, 그마저 간격을 두어 던집니다. 움직임이 멈추면 계산도 멈춥니다.
     *
     * decay가 클수록 느긋합니다(기본 50, 여기서는 훨씬 크게 씁니다).
     */
    function startFollow(node) {
      if (!node || !opts.follow || prefersReducedMotion()) return;

      /*
       * 값이 클수록 느립니다. 200으로 뒀더니 **거의 움직이지 않는 것처럼** 보였습니다
       * — 마우스가 멈추면 목표 갱신도 멈추므로 감쇠가 크면 남은 거리를 한없이
       * 조금씩만 좁힙니다. 80이 "천천히 도는데 눈에는 보이는" 지점입니다.
       */
      node.setAttribute('interpolation-decay', String(Math.max(20, Number(opts.followDecay) || 80)));

      /*
       * `camera-controls`는 **살려 둡니다** (옵션이 켜져 있다면).
       *
       * 예전에는 여기서 껐습니다 — 뷰어가 포인터를 자기 조작으로 해석해 밖에서
       * 쓰는 cameraOrbit과 싸운다고 봤기 때문입니다. 실제 충돌은 **드래그하는
       * 동안**뿐입니다. 그래서 끄는 대신, 사용자가 잡고 도는 동안(camera-change의
       * source가 user-interaction) follow와 기본 회전을 멈추고, 손을 뗀 뒤
       * idleMs가 지나면 **그 각도에서** 이어 갑니다. 모델을 원하는 방향으로
       * 돌려 볼 수 있으면서 마우스 바라보기도 유지됩니다.
       */

      /* 좌우로 얼마나 돌아볼지(도). 기본 각도에서 이만큼 벗어납니다. */
      const yaw = Math.max(0, Number(opts.followYaw) || 28);
      const pitch = Math.max(0, Number(opts.followPitch) || 10);

      /*
       * 거리는 **고정합니다.** `auto`로 두면 뷰어가 프레임마다 모델 크기에 맞춰
       * 다시 계산해서, 각도만 바꾸려는데 거리까지 흔들립니다.
       * 속성과 프로퍼티를 함께 씁니다 — 버전에 따라 한쪽만 먹는 경우가 있습니다.
       */
      let theta = 0; // 마지막으로 던진 좌우각. 쉬는 회전이 여기서 이어집니다.
      const setOrbit = (th, ph) => {
        const orbit = `${th.toFixed(1)}deg ${ph.toFixed(1)}deg 105%`;
        node.cameraOrbit = orbit;
        node.setAttribute('camera-orbit', orbit);
      };

      /*
       * 마우스가 쉬면 기본 회전(360°)으로 돌아갑니다.
       *
       * `auto-rotate` 속성을 켰다 끄는 방식은 안 씁니다 — auto-rotate는 카메라와
       * 별도의 turntable 각도를 쌓아서, follow로 돌아올 때 그 오프셋만큼 시선이
       * 어긋납니다(이 충돌을 걷어낸 게 바로 이 파일의 이력입니다). 대신 **같은
       * 채널**(camera-orbit 목표값)로 목표각을 조금씩 밀어 주면, 뷰어의
       * interpolation-decay가 그 사이를 채워 rAF 루프 없이도 매끈하게 돕니다.
       * 250ms 간격의 setInterval은 프레임 루프에 비하면 공짜에 가깝습니다.
       */
      const idleSpin = opts.autoRotate;
      const spinStep = Math.max(0.5, (parseFloat(opts.rotationPerSecond) || 18) / 4); // 250ms당 각도
      const idleMs = Math.max(800, Number(opts.autoRotateDelay) || 1500);
      let idleTimer = 0;
      let spinTimer = 0;
      const stopSpin = () => { if (spinTimer) { win.clearInterval(spinTimer); spinTimer = 0; } };
      const startSpin = () => {
        if (!idleSpin || spinTimer) return;
        spinTimer = win.setInterval(() => { theta += spinStep; setOrbit(theta, 75); }, 250);
      };

      /*
       * 드래그 회전과의 공존.
       *
       * 사용자가 모델을 잡고 도는 동안 우리가 목표각을 던지면 서로 밀어냅니다.
       * 뷰어가 알려 주는 camera-change(source: user-interaction)를 기준으로
       * 조준을 멈추고, 손을 뗀 뒤 idleMs가 지나면 **사용자가 돌려놓은 각도를
       * 읽어 와서** 그 자리부터 기본 회전을 이어 갑니다.
       */
      let holding = false;
      const resume = () => {
        holding = false;
        const o = node.getCameraOrbit?.();
        if (o && Number.isFinite(o.theta)) theta = (o.theta * 180) / Math.PI;
        startSpin();
      };
      const onCam = (e) => {
        if (e.detail?.source !== 'user-interaction') return;
        holding = true;
        stopSpin();
        win.clearTimeout(idleTimer);
        idleTimer = win.setTimeout(resume, idleMs);
      };
      node.addEventListener('camera-change', onCam);
      addCleanup(() => node.removeEventListener('camera-change', onCam));

      let last = 0;
      const aim = (e) => {
        /* 잡고 도는 중에는 조준하지 않습니다 — 드래그가 이깁니다. */
        if (holding) return;
        /*
         * 초당 12번으로 제한합니다. 그 이상 던져도 뷰어가 보간하는 중이라
         * 눈에 보이는 차이가 없고, 포인터 이벤트는 초당 수백 번 옵니다.
         */
        const t = e.timeStamp ?? 0;
        if (t - last < 80) return;
        last = t;

        stopSpin();
        win.clearTimeout(idleTimer);
        idleTimer = win.setTimeout(startSpin, idleMs);

        const dx = (e.clientX / win.innerWidth) * 2 - 1;    // -1..1
        const dy = (e.clientY / win.innerHeight) * 2 - 1;
        /*
         * 부호가 **반대**입니다. camera-orbit은 모델이 아니라 **카메라**를 도는
         * 각도라, 카메라를 오른쪽으로 보내면 모델은 왼쪽을 보는 것처럼 보입니다.
         * 마우스 쪽을 바라보게 하려면 카메라를 마우스 반대쪽으로 보내야 합니다.
         * (75deg가 model-viewer의 기본 세로각입니다. 그 주변에서 움직입니다.)
         */
        let want = -dx * yaw;
        /*
         * 쉬는 회전으로 theta가 몇 바퀴(720° 등) 쌓였을 수 있습니다. 목표를
         * 현재 값에서 가장 가까운 같은 각도로 옮겨 줍니다 — 안 그러면 보간이
         * 쌓인 바퀴 수만큼 되감으며 한참을 돕니다.
         */
        want += Math.round((theta - want) / 360) * 360;
        theta = want;
        setOrbit(theta, 75 - dy * pitch);
      };

      /* 로드 직후, 마우스가 움직이기 전에도 기본 회전은 돌아야 합니다. */
      startSpin();

      win.addEventListener('pointermove', aim, { passive: true });
      addCleanup(() => {
        stopSpin();
        win.clearTimeout(idleTimer);
        win.removeEventListener('pointermove', aim);
        node.removeAttribute('interpolation-decay');
      });
    }

    return {
      /** model-viewer 엘리먼트 (로드 전에는 null) */
      get viewer() {
        return viewer;
      },
      /** 카메라를 초기 위치로 */
      reset: () => viewer?.resetTurntableRotation?.(),
      /** 현재 뷰를 이미지로 (썸네일 만들 때 유용) */
      toDataURL: (type = 'image/webp') => viewer?.toDataURL?.(type) ?? null,
    };
  },
});

export default mount;
