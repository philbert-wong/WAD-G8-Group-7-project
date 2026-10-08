<script setup>
// Price trend (feature 6) and lease decay (feature 7) dashboard, built with Highcharts Dashboards.
// The layout is a normal Bootstrap grid; Dashboards renders a component into each cell by id.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Highcharts from 'highcharts';
import 'highcharts/modules/accessibility';
import Dashboards from '@highcharts/dashboards';
import '@highcharts/dashboards/css/dashboards.css';
import { compactMoney, money, monthLabel, signedMoney, titleCase } from '../services/format.js';

Dashboards.HighchartsPlugin.custom.connectHighcharts(Highcharts);
Dashboards.PluginHandler.addPlugin(Dashboards.HighchartsPlugin);

const props = defineProps({
  block: { type: Object, required: true },
  flatType: { type: String, required: true },
  trend: { type: Object, default: null }, // GET /api/analysis/price-trend
  leaseDecay: { type: Object, default: null }, // GET /api/analysis/lease-decay
});

// Reference categorical palette, slots 1-3 (validated colour-blind safe as a set).
const SERIES = { median: '#2a78d6', fitted: '#eb6834' };
const INK = { primary: '#0b0b0b', secondary: '#52514e', grid: '#e6e5e1' };

const root = ref(null);
const error = ref('');
let board = null; // kept out of Vue reactivity on purpose

const toUtc = (year, monthIndex) => Date.UTC(year, monthIndex, 15);
const quarterToUtc = (label) => {
  const [year, q] = label.split(' Q').map(Number);
  return toUtc(year, (q - 1) * 3 + 1);
};

const baseChart = {
  chart: { backgroundColor: 'transparent', style: { fontFamily: 'inherit' }, spacing: [12, 8, 8, 8], zooming: { type: 'x' } },
  credits: { enabled: false },
  title: { text: undefined },
  xAxis: { lineColor: INK.grid, tickColor: INK.grid, labels: { style: { color: INK.secondary } } },
  yAxis: { gridLineColor: INK.grid, title: { style: { color: INK.secondary } }, labels: { style: { color: INK.secondary } } },
  legend: { itemStyle: { color: INK.primary, fontWeight: '500' } },
  tooltip: { borderRadius: 8, borderWidth: 0, shadow: true, style: { color: INK.primary } },
};

function stats() {
  return props.block.flatTypes.find((f) => f.flatType === props.flatType);
}

function leaseEffectForBlock() {
  const curve = props.leaseDecay?.curve ?? [];
  if (!curve.length) return null;
  const target = Math.floor(props.block.remainingLease);
  return curve.reduce((best, p) => (Math.abs(p.remainingLease - target) < Math.abs(best.remainingLease - target) ? p : best));
}

function kpiComponents() {
  const s = stats();
  const model = props.trend?.model;
  const decay = props.leaseDecay;
  const blockEffect = leaseEffectForBlock();
  return [
    {
      type: 'KPI',
      renderTo: 'kpi-price',
      title: 'Recent median price',
      value: money(s.medianPrice),
      subtitle: s.priceBasis === 'last12m'
        ? `${s.salesLast12m} sale${s.salesLast12m === 1 ? '' : 's'} in the last 12 months`
        : `Older price · last sold ${monthLabel(s.lastSaleMonth)}`,
    },
    {
      type: 'KPI',
      renderTo: 'kpi-trend',
      title: `${titleCase(props.block.town)} market trend`,
      value: model ? `${signedMoney(model.pricePerYear)}/yr` : 'n/a',
      subtitle: model
        ? `${model.pricePerYearPct.toFixed(1)}% a year · R² ${model.r2.toFixed(2)} · ${model.n.toLocaleString('en-SG')} sales`
        : 'Not enough sales to fit a trend',
    },
    {
      type: 'KPI',
      renderTo: 'kpi-lease-year',
      title: 'Value of one lease year',
      value: decay ? `${money(decay.leaseCoefPsm)}/m²` : 'n/a',
      subtitle: decay
        ? `≈ ${money(decay.leaseCoefPsm * s.medianFloorArea)} for a ${s.medianFloorArea} m² flat`
        : 'Lease model not fitted yet',
    },
    {
      type: 'KPI',
      renderTo: 'kpi-lease-block',
      title: `Lease discount at ${Math.floor(props.block.remainingLease)} years`,
      value: blockEffect ? `${signedMoney(blockEffect.effectPsm)}/m²` : 'n/a',
      subtitle: blockEffect ? `vs a ${decay.referenceLeaseYear}-year lease, same town, size and storey` : '',
    },
  ];
}

function trendChart() {
  const series = [
    {
      type: 'line',
      name: 'Quarterly median (town)',
      color: SERIES.median,
      lineWidth: 2,
      marker: { radius: 3, symbol: 'circle' },
      data: (props.trend?.quarterly ?? []).map((q) => ({ x: quarterToUtc(q.quarter), y: q.median, n: q.n })),
      tooltip: { pointFormatter() { return `<span style="color:${this.color}">●</span> Median: <b>${money(this.y)}</b> (${this.n} sales)<br/>`; } },
    },
  ];
  if (props.trend?.fitted?.length) {
    series.push({
      type: 'line',
      name: 'Regression trend',
      color: SERIES.fitted,
      lineWidth: 2,
      marker: { enabled: false },
      enableMouseTracking: true,
      data: props.trend.fitted.map((f) => ({ x: quarterToUtc(f.quarter), y: Math.round(f.price) })),
      tooltip: { pointFormatter() { return `<span style="color:${this.color}">●</span> Trend: <b>${money(this.y)}</b><br/>`; } },
    });
  }
  return {
    type: 'Highcharts',
    renderTo: 'chart-trend',
    chartOptions: {
      ...baseChart,
      chart: { ...baseChart.chart, height: 340 },
      xAxis: { ...baseChart.xAxis, type: 'datetime', crosshair: { color: INK.grid } },
      yAxis: {
        ...baseChart.yAxis,
        title: { ...baseChart.yAxis.title, text: 'Resale price (S$)' },
        labels: { ...baseChart.yAxis.labels, formatter() { return compactMoney(this.value); } },
      },
      tooltip: { ...baseChart.tooltip, shared: false, xDateFormat: '%b %Y' },
      series,
    },
  };
}

function leaseChart() {
  const decay = props.leaseDecay;
  const here = leaseEffectForBlock();
  return {
    type: 'Highcharts',
    renderTo: 'chart-lease',
    chartOptions: {
      ...baseChart,
      chart: { ...baseChart.chart, height: 340 },
      legend: { enabled: false },
      xAxis: {
        ...baseChart.xAxis,
        title: { text: 'Remaining lease (years)', style: { color: INK.secondary } },
        crosshair: { color: INK.grid },
        plotLines: here
          ? [{
              value: here.remainingLease,
              color: INK.secondary,
              width: 1,
              zIndex: 3,
              label: { text: `Blk ${props.block.block}`, rotation: 0, y: 14, x: 6, style: { color: INK.primary, fontWeight: '600' } },
            }]
          : [],
      },
      yAxis: {
        ...baseChart.yAxis,
        title: { ...baseChart.yAxis.title, text: `S$/m² vs a ${decay?.referenceLeaseYear ?? 99}-year lease` },
        labels: { ...baseChart.yAxis.labels, formatter() { return `${this.value < 0 ? '-' : ''}$${Math.abs(this.value).toLocaleString('en-SG')}`; } },
        plotLines: [{ value: 0, color: INK.secondary, width: 1 }],
      },
      tooltip: {
        ...baseChart.tooltip,
        headerFormat: '<b>{point.x} years left</b><br/>',
        pointFormatter() { return `${signedMoney(this.y)}/m² (${this.n.toLocaleString('en-SG')} sales)`; },
      },
      series: [{
        type: 'line',
        name: 'Effect on price per m²',
        color: SERIES.median,
        lineWidth: 2,
        marker: { radius: 3, symbol: 'circle' },
        data: (decay?.curve ?? []).map((p) => ({
          x: p.remainingLease,
          y: Math.round(p.effectPsm),
          n: p.n,
          ...(here && p.remainingLease === here.remainingLease
            ? { marker: { enabled: true, radius: 7, fillColor: SERIES.fitted, lineColor: '#ffffff', lineWidth: 2 } }
            : {}),
        })),
      }],
    },
  };
}

async function render() {
  board?.destroy();
  board = null;
  error.value = '';
  try {
    board = await Dashboards.board(root.value, {
      gui: { enabled: false },
      components: [...kpiComponents(), trendChart(), ...(props.leaseDecay ? [leaseChart()] : [])],
    }, true);
  } catch (err) {
    console.error(err);
    error.value = 'The charts could not be drawn.';
  }
}

onMounted(render);
watch(() => [props.flatType, props.trend, props.leaseDecay, props.block], render, { flush: 'post' });
onBeforeUnmount(() => board?.destroy());
</script>

<template>
  <div v-if="error" class="alert alert-warning">{{ error }}</div>
  <div ref="root" class="price-dashboard highcharts-light" data-cy="price-dashboard">
    <div class="row g-3">
      <div class="col-6 col-xl-3"><div id="kpi-price" class="dash-cell dash-kpi" data-cy="kpi-price"></div></div>
      <div class="col-6 col-xl-3"><div id="kpi-trend" class="dash-cell dash-kpi" data-cy="kpi-trend"></div></div>
      <div class="col-6 col-xl-3"><div id="kpi-lease-year" class="dash-cell dash-kpi" data-cy="kpi-lease-year"></div></div>
      <div class="col-6 col-xl-3"><div id="kpi-lease-block" class="dash-cell dash-kpi" data-cy="kpi-lease-block"></div></div>

      <div class="col-lg-7">
        <section class="dash-cell h-100" aria-labelledby="trend-title">
          <h2 id="trend-title" class="h6 mb-0">Price trend · {{ titleCase(block.town) }}, {{ flatType.toLowerCase() }}</h2>
          <p class="small text-body-secondary mb-0">
            Multiple linear regression on sale date, remaining lease, floor area and storey.
            The trend line holds the other factors at their town averages. Drag across the chart to zoom.
          </p>
          <div id="chart-trend" data-cy="chart-trend"></div>
        </section>
      </div>
      <div class="col-lg-5">
        <section class="dash-cell h-100" aria-labelledby="lease-title">
          <h2 id="lease-title" class="h6 mb-0">Lease decay · island-wide</h2>
          <p class="small text-body-secondary mb-0">
            Estimated effect of each remaining lease year on price per m², controlling for town, flat type, size, storey and sale date.
          </p>
          <div v-if="leaseDecay" id="chart-lease" data-cy="chart-lease"></div>
          <p v-else class="text-body-secondary small mt-3">The lease decay model has not been fitted yet. Run <code>npm run fit</code>.</p>
        </section>
      </div>
    </div>
  </div>
</template>
