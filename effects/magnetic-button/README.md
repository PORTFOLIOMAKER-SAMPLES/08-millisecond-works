# `magnetic-button` — 자석 버튼

> **티어 T1** · 추가 용량 **0KB** · 의존성 없음 · 마우스 환경 전용

커서가 다가오면 버튼이 **마중 나갑니다.** 안의 라벨은 버튼보다 더 움직여서 두께감을 만들고,
아주 약한 `rotateX/Y`가 얹혀 3D 감각을 더합니다.

포트폴리오의 **CTA(연락하기 / 이력서 보기)** 딱 1~2개에만 쓰세요. 남발하면 정신없습니다.

---

## 1. 붙이기 — 바닐라

```html
<link rel="stylesheet" href="./effects/_core/core.css" />
<link rel="stylesheet" href="./effects/magnetic-button/style.css" />

<a class="cta fx-btn" href="mailto:me@example.com">
  <span data-fx-label>연락하기</span>
</a>

<script type="module">
  import { mount } from './effects/magnetic-button/index.js';
  mount('.cta');
</script>
```

> **`data-fx-label`이 핵심입니다.** 이게 없으면 버튼만 움직이고 라벨 시차가 사라져서
> 효과가 절반만 납니다. 텍스트를 반드시 `<span data-fx-label>`로 감싸세요.

## 2. 붙이기 — React

`children`이 자동으로 라벨로 감싸집니다.

```jsx
import { MagneticButton } from './effects/magnetic-button/react.jsx';

<MagneticButton as="a" href="/resume.pdf" className="fx-btn" strength={0.4}>
  이력서 보기
</MagneticButton>
```

---

## 3. 옵션

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `strength` | `0.35` | 커서 쪽으로 따라가는 비율(0~1). **0.3~0.45가 자연스럽고 0.6 넘으면 장난감 같습니다** |
| `radius` | `110` | 버튼 경계 **바깥으로** 자력이 미치는 거리(px) |
| `labelFactor` | `0.5` | 라벨이 추가로 움직이는 비율. **음수면 라벨이 반대로 밀려 유리 안에 갇힌 느낌** |
| `scale` | `1.04` | 자력 범위 안일 때 확대 배율 |
| `rotate` | `6` | 최대 기울기(도). `0`이면 평면 이동만 |
| `speed` | `11` | 따라오는 속도(감쇠 계수) |
| `glow` | `true` | 커서를 따라다니는 빛 번짐 |

---

## 4. 왜 hover가 아니라 "거리"인가

hover 기반이면 커서가 버튼에 **닿는 순간** 반응이 시작됩니다. 자석 같지 않고 스위치 같습니다.
그래서 이 효과는 버튼 경계가 아니라 **중심으로부터의 거리**로 계산합니다.
닿기 전부터 서서히 끌려오기 시작해야 자석처럼 느껴집니다.

### 감쇠에 smoothstep을 쓴 이유

선형 감쇠(`1 - d/r`)는 반경 경계에서 기울기가 갑자기 끊깁니다 → 자력이 "툭" 하고 끊기는 게 보입니다.
`smoothstep`은 **양 끝에서 기울기가 0**이라 경계가 어디인지 눈에 보이지 않습니다.

이 한 줄이 "만든 티 나는 자석"과 "그냥 자연스러운 자석"을 가릅니다.

---

## 5. 조합 레시피

**유리 안에 갇힌 라벨** — 라벨이 반대로 밀립니다

```js
mount('.cta', { labelFactor: -0.35, rotate: 10, strength: 0.45 });
```

**평면 자석** — 3D 없이 이동만 (텍스트 링크에 어울립니다)

```js
mount('.text-link', { rotate: 0, scale: 1, glow: false, strength: 0.25, radius: 60 });
```

**강한 인력** — 히어로의 단 하나뿐인 CTA

```js
mount('.hero-cta', { strength: 0.5, radius: 180, scale: 1.07 });
```

---

## 6. 접근성

- **키보드 포커스 시에도 반응합니다.** 단 **이동 없이 확대와 글로우만** 줍니다.
  포커스만으로 버튼이 움직이면 키보드 사용자가 위치를 잃습니다.
- 터치 기기에서는 완전히 꺼집니다(`pointer: fine` 가드). "가까이 온다"는 개념이 없기 때문입니다.
- 동작 줄이기 사용자에게도 꺼집니다.

버튼의 실제 클릭 영역은 **움직이지 않습니다.** `transform`은 히트 테스트 영역도 같이 옮기므로,
사용자가 보고 있는 위치와 클릭되는 위치는 항상 일치합니다.

---

## 7. 자주 겪는 문제

**Q. 라벨이 안 움직입니다.**
→ `data-fx-label`을 안 달았습니다. devtools에서 요소에 `data-fx-mag-label="none"`이 있으면 확실합니다.

**Q. 버튼이 잘립니다.**
→ `.fx-magnetic-button`에 `overflow: hidden`이 걸려 있습니다(글로우를 가두기 위해).
라벨이 버튼 밖으로 나가야 하는 디자인이면 `overflow: visible`로 바꾸고 글로우는 끄세요.

**Q. 버튼이 여러 개인데 다 같이 움직입니다.**
→ 각자 자기 중심으로부터의 거리를 재므로 정상적으로는 그럴 수 없습니다.
`mount('.btn')`을 여러 번 호출했는지 확인하세요(중복 마운트는 `_core`가 막지만, 서로 다른 선택자로 겹쳐 부르면 옵션만 첫 번째가 남습니다).

**Q. 스크롤하면 자력 위치가 어긋납니다.**
→ `scroll`/`resize`에서 캐시를 무효화하고 있습니다. 그래도 어긋나면
`position: sticky` 컨테이너 안에 있는 경우입니다. 이때는 부모에 스크롤 리스너가 따로 필요합니다.

**Q. 버튼이 많은 페이지에서 무겁습니다.**
→ 버튼 1개당 `window`의 `pointermove` 리스너가 1개 붙습니다. 계산 자체는 아주 가볍지만
**10개를 넘기지 마세요.** 애초에 자석 버튼이 10개인 화면은 디자인 문제입니다.
