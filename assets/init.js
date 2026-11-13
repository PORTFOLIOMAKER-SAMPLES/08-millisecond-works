/**
 * 3D 효과 마운트.
 *
 * 옵션은 HTML의 data-fx-* 속성에 들어 있고, 효과 팩의 defineEffect가
 * 그걸 알아서 읽습니다(effects/_core/effect.js). 그래서 여기서는
 * "선택자마다 mount 한 번"만 부르면 끝입니다.
 *
 * 효과를 빼고 싶으면 아래 한 줄을 지우고 HTML의 data-fx도 지우면 됩니다.
 */

import { mount as model } from '../effects/model-showcase/index.js';

/**
 * 영역 안쪽 요소에 붙는 효과(tilt/flip/magnetic/scramble)는 옵션을 부모에서 읽습니다.
 * 효과가 둘 이상인 영역은 팩 이름 접두사(data-fx-<팩>-<키>)로 실려 옵니다 —
 * 접두사 속성이 하나라도 있으면 그것만, 없으면 옛 방식(접두사 없음)을 읽습니다.
 */
function readOpts(el, prefix) {
  const out = {};
  const scoped = prefix ? 'data-fx-' + prefix + '-' : null;
  const hasScoped = scoped && [...el.attributes].some((a) => a.name.startsWith(scoped));
  for (const { name, value } of el.attributes) {
    if (!name.startsWith('data-fx-')) continue;
    if (hasScoped && !name.startsWith(scoped)) continue;
    const raw = hasScoped ? name.slice(scoped.length) : name.slice(8);
    const key = raw.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = value === 'true' ? true : value === 'false' ? false
      : value !== '' && !Number.isNaN(Number(value)) ? Number(value)
      : value.includes(',') ? value.split(',') : value;
  }
  return out;
}

function boot() {
  model('.fx-model');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
