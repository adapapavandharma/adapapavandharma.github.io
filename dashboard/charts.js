/* ============================================================
   A small SVG charting kit.

   Hand-rolled rather than pulled from a CDN for three reasons: the page stays
   a single origin with no third-party requests, it cannot break when someone
   else's library ships a major version, and the axis and scale logic is the
   part of charting worth being able to show.

   Every chart returns an <svg> element sized by viewBox, so it scales to its
   container without a resize listener.
   ============================================================ */

const NS = 'http://www.w3.org/2000/svg';

const el = (tag, attrs = {}, text) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== null && v !== undefined) n.setAttribute(k, String(v));
  }
  if (text !== undefined) n.textContent = text;
  return n;
};

/** "Nice" axis bounds: round the max up to 1/2/2.5/5 x a power of ten. */
function niceMax(v) {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return step * mag;
}

function ticks(max, count = 5) {
  const out = [];
  for (let i = 0; i <= count; i++) out.push((max / count) * i);
  return out;
}

const fmt = (v, d = 0) =>
  v >= 1e9 ? (v / 1e9).toFixed(1) + 'B'
  : v >= 1e6 ? (v / 1e6).toFixed(1) + 'M'
  : v >= 1e3 ? (v / 1e3).toFixed(v >= 1e4 ? 0 : 1) + 'K'
  : v.toFixed(d);

/* ---------------------------------------------------------------- tooltip */

let tip;
function showTip(evt, html) {
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'chart-tip';
    document.body.appendChild(tip);
  }
  tip.innerHTML = html;
  tip.style.display = 'block';
  const pad = 14;
  const r = tip.getBoundingClientRect();
  let x = evt.clientX + pad;
  let y = evt.clientY - r.height - pad;
  if (x + r.width > window.innerWidth - 8) x = evt.clientX - r.width - pad;
  if (y < 8) y = evt.clientY + pad;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}
function hideTip() { if (tip) tip.style.display = 'none'; }

function hoverable(node, html) {
  node.addEventListener('mousemove', (e) => showTip(e, html));
  node.addEventListener('mouseleave', hideTip);
  node.style.cursor = 'default';
  return node;
}

/* ------------------------------------------------------------- base frame */

function frame(w, h, m) {
  const svg = el('svg', {
    viewBox: `0 0 ${w} ${h}`, class: 'chart', preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
  });
  const plot = { x0: m.l, y0: m.t, x1: w - m.r, y1: h - m.b };
  plot.w = plot.x1 - plot.x0;
  plot.h = plot.y1 - plot.y0;
  return { svg, plot };
}

function yAxis(svg, plot, max, { pct = false, label = null, count = 5 } = {}) {
  for (const t of ticks(max, count)) {
    const y = plot.y1 - (t / max) * plot.h;
    svg.appendChild(el('line', {
      x1: plot.x0, x2: plot.x1, y1: y, y2: y, class: 'grid',
    }));
    svg.appendChild(el('text', {
      x: plot.x0 - 8, y: y + 3.5, class: 'tick', 'text-anchor': 'end',
    }, pct ? t.toFixed(max < 5 ? 1 : 0) + '%' : fmt(t, max < 10 ? 1 : 0)));
  }
  if (label) {
    svg.appendChild(el('text', {
      x: -(plot.y0 + plot.h / 2), y: 13, class: 'axis-label',
      transform: 'rotate(-90)', 'text-anchor': 'middle',
    }, label));
  }
}

/* ------------------------------------------------------------------ charts */

/** Vertical bars with an optional overlaid line series (dual purpose). */
export function barLine(data, opts = {}) {
  const {
    w = 760, h = 300, bar, lines = [], xKey, xLabel, yLabel, yLabelRight,
    pctLeft = false, band = null, tip: tipFn,
  } = opts;
  const m = { t: 16, r: lines.length ? 48 : 16, b: 34, l: 52 };
  const { svg, plot } = frame(w, h, m);

  const barMax = niceMax(Math.max(...data.map((d) => d[bar.key])));
  const lineMax = lines.length
    ? niceMax(Math.max(...lines.flatMap((s) => data.map((d) => d[s.key] ?? 0))))
    : 1;

  yAxis(svg, plot, barMax, { pct: pctLeft, label: yLabel });

  if (band) {
    const bw = plot.w / data.length;
    const i0 = data.findIndex((d) => d[xKey] === band[0]);
    const i1 = data.findIndex((d) => d[xKey] === band[1]);
    if (i0 >= 0 && i1 >= 0) {
      svg.appendChild(el('rect', {
        x: plot.x0 + i0 * bw, y: plot.y0, width: (i1 - i0 + 1) * bw, height: plot.h,
        class: 'band',
      }));
    }
  }

  const bw = plot.w / data.length;
  data.forEach((d, i) => {
    const v = d[bar.key];
    const bh = (v / barMax) * plot.h;
    const r = el('rect', {
      x: plot.x0 + i * bw + bw * 0.16, y: plot.y1 - bh,
      width: bw * 0.68, height: Math.max(bh, 0.5), class: 'bar',
    });
    svg.appendChild(tipFn ? hoverable(r, tipFn(d)) : r);
  });

  lines.forEach((s, si) => {
    const pts = data.map((d, i) => [
      plot.x0 + i * bw + bw / 2,
      plot.y1 - ((d[s.key] ?? 0) / lineMax) * plot.h,
    ]);
    svg.appendChild(el('path', {
      d: pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(''),
      class: `line s${si}`, fill: 'none',
    }));
    pts.forEach(([cx, cy], i) => {
      const c = el('circle', { cx, cy, r: 2.8, class: `dot s${si}` });
      svg.appendChild(tipFn ? hoverable(c, tipFn(data[i])) : c);
    });
  });

  if (lines.length) {
    for (const t of ticks(lineMax, 5)) {
      const y = plot.y1 - (t / lineMax) * plot.h;
      svg.appendChild(el('text', {
        x: plot.x1 + 8, y: y + 3.5, class: 'tick right', 'text-anchor': 'start',
      }, fmt(t, lineMax < 10 ? 1 : 0)));
    }
    if (yLabelRight) {
      svg.appendChild(el('text', {
        x: (plot.y0 + plot.h / 2), y: -(w - 13), class: 'axis-label',
        transform: 'rotate(90)', 'text-anchor': 'middle',
      }, yLabelRight));
    }
  }

  const every = data.length > 14 ? 2 : 1;
  data.forEach((d, i) => {
    if (i % every) return;
    svg.appendChild(el('text', {
      x: plot.x0 + i * bw + bw / 2, y: plot.y1 + 16, class: 'tick', 'text-anchor': 'middle',
    }, String(d[xKey])));
  });
  if (xLabel) {
    svg.appendChild(el('text', {
      x: plot.x0 + plot.w / 2, y: h - 3, class: 'axis-label', 'text-anchor': 'middle',
    }, xLabel));
  }
  return svg;
}

/** Horizontal bars, optionally with confidence whiskers. */
export function hbar(data, opts = {}) {
  const {
    w = 760, labelKey, valueKey, loKey, hiKey, unit = '%', h = null,
    colorFn = null, tip: tipFn, valueFmt = (v) => v.toFixed(1) + unit,
    maxLabelChars = 30,
  } = opts;
  const rowH = 26;
  const height = h || data.length * rowH + 34;

  // Margins are measured from the actual strings rather than fixed, because a
  // fixed left gutter silently clips issuer names and a fixed right gutter
  // pushes the value labels off the viewBox. The monospace stack makes width
  // a reliable function of character count.
  const CH = 6.35;                                    // px per char at 11px mono
  const labels = data.map((d) => String(d[labelKey]).slice(0, maxLabelChars));
  const values = data.map((d, i) => valueFmt(d[valueKey], data[i]));
  const m = {
    t: 10, b: 24,
    l: Math.min(Math.max(...labels.map((s) => s.length)) * CH + 16, 0.42 * w),
    r: Math.min(Math.max(...values.map((s) => s.length)) * CH + 16, 0.3 * w),
  };
  const { svg, plot } = frame(w, height, m);

  const max = niceMax(Math.max(...data.map((d) => (hiKey ? d[hiKey] ?? d[valueKey] : d[valueKey]))));
  for (const t of ticks(max, 4)) {
    const x = plot.x0 + (t / max) * plot.w;
    svg.appendChild(el('line', { x1: x, x2: x, y1: plot.y0, y2: plot.y1, class: 'grid' }));
    svg.appendChild(el('text', {
      x, y: plot.y1 + 15, class: 'tick', 'text-anchor': 'middle',
    }, t.toFixed(max < 5 ? 1 : 0) + unit));
  }

  data.forEach((d, i) => {
    const y = plot.y0 + i * (plot.h / data.length) + 4;
    const bh = plot.h / data.length - 9;
    const bwid = (d[valueKey] / max) * plot.w;
    const g = el('g');
    const rect = el('rect', {
      x: plot.x0, y, width: Math.max(bwid, 1), height: bh,
      class: 'bar' + (colorFn ? ' ' + colorFn(d) : ''),
    });
    g.appendChild(rect);

    if (loKey && d[loKey] !== null && d[loKey] !== undefined) {
      const xl = plot.x0 + (Math.max(d[loKey], 0) / max) * plot.w;
      const xh = plot.x0 + (d[hiKey] / max) * plot.w;
      const cy = y + bh / 2;
      g.appendChild(el('line', { x1: xl, x2: xh, y1: cy, y2: cy, class: 'whisker' }));
      g.appendChild(el('line', { x1: xl, x2: xl, y1: cy - 4, y2: cy + 4, class: 'whisker' }));
      g.appendChild(el('line', { x1: xh, x2: xh, y1: cy - 4, y2: cy + 4, class: 'whisker' }));
    }

    svg.appendChild(tipFn ? hoverable(g, tipFn(d)) : g);
    svg.appendChild(el('text', {
      x: plot.x0 - 10, y: y + bh / 2 + 3.5, class: 'tick', 'text-anchor': 'end',
    }, String(d[labelKey]).slice(0, 26)));
    svg.appendChild(el('text', {
      x: plot.x1 + 8, y: y + bh / 2 + 3.5, class: 'val', 'text-anchor': 'start',
    }, valueFmt(d[valueKey], d)));
  });
  return svg;
}

/** Grouped vertical bars — one group per category, one bar per series. */
export function groupedBar(data, opts = {}) {
  const { w = 760, h = 300, xKey, series, yLabel, unit = '%', tip: tipFn } = opts;
  const m = { t: 16, r: 16, b: 46, l: 52 };
  const { svg, plot } = frame(w, h, m);
  const max = niceMax(Math.max(...data.flatMap((d) => series.map((s) => d[s.key] ?? 0))));
  yAxis(svg, plot, max, { pct: unit === '%', label: yLabel });

  const gw = plot.w / data.length;
  const bw = (gw * 0.74) / series.length;
  data.forEach((d, i) => {
    series.forEach((s, si) => {
      const v = d[s.key] ?? 0;
      const bh = (v / max) * plot.h;
      const x = plot.x0 + i * gw + gw * 0.13 + si * bw;
      const r = el('rect', {
        x, y: plot.y1 - bh, width: bw * 0.88, height: Math.max(bh, 0.5),
        class: `bar c${si}`,
      });
      svg.appendChild(tipFn ? hoverable(r, tipFn(d, s)) : r);
    });
    svg.appendChild(el('text', {
      x: plot.x0 + i * gw + gw / 2, y: plot.y1 + 16, class: 'tick', 'text-anchor': 'middle',
    }, String(d[xKey])));
  });

  series.forEach((s, si) => {
    const lx = plot.x0 + si * 128;
    svg.appendChild(el('rect', { x: lx, y: h - 15, width: 9, height: 9, class: `bar c${si}` }));
    svg.appendChild(el('text', { x: lx + 14, y: h - 7, class: 'tick' }, s.label));
  });
  return svg;
}

/** 100% stacked horizontal bars — composition over time. */
export function stacked(rows, opts = {}) {
  const { w = 760, keys, labelKey, colors, tip: tipFn } = opts;
  const rowH = 34;
  const h = rows.length * rowH + 46;
  const m = { t: 8, r: 12, b: 38, l: 56 };
  const { svg, plot } = frame(w, h, m);

  rows.forEach((row, i) => {
    let x = plot.x0;
    const y = plot.y0 + i * (plot.h / rows.length) + 4;
    const bh = plot.h / rows.length - 9;
    keys.forEach((k, ki) => {
      const v = row[k] ?? 0;
      const seg = (v / 100) * plot.w;
      const r = el('rect', {
        x, y, width: Math.max(seg, 0), height: bh, class: `seg k${ki}`,
      });
      svg.appendChild(tipFn ? hoverable(r, tipFn(row, k, v)) : r);
      if (v >= 7) {
        svg.appendChild(el('text', {
          x: x + seg / 2, y: y + bh / 2 + 3.5, class: 'seg-label', 'text-anchor': 'middle',
        }, v.toFixed(0) + '%'));
      }
      x += seg;
    });
    svg.appendChild(el('text', {
      x: plot.x0 - 10, y: y + bh / 2 + 3.5, class: 'tick', 'text-anchor': 'end',
    }, String(row[labelKey])));
  });

  keys.forEach((k, ki) => {
    const per = Math.floor(plot.w / Math.min(keys.length, 3));
    const col = ki % 3, rw = Math.floor(ki / 3);
    const lx = plot.x0 + col * per;
    const ly = h - 22 + rw * 12;
    svg.appendChild(el('rect', { x: lx, y: ly - 7, width: 9, height: 9, class: `seg k${ki}` }));
    svg.appendChild(el('text', { x: lx + 14, y: ly + 1, class: 'tick' }, k));
  });
  return svg;
}

/** Multi-series line chart on a shared numeric x axis. */
export function lineChart(data, opts = {}) {
  const {
    w = 760, h = 300, xKey, series, xLabel, yLabel, unit = '%', refLine = null,
    tip: tipFn,
  } = opts;
  // Bottom margin carries three stacked rows: tick labels, the axis label, and
  // the legend. 44px fitted two of them and clipped the descenders off the third.
  const m = { t: 16, r: 16, b: 58, l: 52 };
  const { svg, plot } = frame(w, h, m);
  const xs = data.map((d) => d[xKey]);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const max = niceMax(Math.max(...data.flatMap((d) => series.map((s) => d[s.key] ?? 0))));
  yAxis(svg, plot, max, { pct: unit === '%', label: yLabel });

  const px = (v) => plot.x0 + ((v - xMin) / (xMax - xMin || 1)) * plot.w;
  const py = (v) => plot.y1 - (v / max) * plot.h;

  if (refLine !== null) {
    svg.appendChild(el('line', {
      x1: plot.x0, x2: plot.x1, y1: py(refLine), y2: py(refLine), class: 'ref',
    }));
  }

  series.forEach((s, si) => {
    const pts = data.map((d) => [px(d[xKey]), py(d[s.key] ?? 0)]);
    svg.appendChild(el('path', {
      d: pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(''),
      class: `line s${si}`, fill: 'none',
    }));
    pts.forEach(([cx, cy], i) => {
      const c = el('circle', { cx, cy, r: 3.2, class: `dot s${si}` });
      svg.appendChild(tipFn ? hoverable(c, tipFn(data[i], s)) : c);
    });
  });

  data.forEach((d) => {
    svg.appendChild(el('text', {
      x: px(d[xKey]), y: plot.y1 + 16, class: 'tick', 'text-anchor': 'middle',
    }, String(d[xKey])));
  });
  if (xLabel) {
    svg.appendChild(el('text', {
      x: plot.x0 + plot.w / 2, y: h - 26, class: 'axis-label', 'text-anchor': 'middle',
    }, xLabel));
  }
  // Legend sits a full text-height above the viewBox floor. Placing the
  // baseline at y = h looks fine until a descender ("p", "j") crosses the edge
  // and gets clipped by the SVG bounds.
  const legendGap = Math.max(...series.map((s) => s.label.length)) * 6.6 + 34;
  series.forEach((s, si) => {
    const lx = plot.x0 + si * legendGap;
    svg.appendChild(el('line', {
      x1: lx, x2: lx + 16, y1: h - 10, y2: h - 10, class: `line s${si}`,
    }));
    svg.appendChild(el('text', { x: lx + 22, y: h - 6, class: 'tick' }, s.label));
  });
  return svg;
}

/** Strip plot — one dot per observation, jittered, with a median rule. */
export function strip(groups, opts = {}) {
  const { w = 760, valueKey, unit = ' min', h = null } = opts;
  const rowH = 62;
  const height = h || groups.length * rowH + 42;
  const m = { t: 12, r: 18, b: 30, l: 168 };
  const { svg, plot } = frame(w, height, m);

  const all = groups.flatMap((g) => g.values.map((v) => v[valueKey] ?? v));
  const max = niceMax(Math.max(...all));
  for (const t of ticks(max, 5)) {
    const x = plot.x0 + (t / max) * plot.w;
    svg.appendChild(el('line', { x1: x, x2: x, y1: plot.y0, y2: plot.y1, class: 'grid' }));
    svg.appendChild(el('text', {
      x, y: plot.y1 + 16, class: 'tick', 'text-anchor': 'middle',
    }, t.toFixed(0)));
  }

  groups.forEach((g, gi) => {
    const cy = plot.y0 + (gi + 0.5) * (plot.h / groups.length);
    const vals = g.values.map((v) => (typeof v === 'object' ? v[valueKey] : v)).sort((a, b) => a - b);
    const q = (p) => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))];

    // IQR box behind the points
    const bx0 = plot.x0 + (q(0.25) / max) * plot.w;
    const bx1 = plot.x0 + (q(0.75) / max) * plot.w;
    svg.appendChild(el('rect', {
      x: bx0, y: cy - 17, width: Math.max(bx1 - bx0, 1), height: 34, class: 'iqr',
    }));

    let seed = gi * 9301 + 49297;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5);
    vals.forEach((v) => {
      const c = el('circle', {
        cx: plot.x0 + (v / max) * plot.w, cy: cy + rnd() * 24, r: 3, class: 'pt',
      });
      svg.appendChild(hoverable(c, `${g.label}<br><b>${v.toFixed(1)}${unit}</b>`));
    });

    const mx = plot.x0 + (q(0.5) / max) * plot.w;
    svg.appendChild(el('line', { x1: mx, x2: mx, y1: cy - 19, y2: cy + 19, class: 'median' }));
    g.label.split('\n').forEach((ln, li, arr) => {
      svg.appendChild(el('text', {
        x: plot.x0 - 12, y: cy + 4 - (arr.length - 1) * 6 + li * 13,
        class: 'tick', 'text-anchor': 'end',
      }, ln));
    });
  });
  return svg;
}

/** Funnel — successive stages as shrinking bars with drop-off annotations. */
export function funnel(stages, opts = {}) {
  const { w = 760 } = opts;
  const h = stages.length * 62 + 16;
  // The first stage is by definition full width, so its value label has
  // nowhere to sit outside the bar. Reserve room, and fall back to placing the
  // label inside the bar when even that is not enough.
  const m = { t: 10, r: 62, b: 8, l: 158 };
  const { svg, plot } = frame(w, h, m);
  const top = stages[0].value;

  stages.forEach((s, i) => {
    const y = plot.y0 + i * (plot.h / stages.length);
    const bh = plot.h / stages.length - 22;
    const bwid = Math.max((s.value / top) * plot.w, 2);
    const g = el('g');
    g.appendChild(el('rect', {
      x: plot.x0, y, width: bwid, height: bh, class: `funnel f${i}`,
    }));
    svg.appendChild(hoverable(g, `${s.label}<br><b>${s.value.toLocaleString()}</b>`));
    svg.appendChild(el('text', {
      x: plot.x0 - 10, y: y + bh / 2 + 4, class: 'tick', 'text-anchor': 'end',
    }, s.label));
    const valTxt = fmt(s.value, 1);
    const needed = valTxt.length * 6.6 + 10;
    const outside = plot.x0 + bwid + 10 + needed <= plot.x1 + m.r - 4;
    svg.appendChild(el('text', {
      x: outside ? plot.x0 + bwid + 10 : plot.x0 + bwid - 10,
      y: y + bh / 2 + 4, class: outside ? 'val' : 'val inside',
      'text-anchor': outside ? 'start' : 'end',
    }, valTxt));
    if (i) {
      const pct = (s.value / stages[i - 1].value) * 100;
      svg.appendChild(el('text', {
        x: plot.x0 + 6, y: y - 6, class: 'drop',
      }, `${pct < 1 ? pct.toFixed(3) : pct.toFixed(1)}% of the step above`));
    }
  });
  return svg;
}

export { fmt };
