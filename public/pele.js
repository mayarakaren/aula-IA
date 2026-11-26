// Ilustração de "foto de pele" para a IA de pintas (sem fotos reais de pacientes).
// pele({ id, tom, lesao, regua }, { heat: 'lesao' | 'fora' | null }) -> string SVG
(function () {
  const TONS = ['#f7dfcc', '#ebc4a3', '#d4a077', '#ad7650', '#83553a', '#583824'];
  let uid = 0;
  const mix = (hex, alvo, t) => {
    const a = parseInt(hex.slice(1), 16), b = parseInt(alvo.slice(1), 16);
    const c = [16, 8, 0].map((s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t));
    return '#' + c.map((x) => x.toString(16).padStart(2, '0')).join('');
  };
  const seed = (str) => { let h = 7; for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return () => ((h = (h * 1103515245 + 12345) >>> 0) / 4294967296); };

  function pele(f, opt) {
    const o = opt || {}; const k = 'p' + (++uid);
    const pele = TONS[Math.max(0, Math.min(5, (f.tom || 1) - 1))];
    const escuro = (f.tom || 1) >= 5;
    const rnd = seed(f.id || 'x');
    let poros = '';
    for (let i = 0; i < 26; i++) poros += `<circle cx="${(rnd() * 160).toFixed(1)}" cy="${(rnd() * 120).toFixed(1)}" r="${(0.5 + rnd() * 0.9).toFixed(2)}" fill="${mix(pele, '#000000', 0.18)}" opacity=".35"/>`;
    let lesao;
    if (f.lesao === 'suspeita') {
      // assimétrica, borda irregular, várias cores (regra ABCDE)
      const c1 = mix(pele, '#1a0d08', escuro ? 0.75 : 0.82), c2 = mix(pele, '#5a2418', escuro ? 0.55 : 0.6), c3 = mix(pele, '#0b0503', 0.9);
      lesao = `<path d="M57 50 C58 39 70 31 80 35 C86 29 98 33 99 41 C108 44 113 55 104 60 C105 69 96 76 87 71 C79 77 66 74 63 66 C54 64 52 56 57 50 Z" fill="url(#${k}l)" filter="url(#${k}b)"/>
        <path d="M78 46 C86 41 95 46 93 54 C90 61 80 62 76 56 C73 52 74 48 78 46 Z" fill="${c3}" opacity=".75"/>
        <path d="M64 54 C68 51 73 55 70 60 C66 63 61 59 64 54 Z" fill="${c2}" opacity=".9"/>
        <defs><radialGradient id="${k}l" cx="45%" cy="45%" r="60%"><stop offset="0" stop-color="${c1}"/><stop offset=".7" stop-color="${c2}"/><stop offset="1" stop-color="${mix(c2, pele, 0.35)}"/></radialGradient></defs>`;
    } else {
      // simétrica, redonda, uma cor só
      const c1 = mix(pele, '#3b2015', escuro ? 0.55 : 0.6);
      lesao = `<ellipse cx="82" cy="54" rx="13" ry="12" fill="url(#${k}l)" filter="url(#${k}b)"/>
        <defs><radialGradient id="${k}l" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="${mix(c1, '#000000', 0.1)}"/><stop offset="1" stop-color="${c1}"/></radialGradient></defs>`;
    }
    let regua = '';
    if (f.regua) {
      let ticks = '';
      for (let x = 0; x <= 126; x += 6.3) { const longo = Math.round(x / 6.3) % 5 === 0; ticks += `<line x1="${(14 + x).toFixed(1)}" y1="96" x2="${(14 + x).toFixed(1)}" y2="${longo ? 103 : 100}" stroke="#4a4232" stroke-width=".7"/>`; }
      let nums = ''; for (let n = 0; n <= 3; n++) nums += `<text x="${14 + n * 31.5}" y="110" font-size="5.5" font-family="Arial" fill="#4a4232" text-anchor="middle">${n}</text>`;
      regua = `<g transform="rotate(-2 80 102)"><rect x="8" y="93" width="144" height="20" rx="2" fill="#f4ecd2" stroke="#b9ad8c" stroke-width=".8"/>${ticks}${nums}<text x="146" y="110" font-size="5" font-family="Arial" fill="#4a4232" text-anchor="end">cm</text></g>`;
    }
    let heat = '';
    if (o.heat) {
      const [cx, cy, rx, ry] = o.heat === 'lesao' ? [82, 54, 34, 30] : [80, 103, 76, 22];
      heat = `<g class="heat"><rect width="160" height="120" fill="#2440c8" opacity=".38"/>
        <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${k}h)"/>
        <defs><radialGradient id="${k}h"><stop offset="0" stop-color="#ff2a1a" stop-opacity=".92"/><stop offset=".45" stop-color="#ffb020" stop-opacity=".78"/><stop offset=".75" stop-color="#8cff60" stop-opacity=".35"/><stop offset="1" stop-color="#2440c8" stop-opacity="0"/></radialGradient></defs></g>`;
    }
    return `<svg class="pele" viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Ilustração de pinta na pele${f.regua ? ' com régua' : ''}">
      <defs><radialGradient id="${k}s" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="${mix(pele, '#ffffff', 0.12)}"/><stop offset="1" stop-color="${mix(pele, '#000000', 0.14)}"/></radialGradient>
      <filter id="${k}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".9"/></filter></defs>
      <rect width="160" height="120" fill="url(#${k}s)"/>${poros}${lesao}${regua}${heat}</svg>`;
  }
  window.pele = pele;
})();
