# `model-showcase` — GLB 3D 모델 쇼케이스

> **티어 T3** · 추가 용량 **약 150KB+ 모델 파일**(화면 근처에서만 로드) · WebGL 필요

> ⚠️ **이 팩에서 유일하게 무거운 효과입니다. 페이지당 1개만 쓰세요.**

---

## 1. 붙이기 — 바닐라

```html
<link rel="stylesheet" href="./effects/_core/core.css" />
<link rel="stylesheet" href="./effects/model-showcase/style.css" />

<div class="showcase fx-model">
  <!-- 포스터는 HTML에 미리 둡니다. 이게 모든 실패 경로의 안전망입니다. -->
  <img class="fx-model__poster" src="./models/chair.webp" alt="원목 의자 3D 모델" />
  <span class="fx-model__hint">드래그해서 돌려보세요</span>
</div>

<script type="module">
  import { mount } from './effects/model-showcase/index.js';
  mount('.showcase', {
    src: './models/chair.glb',
    alt: '원목 의자 3D 모델',
  });
</script>
```

## 2. 붙이기 — React

```jsx
import { ModelShowcase } from './effects/model-showcase/react.jsx';

<ModelShowcase
  src={`${import.meta.env.BASE_URL}models/chair.glb`}
  poster={`${import.meta.env.BASE_URL}models/chair.webp`}
  alt="원목 의자 3D 모델"
  ratio="square"
/>
```

---

## 3. 왜 three.js로 직접 짜지 않나

포트폴리오에서 필요한 건 **"모델 하나를 예쁘게 돌려 보여주기"**입니다.

three.js로 직접 하면 카메라·조명·환경맵·톤매핑·DRACO 디코더·AR·접근성·로딩 상태를
전부 직접 짜야 합니다. **300줄은 나옵니다.** 그리고 대부분 조명 세팅에서 막힙니다.

`<model-viewer>`는 그걸 전부 포함하고 태그 한 줄로 끝납니다.
**커스텀 셰이더가 필요해지는 순간에만** three.js로 내려가세요.

---

## 4. 3단 로딩 전략

| 단계 | 내용 | 비용 |
|---|---|---|
| 1 | **포스터 이미지** (HTML에 미리 존재) | 0KB 추가 — 이미 페이지에 있음 |
| 2 | 화면 300px 앞에 오면 **model-viewer 스크립트** 로드 | 약 150KB |
| 3 | 모델 로드 완료 → 포스터 페이드아웃 | GLB 크기만큼 |

> **방문자가 3D 섹션까지 스크롤하지 않으면 단 한 바이트도 내려받지 않습니다.**

그리고 어떤 단계에서 실패해도 **포스터는 항상 남습니다.**

---

## 5. 옵션

### 필수

| 옵션 | 설명 |
|---|---|
| `src` | `.glb` 또는 `.gltf` 경로 **(필수)** |
| `alt` | 스크린 리더용 설명. **비워두지 마세요** |
| `poster` | 포스터 이미지. `null`이면 `.fx-model__poster`의 `src`를 읽습니다 |

### 조작

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `cameraControls` | `true` | 드래그로 회전 |
| `autoRotate` | `true` | 자동 회전 (**동작 줄이기 사용자에게는 자동으로 꺼집니다**) |
| `autoRotateDelay` | `1500` | 조작 후 자동 회전 재개까지(ms) |
| `rotationPerSecond` | `'18deg'` | 자동 회전 속도 |
| `disableZoom` | **`true`** | **아래 설명 필독** |
| `disablePan` | `true` | 두 손가락/우클릭 이동 비활성화 |

### 🚨 `disableZoom`이 기본 `true`인 이유

`<model-viewer>`는 **휠 이벤트를 가로채 줌으로 씁니다.**
페이지 중간에 있는 모델 위에서 스크롤하면 **페이지가 안 내려가고 모델만 확대됩니다.**
방문자는 "페이지가 멈췄다"고 느끼고 나가버립니다.

포트폴리오에서 줌은 거의 필요 없습니다. 켜야 한다면 모델을 전체 화면 섹션에 두세요.

### 조명 / 렌더링

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `exposure` | `1` | 노출. **모델이 어두우면 여기부터 1.2~1.6으로** |
| `shadowIntensity` | `0.75` | 바닥 그림자 세기(0~1). **이게 0이면 모델이 공중에 떠 보입니다** |
| `shadowSoftness` | `1` | 그림자 부드러움(0~1) |
| `environmentImage` | `'neutral'` | `'neutral'` / `'legacy'` / `.hdr` 경로 |
| `skybox` | `false` | 배경까지 환경맵으로 채울지 — `environmentImage`가 실제 이미지 URL일 때만 동작(`'neutral'`은 skybox-image에 못 씀) |

### 카메라

| 옵션 | 예시 | 설명 |
|---|---|---|
| `cameraOrbit` | `'25deg 75deg 105%'` | 초기 각도 (수평 수직 거리) |
| `minCameraOrbit` / `maxCameraOrbit` | `'auto 60deg auto'` | 회전 범위 제한 |
| `fieldOfView` | `'30deg'` | 시야각. 작을수록 망원(왜곡 적음) |

### AR

| 옵션 | 기본값 |
|---|---|
| `ar` | `false` |
| `iosSrc` | `null` — iOS AR에는 `.usdz`가 **따로** 필요합니다 |

---

## 6. 모델 파일 준비 — 여기가 진짜 병목

**GLB 파일 크기가 이 효과의 전부입니다.** 코드 최적화는 의미가 없습니다.

| 크기 | 판정 |
|---|---|
| ~1MB | 이상적 |
| 1~3MB | 허용 |
| 3~8MB | 느림. 진행률 표시가 필수 |
| 8MB 초과 | **다시 만드세요** |

### 줄이는 순서 (효과 큰 순)

1. **텍스처 해상도** — 4096px를 1024px로. 보통 여기서 80% 줄어듭니다
2. **텍스처를 WebP/KTX2로**
3. **Draco 메시 압축** — [gltf-transform](https://gltf-transform.dev/) 사용
4. **폴리곤 감축** — Blender의 Decimate

```bash
npx @gltf-transform/cli optimize input.glb output.glb --texture-size 1024
```

### 포스터 이미지 만들기

모델을 한 번 띄운 뒤 콘솔에서:

```js
const handle = mount('.showcase', { src: './models/chair.glb' });
// 모델이 다 뜬 뒤에
handle.api.toDataURL('image/webp');
```

나온 data URL을 저장하면 **모델과 각도가 정확히 일치하는 포스터**가 됩니다.
포스터와 모델의 첫 프레임이 어긋나면 전환할 때 눈에 확 띕니다.

---

## 7. 무료 모델 구하기

| 출처 | 라이선스 |
|---|---|
| [Poly Haven](https://polyhaven.com/models) | CC0 (완전 자유) |
| [Sketchfab](https://sketchfab.com/) — CC 필터 | 대부분 **출처 표기 필요** |
| [Khronos glTF 샘플](https://github.com/KhronosGroup/glTF-Sample-Assets) | 테스트용으로 최적 |

> 출처 표기가 필요한 모델을 쓸 때는 **포트폴리오 어딘가에 반드시 표기**하세요.
> 라이선스를 지키는지 보는 채용담당자가 실제로 있습니다.

---

## 8. 🚨 GitHub Pages 배포 — 여기서 90%가 막힙니다

**증상: 로컬에서는 되는데 배포하면 모델만 안 뜬다.**

JS는 정상 로드되고 캔버스도 뜨는데 GLB만 404입니다. 원인은 **base 경로**입니다.

### Vite + React

```js
// vite.config.js
export default { base: '/내-저장소-이름/' }
```

```jsx
// ❌ 배포하면 404
<ModelShowcase src="/models/chair.glb" />

// ✅ 방법 1 — BASE_URL 붙이기 (public/ 폴더에 둔 경우)
<ModelShowcase src={`${import.meta.env.BASE_URL}models/chair.glb`} />

// ✅ 방법 2 — import로 번들 (src/ 안에 둔 경우, 가장 안전)
import chairUrl from './assets/chair.glb?url';
<ModelShowcase src={chairUrl} />
```

**방법 2를 권장합니다.** 번들러가 경로를 알아서 처리하므로 base가 바뀌어도 안 깨집니다.

### 바닐라

상대 경로(`./models/chair.glb`)를 쓰면 그대로 동작합니다.
**절대 경로(`/models/chair.glb`)를 쓰면 404**입니다 —
GitHub Pages는 `사용자명.github.io/저장소명/` 아래에 있기 때문입니다.

### 그 외 체크리스트

- [ ] `.glb`가 `.gitignore`에 걸려 있지 않은지 (`*.bin` 패턴에 걸리는 경우 있음)
- [ ] Git LFS로 올렸다면 → **GitHub Pages는 LFS 파일을 서빙하지 않습니다.** 일반 파일로 올리세요
- [ ] 파일명 대소문자 (Windows는 구분 안 하지만 **GitHub Pages는 구분합니다**)
- [ ] 100MB 초과 파일은 GitHub이 거부합니다

로드에 실패하면 콘솔에 `[fx:model-showcase]` 경고와 함께 이 항목이 안내됩니다.

---

## 9. 수동 제어

```js
const handle = mount('.showcase', { src: './chair.glb' });

handle.api.viewer;                    // <model-viewer> 엘리먼트 (로드 전 null)
handle.api.reset();                   // 카메라 초기화
handle.api.toDataURL('image/webp');   // 현재 뷰를 이미지로
```

```js
document.addEventListener('fx:model-showcase:progress', (e) => {
  console.log(Math.round(e.detail.progress * 100) + '%');
});
document.addEventListener('fx:model-showcase:load', () => console.log('완료'));
document.addEventListener('fx:model-showcase:error', (e) => console.log('실패', e.detail.src));
```

---

## 10. 접근성

- `alt`는 **반드시** 채우세요. `<model-viewer>`가 캔버스에 대한 대체 텍스트로 씁니다
- 동작 줄이기 사용자에게는 **자동 회전만 꺼지고 모델은 보입니다** (드래그로는 여전히 조작 가능)
- 포스터 이미지가 항상 존재하므로 WebGL이 없어도 **무엇을 만들었는지는 전달됩니다**
- `.fx-model__hint`로 "드래그해서 돌려보세요"를 꼭 보여주세요.
  **아무 표시가 없으면 대부분의 방문자는 그냥 이미지인 줄 압니다**

---

## 11. 자주 겪는 문제

**Q. 모델이 새까맣습니다.**
→ `environmentImage`가 없거나 모델에 조명 정보가 없습니다. `exposure`를 1.4로,
`environmentImage: 'neutral'`(기본값)이 적용됐는지 확인하세요.

**Q. 모델이 공중에 떠 보입니다.**
→ `shadowIntensity`가 0입니다. `0.75` 정도 주면 바닥에 붙습니다.

**Q. 모델이 너무 크거나 작습니다.**
→ `cameraOrbit`의 세 번째 값(거리)을 조절하세요: `'0deg 75deg 120%'`.
또는 Blender에서 모델을 원점 기준으로 정규화하세요.

**Q. 페이지 스크롤이 모델 위에서 멈춥니다.**
→ `disableZoom: true`(기본값)를 껐기 때문입니다. 다시 켜세요.

**Q. iOS에서 AR 버튼이 안 뜹니다.**
→ iOS는 `.usdz`가 별도로 필요합니다. `iosSrc` 옵션에 넣으세요.

**Q. 로딩이 너무 깁니다.**
→ 코드 문제가 아니라 **GLB 크기 문제**입니다. 6번으로 돌아가세요.
