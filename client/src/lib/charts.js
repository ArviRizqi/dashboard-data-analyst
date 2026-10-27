import { Chart, registerables } from 'chart.js';
import { nf } from './format.js';

Chart.register(...registerables);

/** Label nilai di ujung batang (plugin dari dashboard HTML asli). */
const valueLabels = {
  id: 'vl',
  afterDatasetsDraw(ch, _args, o) {
    if (!o || !o.on) return;
    const { ctx } = ch;
    const horiz = ch.options.indexAxis === 'y';
    ctx.save();
    ctx.font = `600 11px ${getComputedStyle(document.body).fontFamily}`;
    ctx.fillStyle = o.color;
    ch.data.datasets.forEach((ds, di) => {
      const m = ch.getDatasetMeta(di);
      if (m.hidden || !ds.vlabels) return;
      m.data.forEach((el, i) => {
        const t = ds.vlabels[i];
        if (t == null) return;
        if (horiz) {
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(t, el.x + 6, el.y);
        } else {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(t, el.x, el.y - 5);
        }
      });
    });
    ctx.restore();
  },
};
Chart.register(valueLabels);

/** Membaca token warna dari CSS (mengikuti tema terang/gelap). */
export function readTheme() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n) => cs.getPropertyValue(n).trim();
  return {
    ink: g('--ink'),
    ink2: g('--ink2'),
    mute: g('--mute'),
    grid: g('--grid'),
    card: g('--card'),
    line: g('--line'),
    s: [1, 2, 3, 4, 5, 6, 7, 8].map((k) => g(`--s${k}`)),
  };
}

function baseOptions(t, cfg) {
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.font.size = 12;
  Chart.defaults.color = t.ink2;
  cfg.options = cfg.options || {};
  cfg.options.maintainAspectRatio = false;
  cfg.options.animation = { duration: 250 };
  cfg.options.plugins = cfg.options.plugins || {};
  cfg.options.plugins.tooltip = {
    backgroundColor: t.card,
    titleColor: t.ink,
    bodyColor: t.ink2,
    borderColor: t.line,
    borderWidth: 1,
    padding: 10,
    boxPadding: 4,
    displayColors: true,
    ...(cfg.options.plugins.tooltip || {}),
  };
  return cfg;
}

function axes(t, o = {}) {
  const val = {
    grid: { color: t.grid },
    border: { display: false },
    ticks: { color: t.ink2, callback: o.axisFmt || ((v) => v) },
    beginAtZero: o.min === undefined,
    stacked: !!o.stacked,
  };
  if (o.min !== undefined) val.min = o.min;
  if (o.max !== undefined) val.max = o.max;
  const cat = {
    grid: { display: false },
    border: { color: t.line },
    ticks: { color: t.ink2, autoSkip: o.skip === true, maxRotation: 0 },
    stacked: !!o.stacked,
  };
  return o.horiz ? { x: val, y: cat } : { x: cat, y: val };
}

/** Grafik batang. Mengembalikan { config, meta } — meta dipakai untuk tampilan tabel. */
export function bar(t, o) {
  const h = !!o.horiz;
  const fmt = o.fmt || ((v) => nf(v));
  const datasets = o.sets.map((s, i) => ({
    label: s.label,
    data: s.data,
    backgroundColor: s.color || t.s[i],
    borderRadius: o.stacked ? 0 : 4,
    borderSkipped: false,
    maxBarThickness: o.thick || 30,
    borderColor: t.card,
    borderWidth: o.stacked ? 2 : 0,
    vlabels: s.vlabels,
    n: s.n,
  }));
  const config = baseOptions(t, {
    type: 'bar',
    data: { labels: o.labels, datasets },
    options: {
      indexAxis: h ? 'y' : 'x',
      layout: { padding: { right: h && o.vl ? o.padR || 78 : 4, top: !h && o.vl ? 18 : 4 } },
      scales: axes(t, { horiz: h, stacked: o.stacked, axisFmt: o.axisFmt, min: o.min, max: o.max, skip: o.skip }),
      onClick: o.onClick ? (_e, els) => els.length && o.onClick(els[0].index) : undefined,
      onHover: o.onClick
        ? (e, els) => {
            e.native.target.style.cursor = els.length ? 'pointer' : 'default';
          }
        : undefined,
      plugins: {
        legend: { display: o.sets.length > 1, position: 'top', align: 'start', labels: { boxWidth: 10, boxHeight: 10, color: t.ink2 } },
        vl: { on: !!o.vl && !o.stacked, color: t.ink2 },
        tooltip: {
          callbacks: {
            label: (c) => {
              if (o.tip) return o.tip(c);
              const v = c.parsed[h ? 'x' : 'y'];
              return (c.dataset.label ? `${c.dataset.label}: ` : '') + fmt(v);
            },
          },
        },
      },
    },
  });
  return { config, meta: { labels: o.labels, sets: o.sets, fmt } };
}

/** Grafik garis (kategori atau XY). */
export function line(t, o) {
  const fmt = o.fmt || ((v) => nf(v));
  const datasets = o.sets.map((s, i) => {
    const color = s.color || t.s[i];
    return {
      label: s.label,
      data: s.data,
      borderColor: color,
      backgroundColor: s.fill ? `${color}22` : color,
      borderWidth: 2,
      pointRadius: s.pr || 0,
      pointHoverRadius: 5,
      pointBackgroundColor: color,
      pointBorderColor: t.card,
      pointBorderWidth: 2,
      tension: 0.25,
      fill: !!s.fill,
      borderDash: s.dash || [],
      showLine: s.showLine !== false,
      spanGaps: true,
    };
  });
  const scales = o.xy
    ? {
        x: { type: 'linear', grid: { color: t.grid }, border: { display: false }, ticks: { color: t.ink2 }, title: { display: true, text: o.xTitle, color: t.mute } },
        y: { grid: { color: t.grid }, border: { display: false }, ticks: { color: t.ink2, callback: o.axisFmt }, min: o.min, max: o.max },
      }
    : axes(t, { axisFmt: o.axisFmt, min: o.min, max: o.max, skip: o.skip });
  const config = baseOptions(t, {
    type: 'line',
    data: { labels: o.labels, datasets },
    options: {
      interaction: { mode: o.xy ? 'nearest' : 'index', intersect: false },
      scales,
      plugins: {
        legend: { display: o.sets.length > 1, position: 'top', align: 'start', labels: { boxWidth: 10, boxHeight: 10, color: t.ink2 } },
        tooltip: {
          callbacks: {
            label: (c) => (o.tip ? o.tip(c) : (c.dataset.label ? `${c.dataset.label}: ` : '') + fmt(c.parsed.y)),
          },
        },
      },
    },
  });
  return { config, meta: { labels: o.labels, sets: o.sets, fmt, noTbl: o.noTbl } };
}

/** Grafik titik horizontal (rating rata-rata) — skala 3,5 sampai 4,5. */
export function dot(t, { labels, values, counts }) {
  const config = baseOptions(t, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Rating',
          data: values,
          showLine: false,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: t.s[0],
          pointBorderColor: t.card,
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      scales: {
        x: { min: 3.5, max: 4.5, grid: { color: t.grid }, border: { display: false }, ticks: { color: t.ink2 } },
        y: { grid: { color: t.grid }, border: { display: false }, ticks: { color: t.ink2, autoSkip: false } },
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => `Rating ${nf(c.parsed.x, 2)} dari ${nf(counts[c.dataIndex])} ulasan` } },
      },
    },
  });
  return { config, meta: { labels, sets: [{ label: 'Rating', data: values }], fmt: (v) => nf(v, 2) } };
}
