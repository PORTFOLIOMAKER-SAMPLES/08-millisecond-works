# `dot-grid-wave` — 3D 파동 도트 그리드

> **티어 T1** · 추가 용량 **0KB**(Canvas 2D) · **WebGL 불필요** · 모든 환경에서 동작

점 격자가 파도처럼 앞뒤로 물결치고, 커서 주변은 밀려납니다.
`silk-bg`가 부담스러운 섹션(About, Skills)의 배경으로 씁니다.

---

## 1. 붙이기 — 바닐라

```html
<link rel="stylesheet" href="./effects/_core/core.css" />
<link rel="stylesheet" href="./effects/dot-grid-wave/style.css" />

<!-- .fx-dots 는 필수 -->
<section class="about fx-dots fx-dots--fade fx-dots-section">
  <div>
    <h2>About</h2>
    <p>사용자가 머무는 화면을 만듭니다.</p>
  </div>
</section>

<script type="module">
  import { mount } from './effects/dot-grid-wave/index.js';
  mount('.about');
</script>
```

## 2. 붙이기 — React

```jsx
import { DotGridWave } from './effects/dot-grid-wave/react.jsx';

<DotGridWave fade className="fx-dots-section" spacing={30} ripple={0.5}>
  <h2>About</h2>
</DotGridWave>
```

---

## 3. 왜 Canvas 2D인가 (WebGL이 아니라)

점 몇천 개를 그리는 데 WebGL 컨텍스트를 하나 잡는 건 과합니다.

| | Canvas 2D | WebGL |
|---|---|---|
| 컨텍스트 개수 제한 | **없음** | 브라우저당 8~16개 |
| 셰이더 컴파일 비용 | 없음 | 초기화 시 수십 ms |
| 구형 기기 | **100% 동작** | 미지원 존재 |
| 추가 용량 | **0KB** | 라이브러리 필요 |

`silk-bg`와 이 효과를 **같은 페이지에 함께 써도** 컨텍스트 경쟁이 없습니다.
이건 우연이 아니라 그렇게 나눈 겁니다.

---

## 4. 진짜 3D인 이유

점 크기만 키웠다 줄이면 **"깜빡이는 점"**으로 보입니다. 3D가 아닙니다.

여기서는 파동을 **Z축 변위**로 쓰고 원근 투영을 직접 계산합니다.

```
k = focal / (focal − z)
화면좌표 = 중심 + (격자좌표 − 중심) × k
반지름   = 기본반지름 × k
```

앞으로 나온 점은 **커지면서 화면 바깥으로 퍼지고**,
뒤로 간 점은 **작아지면서 중심으로 모입니다.** 이게 실제 원근입니다.

`depth: 0`으로 주면 평평한 격자가 됩니다. 차이를 직접 비교해보세요.

---

## 5. 옵션

### 격자

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `spacing` | `28` | 점 간격(px). **22~34 권장.** 작을수록 촘촘하고 무겁습니다 |
| `radius` | `1.7` | 점 기본 반지름(px) |
| `color` | `null` | `null`이면 CSS 변수 `--fx-dot-color` → 요소의 `color` 순으로 읽습니다 |
| `opacity` | `0.55` | 전체 불투명도 |
| `maxDots` | `7000` | 점 개수 상한. 넘으면 `spacing`을 자동으로 늘립니다 |

### 파동

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `depth` | `38` | 파동의 Z 변위(px). **입체감의 핵심.** `0`이면 평면 |
| `focal` | `420` | 원근 초점 거리(px). 작을수록 왜곡이 강함 |
| `speed` | `1.0` | 파동 속도 |
| `frequency` | `0.022` | 공간 주파수. 작을수록 파장이 김 |
| `angle` | `38` | 파동 진행 방향(도). `0`=오른쪽, `90`=아래 |
| `ripple` | `0.35` | 중심에서 퍼지는 원형파를 섞는 비율(0~1) |

### 커서

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `pointer` | `true` | 커서 반응 |
| `pointerRadius` | `140` | 영향 반경(px) |
| `pointerPush` | `18` | 밀어내는 거리(px). **음수면 끌어당깁니다** |
| `pointerLift` | `26` | 커서 주변이 앞으로 나오는 정도(px) |

---

## 6. 성능 설계

점 2,600개를 개별 `fill`하면 draw call이 **2,600번**입니다.
여기서는 `Path2D` 하나에 `arc`를 전부 모아 **`fill`을 딱 1번** 호출합니다.

그 외:

- **화면 밖 점 스킵** — 원근으로 퍼져나간 점은 그리지 않습니다
- **`maxDots` 자동 방어** — 4K 모니터에서 `spacing: 28`이면 3만 개가 넘습니다. 상한을 넘으면 간격을 자동으로 넓힙니다
- **화면 밖 → 루프 완전 정지**
- **저사양 기기 30fps 자동**
- **다크모드 토글 감지** — 테마가 바뀌면 점 색을 다시 읽습니다

---

## 7. 조합 레시피

```js
// 잔잔한 배경 (본문 섹션)
mount('.about', { depth: 20, speed: 0.6, opacity: 0.35, ripple: 0 });

// 강한 물결 (구분선/전환 구간)
mount('.divider', { depth: 60, focal: 300, frequency: 0.03, ripple: 0.7 });

// 커서에 끌려오는 점들
mount('.hero', { pointerPush: -24, pointerLift: 40, pointerRadius: 200 });

// 평면 격자 (3D 없이 도트 패턴만)
mount('.section', { depth: 0, speed: 0.4, ripple: 0 });

// 수직 파동 (아래로 흐르는 느낌)
mount('.section', { angle: 90, frequency: 0.018 });
```

---

## 8. 가장자리 처리

격자가 컨테이너 경계에서 뚝 잘리면 **"붙여놓은 배경"**처럼 보입니다.

```html
<section class="fx-dots fx-dots--fade">     <!-- 원형 페이드 -->
<section class="fx-dots fx-dots--fade-y">   <!-- 위/아래만 페이드 -->
```

마스크로 가장자리를 흐리면 화면에 녹아든 느낌이 납니다. **거의 항상 켜는 게 낫습니다.**

---

## 9. 수동 제어

```js
const handle = mount('.about');

handle.api.refresh();   // 테마 토글 후 색/레이아웃 다시 읽기
handle.api.dots;        // 현재 점 개수 (성능 튜닝 확인용)
```

---

## 10. 자주 겪는 문제

**Q. 점이 안 보입니다.**
→ ① 컨테이너에 `.fx-dots`를 붙였는지 (색 변수가 여기 있습니다).
→ ② 컨테이너 높이가 0은 아닌지 (캔버스는 `absolute`라 높이를 만들지 못합니다).
→ ③ 점 색이 배경색과 같지 않은지 — `--fx-dot-color`를 직접 지정해보세요.

**Q. 커서 반응이 없습니다.**
→ 캔버스는 `pointer-events: none`이고 컨테이너가 이벤트를 받습니다.
컨테이너 위에 다른 요소가 전면을 덮고 있으면 `pointermove`가 도달하지 않습니다.

**Q. 무겁습니다.**
→ `handle.api.dots`를 찍어보세요. **3,000개를 넘으면** `spacing`을 키우거나 `maxDots`를 낮추세요.
`fps: 30`도 배경으로는 충분합니다.

**Q. 다크모드로 바꾸면 점 색이 그대로입니다.**
→ `prefers-color-scheme` 변경은 자동 감지합니다. 하지만 **직접 만든 테마 토글 버튼**(`data-theme`)은
감지 대상이 아니므로 토글 후 `handle.api.refresh()`를 호출하세요.

**Q. 점이 격자처럼 딱딱해 보입니다.**
→ `ripple`을 올려 원형파를 섞거나, `angle`을 `38`처럼 격자와 어긋난 각도로 두세요.
`0`이나 `90`은 격자 축과 정렬돼서 규칙적으로 보입니다.
