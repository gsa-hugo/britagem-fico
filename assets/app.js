/* Painel de Operação e Manutenção · Britagem de Agregados · GSA Service
   SPA estática: lê window.DADOS (gerado pela área de atualização) e calcula todas as análises no navegador. */
(function () {
  'use strict';

  // ---------- dados (com modo prévia vindo da área de atualização) ----------
  var PREVIEW = false;
  var D = window.DADOS;
  try {
    if (/[?&]previa=1/.test(location.search)) {
      var raw = localStorage.getItem('gsa_dados_previa');
      if (raw) { D = JSON.parse(raw); PREVIEW = true; }
    }
  } catch (e) { /* armazenamento indisponível: segue com os dados publicados */ }
  var view = document.getElementById('view');
  if (!D) { view.innerHTML = '<div class="empty">Arquivo de dados não encontrado (dados/dados.js).</div>'; return; }
  var P = D.params, EQ = window.EQUIP;

  // ---------- paleta (validada · ver metodologia) ----------
  var C = {
    lastro: '#2a78d6', meta: '#5c5c5b', brand: '#cb5434', ink: '#2e2e2d', grid: '#ecebe7', axis: '#8a8985',
    oper: '#1baf7a', gsa: '#cb5434', vale: '#2a78d6',
    cls: { 'Manutenção corretiva': '#e34948', 'Manutenção preventiva': '#2a78d6', 'Processo / operação': '#eda100', 'Externa / alimentação': '#6250d6', 'Rotina operacional': '#a3a29d' },
    prod: { 'Lastro': '#2a78d6', 'Bica Corrida': '#eb6834', 'Pó de Brita': '#1baf7a', 'Brita 1': '#eda100', 'Brita 0': '#e87ba4', 'Brita 2': '#008300', 'Rachão': '#6250d6', 'Pilha Pulmão': '#a3a29d' },
    abc: { A: '#1c5cab', B: '#5598e7', C: '#b7d3f6' }
  };
  var CLASSES = ['Manutenção corretiva', 'Manutenção preventiva', 'Processo / operação', 'Externa / alimentação', 'Rotina operacional'];
  var PRODS = [['Lastro', 'las'], ['Bica Corrida', 'bic'], ['Pó de Brita', 'po'], ['Brita 1', 'b1'], ['Brita 0', 'b0'], ['Brita 2', 'b2'], ['Rachão', 'rac']];

  // ---------- utilidades ----------
  var nf = function (d) { return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  var F0 = nf(0), F1 = nf(1), F2 = nf(2);
  function f0(v) { return isFinite(v) ? F0.format(v) : '–'; }
  function f1(v) { return isFinite(v) ? F1.format(v) : '–'; }
  function f2(v) { return isFinite(v) ? F2.format(v) : '–'; }
  function pc(v, d) { return isFinite(v) ? nf(d === undefined ? 1 : d).format(v * 100) + '%' : '–'; }
  function hm(h) { if (!isFinite(h)) return '–'; var m = Math.round(h * 60); return Math.floor(m / 60) + 'h' + String(m % 60).padStart(2, '0'); }
  function dBR(iso) { if (!iso) return '–'; var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function dBRs(iso) { if (!iso) return ''; var p = iso.split('-'); return p[2] + '/' + p[1]; }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sum(a, f) { var s = 0; for (var i = 0; i < a.length; i++) s += (f ? f(a[i]) : a[i]) || 0; return s; }
  function by(a, f) { var m = {}; a.forEach(function (x) { var k = f(x); (m[k] = m[k] || []).push(x); }); return m; }
  function div(a, b) { return b ? a / b : NaN; }
  function addDays(iso, n) { var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function diffDays(a, b) { return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000); }
  function monday(iso) { var d = new Date(iso + 'T00:00:00Z'); var w = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - w); return d.toISOString().slice(0, 10); }
  function ratioTag(v, meta, inverse) {
    if (!isFinite(v) || !meta) return '';
    var r = v / meta; if (inverse) r = meta / v;
    var cls = r >= 1 ? 'good' : r >= 0.85 ? 'warn' : 'bad';
    var ico = r >= 1 ? '▲' : '▼';
    return '<span class="tag ' + cls + '">' + ico + ' ' + pc(v / meta, 0) + ' da meta</span>';
  }
  function etapaNome(e) { return e === 'P' ? 'Primária' : e === 'S' ? 'Secundária' : 'Planta'; }
  function svg(path) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>'; }

  // ---------- recortes base ----------
  var DIAS = D.dias.slice().sort(function (a, b) { return a.d < b.d ? -1 : 1; });
  var PRIMEIRA = D.meta.primeiraData, ULTIMA = D.meta.ultimaData;
  var DIAS_OP = DIAS.filter(function (x) { return x.d >= PRIMEIRA && x.d <= ULTIMA; });
  var EV = D.eventos;
  EV.forEach(function (e, i) { e.id = i; e.stop = !e.op; e.falha = e.stop && e.cls === 'Manutenção corretiva' && !/^sim/i.test(e.cont); e.manut = e.stop && /^Manutenção (corretiva|preventiva)/.test(e.cls); });

  // ---------- estado ----------
  var S = { ini: PRIMEIRA, fim: ULTIMA, etapa: 'T' };
  try { var sv = JSON.parse(sessionStorage.getItem('gsa_periodo') || 'null'); if (sv && sv.ini >= PRIMEIRA && sv.fim <= ULTIMA) { S.ini = sv.ini; S.fim = sv.fim; } } catch (e) { }
  function salvaPeriodo() { try { sessionStorage.setItem('gsa_periodo', JSON.stringify({ ini: S.ini, fim: S.fim })); } catch (e) { } }

  function diasPeriodo() { return DIAS_OP.filter(function (x) { return x.d >= S.ini && x.d <= S.fim; }); }
  function evPeriodo(et) { return EV.filter(function (e) { return e.d >= S.ini && e.d <= S.fim && (!et || et === 'T' || e.e === et); }); }

  // agregado de um conjunto de dias da Base Diária
  function agrega(ds) {
    var a = { n: 0 };
    var keys = ['hapP', 'hopP', 'hapS', 'hopS', 'sob', 'hop', 'hmP', 'fP', 'hfP', 'hmS', 'fS', 'hfS', 'P_cor', 'P_pre', 'P_pro', 'P_ext', 'P_rot', 'S_cor', 'S_pre', 'S_pro', 'S_ext', 'S_rot', 'P_gsa', 'P_vale', 'S_gsa', 'S_vale', 'pul', 'bic', 'rac', 'las', 'b0', 'b1', 'b2', 'po', 'ali'];
    keys.forEach(function (k) { a[k] = 0; });
    a.exc = 0; a.excH = 0;
    ds.forEach(function (x) {
      if (x.apt) a.n++;
      keys.forEach(function (k) { a[k] += x[k] || 0; });
      if ((x.exc || 0) > 0.0001) { a.exc++; a.excH += x.exc; }
    });
    a.lasDia = div(a.las, a.n); a.hDia = div(a.hop, a.n);
    a.taxaP = div(a.ali, a.hopP); a.aprov = div(a.las, a.ali); a.thLas = div(a.las, a.hopS); a.sinc = div(a.sob, a.hop);
    a.cobP = div(a.hopP, a.hop); a.aliHp = div(a.ali, a.hop);
    a.metaLas = P.metaLastroDia * a.n;
    a.parP = a.hapP - a.hopP; a.parS = a.hapS - a.hopS;
    a.gsa = a.P_gsa + a.S_gsa; a.vale = a.P_vale + a.S_vale;
    return a;
  }
  // decomposição multiplicativa exata: lastro/dia = h/dia × cobertura primária × taxa primária × aproveitamento
  function decompoe(a) {
    var f = [
      { k: 'Horas de operação/dia', u: 'h/dia', real: a.hDia, meta: P.metaHoras, fmt: f1 },
      { k: 'Cobertura da primária', u: '%', real: a.cobP, meta: 1, fmt: function (v) { return pc(v); } },
      { k: 'Taxa da primária', u: 't/h', real: a.taxaP, meta: P.capacidadeNominal, fmt: f0 },
      { k: 'Aproveitamento', u: '%', real: a.aprov, meta: P.aproveitamentoMeta, fmt: function (v) { return pc(v); } }
    ];
    var lnTot = Math.log(div(a.lasDia, P.metaLastroDia));
    f.forEach(function (x) { x.ating = x.real / x.meta; x.ln = Math.log(x.ating); x.peso = lnTot ? x.ln / lnTot : 0; });
    return { fatores: f, lnTot: lnTot };
  }

  // ---------- gráficos ----------
  var charts = [];
  function chart(el, opt) {
    var c = echarts.init(el, null, { renderer: 'canvas' });
    var base = {
      textStyle: { fontFamily: getComputedStyle(document.body).fontFamily, color: C.ink },
      grid: { left: 8, right: 14, top: 34, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', confine: true, backgroundColor: '#fff', borderColor: '#e4e3df', textStyle: { color: C.ink, fontSize: 12 }, axisPointer: { type: 'line', lineStyle: { color: '#b9b8b3' } } },
      legend: { top: 0, left: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 8, textStyle: { color: '#5c5c5b', fontSize: 12 } },
      animationDuration: 400
    };
    c.setOption(Object.assign(base, opt));
    charts.push(c);
    return c;
  }
  function axCat(data, extra) { return Object.assign({ type: 'category', data: data, axisLine: { lineStyle: { color: '#cfcec9' } }, axisTick: { show: false }, axisLabel: { color: C.axis, fontSize: 11 } }, extra || {}); }
  function axVal(extra) { return Object.assign({ type: 'value', splitLine: { lineStyle: { color: C.grid } }, axisLabel: { color: C.axis, fontSize: 11, formatter: function (v) { return F0.format(v); } } }, extra || {}); }
  function barS(name, data, color, extra) { return Object.assign({ name: name, type: 'bar', data: data, itemStyle: { color: color, borderRadius: [4, 4, 0, 0] }, barMaxWidth: 26, emphasis: { focus: 'series' } }, extra || {}); }
  function lineS(name, data, color, extra) { return Object.assign({ name: name, type: 'line', data: data, symbol: 'none', lineStyle: { width: 2, color: color }, itemStyle: { color: color } }, extra || {}); }
  function metaS(name, data, color) { return { name: name, type: 'line', data: data, symbol: 'none', step: false, lineStyle: { width: 1.5, type: 'dashed', color: color || C.meta }, itemStyle: { color: color || C.meta } }; }
  function ttFmt(unit, dec) {
    return function (ps) {
      var s = '<b>' + ps[0].axisValueLabel + '</b>';
      ps.forEach(function (p) { if (p.value === null || p.value === undefined || p.value === '-') return; s += '<br>' + p.marker + p.seriesName + ': <b>' + nf(dec || 0).format(+p.value) + '</b> ' + (unit || ''); });
      return s;
    };
  }
  window.addEventListener('resize', function () { charts.forEach(function (c) { c.resize(); }); });

  // ---------- tabela genérica ----------
  function tabela(host, cols, rows, opt) {
    opt = opt || {};
    var st = { sort: opt.sort || null, dir: opt.dir || -1, q: '', page: 0, size: opt.size || 25 };
    host.innerHTML = (opt.search ? '<div class="tbl-tools"><input type="search" placeholder="Buscar…" style="min-width:220px">' + (opt.csv ? '<button class="btn" data-csv>' + svg('<path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3"/>') + 'Exportar CSV</button>' : '') + '<span class="sub" data-cnt style="color:var(--ink-3);font-size:12px"></span></div>' : '') +
      '<div class="tbl-wrap"><table class="t"><thead><tr></tr></thead><tbody></tbody></table></div><div class="pager"></div>';
    var thead = host.querySelector('thead tr'), tbody = host.querySelector('tbody'), pager = host.querySelector('.pager');
    cols.forEach(function (c, i) {
      var th = document.createElement('th'); th.className = c.n ? 'n' : ''; th.innerHTML = esc(c.t) + '<span class="ar"></span>';
      th.onclick = function () { if (st.sort === i) st.dir *= -1; else { st.sort = i; st.dir = c.n ? -1 : 1; } st.page = 0; draw(); };
      thead.appendChild(th);
    });
    var inp = host.querySelector('input[type=search]');
    if (inp) inp.oninput = function () { st.q = inp.value.toLowerCase(); st.page = 0; draw(); };
    var csvB = host.querySelector('[data-csv]');
    if (csvB) csvB.onclick = function () {
      var lines = [cols.map(function (c) { return c.t; }).join(';')].concat(filt().map(function (r) { return cols.map(function (c) { var v = c.raw ? c.raw(r) : c.v(r); return '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"'; }).join(';'); }));
      var blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (opt.csv || 'tabela') + '.csv'; a.click();
    };
    function filt() {
      var r = rows;
      if (st.q) r = r.filter(function (x) { return cols.some(function (c) { return String(c.raw ? c.raw(x) : c.v(x)).toLowerCase().indexOf(st.q) >= 0; }); });
      if (st.sort !== null) { var c = cols[st.sort]; var g = c.s || c.raw || c.v; r = r.slice().sort(function (a, b) { var x = g(a), y = g(b); return (x > y ? 1 : x < y ? -1 : 0) * st.dir; }); }
      return r;
    }
    function draw() {
      var r = filt(); var pages = Math.max(1, Math.ceil(r.length / st.size)); if (st.page >= pages) st.page = pages - 1;
      var sl = opt.noPage ? r : r.slice(st.page * st.size, (st.page + 1) * st.size);
      tbody.innerHTML = sl.length ? sl.map(function (x) {
        return '<tr' + (opt.onRow ? ' class="clk" data-i="' + rows.indexOf(x) + '"' : '') + '>' + cols.map(function (c) { return '<td class="' + (c.n ? 'n' : '') + (c.wrap ? ' wrap' : '') + '">' + (c.h ? c.h(x) : esc(c.v(x))) + '</td>'; }).join('') + '</tr>';
      }).join('') : '<tr><td colspan="' + cols.length + '" class="empty">Sem registros para o filtro.</td></tr>';
      thead.querySelectorAll('th').forEach(function (th, i) { th.querySelector('.ar').textContent = st.sort === i ? (st.dir > 0 ? '▲' : '▼') : ''; });
      var cnt = host.querySelector('[data-cnt]'); if (cnt) cnt.textContent = r.length + ' registro(s)';
      if (opt.onRow) tbody.querySelectorAll('tr.clk').forEach(function (tr) { tr.onclick = function () { opt.onRow(rows[+tr.dataset.i]); }; });
      pager.innerHTML = opt.noPage || pages <= 1 ? '' : '<button class="btn" data-p="-1">‹</button><span>Página ' + (st.page + 1) + ' de ' + pages + '</span><button class="btn" data-p="1">›</button>';
      pager.querySelectorAll('button').forEach(function (b) { b.onclick = function () { st.page = Math.min(pages - 1, Math.max(0, st.page + +b.dataset.p)); draw(); }; });
    }
    draw();
  }

  // ---------- componentes ----------
  function kpi(l, v, unit, meta, barPct, barColor) {
    return '<div class="kpi"><div class="l">' + l + '</div><div class="v">' + v + (unit ? '<small>' + unit + '</small>' : '') + '</div>' +
      (meta ? '<div class="m">' + meta + '</div>' : '') +
      (barPct !== undefined && isFinite(barPct) ? '<div class="bar"><i style="width:' + Math.max(0, Math.min(100, barPct * 100)) + '%;background:' + (barColor || C.ink) + '"></i></div>' : '') + '</div>';
  }
  function card(id, title, hint, cls, tools) { return '<div class="card"><div class="head"><div><h3>' + title + '</h3>' + (hint ? '<div class="hint">' + hint + '</div>' : '') + '</div>' + (tools || '') + '</div><div class="chart ' + (cls || '') + '" id="' + id + '"></div></div>'; }
  function seg(name, opts, cur) { return '<div class="seg" data-seg="' + name + '">' + opts.map(function (o) { return '<button data-v="' + o[0] + '" class="' + (o[0] === cur ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
  function bindSeg(root, name, fn) { var el = root.querySelector('[data-seg="' + name + '"]'); if (!el) return; el.querySelectorAll('button').forEach(function (b) { b.onclick = function () { el.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); fn(b.dataset.v); }; }); }
  function $(id) { return document.getElementById(id); }

  // ---------- navegação ----------
  var ICONS = {
    visao: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
    boletim: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    producao: '<path d="M3 20h18M6 16l4-6 4 3 5-8"/>',
    paradas: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    equip: '<path d="M4 17l5-10 4 6 3-4 4 8z"/><path d="M3 21h18"/>',
    semanal: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    eventos: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    metodo: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>'
  };
  var ROTAS = [
    ['grp', 'Operação'], ['visao', 'Visão Geral', 'Desempenho do período contra o orçamento'], ['boletim', 'Boletim Diário', 'Linha do tempo e registros do dia operacional'],
    ['producao', 'Produção', 'Produtos, aproveitamento e curva S contratual'], ['semanal', 'Evolução Semanal', 'Indicadores consolidados por semana'],
    ['grp', 'Manutenção'], ['paradas', 'Paradas e Disponibilidade', 'Pareto, classes, responsabilidade e confiabilidade'], ['equip', 'Equipamentos', 'Indicadores e ficha técnica por equipamento'],
    ['grp', 'Registros'], ['eventos', 'Registro de Eventos', 'Todos os apontamentos de operação e parada'], ['metodo', 'Metodologia', 'Premissas, definições e fonte dos dados']
  ];
  function navHtml(cur) {
    return ROTAS.map(function (r) {
      if (r[0] === 'grp') return '<div class="grp">' + r[1] + '</div>';
      var on = cur === r[0] || (cur === 'equipamento' && r[0] === 'equip');
      return '<a href="#/' + r[0] + '" class="' + (on ? 'on' : '') + '">' + svg(ICONS[r[0]]) + r[1] + '</a>';
    }).join('');
  }

  function periodoHtml(show) {
    if (!show) return '';
    return '<label for="pIni">Período</label><input type="date" id="pIni" min="' + PRIMEIRA + '" max="' + ULTIMA + '" value="' + S.ini + '"><span style="color:var(--ink-3)">a</span><input type="date" id="pFim" min="' + PRIMEIRA + '" max="' + ULTIMA + '" value="' + S.fim + '">' +
      '<div class="seg" id="pPreset"><button data-p="7">7 d</button><button data-p="30">30 d</button><button data-p="mes">Mês</button><button data-p="tudo">Tudo</button></div>';
  }
  function bindPeriodo() {
    var a = $('pIni'), b = $('pFim'); if (!a) return;
    function apply() { if (a.value && b.value && a.value <= b.value) { S.ini = a.value; S.fim = b.value; salvaPeriodo(); route(); } }
    a.onchange = apply; b.onchange = apply;
    document.querySelectorAll('#pPreset button').forEach(function (bt) {
      var p = bt.dataset.p;
      var tgt = p === 'tudo' ? [PRIMEIRA, ULTIMA] : p === 'mes' ? [ULTIMA.slice(0, 8) + '01', ULTIMA] : [addDays(ULTIMA, -(+p) + 1), ULTIMA];
      if (tgt[0] < PRIMEIRA) tgt[0] = PRIMEIRA;
      if (S.ini === tgt[0] && S.fim === tgt[1]) bt.classList.add('on');
      bt.onclick = function () { S.ini = tgt[0]; S.fim = tgt[1]; salvaPeriodo(); route(); };
    });
  }

  function route() {
    charts.forEach(function (c) { c.dispose(); }); charts = [];
    var h = location.hash.replace(/^#\/?/, '').split('/');
    var pg = h[0] || 'visao', arg = h[1] ? decodeURIComponent(h[1]) : null;
    var def = ROTAS.filter(function (r) { return r[0] === pg; })[0];
    if (!def && pg !== 'equipamento') { pg = 'visao'; def = ROTAS[1]; }
    $('nav').innerHTML = navHtml(pg);
    $('app').classList.remove('open');
    var semPeriodo = pg === 'boletim' || pg === 'metodo';
    $('periodo').innerHTML = periodoHtml(!semPeriodo);
    bindPeriodo();
    $('pgTitle').textContent = def ? def[1] : 'Equipamento ' + arg;
    $('pgSub').textContent = semPeriodo ? (def ? def[2] : '') : (def ? def[2] + ' · ' : '') + dBR(S.ini) + ' a ' + dBR(S.fim);
    view.innerHTML = PREVIEW ? '<div class="note"><b>Modo prévia.</b> Você está vendo os dados carregados na área de atualização, ainda não publicados.</div>' : '';
    var holder = document.createElement('div'); view.appendChild(holder);
    window.scrollTo(0, 0);
    ({ visao: pgVisao, boletim: pgBoletim, producao: pgProducao, semanal: pgSemanal, paradas: pgParadas, equip: pgEquip, equipamento: pgEquipamento, eventos: pgEventos, metodo: pgMetodo })[pg](holder, arg);
  }
  window.addEventListener('hashchange', route);

  // =====================================================================
  // VISÃO GERAL
  // =====================================================================
  function pgVisao(root) {
    var ds = diasPeriodo(), a = agrega(ds), dc = decompoe(a);
    var acum = DIAS.filter(function (x) { return x.d === S.fim; })[0] || {};
    var ader = div(acum.lasAc, acum.baseAc);
    // leitura executiva automática
    var piores = dc.fatores.filter(function (f) { return f.peso > 0.05; }).sort(function (x, y) { return y.peso - x.peso; });
    var top = ds.filter(function (x) { return x.apt; }).sort(function (x, y) { return y.las - x.las; })[0];
    var evp = evPeriodo('T').filter(function (e) { return e.stop; });
    var porMot = by(evp, function (e) { return e.mot; }); var motTop = Object.keys(porMot).map(function (k) { return [k, sum(porMot[k], function (e) { return e.h; })]; }).sort(function (x, y) { return y[1] - x[1]; })[0];
    var totPar = sum(evp, function (e) { return e.h; });
    var insights = [
      'Lastro de <b>' + f0(a.las) + ' t</b> em ' + a.n + ' dias com apontamento, média de <b>' + f0(a.lasDia) + ' t/dia</b> (' + pc(div(a.lasDia, P.metaLastroDia), 0) + ' da meta de ' + f0(P.metaLastroDia) + ' t/dia).',
      piores.length ? 'O déficit decorre principalmente de <b>' + piores.map(function (f) { return f.k.toLowerCase().replace(/ \(.*\)/, '') + ' (' + pc(f.peso, 0) + ')'; }).join(', ') + '</b>, conforme a decomposição abaixo.' : 'Todos os fatores de produção estão na meta ou acima dela.',
      motTop ? 'Maior causa de parada no período: <b>' + esc(motTop[0]) + '</b>, com ' + f1(motTop[1]) + ' h (' + pc(div(motTop[1], totPar), 0) + ' das horas paradas das duas etapas).' : '',
      'Paradas com responsabilidade imediata da Contratante (VALE): <b>' + f1(a.vale) + ' h</b> (' + pc(div(a.vale, a.vale + a.gsa), 0) + ' das horas paradas classificadas).',
      top ? 'Melhor dia do período: <b>' + dBR(top.d) + '</b>, com ' + f0(top.las) + ' t de lastro e ' + f1(top.hop) + ' h de operação da planta.' : '',
      a.exc ? '<b>' + a.exc + ' dia(s)</b> excederam a licença operacional de ' + P.licencaH + ' h.' : 'Nenhum dia excedeu a licença operacional de ' + P.licencaH + ' h no período.'
    ].filter(Boolean);
    root.innerHTML =
      '<div class="insight"><h3>Leitura executiva do período</h3><ul>' + insights.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul></div>' +
      '<div class="kpis">' +
      kpi('Lastro produzido', f0(a.las), 't', 'Meta ' + f0(a.metaLas) + ' t ' + ratioTag(a.las, a.metaLas), div(a.las, a.metaLas), C.lastro) +
      kpi('Lastro por dia apontado', f0(a.lasDia), 't/dia', ratioTag(a.lasDia, P.metaLastroDia), div(a.lasDia, P.metaLastroDia), C.lastro) +
      kpi('Horas de operação da planta', f1(a.hDia), 'h/dia', 'Meta ' + P.metaHoras + ' h ' + ratioTag(a.hDia, P.metaHoras), div(a.hDia, P.metaHoras)) +
      kpi('Taxa de alimentação (primária)', f0(a.taxaP), 't/h', 'Nominal ' + P.capacidadeNominal + ' t/h ' + ratioTag(a.taxaP, P.capacidadeNominal), div(a.taxaP, P.capacidadeNominal)) +
      kpi('Aproveitamento do lastro', pc(a.aprov), '', 'Meta ' + pc(P.aproveitamentoMeta, 0) + ' ' + ratioTag(a.aprov, P.aproveitamentoMeta), div(a.aprov, P.aproveitamentoMeta)) +
      kpi('Lastro por hora (secundária)', f0(a.thLas), 't/h', 'Orçado ' + f1(P.produtividadeOrcada) + ' t/h ' + ratioTag(a.thLas, P.produtividadeOrcada), div(a.thLas, P.produtividadeOrcada)) +
      kpi('Aderência à baseline contratual', pc(ader), '', f0(acum.lasAc) + ' de ' + f0(acum.baseAc) + ' t em ' + dBRs(S.fim), ader, C.brand) +
      kpi('Dias acima da licença', a.exc, 'dias', a.exc ? f1(a.excH) + ' h excedentes' : 'Licença de ' + P.licencaH + ' h/dia respeitada') +
      '</div>' +
      '<div class="grid g32">' + card('cLas', 'Lastro diário', 'Barras: lastro (TC-05). Linhas: meta orçamentária e média móvel de 7 dias apontados.', 'tall') +
      '<div class="card"><h3>Decomposição do déficit de lastro</h3><div class="hint">Lastro/dia = horas × cobertura × taxa × aproveitamento. O peso indica quanto cada fator explica do déficit (escala logarítmica, soma 100%).</div><div id="decomp"></div></div></div>' +
      '<div class="grid g2" style="margin-top:16px">' + card('cHor', 'Horas de operação da planta por dia', 'União dos períodos em que ao menos uma britagem operou. Referências: meta de 13 h e licença de 16 h.') +
      card('cCls', 'Horas paradas por classe', 'Soma por dia, conforme a classe de cada parada.', '', seg('vcls', [['P', 'Primária'], ['S', 'Secundária']], 'P')) + '</div>';

    var dx = ds.filter(function (x) { return x.apt; }).map(function (x) { return dBRs(x.d); });
    var dd = ds.filter(function (x) { return x.apt; });
    var mm = dd.map(function (x, i) { var w = dd.slice(Math.max(0, i - 6), i + 1); return Math.round(sum(w, function (y) { return y.las; }) / w.length); });
    chart($('cLas'), {
      tooltip: { trigger: 'axis', formatter: ttFmt('t', 0) },
      xAxis: axCat(dx), yAxis: axVal(),
      series: [barS('Lastro (t)', dd.map(function (x) { return Math.round(x.las); }), C.lastro), lineS('Média móvel 7 dias', mm, C.brand), metaS('Meta (t/dia)', dd.map(function () { return P.metaLastroDia; }))]
    });
    $('decomp').innerHTML = '<div class="tbl-wrap"><table class="t"><thead><tr><th>Fator</th><th class="n">Meta</th><th class="n">Real</th><th class="n">Ating.</th><th class="n">Peso</th></tr></thead><tbody>' +
      dc.fatores.map(function (f) {
        var cls = f.ating >= 1 ? 'good' : f.ating >= 0.85 ? 'warn' : 'bad';
        return '<tr><td>' + f.k + '</td><td class="n">' + f.fmt(f.meta) + '</td><td class="n">' + f.fmt(f.real) + '</td><td class="n"><span class="tag ' + cls + '">' + pc(f.ating, 0) + '</span></td><td class="n"><div style="display:flex;align-items:center;gap:6px;justify-content:flex-end"><div style="width:46px;height:6px;background:#efeeea;border-radius:3px;overflow:hidden"><i style="display:block;height:100%;width:' + Math.max(0, Math.min(100, f.peso * 100)) + '%;background:' + C.brand + '"></i></div>' + pc(f.peso, 0) + '</div></td></tr>';
      }).join('') +
      '<tr><td><b>Lastro por dia</b></td><td class="n"><b>' + f0(P.metaLastroDia) + '</b></td><td class="n"><b>' + f0(a.lasDia) + '</b></td><td class="n"><b>' + pc(div(a.lasDia, P.metaLastroDia), 0) + '</b></td><td class="n"><b>100%</b></td></tr></tbody></table></div>' +
      '<p class="hint" style="margin-top:10px">A cobertura da primária mede quanto das horas da planta tiveram britagem primária operando. Quando a secundária roda sozinha a partir da pilha pulmão, a planta acumula horas sem alimentar material novo, e esse efeito aparece aqui de forma explícita.</p>';
    chart($('cHor'), {
      tooltip: { trigger: 'axis', formatter: ttFmt('h', 1) }, xAxis: axCat(dx), yAxis: axVal({ max: 18 }),
      series: [barS('Horas de operação (h)', dd.map(function (x) { return +x.hop.toFixed(2); }), C.ink, { color: '#5c5c5b', itemStyle: { color: function (p) { return dd[p.dataIndex].exc > 0 ? '#d03b3b' : '#5c5c5b'; }, borderRadius: [4, 4, 0, 0] } }),
        metaS('Meta 13 h', dd.map(function () { return P.metaHoras; }), C.brand), metaS('Licença 16 h', dd.map(function () { return P.licencaH; }), '#d03b3b')]
    });
    function drawCls(et) {
      var el = $('cCls'); var ch = echarts.getInstanceByDom(el); if (ch) { charts.splice(charts.indexOf(ch), 1); ch.dispose(); }
      var map = { 'Manutenção corretiva': 'cor', 'Manutenção preventiva': 'pre', 'Processo / operação': 'pro', 'Externa / alimentação': 'ext', 'Rotina operacional': 'rot' };
      chart(el, {
        tooltip: { trigger: 'axis', formatter: ttFmt('h', 1) }, xAxis: axCat(dx), yAxis: axVal(),
        series: CLASSES.map(function (c, i) { return barS(c, dd.map(function (x) { return +(x[et + '_' + map[c]] || 0).toFixed(2); }), C.cls[c], { stack: 's', itemStyle: { color: C.cls[c], borderRadius: i === CLASSES.length - 1 ? [4, 4, 0, 0] : 0, borderColor: '#fff', borderWidth: 0.5 } }); })
      });
    }
    drawCls('P'); bindSeg(root, 'vcls', drawCls);
  }

  // =====================================================================
  // BOLETIM DIÁRIO
  // =====================================================================
  function pgBoletim(root, arg) {
    var datas = DIAS_OP.filter(function (x) { return x.apt; }).map(function (x) { return x.d; });
    var dia = arg && datas.indexOf(arg) >= 0 ? arg : datas[datas.length - 1];
    var i = datas.indexOf(dia);
    var x = DIAS_OP.filter(function (y) { return y.d === dia; })[0] || {};
    var evs = EV.filter(function (e) { return e.d === dia; }).sort(function (a, b) { return a.ti < b.ti ? -1 : 1; });
    var prod = D.producao.filter(function (p) { return p.d === dia; });
    var mes = dia.slice(0, 7);
    var stops = evs.filter(function (e) { return e.stop; });
    var turnos = by(evs, function (e) { return e.t + '|' + e.q; });
    root.innerHTML =
      '<div class="card" style="margin-bottom:16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div class="daynav">' +
      '<button class="btn" id="bPrev" ' + (i <= 0 ? 'disabled' : '') + '>‹ Anterior</button><select id="bSel">' + datas.slice().reverse().map(function (d) { return '<option value="' + d + '"' + (d === dia ? ' selected' : '') + '>' + dBR(d) + ' · ' + ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(d + 'T12:00:00Z').getUTCDay()] + '</option>'; }).join('') + '</select>' +
      '<button class="btn" id="bNext" ' + (i >= datas.length - 1 ? 'disabled' : '') + '>Próximo ›</button></div>' +
      '<span class="tag ' + (x.hop >= P.metaHoras ? 'good' : x.hop >= P.metaHoras * 0.85 ? 'warn' : 'bad') + '">' + esc(x.status || '') + '</span>' + (x.exc > 0 ? '<span class="tag bad">Licença excedida em ' + hm(x.exc) + '</span>' : '') +
      '<span class="sub" style="color:var(--ink-3);font-size:12px">Dia operacional com virada às ' + (P.horaVirada || '05:00') + '</span></div>' +
      '<div class="kpis">' +
      kpi('Lastro do dia', f0(x.las), 't', ratioTag(x.las, P.metaLastroDia), div(x.las, P.metaLastroDia), C.lastro) +
      kpi('Operação da planta', hm(x.hop), '', 'Meta ' + P.metaHoras + ' h · licença ' + P.licencaH + ' h', div(x.hop, P.metaHoras)) +
      kpi('Primária operando', hm(x.hopP), '', 'de ' + hm(x.hapP) + ' apontadas (' + pc(div(x.hopP, x.hapP), 0) + ')', div(x.hopP, x.hapP), C.oper) +
      kpi('Secundária operando', hm(x.hopS), '', 'de ' + hm(x.hapS) + ' apontadas (' + pc(div(x.hopS, x.hapS), 0) + ')', div(x.hopS, x.hapS), C.oper) +
      kpi('Alimentação', f0(x.ali), 't', 'Pulmão ' + f0(x.pul) + ' + bica ' + f0(x.bic)) +
      kpi('Aproveitamento', pc(div(x.las, x.ali)), '', 'Meta ' + pc(P.aproveitamentoMeta, 0) + (div(x.las, x.ali) > 1 ? ' · consumo de estoque do pulmão' : ''), div(div(x.las, x.ali), P.aproveitamentoMeta)) +
      kpi('Paradas VALE / GSA', hm(x.P_vale + x.S_vale), '', 'GSA ' + hm(x.P_gsa + x.S_gsa) + ' · ' + stops.length + ' registro(s)') +
      kpi('Falhas (corretivas)', (x.fP || 0) + (x.fS || 0), '', hm((x.hfP || 0) + (x.hfS || 0)) + ' em falha') +
      '</div>' +
      '<div class="card" style="margin-bottom:16px"><div class="head"><div><h3>Linha do tempo do dia</h3><div class="hint">Cada bloco é um apontamento. Passe o cursor para ver motivo, equipamento, responsabilidade e detalhamento.</div></div><div class="legend-inline"><span><i class="dot" style="background:' + C.oper + '"></i>Operando</span>' + CLASSES.map(function (c) { return '<span><i class="dot" style="background:' + C.cls[c] + '"></i>' + c + '</span>'; }).join('') + '</div></div><div class="chart short" id="cGantt"></div></div>' +
      '<div class="grid g2"><div class="card"><h3>Turnos</h3><div class="hint">Horas apontadas e operadas por turno e equipe.</div><div id="tTurnos"></div></div>' +
      '<div class="card"><h3>Produção por produto</h3><div class="hint">No dia, acumulado no mês e acumulado desde o início da operação.</div><div id="tProd"></div></div></div>' +
      '<div class="sec">Paradas registradas no dia</div><div class="card"><div id="tStops"></div></div>';
    $('bSel').onchange = function () { location.hash = '#/boletim/' + this.value; };
    $('bPrev').onclick = function () { location.hash = '#/boletim/' + datas[i - 1]; };
    $('bNext').onclick = function () { location.hash = '#/boletim/' + datas[i + 1]; };
    // gantt
    var t0 = Math.min.apply(null, evs.map(function (e) { return Date.parse(e.ti + ':00Z'); }));
    var t1 = Math.max.apply(null, evs.map(function (e) { return Date.parse(e.tf + ':00Z'); }));
    if (evs.length) {
      var dataG = evs.map(function (e) { return { value: [e.e === 'P' ? 1 : 0, Date.parse(e.ti + ':00Z'), Date.parse(e.tf + ':00Z'), e.id], itemStyle: { color: e.op ? C.oper : (C.cls[e.cls] || '#999') } }; });
      chart($('cGantt'), {
        grid: { left: 8, right: 16, top: 10, bottom: 8, containLabel: true },
        tooltip: { trigger: 'item', formatter: function (p) { var e = EV[p.value[3]]; return '<b>' + etapaNome(e.e) + ' · ' + e.hi + ' a ' + e.hf + '</b> (' + hm(e.h) + ')<br>' + (e.op ? 'Operando' : esc(e.mot) + (e.eq ? ' · ' + esc(e.eq) : '') + '<br>' + esc(e.sub) + (e.comp ? ' · ' + esc(e.comp) : '') + (e.modo ? '<br>Modo de falha: ' + esc(e.modo) : '') + '<br>Classe: ' + esc(e.cls) + '<br>Responsabilidade: <b>' + esc(e.resp) + '</b>' + (e.det ? '<br><span style="display:inline-block;max-width:320px;white-space:normal">' + esc(e.det) + '</span>' : '')); } },
        xAxis: { type: 'time', min: t0, max: t1, axisLabel: { color: C.axis, fontSize: 11, formatter: function (v) { var d = new Date(v); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); } }, splitLine: { show: true, lineStyle: { color: C.grid } } },
        yAxis: axCat(['Secundária', 'Primária'], { axisLabel: { color: C.ink, fontSize: 12, fontWeight: 600 } }),
        series: [{
          type: 'custom', data: dataG, encode: { x: [1, 2], y: 0 },
          renderItem: function (params, api) {
            var y = api.value(0), s = api.coord([api.value(1), y]), e = api.coord([api.value(2), y]), h = api.size([0, 1])[1] * 0.56;
            var rect = echarts.graphic.clipRectByRect({ x: s[0], y: s[1] - h / 2, width: Math.max(1, e[0] - s[0] - 1), height: h }, { x: params.coordSys.x, y: params.coordSys.y, width: params.coordSys.width, height: params.coordSys.height });
            return rect && { type: 'rect', shape: Object.assign(rect, { r: 2 }), style: api.style() };
          }
        }]
      });
    } else $('cGantt').innerHTML = '<div class="empty">Sem apontamentos neste dia.</div>';
    // turnos
    $('tTurnos').innerHTML = '<div class="tbl-wrap"><table class="t"><thead><tr><th>Turno</th><th>Equipe</th><th>Início</th><th>Fim</th><th class="n">Op. P</th><th class="n">Op. S</th></tr></thead><tbody>' +
      Object.keys(turnos).map(function (k) {
        var es = turnos[k]; var ini = es.map(function (e) { return e.ti; }).sort()[0], fim = es.map(function (e) { return e.tf; }).sort().pop();
        return '<tr><td>' + esc(k.split('|')[0]) + '</td><td>' + esc(k.split('|')[1]) + '</td><td>' + ini.slice(11) + '</td><td>' + fim.slice(11) + '</td><td class="n">' + hm(sum(es.filter(function (e) { return e.op && e.e === 'P'; }), function (e) { return e.h; })) + '</td><td class="n">' + hm(sum(es.filter(function (e) { return e.op && e.e === 'S'; }), function (e) { return e.h; })) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    // produção
    var prodNomes = ['Pilha Pulmão', 'Bica Corrida', 'Lastro', 'Brita 2', 'Brita 1', 'Brita 0', 'Pó de Brita', 'Rachão'];
    $('tProd').innerHTML = '<div class="tbl-wrap"><table class="t"><thead><tr><th>Produto</th><th>Transp.</th><th class="n">No dia (t)</th><th class="n">No mês (t)</th><th class="n">Contrato (t)</th></tr></thead><tbody>' +
      prodNomes.map(function (n) {
        var r = D.producao.filter(function (p) { return p.p === n; });
        var tc = (r[0] || {}).tc || '';
        return '<tr><td><i class="dot" style="background:' + C.prod[n] + ';margin-right:6px"></i>' + n + '</td><td>' + esc(tc) + '</td><td class="n">' + f1(sum(r.filter(function (p) { return p.d === dia; }), function (p) { return p.v; })) + '</td><td class="n">' + f0(sum(r.filter(function (p) { return p.d.slice(0, 7) === mes && p.d <= dia; }), function (p) { return p.v; })) + '</td><td class="n">' + f0(sum(r.filter(function (p) { return p.d <= dia; }), function (p) { return p.v; })) + '</td></tr>';
      }).join('') + '</tbody></table></div>' + (prod.some(function (p) { return p.obs; }) ? '<div class="note">' + prod.filter(function (p) { return p.obs; }).map(function (p) { return esc(p.p) + ': ' + esc(p.obs); }).join('<br>') + '</div>' : '');
    tabela($('tStops'), colsEventos(), stops, { noPage: true });
  }

  function colsEventos(full) {
    var c = [
      { t: 'Etapa', v: function (e) { return etapaNome(e.e); } },
      { t: 'Data', v: function (e) { return dBR(e.d); }, s: function (e) { return e.ti; }, raw: function (e) { return e.d; } },
      { t: 'Início', v: function (e) { return e.hi; } }, { t: 'Fim', v: function (e) { return e.hf; } },
      { t: 'Duração', n: 1, v: function (e) { return hm(e.h); }, s: function (e) { return e.h; }, raw: function (e) { return f2(e.h); } },
      { t: 'Motivo', v: function (e) { return e.op ? 'Operando' : e.mot; } },
      { t: 'Equipamento', h: function (e) { return e.eq ? '<a href="#/equipamento/' + encodeURIComponent(e.eq) + '">' + esc(e.eq) + '</a>' : ''; }, v: function (e) { return e.eq; } },
      { t: 'Submotivo', v: function (e) { return e.sub; } }, { t: 'Componente', v: function (e) { return e.comp; } }, { t: 'Modo de falha', v: function (e) { return e.modo; } },
      { t: 'Detalhamento', wrap: 1, v: function (e) { return e.det; } },
      { t: 'Resp.', h: function (e) { return e.resp ? '<span class="tag ' + (/vale/i.test(e.resp) ? 'vale' : 'gsa') + '">' + esc(e.resp) + '</span>' : ''; }, v: function (e) { return e.resp; } },
      { t: 'Justificativa', wrap: 1, v: function (e) { return e.just; } },
      { t: 'Classe', h: function (e) { return e.cls ? '<span style="display:inline-flex;gap:5px;align-items:center;white-space:nowrap"><i class="dot" style="background:' + (C.cls[e.cls] || '#999') + '"></i>' + esc(e.cls) + '</span>' : ''; }, v: function (e) { return e.cls; } }
    ];
    if (!full) c.splice(1, 1);
    else c.splice(13, 0, { t: 'Continuação', v: function (e) { return e.cont; } }), c.push({ t: 'Turno', v: function (e) { return e.t; } }, { t: 'Equipe', v: function (e) { return e.q; } });
    return c;
  }

  // =====================================================================
  // PRODUÇÃO
  // =====================================================================
  function pgProducao(root) {
    var ds = diasPeriodo(), a = agrega(ds), dd = ds.filter(function (x) { return x.apt; });
    var dx = dd.map(function (x) { return dBRs(x.d); });
    root.innerHTML = '<div class="kpis">' +
      kpi('Alimentação da planta', f0(a.ali), 't', 'Pulmão ' + f0(a.pul) + ' + bica ' + f0(a.bic)) +
      kpi('Lastro (TC-05)', f0(a.las), 't', pc(a.aprov) + ' da alimentação', a.aprov / P.aproveitamentoMeta, C.lastro) +
      kpi('Bica corrida (TC-12)', f0(a.bic), 't', pc(div(a.bic, a.ali)) + ' da alimentação', div(a.bic, a.ali), C.prod['Bica Corrida']) +
      kpi('Pó de brita (TC-10)', f0(a.po), 't', pc(div(a.po, a.ali)) + ' da alimentação', div(a.po, a.ali), C.prod['Pó de Brita']) +
      kpi('Brita 1 (TC-08)', f0(a.b1), 't', pc(div(a.b1, a.ali)) + ' da alimentação', div(a.b1, a.ali), C.prod['Brita 1']) +
      kpi('Lastro por hora (secundária)', f0(a.thLas), 't/h', 'Orçado ' + f1(P.produtividadeOrcada) + ' t/h', div(a.thLas, P.produtividadeOrcada)) +
      '</div>' +
      '<div class="grid g32">' + card('cProdDia', 'Produção diária por produto', 'Toneladas pesadas nas balanças integradoras de cada transportador.', 'tall') +
      '<div class="card"><h3>Distribuição da alimentação</h3><div class="hint">Participação de cada produto na alimentação (pulmão + bica). A soma pode diferir de 100% por estoques e perdas.</div><div class="chart tall" id="cMix"></div></div></div>' +
      '<div class="grid g2" style="margin-top:16px">' + card('cAprov', 'Aproveitamento do lastro', 'Lastro ÷ alimentação, diário e acumulado. Valores diários acima de 100% indicam secundária consumindo estoque da pilha pulmão; por isso o acumulado é a leitura de referência.') +
      card('cTh', 'Lastro por hora de secundária (semanal)', 'Lastro ÷ horas operando da secundária, com média móvel de ' + P.semanasTendencia + ' semanas.') + '</div>' +
      '<div class="sec">Curva S contratual</div>' +
      '<div class="grid g32">' + card('cCurva', 'Lastro acumulado × baseline contratual', 'Baseline a partir de ' + dBR(P.inicioBaseline) + '. Projeção pelo ritmo das últimas ' + P.semanasTendencia + ' semanas.', 'tall') +
      '<div class="card"><h3>Marcos contratuais</h3><div class="hint">Situação calculada na planilha de controle (aba Cronograma).</div><div id="tMarcos"></div></div></div>';
    chart($('cProdDia'), {
      tooltip: { trigger: 'axis', formatter: ttFmt('t', 0) }, xAxis: axCat(dx), yAxis: axVal(),
      series: PRODS.filter(function (p) { return sum(dd, function (x) { return x[p[1]]; }) > 0; }).map(function (p, i, arr) { return barS(p[0], dd.map(function (x) { return Math.round(x[p[1]]); }), C.prod[p[0]], { stack: 'p', itemStyle: { color: C.prod[p[0]], borderRadius: i === arr.length - 1 ? [4, 4, 0, 0] : 0, borderColor: '#fff', borderWidth: 0.5 } }); })
        .concat([lineS('Alimentação', dd.map(function (x) { return Math.round(x.ali); }), C.ink, { lineStyle: { width: 1.5, color: C.ink, type: 'dotted' } })])
    });
    var mix = PRODS.map(function (p) { return [p[0], a[p[1]]]; }).filter(function (p) { return p[1] > 0; }).sort(function (x, y) { return x[1] - y[1]; });
    chart($('cMix'), {
      grid: { left: 8, right: 56, top: 6, bottom: 8, containLabel: true }, tooltip: { trigger: 'item', formatter: function (p) { return p.name + ': <b>' + f0(p.value) + ' t</b> (' + pc(p.value / a.ali) + ' da alimentação)'; } },
      xAxis: axVal({ show: false }), yAxis: axCat(mix.map(function (m) { return m[0]; }), { axisLabel: { color: C.ink, fontSize: 12 } }),
      series: [{ type: 'bar', data: mix.map(function (m) { return { value: Math.round(m[1]), itemStyle: { color: C.prod[m[0]], borderRadius: [0, 4, 4, 0] } }; }), barMaxWidth: 22, label: { show: true, position: 'right', color: C.ink, fontSize: 11, formatter: function (p) { return pc(p.value / a.ali, 0); } } }]
    });
    chart($('cAprov'), {
      tooltip: { trigger: 'axis', formatter: function (ps) { return '<b>' + ps[0].axisValueLabel + '</b>' + ps.map(function (p) { return '<br>' + p.marker + p.seriesName + ': <b>' + (p.value === null ? '–' : nf(1).format(p.value)) + '%</b>'; }).join(''); } },
      xAxis: axCat(dx), yAxis: axVal({ min: 0, max: function (v) { return Math.max(100, Math.ceil(v.max / 20) * 20); }, axisLabel: { color: C.axis, fontSize: 11, formatter: '{value}%' } }),
      series: [barS('Diário', dd.map(function (x) { return x.ali ? +(x.las / x.ali * 100).toFixed(1) : null; }), '#9ec5f4'), lineS('Acumulado', dd.map(function (x) { return x.aliAc ? +(x.lasAc / x.aliAc * 100).toFixed(1) : null; }), C.lastro), metaS('Meta', dd.map(function () { return P.aproveitamentoMeta * 100; }), C.brand)]
    });
    var sem = semanas(ds);
    chart($('cTh'), {
      tooltip: { trigger: 'axis', formatter: ttFmt('t/h', 1) }, xAxis: axCat(sem.map(function (w) { return dBRs(w.sem); })), yAxis: axVal(),
      series: [barS('t/h de lastro', sem.map(function (w) { return +w.a.thLas.toFixed(1); }), C.lastro), lineS('Média móvel ' + P.semanasTendencia + ' sem.', sem.map(function (w) { return +w.mm.toFixed(1); }), C.brand), metaS('Orçado', sem.map(function () { return P.produtividadeOrcada; }))]
    });
    // curva S
    var fimB = DIAS[DIAS.length - 1].d;
    var serieB = DIAS.filter(function (x) { return x.d >= P.inicioBaseline; });
    var real = serieB.filter(function (x) { return x.d <= ULTIMA; });
    var recent = DIAS_OP.filter(function (x) { return x.d > addDays(ULTIMA, -7 * P.semanasTendencia); });
    var ritmo = sum(recent, function (x) { return x.las; }) / (7 * P.semanasTendencia); // t por dia corrido
    var lastAc = (real[real.length - 1] || {}).lasAc || 0;
    var proj = serieB.map(function (x) { return x.d >= ULTIMA ? [x.d, Math.round(lastAc + ritmo * diffDays(ULTIMA, x.d))] : null; }).filter(Boolean);
    chart($('cCurva'), {
      tooltip: { trigger: 'axis', formatter: function (ps) { return '<b>' + dBR(ps[0].value[0]) + '</b>' + ps.map(function (p) { return '<br>' + p.marker + p.seriesName + ': <b>' + f0(p.value[1]) + ' t</b>'; }).join(''); } },
      xAxis: { type: 'time', axisLabel: { color: C.axis, fontSize: 11, formatter: function (v) { var d = new Date(v); return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][d.getUTCMonth()] + '/' + String(d.getUTCFullYear()).slice(2); } }, splitLine: { show: false } },
      yAxis: axVal({ axisLabel: { color: C.axis, fontSize: 11, formatter: function (v) { return F0.format(v / 1000) + ' mil'; } } }),
      series: [lineS('Baseline contratual', serieB.map(function (x) { return [x.d, Math.round(x.baseAc)]; }), C.meta, { lineStyle: { width: 2, type: 'dashed', color: C.meta } }),
        lineS('Lastro real', real.map(function (x) { return [x.d, Math.round(x.lasAc)]; }), C.lastro, { areaStyle: { color: 'rgba(42,120,214,.10)' }, lineStyle: { width: 2.5, color: C.lastro } }),
        lineS('Projeção (ritmo recente)', proj, C.brand, { lineStyle: { width: 2, type: 'dotted', color: C.brand } }),
        { type: 'scatter', name: 'Marcos', symbolSize: 9, itemStyle: { color: '#fff', borderColor: C.ink, borderWidth: 2 }, data: D.marcos.map(function (m) { return [m.data, m.meta]; }), tooltip: { trigger: 'item', formatter: function (p) { var m = D.marcos[p.dataIndex]; return '<b>' + esc(m.nome) + '</b><br>' + dBR(m.data) + ' · meta ' + f0(m.meta) + ' t'; } } }]
    });
    $('tMarcos').innerHTML = '<div class="tbl-wrap"><table class="t"><thead><tr><th>Marco</th><th>Data</th><th>Projeção</th><th>Situação</th></tr></thead><tbody>' + D.marcos.map(function (m) {
      var cls = /vencido/i.test(m.sit) ? 'bad' : /risco/i.test(m.sit) ? 'warn' : /atingido|ok|no prazo/i.test(m.sit) ? 'good' : 'neu';
      return '<tr><td><b>' + esc(m.nome.split(' - ')[0]) + '</b><br><span style="color:var(--ink-3);font-size:11.5px">' + f0(m.meta) + ' t</span></td><td>' + dBR(m.data) + '</td><td>' + dBR(m.proj) + (m.atraso ? '<br><span style="color:var(--ink-3);font-size:11.5px">+' + f0(m.atraso) + ' dias</span>' : '') + '</td><td><span class="tag ' + cls + '">' + esc(m.sit) + '</span>' + (m.ritmo ? '<br><span style="color:var(--ink-3);font-size:11.5px">exige ' + f0(m.ritmo) + ' t/dia</span>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div><p class="hint" style="margin-top:8px">Ritmo recente: ' + f0(ritmo) + ' t por dia corrido (' + f0(ritmo * 7 / 5) + ' t por dia útil).</p>';
  }

  // agrega semanas (segunda-feira)
  function semanas(ds) {
    var g = by(ds, function (x) { return x.sem || monday(x.d); });
    var ks = Object.keys(g).sort();
    var out = ks.map(function (k) { return { sem: k, fim: addDays(k, 6), a: agrega(g[k]) }; });
    var w = P.semanasTendencia;
    out.forEach(function (o, i) { var j = out.slice(Math.max(0, i - w + 1), i + 1); var las = sum(j, function (x) { return x.a.las; }), hs = sum(j, function (x) { return x.a.hopS; }); o.mm = div(las, hs); });
    return out;
  }

  // =====================================================================
  // EVOLUÇÃO SEMANAL
  // =====================================================================
  function pgSemanal(root) {
    var sem = semanas(diasPeriodo());
    root.innerHTML = '<div class="grid g2">' + card('cSemL', 'Lastro por dia apontado', 'Média semanal contra a meta orçamentária.') + card('cSemH', 'Horas de operação da planta por dia', 'Média semanal contra a meta e a licença.') + '</div>' +
      '<div class="grid g2" style="margin-top:16px">' + card('cSemR', 'Horas paradas por responsabilidade', 'Soma das duas etapas: Contratada (GSA) e Contratante (VALE).') + card('cSemS', 'Sincronismo entre etapas', 'Horas em que primária e secundária operaram juntas ÷ horas de operação da planta.') + '</div>' +
      '<div class="sec">Tabela semanal</div><div class="card"><div id="tSem"></div></div>';
    var x = sem.map(function (w) { return dBRs(w.sem); });
    chart($('cSemL'), { tooltip: { trigger: 'axis', formatter: ttFmt('t/dia', 0) }, xAxis: axCat(x), yAxis: axVal(), series: [barS('Lastro/dia', sem.map(function (w) { return Math.round(w.a.lasDia || 0); }), C.lastro), metaS('Meta', sem.map(function () { return P.metaLastroDia; }))] });
    chart($('cSemH'), { tooltip: { trigger: 'axis', formatter: ttFmt('h/dia', 1) }, xAxis: axCat(x), yAxis: axVal({ max: 18 }), series: [barS('Horas/dia', sem.map(function (w) { return +(w.a.hDia || 0).toFixed(2); }), '#5c5c5b'), metaS('Meta', sem.map(function () { return P.metaHoras; }), C.brand), metaS('Licença', sem.map(function () { return P.licencaH; }), '#d03b3b')] });
    chart($('cSemR'), { tooltip: { trigger: 'axis', formatter: ttFmt('h', 1) }, xAxis: axCat(x), yAxis: axVal(), series: [barS('GSA (Contratada)', sem.map(function (w) { return +w.a.gsa.toFixed(1); }), C.gsa, { stack: 'r', itemStyle: { color: C.gsa, borderColor: '#fff', borderWidth: 0.5 } }), barS('VALE (Contratante)', sem.map(function (w) { return +w.a.vale.toFixed(1); }), C.vale, { stack: 'r', itemStyle: { color: C.vale, borderRadius: [4, 4, 0, 0], borderColor: '#fff', borderWidth: 0.5 } })] });
    chart($('cSemS'), { tooltip: { trigger: 'axis', formatter: ttFmt('%', 0) }, xAxis: axCat(x), yAxis: axVal({ max: 100, axisLabel: { color: C.axis, fontSize: 11, formatter: '{value}%' } }), series: [lineS('Sincronismo', sem.map(function (w) { return Math.round((w.a.sinc || 0) * 100); }), C.ink, { symbol: 'circle', symbolSize: 7 }), lineS('Cobertura da primária', sem.map(function (w) { return Math.round((w.a.cobP || 0) * 100); }), C.brand, { symbol: 'circle', symbolSize: 7 })] });
    tabela($('tSem'), [
      { t: 'Semana', v: function (w) { return dBR(w.sem) + ' a ' + dBRs(w.fim); }, s: function (w) { return w.sem; } },
      { t: 'Dias', n: 1, v: function (w) { return w.a.n; }, s: function (w) { return w.a.n; } },
      { t: 'H planta', n: 1, v: function (w) { return f1(w.a.hop); }, s: function (w) { return w.a.hop; } },
      { t: 'H/dia', n: 1, v: function (w) { return f1(w.a.hDia); }, s: function (w) { return w.a.hDia; } },
      { t: 'H op. P', n: 1, v: function (w) { return f1(w.a.hopP); }, s: function (w) { return w.a.hopP; } },
      { t: 'H op. S', n: 1, v: function (w) { return f1(w.a.hopS); }, s: function (w) { return w.a.hopS; } },
      { t: 'Sincronismo', n: 1, v: function (w) { return pc(w.a.sinc, 0); }, s: function (w) { return w.a.sinc; } },
      { t: 'Alimentação (t)', n: 1, v: function (w) { return f0(w.a.ali); }, s: function (w) { return w.a.ali; } },
      { t: 'Lastro (t)', n: 1, v: function (w) { return f0(w.a.las); }, s: function (w) { return w.a.las; } },
      { t: 'Lastro/dia', n: 1, v: function (w) { return f0(w.a.lasDia); }, s: function (w) { return w.a.lasDia; } },
      { t: 'Taxa P (t/h)', n: 1, v: function (w) { return f0(w.a.taxaP); }, s: function (w) { return w.a.taxaP; } },
      { t: 't/h lastro', n: 1, v: function (w) { return f1(w.a.thLas); }, s: function (w) { return w.a.thLas; } },
      { t: 'Aproveit.', n: 1, v: function (w) { return pc(w.a.aprov); }, s: function (w) { return w.a.aprov; } },
      { t: 'Parado P (h)', n: 1, v: function (w) { return f1(w.a.parP); }, s: function (w) { return w.a.parP; } },
      { t: 'Parado S (h)', n: 1, v: function (w) { return f1(w.a.parS); }, s: function (w) { return w.a.parS; } },
      { t: 'GSA (h)', n: 1, v: function (w) { return f1(w.a.gsa); }, s: function (w) { return w.a.gsa; } },
      { t: 'VALE (h)', n: 1, v: function (w) { return f1(w.a.vale); }, s: function (w) { return w.a.vale; } }
    ], sem.slice().reverse(), { noPage: true, csv: 'evolucao-semanal' });
  }

  // =====================================================================
  // PARADAS E DISPONIBILIDADE
  // =====================================================================
  function confiab(evs, horasOp) {
    var falhas = evs.filter(function (e) { return e.falha; }).length;
    var hFalha = sum(evs.filter(function (e) { return e.stop && e.cls === 'Manutenção corretiva'; }), function (e) { return e.h; });
    var hMan = sum(evs.filter(function (e) { return e.manut; }), function (e) { return e.h; });
    return { falhas: falhas, hFalha: hFalha, hMan: hMan, mtbf: div(horasOp, falhas), mttr: div(hFalha, falhas), df: div(horasOp, horasOp + hMan) };
  }
  function pgParadas(root) {
    var et = S.etapa;
    root.innerHTML = '<div class="card" style="margin-bottom:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><b>Etapa</b>' + seg('et', [['T', 'Planta (ambas)'], ['P', 'Primária'], ['S', 'Secundária']], et) + '<span class="hint" style="margin:0">Indicadores de confiabilidade usam as horas operando da etapa como base de tempo.</span></div><div id="parBody"></div>';
    bindSeg(root, 'et', function (v) { S.etapa = v; charts.forEach(function (c) { c.dispose(); }); charts = []; corpo(v); });
    corpo(et);
    function corpo(et) {
      var a = agrega(diasPeriodo());
      var evs = evPeriodo(et).filter(function (e) { return e.stop; });
      var hOp = et === 'P' ? a.hopP : et === 'S' ? a.hopS : a.hopP + a.hopS;
      var hAp = et === 'P' ? a.hapP : et === 'S' ? a.hapS : a.hapP + a.hapS;
      var cf = confiab(evs, hOp);
      var hPar = sum(evs, function (e) { return e.h; });
      var hV = sum(evs.filter(function (e) { return /vale/i.test(e.resp); }), function (e) { return e.h; }), hG = sum(evs.filter(function (e) { return /gsa/i.test(e.resp); }), function (e) { return e.h; });
      var b = $('parBody');
      b.innerHTML = '<div class="kpis">' +
        kpi('Horas paradas', f1(hPar), 'h', pc(div(hPar, hAp)) + ' do tempo apontado', div(hPar, hAp), '#d03b3b') +
        kpi('Utilização', pc(div(hOp, hAp)), '', f1(hOp) + ' h operando de ' + f1(hAp) + ' h', div(hOp, hAp), C.oper) +
        kpi('Disponibilidade física', pc(cf.df), '', 'Desconta manutenção corretiva e preventiva', cf.df, C.oper) +
        kpi('Falhas registradas', cf.falhas, '', f1(cf.hFalha) + ' h em manutenção corretiva') +
        kpi('MTBF', f1(cf.mtbf), 'h', 'Horas operando entre falhas') +
        kpi('MTTR', f2(cf.mttr), 'h', 'Duração média de reparo') +
        kpi('Responsabilidade VALE', f1(hV), 'h', pc(div(hV, hV + hG), 0) + ' das horas paradas', div(hV, hV + hG), C.vale) +
        kpi('Responsabilidade GSA', f1(hG), 'h', pc(div(hG, hV + hG), 0) + ' das horas paradas', div(hG, hV + hG), C.gsa) +
        '</div>' +
        '<div class="grid g2">' + card('cPareto', 'Pareto de horas paradas por motivo', 'Cor indica a classe ABC (A até ' + pc(P.limiteA, 0) + ' acumulado, B até ' + pc(P.limiteB, 0) + ').', 'tall') + card('cEqH', 'Horas paradas por equipamento', 'Clique em uma barra para abrir o equipamento.', 'tall') + '</div>' +
        '<div class="grid g2" style="margin-top:16px">' + card('cClsW', 'Classes de parada por semana', 'Horas paradas da etapa selecionada.') + card('cRespM', 'Responsabilidade por motivo', 'Horas paradas atribuídas à Contratada (GSA) e à Contratante (VALE).') + '</div>' +
        '<div class="grid g2" style="margin-top:16px">' + card('cHeat', 'Mapa de calor das paradas', 'Horas paradas por hora do dia e dia da semana. Revela padrões de turno, refeição e início de jornada.') + card('cSub', 'Principais submotivos', 'Os 12 submotivos com mais horas paradas.') + '</div>' +
        '<div class="sec">Maiores paradas do período</div><div class="card"><div id="tTop"></div></div>';
      // pareto
      var gm = by(evs, function (e) { return e.mot || '(sem motivo)'; });
      var par = Object.keys(gm).map(function (k) { return { k: k, h: sum(gm[k], function (e) { return e.h; }), n: gm[k].length }; }).sort(function (x, y) { return y.h - x.h; });
      var acc = 0; par.forEach(function (p) { acc += p.h; p.cum = acc / hPar; p.cls = p.cum - p.h / hPar < P.limiteA ? 'A' : p.cum - p.h / hPar < P.limiteB ? 'B' : 'C'; });
      chart($('cPareto'), {
        grid: { left: 8, right: 70, top: 6, bottom: 8, containLabel: true },
        tooltip: { trigger: 'item', formatter: function (p) { var x = par[par.length - 1 - p.dataIndex]; return '<b>' + esc(x.k) + '</b><br>' + f1(x.h) + ' h em ' + x.n + ' registro(s)<br>' + pc(x.h / hPar) + ' do total · acumulado ' + pc(x.cum) + '<br>Classe ' + x.cls; } },
        xAxis: axVal({ show: false }), yAxis: axCat(par.map(function (p) { return p.k; }).reverse(), { axisLabel: { color: C.ink, fontSize: 11, width: 150, overflow: 'truncate' } }),
        series: [{ type: 'bar', barMaxWidth: 18, data: par.slice().reverse().map(function (p) { return { value: +p.h.toFixed(1), itemStyle: { color: C.abc[p.cls], borderRadius: [0, 4, 4, 0] } }; }), label: { show: true, position: 'right', fontSize: 11, color: C.ink, formatter: function (p) { var x = par[par.length - 1 - p.dataIndex]; return f1(x.h) + ' h · ' + pc(x.cum, 0); } } }]
      });
      // por equipamento
      var ge = by(evs.filter(function (e) { return e.eq; }), function (e) { return e.eq; });
      var eqs = Object.keys(ge).map(function (k) { return { k: k, h: sum(ge[k], function (e) { return e.h; }) }; }).sort(function (x, y) { return y.h - x.h; }).slice(0, 15).reverse();
      var ce = chart($('cEqH'), {
        grid: { left: 8, right: 50, top: 6, bottom: 8, containLabel: true }, tooltip: { trigger: 'item', formatter: function (p) { return '<b>' + p.name + '</b>: ' + f1(p.value) + ' h'; } },
        xAxis: axVal({ show: false }), yAxis: axCat(eqs.map(function (e) { return e.k; }), { axisLabel: { color: C.ink, fontSize: 12 } }),
        series: [{ type: 'bar', barMaxWidth: 18, data: eqs.map(function (e) { return { value: +e.h.toFixed(1), itemStyle: { color: e.k === 'Geral' ? '#a3a29d' : C.brand, borderRadius: [0, 4, 4, 0] } }; }), label: { show: true, position: 'right', fontSize: 11, color: C.ink, formatter: function (p) { return f1(p.value); } }, cursor: 'pointer' }]
      });
      ce.on('click', function (p) { location.hash = '#/equipamento/' + encodeURIComponent(p.name); });
      // classes por semana
      var gw = by(evs, function (e) { return monday(e.d); }); var ws = Object.keys(gw).sort();
      chart($('cClsW'), {
        tooltip: { trigger: 'axis', formatter: ttFmt('h', 1) }, xAxis: axCat(ws.map(dBRs)), yAxis: axVal(),
        series: CLASSES.map(function (c, i) { return barS(c, ws.map(function (w) { return +sum(gw[w].filter(function (e) { return e.cls === c; }), function (e) { return e.h; }).toFixed(1); }), C.cls[c], { stack: 'c', itemStyle: { color: C.cls[c], borderRadius: i === 4 ? [4, 4, 0, 0] : 0, borderColor: '#fff', borderWidth: 0.5 } }); })
      });
      var top8 = par.slice(0, 10).map(function (p) { return p.k; }).reverse();
      chart($('cRespM'), {
        grid: { left: 8, right: 14, top: 34, bottom: 8, containLabel: true }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: ttFmt('h', 1) },
        xAxis: axVal(), yAxis: axCat(top8, { axisLabel: { color: C.ink, fontSize: 11, width: 140, overflow: 'truncate' } }),
        series: [['GSA (Contratada)', /gsa/i, C.gsa], ['VALE (Contratante)', /vale/i, C.vale]].map(function (s, i) { return { name: s[0], type: 'bar', stack: 'r', barMaxWidth: 18, itemStyle: { color: s[2], borderRadius: i ? [0, 4, 4, 0] : 0, borderColor: '#fff', borderWidth: 0.5 }, data: top8.map(function (m) { return +sum(gm[m].filter(function (e) { return s[1].test(e.resp); }), function (e) { return e.h; }).toFixed(1); }) }; })
      });
      // heatmap hora × dia da semana
      var hmx = []; for (var d = 0; d < 7; d++) for (var h = 0; h < 24; h++) hmx.push([h, d, 0]);
      evs.forEach(function (e) {
        var t = Date.parse(e.ti + ':00Z'), t2 = Date.parse(e.tf + ':00Z');
        while (t < t2) { var dt = new Date(t); var nx = Math.min(t2, t - (t % 3600000) + 3600000); var dw = (dt.getUTCDay() + 6) % 7; hmx[dw * 24 + dt.getUTCHours()][2] += (nx - t) / 3600000; t = nx; }
      });
      var hv = hmx.filter(function (x) { return x[2] > 0; }); var hmin = Math.min.apply(null, hv.map(function (x) { return x[0]; }).concat([6])), hmax = Math.max.apply(null, hv.map(function (x) { return x[0]; }).concat([17]));
      var hrs = []; for (h = hmin; h <= hmax; h++) hrs.push(h);
      chart($('cHeat'), {
        grid: { left: 8, right: 14, top: 8, bottom: 40, containLabel: true }, tooltip: { trigger: 'item', axisPointer: null, formatter: function (p) { return ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][p.value[1]] + ' · ' + p.value[0] + 'h às ' + (p.value[0] + 1) + 'h<br><b>' + f1(p.value[2]) + ' h paradas</b>'; } },
        xAxis: axCat(hrs.map(function (h) { return h + 'h'; }), { splitArea: { show: false } }), yAxis: axCat(['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'], { inverse: true }),
        visualMap: { min: 0, max: Math.max.apply(null, hmx.map(function (x) { return x[2]; })) || 1, calculable: false, orient: 'horizontal', left: 'center', bottom: 0, itemHeight: 140, itemWidth: 10, text: ['mais', 'menos'], textStyle: { color: C.axis, fontSize: 11 }, inRange: { color: ['#f0efec', '#b7d3f6', '#5598e7', '#1c5cab', '#0d366b'] } },
        series: [{ type: 'heatmap', data: hmx.filter(function (x) { return x[0] >= hmin && x[0] <= hmax; }).map(function (x) { return [x[0] - hmin, x[1], +x[2].toFixed(2)]; }), itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 3 } }]
      });
      var gs = by(evs, function (e) { return (e.sub || '(sem submotivo)') + ' · ' + (e.mot || ''); });
      var subs = Object.keys(gs).map(function (k) { return { k: k, h: sum(gs[k], function (e) { return e.h; }) }; }).sort(function (x, y) { return y.h - x.h; }).slice(0, 12).reverse();
      chart($('cSub'), {
        grid: { left: 8, right: 44, top: 6, bottom: 8, containLabel: true }, tooltip: { trigger: 'item', formatter: function (p) { return '<b>' + esc(subs[p.dataIndex].k) + '</b><br>' + f1(p.value) + ' h'; } },
        xAxis: axVal({ show: false }), yAxis: axCat(subs.map(function (s) { return s.k.split(' · ')[0]; }), { axisLabel: { color: C.ink, fontSize: 11, width: 170, overflow: 'truncate' } }),
        series: [{ type: 'bar', barMaxWidth: 16, data: subs.map(function (s) { return +s.h.toFixed(1); }), itemStyle: { color: '#5c5c5b', borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', fontSize: 11, color: C.ink, formatter: function (p) { return f1(p.value); } } }]
      });
      tabela($('tTop'), colsEventos(true), evs.slice().sort(function (x, y) { return y.h - x.h; }).slice(0, 25), { noPage: true });
    }
  }

  // =====================================================================
  // EQUIPAMENTOS
  // =====================================================================
  function statsEquip(tag, a, evsAll) {
    var evs = evsAll.filter(function (e) { return e.eq === tag && e.stop; });
    var et = EQ.etapa[tag] || (evs[0] || {}).e || 'G';
    var hOp = et === 'P' ? a.hopP : et === 'S' ? a.hopS : a.hop;
    var cf = confiab(evs, hOp);
    return { tag: tag, et: et, evs: evs, n: evs.length, h: sum(evs, function (e) { return e.h; }), hOp: hOp, cf: cf, vale: sum(evs.filter(function (e) { return /vale/i.test(e.resp); }), function (e) { return e.h; }) };
  }
  function tipoDe(tag) { var k = tag === 'Geral' ? 'GERAL' : tag === 'PLC' ? 'PLC' : tag.split(' ')[0]; return EQ.tipos[k] || 'Equipamento'; }
  function pgEquip(root) {
    var a = agrega(diasPeriodo()), evs = evPeriodo('T');
    var tags = EQ.ordem.slice(); evs.forEach(function (e) { if (e.eq && tags.indexOf(e.eq) < 0) tags.push(e.eq); });
    var st = tags.map(function (t) { return statsEquip(t, a, evs); });
    var maxH = Math.max.apply(null, st.map(function (s) { return s.h; }).concat([1]));
    var state = { et: 'T', ord: 'h' };
    root.innerHTML = '<div class="card" style="margin-bottom:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><b>Etapa</b>' + seg('eqet', [['T', 'Todas'], ['P', 'Primária'], ['S', 'Secundária'], ['G', 'Gerais']], 'T') + '<b style="margin-left:8px">Ordenar</b>' + seg('eqord', [['h', 'Horas paradas'], ['f', 'Falhas'], ['fluxo', 'Fluxo do processo']], 'h') + '</div><div class="eq-grid" id="eqGrid"></div>' +
      '<p class="hint" style="margin-top:14px">MTBF e disponibilidade física usam as horas operando da etapa do equipamento (operação em série). Fichas técnicas extraídas dos manuais IMIC do projeto.</p>';
    function draw() {
      var l = st.filter(function (s) { return state.et === 'T' || s.et === state.et; });
      if (state.ord === 'h') l.sort(function (x, y) { return y.h - x.h; }); else if (state.ord === 'f') l.sort(function (x, y) { return y.cf.falhas - x.cf.falhas || y.h - x.h; });
      $('eqGrid').innerHTML = l.map(function (s) {
        var ficha = EQ.fichas[s.tag];
        return '<div class="eq" data-t="' + esc(s.tag) + '"><div class="t1"><span class="tg">' + esc(s.tag) + '</span><span class="tag neu">' + etapaNome(s.et === 'G' ? 'T' : s.et).replace('Planta', 'Geral') + '</span></div>' +
          '<div><div class="ty">' + esc(tipoDe(s.tag)) + '</div><div class="md">' + esc(ficha ? ficha.modelo : (EQ.funcao[s.tag] || '')) + '</div></div>' +
          '<div class="share" title="Participação nas horas paradas"><i style="width:' + (s.h / maxH * 100) + '%"></i></div>' +
          '<div class="st"><div><b>' + f1(s.h) + '</b>h paradas</div><div><b>' + s.cf.falhas + '</b>falhas</div><div><b>' + (s.cf.falhas && s.tag !== 'Geral' ? f0(s.cf.mtbf) : '–') + '</b>MTBF (h)</div></div></div>';
      }).join('');
      $('eqGrid').querySelectorAll('.eq').forEach(function (el) { el.onclick = function () { location.hash = '#/equipamento/' + encodeURIComponent(el.dataset.t); }; });
    }
    bindSeg(root, 'eqet', function (v) { state.et = v; draw(); });
    bindSeg(root, 'eqord', function (v) { state.ord = v; draw(); });
    draw();
  }

  function pgEquipamento(root, tag) {
    var a = agrega(diasPeriodo()), evsP = evPeriodo('T');
    var s = statsEquip(tag, a, evsP);
    var ficha = EQ.fichas[tag];
    // cadência recente da etapa (últimas semanas) para converter intervalos de manutenção em dias
    var rec = agrega(DIAS_OP.filter(function (x) { return x.d > addDays(ULTIMA, -7 * P.semanasTendencia); }));
    var hDiaEt = s.et === 'P' ? div(rec.hopP, rec.n) : s.et === 'S' ? div(rec.hopS, rec.n) : rec.hDia;
    var histTot = statsEquip(tag, agrega(DIAS_OP), EV);
    root.innerHTML = '<div class="crumb"><a href="#/equip">Equipamentos</a> › ' + esc(tag) + '</div>' +
      '<div class="card" style="margin-bottom:16px"><div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div style="font-size:30px;font-weight:800;letter-spacing:-.02em">' + esc(tag) + '</div><div><div style="font-weight:700">' + esc(tipoDe(tag)) + (ficha ? ' · ' + esc(ficha.modelo) : '') + '</div><div class="hint" style="margin:0">' + etapaNome(s.et === 'G' ? 'T' : s.et).replace('Planta', 'Item geral') + (EQ.funcao[tag] ? ' · ' + esc(EQ.funcao[tag]) : '') + (ficha ? ' · Fonte: ' + esc(ficha.manual) : '') + '</div></div></div>' + (ficha && ficha.aviso ? '<div class="note">' + esc(ficha.aviso) + '</div>' : '') + '</div>' +
      '<div class="kpis">' +
      kpi('Horas paradas no período', f1(s.h), 'h', s.n + ' registro(s) · ' + pc(div(s.h, s.hOp + s.h)) + ' do tempo da etapa') +
      kpi('Falhas (corretivas)', s.cf.falhas, '', f1(s.cf.hFalha) + ' h em corretiva') +
      kpi('MTBF', s.cf.falhas ? f1(s.cf.mtbf) : '–', 'h', 'Base: ' + f0(s.hOp) + ' h operando da etapa') +
      kpi('MTTR', s.cf.falhas ? f2(s.cf.mttr) : '–', 'h', 'Duração média de reparo') +
      kpi('Disponibilidade física', pc(s.cf.df), '', 'Descontando ' + f1(s.cf.hMan) + ' h de manutenção', s.cf.df, C.oper) +
      kpi('Responsabilidade VALE', pc(div(s.vale, s.h), 0), '', f1(s.vale) + ' h de ' + f1(s.h) + ' h', div(s.vale, s.h), C.vale) +
      kpi('Histórico desde o início', f1(histTot.h), 'h', histTot.cf.falhas + ' falhas · ' + histTot.n + ' registros') +
      '</div>' +
      (s.n ? '<div class="grid g2">' + card('cEqW', 'Horas paradas por semana e classe', '') + card('cEqTL', 'Linha do tempo das ocorrências', 'Cada ponto é uma parada; o tamanho indica a duração.') + '</div>' +
        '<div class="grid g3" style="margin-top:16px">' + card('cEqComp', 'Componentes', 'Horas paradas por componente.') + card('cEqModo', 'Modos de falha', 'Somente paradas com modo de falha informado.') + card('cEqMot', 'Motivos', 'Horas paradas por motivo.') + '</div>' : '<div class="card empty">Sem paradas registradas para este equipamento no período selecionado.</div>') +
      (ficha ? '<div class="sec">Ficha técnica e plano de conservação</div><div class="grid g2">' +
        '<div class="card"><h3>Especificações</h3><div class="spec">' + ficha.specs.map(function (r) { return '<div>' + esc(r[0]) + '</div><div>' + esc(r[1]) + '</div>'; }).join('') + '</div></div>' +
        '<div class="card"><h3>Lubrificação e limites</h3><div class="spec">' + ficha.lub.map(function (r) { return '<div>' + esc(r[0]) + '</div><div>' + esc(r[1]) + '</div>'; }).join('') + '</div>' + intervalos(ficha, hDiaEt) + '</div>' +
        '<div class="card"><h3>Peças sobressalentes (códigos IMIC)</h3><div class="spec">' + ficha.pecas.map(function (r) { return '<div>' + esc(r[0]) + '</div><div class="num">' + esc(r[1]) + '</div>'; }).join('') + '</div></div>' +
        '<div class="card"><h3>Rotina recomendada pelo fabricante</h3><ul style="margin:6px 0 0;padding-left:18px">' + ficha.rotina.map(function (r) { return '<li style="margin:4px 0">' + esc(r) + '</li>'; }).join('') + '</ul></div></div>' : '') +
      '<div class="sec">Histórico de paradas</div><div class="card"><div id="tEqEv"></div></div>';
    if (s.n) {
      var gw = by(s.evs, function (e) { return monday(e.d); }); var ws = Object.keys(gw).sort();
      chart($('cEqW'), { tooltip: { trigger: 'axis', formatter: ttFmt('h', 1) }, xAxis: axCat(ws.map(dBRs)), yAxis: axVal(), series: CLASSES.filter(function (c) { return s.evs.some(function (e) { return e.cls === c; }); }).map(function (c, i, arr) { return barS(c, ws.map(function (w) { return +sum(gw[w].filter(function (e) { return e.cls === c; }), function (e) { return e.h; }).toFixed(2); }), C.cls[c], { stack: 'c', itemStyle: { color: C.cls[c], borderRadius: i === arr.length - 1 ? [4, 4, 0, 0] : 0, borderColor: '#fff', borderWidth: 0.5 } }); }) });
      chart($('cEqTL'), {
        tooltip: { trigger: 'item', formatter: function (p) { var e = s.evs[p.dataIndex]; return '<b>' + dBR(e.d) + ' ' + e.hi + '-' + e.hf + '</b> (' + hm(e.h) + ')<br>' + esc(e.mot) + ' · ' + esc(e.sub) + '<br>' + esc(e.comp) + (e.modo ? ' · ' + esc(e.modo) : '') + '<br>Resp.: ' + esc(e.resp) + (e.det ? '<br><span style="display:inline-block;max-width:300px;white-space:normal">' + esc(e.det) + '</span>' : ''); } },
        xAxis: { type: 'time', min: S.ini, max: addDays(S.fim, 1), splitNumber: 6, axisLabel: { hideOverlap: true, color: C.axis, fontSize: 11, formatter: function (v) { var d = new Date(v); return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0'); } }, splitLine: { show: false } },
        yAxis: axVal({ name: 'h', nameTextStyle: { color: C.axis } }),
        series: [{ type: 'scatter', data: s.evs.map(function (e) { return { value: [e.ti, +e.h.toFixed(2)], itemStyle: { color: C.cls[e.cls] || '#999', borderColor: '#fff', borderWidth: 1.5 } }; }), symbolSize: function (v) { return Math.max(8, Math.min(28, 6 + Math.sqrt(v[1]) * 8)); } }]
      });
      [['cEqComp', 'comp', C.brand], ['cEqModo', 'modo', '#e34948'], ['cEqMot', 'mot', '#5c5c5b']].forEach(function (cfg) {
        var g = by(s.evs.filter(function (e) { return e[cfg[1]]; }), function (e) { return e[cfg[1]]; });
        var l = Object.keys(g).map(function (k) { return { k: k, h: sum(g[k], function (e) { return e.h; }), n: g[k].length }; }).sort(function (x, y) { return y.h - x.h; }).slice(0, 10).reverse();
        if (!l.length) { $(cfg[0]).innerHTML = '<div class="empty">Sem informação.</div>'; return; }
        chart($(cfg[0]), { grid: { left: 8, right: 40, top: 6, bottom: 8, containLabel: true }, tooltip: { trigger: 'item', formatter: function (p) { var x = l[p.dataIndex]; return '<b>' + esc(x.k) + '</b><br>' + f1(x.h) + ' h · ' + x.n + ' ocorrência(s)'; } }, xAxis: axVal({ show: false }), yAxis: axCat(l.map(function (x) { return x.k; }), { axisLabel: { color: C.ink, fontSize: 11, width: 120, overflow: 'truncate' } }), series: [{ type: 'bar', barMaxWidth: 16, data: l.map(function (x) { return +x.h.toFixed(2); }), itemStyle: { color: cfg[2], borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', fontSize: 11, color: C.ink, formatter: function (p) { return f1(p.value); } } }] });
      });
    }
    tabela($('tEqEv'), colsEventos(true), EV.filter(function (e) { return e.eq === tag && e.stop; }).sort(function (x, y) { return x.ti < y.ti ? 1 : -1; }), { search: true, csv: 'paradas-' + tag.replace(/\s/g, ''), size: 20 });
  }
  function intervalos(ficha, hDia) {
    if (!isFinite(hDia) || hDia <= 0) return '';
    var hs = {}; ficha.lub.forEach(function (r) { (r[1].match(/(\d[\d.]*)\s*h\b/g) || []).forEach(function (m) { var v = +m.replace(/[^\d]/g, ''); if (v >= 20) hs[v] = 1; }); });
    var l = Object.keys(hs).map(Number).sort(function (a, b) { return a - b; });
    if (!l.length) return '';
    return '<div class="note" style="background:#eef4fc;border-color:#d3e3f7;color:#1c4f94;margin-top:12px"><b>Cadência atual da etapa:</b> ' + f1(hDia) + ' h operando por dia apontado (últimas ' + P.semanasTendencia + ' semanas). Nessa cadência, ' + l.map(function (h) { return '<b>' + f0(h) + ' h</b> ≈ ' + f0(Math.ceil(h / hDia)) + ' dias de operação'; }).join(' · ') + '.</div>';
  }

  // =====================================================================
  // REGISTRO DE EVENTOS
  // =====================================================================
  function pgEventos(root) {
    var evs = evPeriodo('T');
    var opts = function (k) { var s = {}; evs.forEach(function (e) { if (e[k]) s[e[k]] = 1; }); return Object.keys(s).sort(); };
    var f = { e: '', st: 'P', eq: '', mot: '', resp: '', cls: '' };
    root.innerHTML = '<div class="card" style="margin-bottom:16px"><div class="tbl-tools" style="margin:0">' +
      '<select data-f="e"><option value="">Etapa: todas</option><option value="P">Primária</option><option value="S">Secundária</option></select>' +
      '<select data-f="st"><option value="">Status: todos</option><option value="P" selected>Somente paradas</option><option value="O">Somente operação</option></select>' +
      '<select data-f="eq"><option value="">Equipamento: todos</option>' + opts('eq').map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select>' +
      '<select data-f="mot"><option value="">Motivo: todos</option>' + opts('mot').map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select>' +
      '<select data-f="cls"><option value="">Classe: todas</option>' + CLASSES.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select>' +
      '<select data-f="resp"><option value="">Responsabilidade: todas</option>' + opts('resp').map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select>' +
      '</div></div><div class="kpis" id="evK"></div><div class="card"><div id="tEv"></div></div>';
    function draw() {
      var l = evs.filter(function (e) { return (!f.e || e.e === f.e) && (!f.st || (f.st === 'P' ? e.stop : e.op)) && (!f.eq || e.eq === f.eq) && (!f.mot || e.mot === f.mot) && (!f.cls || e.cls === f.cls) && (!f.resp || e.resp === f.resp); }).sort(function (x, y) { return x.ti < y.ti ? 1 : -1; });
      var h = sum(l, function (e) { return e.h; });
      $('evK').innerHTML = kpi('Registros filtrados', l.length, '', '') + kpi('Horas somadas', f1(h), 'h', '') + kpi('Duração média', hm(div(h, l.length)), '', '') + kpi('Maior registro', hm(Math.max.apply(null, l.map(function (e) { return e.h; }).concat([0]))), '', '');
      tabela($('tEv'), colsEventos(true), l, { search: true, csv: 'registro-eventos', size: 30 });
    }
    root.querySelectorAll('[data-f]').forEach(function (s) { s.onchange = function () { f[s.dataset.f] = s.value; draw(); }; });
    draw();
  }

  // =====================================================================
  // METODOLOGIA
  // =====================================================================
  function pgMetodo(root) {
    var defs = [
      ['Dia operacional', 'Eventos iniciados antes de ' + (P.horaVirada || '05:00') + ' pertencem ao dia anterior.'],
      ['Horas de operação da planta', 'União dos períodos em que ao menos uma britagem está operando: H operando P + H operando S − horas simultâneas. Toda parada é descontada.'],
      ['Licença operacional', P.licencaH + ' h por dia de operação da planta. Meta orçamentária: ' + P.metaHoras + ' h/dia (' + pc(P.metaHoras / P.licencaH, 1) + ' da licença).'],
      ['Alimentação', 'Pilha pulmão (TC-01) + bica corrida (TC-12).'],
      ['Lastro', 'Leitura do totalizador da balança integradora TC-05 (Brita 3), sem fator de correção.'],
      ['Aproveitamento do lastro', 'Lastro ÷ alimentação. Meta ' + pc(P.aproveitamentoMeta, 0) + '.'],
      ['Taxa de alimentação da primária', 'Alimentação ÷ horas operando da primária. Referência: capacidade nominal de ' + P.capacidadeNominal + ' t/h.'],
      ['Lastro por hora (secundária)', 'Lastro ÷ horas operando da secundária. Orçado ' + f1(P.produtividadeOrcada) + ' t/h (' + P.capacidadeNominal + ' t/h × ' + pc(P.aproveitamentoMeta, 0) + ').'],
      ['Meta de lastro por dia', f0(P.metaLastroDia) + ' t = ' + P.metaHoras + ' h × ' + f1(P.produtividadeOrcada) + ' t/h.'],
      ['Cobertura da primária', 'Horas operando da primária ÷ horas de operação da planta. Mede o tempo de planta sem alimentação de material novo.'],
      ['Sincronismo', 'Horas em que primária e secundária operaram juntas ÷ horas de operação da planta.'],
      ['Decomposição do déficit', 'Lastro/dia = horas/dia × cobertura × taxa × aproveitamento (identidade exata). O peso de cada fator é ln(atingimento do fator) ÷ ln(atingimento do lastro/dia).'],
      ['Falha', 'Parada de classe "Manutenção corretiva" que não é continuação de evento anterior.'],
      ['MTBF', 'Horas operando da etapa ÷ número de falhas.'],
      ['MTTR', 'Horas em manutenção corretiva ÷ número de falhas.'],
      ['Disponibilidade física', 'Horas operando ÷ (horas operando + horas de manutenção corretiva e preventiva).'],
      ['Utilização', 'Horas operando ÷ horas apontadas da etapa.'],
      ['Curva ABC', 'Classe A até ' + pc(P.limiteA, 0) + ' das horas paradas acumuladas; B até ' + pc(P.limiteB, 0) + '; C o restante.'],
      ['Responsabilidade imediata', 'GSA (Contratada) ou VALE (Contratante), conforme o registro da parada. Paradas VALE exigem justificativa.'],
      ['Baseline contratual', 'Curva de lastro acumulado prevista no cronograma a partir de ' + dBR(P.inicioBaseline) + '. Projeção pelo ritmo médio das últimas ' + P.semanasTendencia + ' semanas por dia corrido.']
    ];
    var prm = [['Capacidade nominal da planta', P.capacidadeNominal + ' t/h'], ['Aproveitamento orçado do lastro', pc(P.aproveitamentoMeta, 0)], ['Licença operacional', P.licencaH + ' h/dia'], ['Meta de horas de operação', P.metaHoras + ' h/dia'], ['Escala operacional', P.escala], ['Dias trabalhados por mês', P.diasMes], ['Produtividade efetiva orçada', f1(P.produtividadeOrcada) + ' t/h'], ['Produção mensal orçada', f0(P.producaoMensalOrcada) + ' t'], ['Meta de lastro por dia', f0(P.metaLastroDia) + ' t'], ['Início da baseline contratual', dBR(P.inicioBaseline)], ['Hora de virada do dia', P.horaVirada]];
    root.innerHTML = '<div class="grid g2"><div class="card"><h3>Premissas do orçamento</h3><div class="hint">Aba Parâmetros da planilha de controle.</div><div class="spec">' + prm.map(function (r) { return '<div>' + r[0] + '</div><div class="num">' + esc(r[1]) + '</div>'; }).join('') + '</div></div>' +
      '<div class="card"><h3>Fonte e atualização</h3><div class="spec"><div>Planilha de origem</div><div>' + esc(D.meta.arquivo || '–') + '</div><div>Período com apontamento</div><div>' + dBR(PRIMEIRA) + ' a ' + dBR(ULTIMA) + '</div><div>Dados gerados em</div><div>' + new Date(D.meta.gerado).toLocaleString('pt-BR') + '</div><div>Registros</div><div>' + EV.length + ' apontamentos de operação e parada · ' + D.producao.length + ' leituras de balança</div><div>Atualização</div><div>Diária, a partir da planilha de controle. O painel é estático e somente leitura.</div></div>' +
      '<h3 style="margin-top:16px">Notas metodológicas da planilha</h3><ol style="padding-left:18px;margin:6px 0 0">' + D.notas.map(function (n) { return '<li style="margin:4px 0">' + esc(n.replace(/^\d\.\s*/, '')) + '</li>'; }).join('') + '</ol></div></div>' +
      '<div class="sec">Definições dos indicadores</div><div class="card"><div class="spec">' + defs.map(function (r) { return '<div><b>' + r[0] + '</b></div><div>' + esc(r[1]) + '</div>'; }).join('') + '</div></div>' +
      '<div class="sec">Leitura das cores</div><div class="card"><div class="legend-inline" style="gap:18px"><span><i class="dot" style="background:' + C.oper + '"></i>Operando</span>' + CLASSES.map(function (c) { return '<span><i class="dot" style="background:' + C.cls[c] + '"></i>' + c + '</span>'; }).join('') + '<span><i class="dot" style="background:' + C.gsa + '"></i>GSA (Contratada)</span><span><i class="dot" style="background:' + C.vale + '"></i>VALE (Contratante)</span></div><p class="hint" style="margin-top:10px">Etiquetas de atingimento: ▲ verde na meta ou acima; ▼ amarela entre 85% e 100%; ▼ vermelha abaixo de 85%. Os valores aparecem sempre por escrito, sem depender só da cor.</p></div>';
  }

  // ---------- inicialização ----------
  $('sideFoot').innerHTML = 'Dados até <b>' + dBR(ULTIMA) + '</b><br>Atualizado em ' + new Date(D.meta.gerado).toLocaleDateString('pt-BR');
  $('ftInfo').textContent = 'Dados de ' + dBR(PRIMEIRA) + ' a ' + dBR(ULTIMA) + ' · gerado em ' + new Date(D.meta.gerado).toLocaleString('pt-BR');
  route();
})();
