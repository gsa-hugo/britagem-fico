/* Extrator da planilha "Produção Diária" (.xlsm) -> objeto DADOS normalizado.
   Funciona no navegador (window.XLSX) e no Node (require('xlsx')).
   Lê por NOME de cabeçalho, nunca por posição fixa, para tolerar novas colunas. */
(function (root) {
  'use strict';

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // número serial do Excel -> 'YYYY-MM-DD' (UTC, sem deslocamento de fuso)
  function serialToISO(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'string') {
      var m = v.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0];
      var b = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if (b) return b[3] + '-' + b[2] + '-' + b[1];
      return null;
    }
    if (typeof v !== 'number' || !isFinite(v)) return null;
    var ms = Math.round((v - 25569) * 86400000);
    var d = new Date(ms);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  function serialToDT(v) {
    if (typeof v !== 'number' || !isFinite(v)) return null;
    var ms = Math.round((v - 25569) * 1440) * 60000; // arredonda ao minuto
    var d = new Date(ms);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
  }
  function fracToHM(v) {
    if (typeof v !== 'number' || !isFinite(v)) return null;
    var mins = Math.round((v - Math.floor(v)) * 1440) % 1440;
    return pad(Math.floor(mins / 60)) + ':' + pad(mins % 60);
  }
  function num(v) { return (typeof v === 'number' && isFinite(v)) ? v : (v === null || v === undefined || v === '' ? 0 : (isFinite(+v) ? +v : 0)); }
  function txt(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }
  function norm(s) { return txt(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' '); }

  function rowsOf(XLSX, wb, name) {
    var ws = wb.Sheets[name];
    if (!ws) throw new Error('Aba não encontrada: "' + name + '"');
    return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true });
  }
  // localiza a linha de cabeçalho cuja coluna A é "Data"
  function headerIndex(rows, first) {
    for (var i = 0; i < Math.min(rows.length, 15); i++) {
      if (norm(rows[i][0]) === norm(first || 'Data')) return i;
    }
    throw new Error('Cabeçalho "Data" não localizado');
  }
  function colMap(header) {
    var m = {};
    header.forEach(function (h, i) { if (h !== null && h !== undefined && m[norm(h)] === undefined) m[norm(h)] = i; });
    return function (name, required) {
      var k = norm(name);
      if (m[k] !== undefined) return m[k];
      // busca por prefixo (tolerante a sufixos como unidades)
      for (var key in m) if (key.indexOf(k) === 0) return m[key];
      if (required) throw new Error('Coluna não encontrada: "' + name + '"');
      return -1;
    };
  }

  function extrairParametros(XLSX, wb) {
    var rows = rowsOf(XLSX, wb, 'Parâmetros');
    var lab = {}, notas = [];
    rows.forEach(function (r) {
      var a = txt(r[0]);
      if (a && r[1] !== null && r[1] !== undefined) lab[norm(a)] = r[1];
      if (/^\d\.\s/.test(a) && a.length > 60) notas.push(a);
    });
    function get(prefix) { var k = norm(prefix); for (var key in lab) if (key.indexOf(k) === 0) return lab[key]; return null; }
    return {
      params: {
        capacidadeNominal: num(get('Capacidade Nominal')),
        aproveitamentoMeta: num(get('Taxa de Aproveitamento')),
        licencaH: num(get('Licença Operacional')),
        metaHoras: num(get('Horas Efetivas de Operação')),
        escala: txt(get('Escala Operacional')),
        diasMes: num(get('Dias Trabalhados por Mês')),
        produtividadeOrcada: num(get('Produtividade Efetiva Orçada')),
        producaoMensalOrcada: num(get('Produção Mensal Orçada')),
        metaLastroDia: num(get('Meta de lastro por dia')),
        franquiaRotina: num(get('Franquia de rotina')),
        semanasTendencia: num(get('Semanas usadas')) || 4,
        limiteA: num(get('Limite A')) || 0.8,
        limiteB: num(get('Limite B')) || 0.95,
        inicioBaseline: serialToISO(get('Início da baseline')),
        horaVirada: fracToHM(get('Hora de virada'))
      },
      notas: notas
    };
  }

  function extrairBaseDiaria(XLSX, wb) {
    var rows = rowsOf(XLSX, wb, 'Base Diária');
    var hi = headerIndex(rows, 'Data');
    var c = colMap(rows[hi]);
    var spec = {
      sem: 'Semana (segunda)', apt: 'Dia com apontamento',
      hapP: 'H apontadas P', hopP: 'H operando P', hapS: 'H apontadas S', hopS: 'H operando S',
      sob: 'Sobreposição', hop: 'H operação planta', metaH: 'Meta Orçamento de horas', exc: 'Excedente da licença',
      hmP: 'H manutenção P', fP: 'Falhas P', hfP: 'H em falha P', hmS: 'H manutenção S', fS: 'Falhas S', hfS: 'H em falha S',
      P_cor: 'P · Manutenção corretiva', P_pre: 'P · Manutenção preventiva', P_pro: 'P · Processo', P_ext: 'P · Externa', P_rot: 'P · Rotina',
      S_cor: 'S · Manutenção corretiva', S_pre: 'S · Manutenção preventiva', S_pro: 'S · Processo', S_ext: 'S · Externa', S_rot: 'S · Rotina',
      P_gsa: 'P · Parado Contratada', P_vale: 'P · Parado Contratante', S_gsa: 'S · Parado Contratada', S_vale: 'S · Parado Contratante',
      pul: 'Pilha Pulmão', bic: 'Bica Corrida', rac: 'Rachão', las: 'Lastro (t)', b0: 'Brita 0', b1: 'Brita 1', b2: 'Brita 2', po: 'Pó de Brita',
      ali: 'Alimentação (t)', metaL: 'Meta Orçamento de lastro', base: 'Baseline contratual', baseAc: 'Baseline acumulada',
      lasAc: 'Lastro acumulado', aliAc: 'Alimentação acumulada', status: 'Status do dia', alerta: 'Alerta'
    };
    var idx = {}; for (var k in spec) idx[k] = c(spec[k], k !== 'alerta' && k !== 'status');
    var out = [];
    for (var i = hi + 1; i < rows.length; i++) {
      var r = rows[i]; var d = serialToISO(r[0]);
      if (!d) continue;
      var o = { d: d };
      for (k in idx) {
        if (idx[k] < 0) continue;
        if (k === 'sem') o[k] = serialToISO(r[idx[k]]);
        else if (k === 'status' || k === 'alerta') o[k] = txt(r[idx[k]]);
        else o[k] = Math.round(num(r[idx[k]]) * 10000) / 10000;
      }
      out.push(o);
    }
    return out;
  }

  function extrairEventos(XLSX, wb, aba, etapa) {
    var rows = rowsOf(XLSX, wb, aba);
    var hi = headerIndex(rows, 'Data');
    var c = colMap(rows[hi]);
    var ix = {
      t: c('Turno', true), q: c('Equipe', true), st: c('Status de Operação', true), hi: c('Horário Início', true), hf: c('Horário Fim', true),
      h: c('Duração (h)', true), mot: c('Motivo da Parada', true), eq: c('Equipamento', true), sub: c('Submotivo', true), comp: c('Componente', true),
      cont: c('Continuação', true), modo: c('Modo de Falha', true), det: c('Detalhamento', true), resp: c('Responsabilidade', true),
      just: c('Justificativa', true), ver: c('Verificação', true), cls: c('Classe', true), ti: c('Início (data-hora)', true), tf: c('Fim (data-hora)', true)
    };
    var out = [];
    for (var i = hi + 1; i < rows.length; i++) {
      var r = rows[i]; var d = serialToISO(r[0]);
      if (!d) continue;
      var st = norm(r[ix.st]);
      if (!st) continue;
      out.push({
        e: etapa, d: d, t: txt(r[ix.t]), q: txt(r[ix.q]), op: st.indexOf('operando') === 0 ? 1 : 0,
        hi: fracToHM(r[ix.hi]), hf: fracToHM(r[ix.hf]), h: Math.round(num(r[ix.h]) * 10000) / 10000,
        mot: txt(r[ix.mot]), eq: txt(r[ix.eq]), sub: txt(r[ix.sub]), comp: txt(r[ix.comp]), cont: txt(r[ix.cont]),
        modo: txt(r[ix.modo]), det: txt(r[ix.det]), resp: txt(r[ix.resp]), just: txt(r[ix.just]), ver: txt(r[ix.ver]),
        cls: txt(r[ix.cls]), ti: serialToDT(r[ix.ti]), tf: serialToDT(r[ix.tf])
      });
    }
    return out;
  }

  function extrairProducao(XLSX, wb) {
    var rows = rowsOf(XLSX, wb, 'Produção');
    var hi = headerIndex(rows, 'Data');
    var c = colMap(rows[hi]);
    var ix = { t: c('Turno', true), q: c('Equipe', true), p: c('Produto', true), tc: c('Transportador', true), ti: c('Totalizador Inicial', true), tf: c('Totalizador Final', true), aj: c('Ajuste de Reset', true), v: c('Produção (t)', true), obs: c('Observação', true) };
    var out = [];
    for (var i = hi + 1; i < rows.length; i++) {
      var r = rows[i]; var d = serialToISO(r[0]);
      if (!d || !txt(r[ix.p])) continue;
      out.push({ d: d, t: txt(r[ix.t]), q: txt(r[ix.q]), p: txt(r[ix.p]), tc: txt(r[ix.tc]), ti: num(r[ix.ti]), tf: num(r[ix.tf]), aj: num(r[ix.aj]), v: Math.round(num(r[ix.v]) * 100) / 100, obs: txt(r[ix.obs]) });
    }
    return out;
  }

  function extrairCronograma(XLSX, wb) {
    var rows = rowsOf(XLSX, wb, 'Cronograma');
    var marcos = [], tarefas = [];
    // tabela de marcos: célula "Marco" seguida de "Meta acumulada (t)"
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      for (var j = 0; j < r.length - 1; j++) {
        if (norm(r[j]) === 'marco' && norm(r[j + 1]).indexOf('meta acumulada') === 0) {
          var hdr = r.slice(j).map(norm);
          var at = function (p) { for (var k = 0; k < hdr.length; k++) if (hdr[k].indexOf(norm(p)) === 0) return j + k; return -1; };
          var cM = at('Meta acumulada'), cD = at('Data contratual'), cR = at('Real na data'), cP = at('Data projetada'), cA = at('Atraso projetado'), cN = at('Ritmo necessário'), cS = at('Situação');
          for (var k2 = i + 1; k2 < rows.length; k2++) {
            var rr = rows[k2]; if (!txt(rr[j])) break;
            marcos.push({ nome: txt(rr[j]), meta: num(rr[cM]), data: serialToISO(rr[cD]), real: num(rr[cR]), proj: serialToISO(rr[cP]), atraso: cA >= 0 ? num(rr[cA]) : null, ritmo: cN >= 0 && typeof rr[cN] === 'number' ? rr[cN] : null, sit: cS >= 0 ? txt(rr[cS]) : '' });
          }
          i = rows.length; break;
        }
      }
    }
    // tarefas do cronograma (coluna A..H)
    rows.forEach(function (r, i) {
      if (i === 0 || !txt(r[0])) return;
      var nome = String(r[0]);
      var nivel = (nome.match(/^\s*/)[0].length) / 3;
      tarefas.push({ nome: nome.trim(), nivel: Math.round(nivel), ini: serialToISO(r[2]), fim: serialToISO(r[3]), meta: typeof r[4] === 'number' ? r[4] : null });
    });
    return { marcos: marcos, tarefas: tarefas };
  }

  function extrair(XLSX, wb, nomeArquivo) {
    var p = extrairParametros(XLSX, wb);
    var dias = extrairBaseDiaria(XLSX, wb);
    var ev = extrairEventos(XLSX, wb, 'Operação Primária', 'P').concat(extrairEventos(XLSX, wb, 'Operação Secundária', 'S'));
    var prod = extrairProducao(XLSX, wb);
    var cr = extrairCronograma(XLSX, wb);
    var datas = ev.map(function (e) { return e.d; }).concat(prod.map(function (x) { return x.d; })).sort();
    return {
      versao: 1,
      meta: { gerado: new Date().toISOString(), arquivo: nomeArquivo || '', primeiraData: datas[0] || null, ultimaData: datas[datas.length - 1] || null },
      params: p.params, notas: p.notas, dias: dias, eventos: ev, producao: prod, marcos: cr.marcos, tarefas: cr.tarefas
    };
  }

  function validar(D) {
    var avisos = [];
    if (!D.dias.length) avisos.push({ nivel: 'erro', msg: 'Base Diária vazia. Abra a planilha no Excel, recalcule e salve antes de enviar.' });
    var ult = D.meta.ultimaData;
    var diaUlt = D.dias.filter(function (x) { return x.d === ult; })[0];
    if (diaUlt && !diaUlt.apt) avisos.push({ nivel: 'erro', msg: 'O último dia lançado (' + ult + ') não aparece calculado na Base Diária. Salve a planilha no Excel (valores em cache) antes de enviar.' });
    var naoOk = D.eventos.filter(function (e) { return e.ver && norm(e.ver) !== 'ok'; });
    if (naoOk.length) avisos.push({ nivel: 'alerta', msg: naoOk.length + ' evento(s) com Verificação diferente de "OK".', itens: naoOk.slice(0, 30).map(function (e) { return (e.e === 'P' ? 'Primária' : 'Secundária') + ' ' + e.d + ' ' + e.hi + '-' + e.hf + ': ' + e.ver; }) });
    var semResp = D.eventos.filter(function (e) { return !e.op && !e.resp; });
    if (semResp.length) avisos.push({ nivel: 'alerta', msg: semResp.length + ' parada(s) sem Responsabilidade Imediata.' });
    var semJust = D.eventos.filter(function (e) { return !e.op && norm(e.resp) === 'vale' && !e.just; });
    if (semJust.length) avisos.push({ nivel: 'alerta', msg: semJust.length + ' parada(s) VALE sem Justificativa.' });
    return avisos;
  }

  var api = { extrair: extrair, validar: validar, serialToISO: serialToISO };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Extrator = api;
})(this);
