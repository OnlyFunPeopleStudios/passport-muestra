// Passport Muestra - Motor único de renderizado de Stamps (V0.4)
// Usado tanto por la app pública del visitante como por el Centro de Mando (/admin).

(function (global) {
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function flagEmoji(code) {
    if (typeof code === 'string' && code.length === 2) {
      const upper = code.toUpperCase();
      const c1 = upper.charCodeAt(0);
      const c2 = upper.charCodeAt(1);
      if (c1 >= 65 && c1 <= 90 && c2 >= 65 && c2 <= 90) {
        return String.fromCodePoint(0x1f1e6 + c1 - 65, 0x1f1e6 + c2 - 65);
      }
    }
    return code || '🏳️';
  }

  // Genera el contenido interno del sello según stamp_type
  function renderStampContent(stand, size) {
    const type = stand.stamp_type || 'flag';
    const name = stand.stand_name || stand.name || '';
    const flag = (stand.flag || '').toLowerCase();
    const color = stand.stamp_color || 'var(--color-primary, #0f4c81)';

    if (type === 'flag') {
      if (flag && flag.length === 2) {
        const altText = esc(`Bandera de ${name || flag.toUpperCase()}`);
        return `<img src="/stamps/${flag}.svg" alt="${altText}" class="stamp-svg" loading="lazy" onerror="this.onerror=null;this.parentElement.innerHTML='<span class=\\'stamp-fallback-emoji\\'>${flagEmoji(flag)}</span>';">`;
      }
      return `<span class="stamp-fallback-emoji" aria-hidden="true">${flagEmoji(flag)}</span>`;
    }

    if (type === 'image' && stand.stamp_image) {
      return `<img src="${esc(stand.stamp_image)}" alt="${esc(`Sello de ${name}`)}" class="stamp-img">`;
    }

    if (type === 'icon') {
      const icon = stand.stamp_icon || flagEmoji(flag);
      const initials = (name.split(/\s+/)[0] || '').slice(0, 8);
      return `
        <div class="stamp-icon-wrap" aria-hidden="true">
          <span class="stamp-icon-char">${esc(icon)}</span>
          ${size !== 'small' && initials ? `<span class="stamp-icon-label">${esc(initials)}</span>` : ''}
        </div>`;
    }

    if (type === 'color') {
      const label = (name.slice(0, 3) || 'ST').toUpperCase();
      return `
        <div class="stamp-color-seal" style="--seal-color: ${esc(color)}" aria-label="${esc(name)}">
          <div class="seal-inner-ring">
            <span class="seal-mark">✦</span>
            <span class="seal-label">${esc(label)}</span>
          </div>
        </div>`;
    }

    // Fallback general
    return `<span class="stamp-fallback-emoji">${flagEmoji(flag)}</span>`;
  }

  /**
   * Renderiza el HTML de un sello visual
   * @param {Object} stand Datos del stand / visita
   * @param {Object} opts Opciones de renderizado:
   *   - size: 'small' | 'normal' | 'big' | 'hero' (def: 'normal')
   *   - style: 'circular' | 'redondo' | 'estampilla' | 'cuadrado' (def: heredado de body o 'circular')
   *   - animated: boolean
   *   - placeholder: boolean (muestra marco vacío con '?')
   *   - showStars: boolean (def: true si tiene rating)
   *   - extraClass: string
   */
  function render(stand = {}, opts = {}) {
    const size = opts.size || 'normal';
    const style = opts.style || document.body?.dataset?.stamp || 'circular';
    const isDone = !opts.placeholder && (stand.stand_name || stand.name || stand.flag || stand.stamp_type);
    const color = stand.stamp_color || '';
    const styleAttr = color ? ` style="--stamp-accent:${esc(color)}; border-color:${esc(color)};"` : '';
    const animClass = opts.animated ? 'stamp-animated' : '';
    const extraClass = opts.extraClass || '';
    const name = stand.stand_name || stand.name || '';

    if (!isDone) {
      return `
        <div class="stamp-box stamp-empty stamp-size-${size} stamp-style-${style} ${extraClass}" aria-label="Stand pendiente">
          <div class="stamp-empty-inner">
            <span class="stamp-qs" aria-hidden="true">?</span>
          </div>
        </div>`;
    }

    const contentHtml = renderStampContent(stand, size);
    const rating = Number(stand.rating) || 0;
    const showStars = opts.showStars !== false && rating >= 1 && rating <= 5;
    const starsHtml = showStars
      ? `<div class="stamp-badge-stars" title="${rating} de 5 estrellas" aria-label="${rating} estrellas">${'★'.repeat(rating)}</div>`
      : '';

    return `
      <div class="stamp-box stamp-done stamp-size-${size} stamp-style-${style} ${animClass} ${extraClass}"${styleAttr} title="${esc(name)}" data-stamp-style="${esc(style)}">
        <div class="stamp-inner">
          ${contentHtml}
        </div>
        ${starsHtml}
      </div>`;
  }

  global.PassportStamp = {
    render,
    flagEmoji,
    esc,
  };
})(typeof window !== 'undefined' ? window : this);
