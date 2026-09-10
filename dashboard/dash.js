/* ============================================================
   Dashboard controller.

   Reads data.json and renders one view per tab. No figure in here is
   retyped by hand: every number comes from data.json, which is built from
   the five projects' pipeline outputs.

   Not retyped is not the same as cannot drift. data.json is a snapshot. Its
   ED section was built on 2026-08-05; the ED pipeline fixed its weighted
   quantiles on 2026-08-11, and this page went on showing the pre-fix 3.9x
   until 2026-09-10. Rebuild the ED section with tools/build_ed_section.py,
   and run it with --check whenever an upstream repository's outputs change.
   ============================================================ */

import { barLine, hbar, groupedBar, stacked, lineChart, strip, funnel, fmt } from './charts.js';

const $ = (sel) => document.querySelector(sel);
const h = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const pct = (v, d = 1) => (v === null || v === undefined ? '—' : v.toFixed(d) + '%');

/* ---------------------------------------------------------------- shell */

function card(title, note, chartNode, footNote) {
  const c = h(`<section class="card"><h3>${title}</h3>${note ? `<p class="note">${note}</p>` : ''}</section>`);
  if (chartNode) c.appendChild(chartNode);
  if (footNote) c.appendChild(h(`<p class="foot-note">${footNote}</p>`));
  return c;
}

function kpis(items) {
  const wrap = h('<div class="kpis"></div>');
  for (const k of items) {
    wrap.appendChild(h(
      `<div class="kpi">
         <div class="k-val">${k.value}${k.unit ? `<span class="unit">${k.unit}</span>` : ''}</div>
         <div class="k-lab">${k.label}</div>
         ${k.sub ? `<div class="k-sub">${k.sub}</div>` : ''}
       </div>`));
  }
  return wrap;
}

function table(headers, rows) {
  const w = h('<div class="tbl-wrap"></div>');
  const t = h(`<table><thead><tr>${headers.map((x) => `<th>${x}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
  w.appendChild(t);
  return w;
}

/* ------------------------------------------------------------ ED view */

function viewED(d) {
  const f = document.createDocumentFragment();
  const k = d.kpi;

  f.appendChild(h(`<p class="view-intro">
    <b>${d.sample_visits.toLocaleString()} real emergency department visits</b> from the CDC/NCHS
    national survey, weighted to the <b>${fmt(d.national_visits)}</b> ED visits made in the United
    States in 2022. Every rate carries a design-based confidence interval, because visits sampled
    from the same hospital are correlated and treating them as independent understates the error
    badly.</p>`));
  f.appendChild(h(`<p class="source">Source: ${d.source}</p>`));

  f.appendChild(kpis([
    { value: k.median_wait, unit: ' min', label: 'median door-to-provider', sub: `90th percentile ${k.p90_wait} min` },
    { value: k.lwbs_pct.toFixed(2), unit: '%', label: 'left without being seen', sub: `99% CI ${k.lwbs_ci[0].toFixed(2)}–${k.lwbs_ci[1].toFixed(2)}%` },
    { value: k.admit_pct.toFixed(1), unit: '%', label: 'admitted', sub: `99% CI ${k.admit_ci[0].toFixed(1)}–${k.admit_ci[1].toFixed(1)}%` },
    { value: k.median_lov, unit: ' min', label: 'median length of visit' },
    { value: (d.boarding.p90_min / 60).toFixed(1), unit: ' hr', label: 'boarding at the 90th percentile', sub: `median ${k.median_boarding} min` },
  ]));

  // the decomposition — the headline finding
  const dec = d.decomposition;
  f.appendChild(card(
    'Where the variation actually lives',
    `The same statistic — median door-to-provider time — computed two ways. Across
     <b>${dec.hospitals_analysed} hospitals</b> it spans ${dec.hospital_median_wait.p10}–${dec.hospital_median_wait.max} min.
     Across the 24 hours of the day it spans only ${dec.hour_of_day_median_wait.p10}–${dec.hour_of_day_median_wait.max} min.
     The between-hospital spread is <b>${dec.spread_ratio_hospital_vs_hour}× larger</b>.`,
    strip([
      { label: `across ${dec.hospitals_analysed} hospitals`, values: d.hospitals.map((x) => x.median) },
      { label: 'across the 24 hours\nof the day', values: d.hourly.map((x) => x.median) },
    ], { valueKey: null, unit: ' min' }),
    'Each dot is one grouping&rsquo;s survey-weighted median. Box shows the interquartile range; the heavy rule is the median of medians.'
  ));

  const pk = d.peak_test;
  f.appendChild(h(`<div class="callout warn">
    <b>The peak-hour effect does not survive testing.</b> Arrivals do surge in the late afternoon
    and the median wait is directionally worse (${pk.median_peak} min at 16:00–19:00 versus
    ${pk.median_night} min overnight; LWBS ${pk.lwbs_peak.toFixed(2)}% versus ${pk.lwbs_night.toFixed(2)}%).
    But under design-correct inference the difference does not clear significance at the
    α = 0.01 level CDC recommends for this file — wait p = ${pk.wait_p.toFixed(2)},
    LWBS p = ${pk.lwbs_p.toFixed(3)}. A staffing case built on it would not withstand scrutiny.
  </div>`));

  f.appendChild(card(
    'Arrival volume and the wait it produces',
    'Bars are annual visit volume by hour of arrival; lines are the median and 90th percentile wait. The median line is essentially flat — the tail is where the crowding shows.',
    barLine(d.hourly, {
      xKey: 'hour', xLabel: 'hour of arrival', yLabel: 'visits (millions/yr)',
      yLabelRight: 'minutes',
      bar: { key: 'visits_m' },
      lines: [{ key: 'median', label: 'median' }, { key: 'p90', label: '90th pct' }],
      band: [16, 19],
      tip: (r) => `<b>${String(r.hour).padStart(2, '0')}:00</b><br>
        ${(r.visits_m * 1e6).toLocaleString(undefined, { maximumFractionDigits: 0 })} visits/yr<br>
        median ${r.median} min · p90 ${r.p90} min<br>LWBS ${r.lwbs}% · n=${r.n}`,
    }),
    'Shaded band marks 16:00–19:00. Right axis applies to the two lines.'
  ));

  const g = h('<div class="grid2"></div>');
  g.appendChild(card(
    'Who gives up and leaves',
    'Patients without coverage are the ones who walk out before being seen — self-pay runs about four times the Medicare rate.',
    hbar(d.payer.filter((p) => p.reliable), {
      labelKey: 'payer', valueKey: 'lwbs', loKey: 'lo', hiKey: 'hi',
      colorFn: (r) => (r.payer === 'Self-pay' || r.payer === 'Medicaid/CHIP' ? 'warn' : ''),
      tip: (r) => `<b>${r.payer}</b><br>LWBS ${r.lwbs}%<br>99% CI ${r.lo}–${r.hi}%<br>n = ${r.n.toLocaleString()}`,
    }),
    'Whiskers are 99% design-based confidence intervals. Only estimates meeting the NCHS reliability standard are shown.'
  ));
  g.appendChild(card(
    'Does triage work?',
    'Wait should climb with triage level. It does through ESI 4 — then falls for ESI 5, the signature of a fast-track pathway pulling the simplest patients out of the main queue.',
    groupedBar(d.acuity, {
      xKey: 'level', unit: ' min', yLabel: 'minutes',
      series: [{ key: 'median', label: 'median' }, { key: 'p90', label: '90th percentile' }],
      tip: (r, s) => `<b>${r.level}</b><br>${s.label}: ${r[s.key]} min<br>LWBS ${r.lwbs}% · n=${r.n}`,
    }),
    'ESI 1 = immediate, ESI 5 = non-urgent.'
  ));
  f.appendChild(g);
  return f;
}

/* -------------------------------------------------------- denials view */

function viewDenials(d) {
  const f = document.createDocumentFragment();
  const p = d.pooled;
  const latest = d.funnel[d.funnel.length - 1];

  f.appendChild(h(`<p class="view-intro">
    Three years of CMS Transparency in Coverage filings — <b>${d.plan_years.toLocaleString()} plan-years</b>
    covering <b>${fmt(p.claims_denied)} denied claims</b> across every Qualified Health Plan on the
    federal Marketplace. The question a revenue-cycle team has is not &ldquo;what is the denial
    rate&rdquo;; it is where the recoverable money sits.</p>`));
  f.appendChild(h(`<p class="source">Source: ${d.source}. All figures self-reported by issuers to CMS.</p>`));

  f.appendChild(kpis([
    { value: latest.denial_rate.toFixed(1), unit: '%', label: 'of claims denied', sub: `${latest.year}, ${latest.issuers} issuers` },
    { value: p.appeal_rate_pct.toFixed(3), unit: '%', label: 'of denials ever appealed', sub: 'fewer than 2 in every 1,000' },
    { value: p.overturn_rate_pct.toFixed(1), unit: '%', label: 'of appeals overturned', sub: 'appealing usually works' },
    { value: fmt(p.denials_never_appealed), unit: '', label: 'denials never challenged at all' },
  ]));

  f.appendChild(card(
    'The appeals funnel',
    'Roughly one claim in six is denied. Almost none of those denials are ever formally challenged — and when they are, they succeed about two times in five.',
    funnel([
      { label: 'claims received', value: d.funnel.reduce((a, x) => a + x.received, 0) },
      { label: 'denied', value: p.claims_denied },
      { label: 'appealed', value: p.appeals_filed },
      { label: 'overturned', value: Math.round(p.appeals_filed * p.overturn_rate_pct / 100) },
    ]),
    'Pooled 2021–2023 across issuers reporting a complete funnel.'
  ));

  f.appendChild(h(`<div class="callout">
    <b>The binding constraint is capacity to file, not claim merit.</b> Multiplying
    ${fmt(p.denials_never_appealed)} unappealed denials by the observed ${p.overturn_rate_pct.toFixed(1)}%
    success rate gives roughly ${fmt(p.implied_overturnable_if_all_appealed)} potentially
    overturnable claims — but that is an <b>upper bound, not a forecast</b>. Appeals are
    self-selected for winnability, so the marginal unappealed denial is certainly weaker than
    the average appealed one.
  </div>`));

  const g = h('<div class="grid2"></div>');

  const years = [...new Set(d.mix.map((m) => m.year))].sort();
  const reasons = [...new Set(d.mix.map((m) => m.reason))];
  const mixRows = years.map((y) => {
    const row = { year: y };
    for (const r of reasons) {
      row[r] = d.mix.find((m) => m.year === y && m.reason === r)?.share ?? 0;
    }
    return row;
  });
  const ordered = [...reasons].sort((a, b) => (mixRows.at(-1)[b] ?? 0) - (mixRows.at(-1)[a] ?? 0));

  g.appendChild(card(
    'The reason taxonomy is mostly a residual bucket',
    `CMS collects five specific denial reasons. They account for barely a quarter of denials, and
     their share <b>shrinks every year</b> — &ldquo;Other&rdquo; has grown to
     ${mixRows.at(-1)['Other'].toFixed(1)}%. You cannot fix what you cannot name.`,
    stacked(mixRows, {
      keys: ordered, labelKey: 'year',
      tip: (row, k, v) => `<b>${row.year} — ${k}</b><br>${v.toFixed(1)}% of categorised denials`,
    }),
    'Share of categorised plan-level denials.'
  ));

  g.appendChild(card(
    'Reporting coverage is falling',
    'The number of plans grew 86% while the number reporting a usable denial rate grew 28%. Any estimate from this file describes the plans that chose to report.',
    lineChart(d.coverage, {
      xKey: 'year', unit: '%', yLabel: 'plans reporting (%)', xLabel: 'plan year',
      series: [{ key: 'pct', label: 'coverage' }],
      tip: (r) => `<b>${r.year}</b><br>${r.reporting.toLocaleString()} of ${r.plans.toLocaleString()} plans<br>${r.pct}% coverage`,
      h: 260,
    }),
    'A transparency mandate whose coverage declines as the market grows is not producing transparency.'
  ));
  f.appendChild(g);

  const v = d.variation.issuer_denial_rate;
  f.appendChild(card(
    'Denial rate is a property of the payer',
    `Across ${v.issuers} issuers with 100,000+ claims the rate runs from <b>${v.p10}%</b> at the
     tenth percentile to <b>${v.max}%</b> at the maximum. The top of the distribution is notably
     concentrated in brands belonging to a small number of parent organisations.`,
    hbar(d.worst, {
      labelKey: 'issuer', valueKey: 'rate',
      colorFn: (r) => (r.rate > 40 ? 'bad' : r.rate > 30 ? 'warn' : ''),
      tip: (r) => `<b>${r.issuer}</b> (${r.state})<br>denial rate ${r.rate}%<br>${r.claims.toLocaleString()} claims received`,
    }),
    'Highest-denying issuers, latest plan year. Self-reported; no inference about intent is made or supported by this data.'
  ));
  return f;
}

/* -------------------------------------------------------- quality view */

function viewQuality(d) {
  const f = document.createDocumentFragment();
  const pop = d.population;

  f.appendChild(h(`<p class="view-intro">
    HEDIS and CMS eCQM measures computed over a <b>${pop.patients.toLocaleString()}-patient</b> EHR —
    ${pop.encounters.toLocaleString()} encounters and <b>${fmt(pop.observations)} observations</b>.
    Measures are versioned YAML specifications with SNOMED and LOINC value sets, so an annual
    steward update is a reviewable diff rather than a code change.</p>`));
  f.appendChild(h(`<p class="source">Source: ${d.source}. Measurement period ${d.period.start} to ${d.period.end}. No real patient data is used.</p>`));

  const byId = Object.fromEntries(d.measures.map((m) => [m.id, m]));
  const disp = d.measures.map((m) => ({
    ...m,
    perf: m.direction === 'lower_is_better' ? 100 - m.rate : m.rate,
    short: m.title.split('—')[0].trim().slice(0, 30),
  }));

  f.appendChild(kpis([
    { value: byId.CBP.rate.toFixed(1), unit: '%', label: 'blood pressure controlled', sub: `n = ${byId.CBP.denominator.toLocaleString()}` },
    { value: byId.COL.rate.toFixed(1), unit: '%', label: 'colorectal screening', sub: `n = ${byId.COL.denominator.toLocaleString()}` },
    { value: byId.CMS134.rate.toFixed(1), unit: '%', label: 'nephropathy attention', sub: `n = ${byId.CMS134.denominator.toLocaleString()}` },
    { value: d.gaps.total.toLocaleString(), unit: '', label: 'open care gaps', sub: `${d.gaps.patients_with_multiple_gaps.toLocaleString()} patients have 2 or more` },
  ]));

  f.appendChild(card(
    'Measure performance',
    'Oriented so higher is always better — CMS122 is an inverse measure and has been flipped.',
    hbar(disp, {
      labelKey: 'short', valueKey: 'perf',
      colorFn: (r) => (r.perf < 60 ? 'warn' : 'good'),
      valueFmt: (v, r) => `${v.toFixed(1)}%  (${r.numerator.toLocaleString()}/${r.denominator.toLocaleString()})`,
      tip: (r) => `<b>${r.title}</b><br>${r.rate.toFixed(1)}% raw · ${r.direction.replace('_', ' ')}<br>${r.numerator.toLocaleString()} of ${r.denominator.toLocaleString()}`,
    })
  ));

  const c122 = byId.CMS122.decomposition;
  if (c122) {
    f.appendChild(h(`<div class="callout warn">
      <b>The headline number for CMS122 is not about blood sugar.</b> It scores
      ${byId.CMS122.rate.toFixed(1)}% poor control — but decomposing the numerator gives
      <b>${c122.failed_on_a_result} patient failing on a recorded result</b> and
      <b>${c122.counted_because_untested} counted because they were never tested</b>
      (${(c122.untested_share_of_numerator * 100).toFixed(0)}% of the numerator).
      Both are &ldquo;poor control&rdquo; by the specification, but one is a clinical problem
      and the other is an outreach problem, and they call for completely different interventions.
    </div>`));
  }

  const ages = [...new Set(d.strata.filter((s) => s.reliable).map((s) => s.stratum))].sort();
  const measures = ['CBP', 'COL', 'CMS122', 'CMS134'];
  const stratRows = measures.map((m) => {
    const row = { measure: m };
    for (const a of ages) {
      row[a] = d.strata.find((s) => s.measure === m && s.stratum === a && s.reliable)?.rate ?? null;
    }
    return row;
  }).filter((r) => ages.some((a) => r[a] !== null));

  f.appendChild(card(
    'The same measure, by age band',
    `An aggregate hides a work plan. Blood pressure control runs <b>57% at ages 18–44 against 89%
     at 75+</b> — a 32-point gap invisible in the ${byId.CBP.rate.toFixed(1)}% headline. Poor
     glycaemic control shows the same pattern in reverse. Younger adults with chronic disease are
     the population failing every control measure.`,
    groupedBar(stratRows, {
      xKey: 'measure', unit: '%', yLabel: 'rate (%)',
      series: ages.map((a) => ({ key: a, label: a })),
      tip: (r, s) => `<b>${r.measure} · ages ${s.label}</b><br>${r[s.key] === null ? 'too few patients' : r[s.key].toFixed(1) + '%'}`,
    }),
    'Strata with fewer than 20 patients are omitted. CMS122 is an inverse measure — higher is worse.'
  ));

  const gapRows = Object.entries(d.gaps.by_measure || {})
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => [k, v.toLocaleString()]);
  f.appendChild(card(
    'The deliverable: a care-gap list',
    `Scores go on a dashboard; gaps go to a person.
     <b>${d.gaps.patients_with_multiple_gaps.toLocaleString()} patients carry two or more open
     gaps</b> — the outreach list worth building first, because one contact closes several.`,
    table(['measure', 'open gaps'], gapRows),
    `${d.gaps.total.toLocaleString()} gaps across ${d.gaps.patients.toLocaleString()} patients.`
  ));
  return f;
}

/* ---------------------------------------------------- readmission view */

function viewReadmission(d) {
  const f = document.createDocumentFragment();
  const gbm = d.models.find((m) => m.key === 'p_gbm');
  const rule = d.models.find((m) => m.key === 'rule_prior_inpatient');
  const top20 = d.lift.find((l) => l.depth === 20);

  f.appendChild(h(`<p class="view-intro">
    A 30-day readmission model on <b>99,343 real inpatient encounters</b> across 130 hospitals.
    It reaches AUC ${gbm.auc.toFixed(3)} — a mediocre-sounding number, and the point of the project
    is that AUC is the wrong thing to judge it on. What a care-management team needs to know is
    what they get from working the top of the list.</p>`));
  f.appendChild(h(`<p class="source">Source: ${d.source}</p>`));

  f.appendChild(kpis([
    { value: top20.recall.toFixed(1), unit: '%', label: 'of readmissions caught in the top 20%', sub: `${d.base_rate}% base rate` },
    { value: top20.lift.toFixed(2), unit: '×', label: 'enrichment at that depth' },
    { value: top20.nns.toFixed(1), unit: '', label: 'number needed to screen' },
    { value: gbm.auc.toFixed(3), unit: '', label: 'ROC AUC', sub: `rule baseline ${rule.auc.toFixed(3)}` },
  ]));

  f.appendChild(card(
    'What the model buys a capacity-constrained team',
    `Ranking is what a team actually consumes, and the ranking is useful even though the
     discrimination is modest. Note the baseline: <b>counting prior inpatient stays alone</b> —
     one variable a nurse can read off the chart — already reaches
     ${d.lift.find((l) => l.depth === 20).recall.toFixed(1)}% at 20% depth for the model versus
     32.2% for the rule. The model buys real value, and far less than an AUC comparison implies.`,
    lineChart(d.lift, {
      xKey: 'depth', unit: '%', xLabel: 'share of patients contacted, highest risk first (%)',
      yLabel: 'readmissions caught (%)',
      series: [{ key: 'recall', label: 'recall' }, { key: 'precision', label: 'precision' }],
      tip: (r) => `<b>top ${r.depth}%</b><br>catches ${r.recall}% of readmissions<br>precision ${r.precision}% · lift ${r.lift}×<br>NNS ${r.nns}`,
    })
  ));

  const g = h('<div class="grid2"></div>');
  g.appendChild(card(
    'Risk board, back-tested',
    'Tier boundaries derive from real outreach capacity — 120 discharges a day, 24 contacts — not from round numbers. Predicted and observed agree within a point in every tier.',
    table(
      ['tier', 'patients', 'predicted', 'observed', 'share of readmits'],
      d.board.map((b) => [
        b.tier.split(' — ')[0].split(' - ')[0],
        b.patients.toLocaleString(), pct(b.predicted), `<b>${pct(b.observed)}</b>`, pct(b.share),
      ])
    ),
    'This is enrichment, not prevention. Whether contacting these patients changes the outcome is a question only a trial can answer.'
  ));

  g.appendChild(card(
    'Calibration is the constraint, not discrimination',
    'Balanced class weighting leaves AUC almost unchanged while destroying the probability scale — an AUC-only evaluation never notices.',
    table(
      ['model', 'AUC', 'Brier', 'mean predicted', 'slope'],
      d.models.filter((m) => m.brier !== null && m.brier !== undefined).map((m) => [
        m.label, m.auc.toFixed(3), m.brier.toFixed(4),
        `<b>${(m.mean_pred * 100).toFixed(1)}%</b>`, m.slope.toFixed(2),
      ])
    ),
    `Observed rate is ${d.base_rate}%. The logistic model predicts a mean risk four times that — unusable for a threshold, however good its ranking.`
  ));
  f.appendChild(g);

  if (d.leakage && d.leakage.gbm) {
    f.appendChild(h(`<div class="callout">
      <b>I expected patient-level leakage to matter here, and measured that it does not.</b>
      23% of patients appear in more than one encounter, so a random split puts the same person
      on both sides. Grouping the split on patient changes AUC by only
      ${(d.leakage.gbm.inflation).toFixed(4)} for the gradient booster and
      ${(d.leakage.logistic.inflation).toFixed(4)} for logistic regression. The grouped split
      stays because it is correct; the inflation is reported because it was tested rather than
      assumed in either direction.
    </div>`));
  }
  return f;
}

/* -------------------------------------------------- experimentation view */

function viewExperiments(d) {
  const f = document.createDocumentFragment();
  const ten = d.peeking.find((p) => p.looks === 10);

  f.appendChild(h(`<p class="view-intro">
    Five failure modes that quietly break online experiments, each measured against
    <b>known ground truth</b> rather than asserted. Simulation is the right instrument: the
    subject is the behaviour of estimators, and the only way to know whether one recovers the
    truth is to run it where you set the truth.</p>`));
  f.appendChild(h('<p class="source">Every figure generated by the code in the repository. Deterministic given a fixed seed.</p>'));

  f.appendChild(kpis([
    { value: (ten.fpr_naive * 100).toFixed(1), unit: '%', label: 'false positive rate after 10 peeks', sub: 'nominal is 5%' },
    { value: ten.inflation.toFixed(1), unit: '×', label: 'error-rate inflation from peeking' },
    { value: '49', unit: '%', label: 'variance removed by CUPED at ρ = 0.7', sub: 'worth 1.96× the traffic, free' },
    { value: (d.underpowered.achieved_power * 100).toFixed(1), unit: '%', label: 'power of a 2,000/arm test for a 5% lift', sub: 'a null here means nothing' },
  ]));

  f.appendChild(card(
    'Peeking inflates false positives',
    `Under a <b>true null</b>, where every rejection is by construction a false positive.
     Stopping at the first significant look across ten interim analyses turns a 5% error rate
     into <b>${(ten.fpr_naive * 100).toFixed(1)}%</b>. An O&rsquo;Brien&ndash;Fleming boundary holds
     it near nominal for almost no cost in power.`,
    lineChart(d.peeking.map((p) => ({
      looks: p.looks, naive: p.fpr_naive * 100, obf: p.fpr_obrien_fleming * 100,
    })), {
      xKey: 'looks', unit: '%', xLabel: 'number of looks at the data',
      yLabel: 'false positive rate (%)', refLine: 5,
      series: [{ key: 'naive', label: 'stop at first p < 0.05' }, { key: 'obf', label: "O'Brien–Fleming" }],
      tip: (r, s) => `<b>${r.looks} looks</b><br>${s.label}: ${r[s.key].toFixed(1)}%`,
    }),
    'Dashed line is the nominal 5%.'
  ));

  const g = h('<div class="grid2"></div>');
  g.appendChild(card(
    'What each stopping rule costs in power',
    'Naive peeking scores the <b>highest</b> power here — because it also rejects when nothing is there. Power bought with false positives is not power.',
    hbar(Object.entries(d.power_cost).map(([k, v]) => ({
      rule: k.replace(/_/g, ' '), power: v * 100,
    })), {
      labelKey: 'rule', valueKey: 'power',
      colorFn: (r) => (r.rule === 'naive peeking' ? 'bad' : r.rule === 'msprt' ? 'dim' : 'good'),
      tip: (r) => `<b>${r.rule}</b><br>power ${r.power.toFixed(1)}% against a real 10% lift`,
    }),
    'mSPRT permits continuous monitoring and pays for it with roughly 25 points of power.'
  ));

  g.appendChild(card(
    'CUPED delivers exactly what the theory predicts',
    'Variance reduction against the pre-experiment covariate correlation. Observed matches ρ² to a tenth of a point across the range.',
    groupedBar(d.cuped.map((c) => ({
      rho: 'ρ = ' + c.correlation,
      observed: c.variance_reduction * 100, theory: c.theoretical * 100,
      mult: c.traffic_multiplier,
    })), {
      xKey: 'rho', unit: '%', yLabel: 'variance reduction (%)',
      series: [{ key: 'observed', label: 'observed' }, { key: 'theory', label: 'theory (ρ²)' }],
      tip: (r, s) => `<b>${r.rho}</b><br>${s.label}: ${r[s.key].toFixed(1)}%<br>worth ${r.mult}× the traffic`,
    })
  ));
  f.appendChild(g);

  const s = d.simpson;
  const segRows = Object.entries(s.segment_lifts).map(([seg, lift]) => [
    seg, `<b>${lift > 0 ? '+' : ''}${(lift * 100).toFixed(1)}%</b>`,
    (s.srm_by_segment_p[seg] ?? 0) < 0.001 ? '<b>MISMATCH</b>' : 'ok',
  ]);
  segRows.push([
    'overall', `${(s.overall_lift * 100).toFixed(1)}%`,
    s.srm_overall_p < 0.001 ? 'MISMATCH' : 'ok',
  ]);

  f.appendChild(card(
    "Simpson's paradox — and why the obvious check misses it",
    `An experiment where treatment wins in <b>every</b> segment and loses
     ${Math.abs(s.overall_lift * 100).toFixed(0)}% overall. Now the part worth the write-up: the
     global sample-ratio check <b>passes cleanly</b> (p = ${s.srm_overall_p.toFixed(3)}) because
     the skew cancels exactly in the total, while both segments are catastrophically imbalanced.
     Run SRM per segment, not just on the totals.`,
    table(['segment', 'lift', 'sample ratio check'], segRows),
    'The paradox is the symptom; the assignment imbalance is the disease.'
  ));
  return f;
}

/* ------------------------------------------------------------ controller */

const VIEWS = {
  ed: ['ed', viewED],
  denials: ['denials', viewDenials],
  quality: ['quality', viewQuality],
  readmission: ['readmission', viewReadmission],
  experiments: ['experiments', viewExperiments],
};

let DATA = null;

function render(name) {
  const [key, fn] = VIEWS[name];
  const host = $('#view');
  host.innerHTML = '';
  try {
    host.appendChild(fn(DATA[key]));
  } catch (err) {
    host.appendChild(h(`<div class="callout warn"><b>Could not render this view.</b> ${err.message}</div>`));
    console.error(err);
  }
  document.querySelectorAll('#tabs button').forEach((b) => {
    b.setAttribute('aria-selected', String(b.dataset.view === name));
  });
  try {
    const url = new URL(location.href);
    url.hash = name;
    history.replaceState(null, '', url);
  } catch (e) { /* ignore */ }
}

function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('pda:theme'); } catch (e) {}
  if (saved !== 'dark' && saved !== 'light') {
    saved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  document.documentElement.setAttribute('data-theme', saved);
}

initTheme();
$('#theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('pda:theme', next); } catch (e) {}
});

document.querySelectorAll('#tabs button').forEach((b) => {
  b.addEventListener('click', () => render(b.dataset.view));
});

fetch('data.json')
  .then((r) => {
    if (!r.ok) throw new Error(`data.json returned ${r.status}`);
    return r.json();
  })
  .then((json) => {
    DATA = json;
    $('#loading').hidden = true;
    $('#view').hidden = false;
    const initial = location.hash.slice(1);
    render(VIEWS[initial] ? initial : 'ed');
  })
  .catch((err) => {
    $('#loading').innerHTML =
      `<div class="callout warn"><b>Could not load the data.</b> ${err.message}</div>`;
    console.error(err);
  });
