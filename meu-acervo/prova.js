// ---------- modo prova: menu da disciplina, provas anteriores, configuração, prova e resultado ----------
const PV = window.PROVAS || {};
const provasDe = (per, disc) => Object.entries(PV).filter(([, p]) => p.per === per && p.disc === disc && p.kind !== 'assunto').map(([id, p]) => ({id, ...p}));
// TPI/ENAMED ficam direto na pasta do grupo: a "disciplina" é a própria pasta
const discKey = path => { const s = path.split('/'); return [clean(s[0]), s[1] ?? s[0]]; };
const ptitle = p => p.kind === 'assunto' ? p.name : `${p.sem}${p.sub ? ' · ' + p.sub : ''}`;
const backPath = id => PV[id]?.path || byId[id]?.folder?.path || '';

// provas montadas por assunto: lista de [prova, índice da questão], recriadas a cada carga
const VIRT = store.get('virt', {});
function addVirtual(id, v){
  const miss = {t: 'disc', e: 'Questão indisponível (o material foi atualizado).', k: ''};
  PV[id] = {per: v.per, disc: v.disc, name: v.title, sem: 'Por assunto', sub: '', flags: [], title: v.topics.join(' · '), kind: 'assunto', path: v.path,
    refs: v.refs, q: v.refs.map(([f, i]) => PV[f]?.q[i] || miss)};
}
Object.entries(VIRT).forEach(([id, v]) => addVirtual(id, v));

const SX = {
  sessions: store.get('sessions', {}),
};
const saveSX = () => store.set('sessions', SX.sessions);
const sid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const LET = 'ABCDE';

// ---------- resultado de uma sessão ----------
function scoreOf(s){
  const p = PV[s.prova], n = s.order.length;
  let ok = 0, ans = 0;
  for (const qi of s.order) { const a = s.ans[qi]; if (a && a.done) { ans++; if (a.ok) ok++; } }
  return {n, ok, ans, pct: n ? Math.round(ok / n * 100) : 0};
}
// questões já respondidas, por "prova:índice" (inclui as feitas dentro de provas por assunto)
function doneKeys(){
  const out = new Set();
  for (const s of Object.values(SX.sessions)) {
    const p = PV[s.prova]; if (!p) continue;
    for (const [qi, a] of Object.entries(s.ans)) if (a.done) out.add(p.refs ? p.refs[qi]?.join(':') : s.prova + ':' + qi);
  }
  return out;
}
const sessionsOf = provaId => Object.values(SX.sessions).filter(s => s.prova === provaId).sort((a, b) => b.start - a.start);
const bestPct = provaId => { const f = sessionsOf(provaId).filter(s => s.finished); return f.length ? Math.max(...f.map(s => scoreOf(s).pct)) : null; };

// ---------- diálogo genérico ----------
function ask({tag = 'Atenção', title, text, buttons}){
  let d = document.getElementById('pvAsk');
  if (!d) { d = document.createElement('div'); d.id = 'pvAsk'; d.className = 'dlg'; document.body.appendChild(d); }
  d.innerHTML = `<div class="askbox"><span class="asktag">${ico('clock')} ${esc(tag)}</span><h3>${esc(title)}</h3><p>${esc(text)}</p>
    <div class="askacts">${buttons.map((b, i) => `<button data-i="${i}" class="${b.cls || ''}">${esc(b.label)}</button>`).join('')}</div></div>`;
  d.classList.add('on');
  d.onclick = e => { const b = e.target.closest('[data-i]'); if (b) { d.classList.remove('on'); buttons[+b.dataset.i].go?.(); } else if (e.target === d) d.classList.remove('on'); };
}

// ---------- menu ao clicar na disciplina ----------
function discMenu(path){
  const [per, disc] = discKey(path);
  const tem = provasDe(per, disc).some(p => p.q.length), temAss = provasDe(per, disc).some(p => p.q.some(q => q.s));
  let d = document.getElementById('pvMenu');
  if (!d) { d = document.createElement('div'); d.id = 'pvMenu'; d.className = 'dlg'; document.body.appendChild(d); }
  const step1 = `<div class="menubox"><div class="mh"><span class="chip">${esc(clean(disc))}</span><button class="mx" data-m="x">${ico('x')}</button></div>
    <div class="tiles">
      <button class="tile blue" data-m="pdf"><span class="em">🖨️</span><b>Provas em PDF</b><small>abrir os arquivos</small></button>
      <button class="tile yellow" data-m="mat"><span class="em">📚</span><b>Materiais de Estudo</b><small>resumos do período</small></button>
      <button class="tile red" data-m="q" ${tem ? '' : 'disabled'}><span class="em">💻</span><b>Fazer Questões</b><small>${tem ? 'modo prova' : 'em breve'}</small></button>
    </div></div>`;
  const step2 = `<div class="menubox"><div class="mh"><button class="mx" data-m="back">${ico('left')}</button><span class="chip">${esc(clean(disc))}</span><button class="mx" data-m="x">${ico('x')}</button></div>
    <div class="tiles two">
      <button class="tile red" data-m="ant"><span class="em">🗂️</span><b>Provas Anteriores</b><small>por semestre</small></button>
      <button class="tile red ${temAss ? '' : 'dim'}" data-m="ass" ${temAss ? '' : 'disabled'}><span class="em">🎯</span><b>Por Assunto</b><small>${temAss ? 'escolha os temas' : 'em breve'}</small></button>
    </div></div>`;
  d.innerHTML = step1; d.classList.add('on');
  d.onclick = e => {
    const b = e.target.closest('[data-m]');
    if (!b) { if (e.target === d) d.classList.remove('on'); return; }
    const m = b.dataset.m;
    if (m === 'x') d.classList.remove('on');
    else if (m === 'back') d.innerHTML = step1;
    else if (m === 'q') d.innerHTML = step2;
    else if (m === 'pdf') { d.classList.remove('on'); location.hash = '#/f/' + encodeURIComponent(path); }
    else if (m === 'mat') { d.classList.remove('on'); const own = nodeAt(path), per = nodeAt(path.split('/')[0]); const r = [own, per].filter(Boolean).map(n => [...n.kids.values()].find(k => /RESUMOS/.test(k.name))).find(Boolean); location.hash = '#/f/' + encodeURIComponent(r ? r.path : path); }
    else if (m === 'ass') { d.classList.remove('on'); location.hash = '#/assuntos/' + encodeURIComponent(path); }
    else if (m === 'ant') { d.classList.remove('on'); location.hash = '#/provas/' + encodeURIComponent(path); }
  };
}

// ---------- provas anteriores (grade de semestres) ----------
function provasHTML(path){
  const [per, disc] = discKey(path);
  const all = provasDe(per, disc);
  const recursos = all.filter(p => p.kind === 'recurso');
  const provas = all.filter(p => p.kind === 'prova').sort((a, b) => a.sem.localeCompare(b.sem) || a.name.localeCompare(b.name));
  const extras = all.filter(p => p.kind === 'extra');
  const card = p => {
    const rec = recursos.filter(r => r.sem === p.sem);
    const best = bestPct(p.id), open = sessionsOf(p.id).find(s => !s.finished);
    const tags = p.flags.filter(f => f !== 'Recurso').map(f => `<span class="ptag">${f === 'S_alt' ? 'Só gabarito' : f}</span>`).join('');
    const sub = p.sub ? `<em class="psub">${esc(p.sub)}</em>` : '';
    if (!p.q.length) return `<div class="pcard off"><small>${esc(clean(disc))}</small><b>${p.sem || esc(p.name)}</b>${sub}${tags}<span class="pbtn">${ico('x')} Indisponível</span><button class="plink" data-open="${p.id}">ver PDF</button></div>`;
    return `<div class="pcard">${best !== null ? `<span class="pbest">✓ ${best}%</span>` : ''}<small>${esc(clean(disc))} · ${p.q.length} questões</small><b>${p.sem || esc(p.name)}</b>${sub}
      <div class="ptags">${tags}${rec.length ? '<span class="ptag rec">Com recurso</span>' : ''}</div>
      <button class="pbtn ${open ? 'go' : ''}" data-cfg="${p.id}">${open ? 'Continuar' : 'Fazer prova'} ${ico('arrow')}</button>
      <div class="plinks"><button class="plink" data-open="${p.id}">PDF</button>${rec.map(r => `<button class="plink" data-open="${r.id}">${esc(r.name.replace(/^.*\)\s*-\s*/, ''))}</button>`).join('')}</div></div>`;
  };
  return `<div class="crumbs"><a href="#/">Início</a> › ${esc(clean(disc))} › Provas anteriores</div>
  <div class="pvwrap">
    <div class="pvhead"><h2>${esc(clean(disc))}${clean(disc) !== per ? ' · ' + esc(per) : ''}</h2>
      <div class="pvhb">${provas.some(p => p.q.some(q => q.s)) ? `<button class="mbtn" data-go="#/assuntos/${encodeURIComponent(path)}">🎯 Por assunto</button>` : ''}<button class="mbtn" data-go="#/f/${encodeURIComponent(path)}">${ico('folder')} Drive</button><button class="mbtn" data-go="#/historico/${encodeURIComponent(path)}">${ico('clock')} Histórico</button></div></div>
    <div class="pgrid">${provas.map(card).join('')}</div>
    ${extras.length ? `<h3 class="pvsub">Outros materiais</h3><div class="list">${extras.map(f => rowHTML(byId[f.id] || {id: f.id, name: f.name, path: ''})).join('')}</div>` : ''}
  </div>`;
}

// ---------- por assunto ----------
const AS = {path: '', sel: new Set(), q: '', lim: 0, novas: true};
const qkey = q => (q.e || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '').slice(0, 160);
// questões da disciplina agrupadas por assunto, sem repetir a mesma questão de versões diferentes
function topicsOf(path){
  const [per, disc] = discKey(path), seen = new Map(), by = new Map();
  for (const p of provasDe(per, disc).filter(p => p.kind === 'prova').sort((a, b) => b.sem.localeCompare(a.sem))) {
    p.q.forEach((q, i) => {
      if (!q.s || !q.e) return;
      const k = qkey(q), prev = seen.get(k);
      if (prev && !(prev.q.t !== 'mc' && q.t === 'mc')) return;  // prefere a versão com alternativas
      if (prev) by.get(prev.q.s).splice(by.get(prev.q.s).indexOf(prev.ref), 1);
      const ref = [p.id, i];
      seen.set(k, {q, ref});
      if (!by.has(q.s)) by.set(q.s, []);
      by.get(q.s).push(ref);
    });
  }
  return [...by.entries()].filter(([, r]) => r.length).sort((a, b) => (a[0] === 'Outros') - (b[0] === 'Outros') || b[1].length - a[1].length || a[0].localeCompare(b[0]));
}
function assHTML(path){
  if (AS.path !== path) Object.assign(AS, {path, sel: new Set(), q: ''});
  const [per, disc] = discKey(path), tops = topicsOf(path), done = doneKeys();
  const total = [...AS.sel].reduce((n, t) => n + (tops.find(x => x[0] === t)?.[1].length || 0), 0);
  return `<div class="crumbs"><a href="#/">Início</a> › ${esc(clean(disc))} › Por assunto</div>
  <div class="pvwrap">
    <div class="pvhead"><h2>🎯 ${esc(clean(disc))} por assunto</h2>
      <div class="pvhb"><button class="mbtn" data-go="#/provas/${encodeURIComponent(path)}">🗂️ Provas anteriores</button></div></div>
    <p class="muted">Os assuntos vêm dos tópicos do próprio material (HAM e Internato) ou do roteiro "Assuntos do período", escolhendo o tema mais parecido com cada questão. Questões repetidas entre semestres aparecem uma vez só.</p>
    <div class="asbar"><input id="asq" type="search" placeholder="Filtrar assuntos (ex.: diabetes, AVC, sutura)" value="${esc(AS.q)}">
      <button class="mbtn" data-asall>Marcar visíveis</button><button class="mbtn" data-asnone>Limpar</button></div>
    <div class="aslist" id="aslist">${asRows(tops, done)}</div>
    <div class="asfoot">
      <div class="asopts"><label class="asck"><input type="checkbox" data-asnovas ${AS.novas ? 'checked' : ''}> Priorizar questões que ainda não fiz</label>
        <label>Quantidade <select data-aslim>${[0, 10, 20, 30, 50].map(n => `<option value="${n}" ${AS.lim === n ? 'selected' : ''}>${n ? 'até ' + n : 'todas'}</option>`).join('')}</select></label></div>
      <button class="pbtn go" data-asgo ${total ? '' : 'disabled'}>Montar prova · ${AS.lim && total > AS.lim ? AS.lim : total} questões ${ico('arrow')}</button></div>
  </div>`;
}
function asRows(tops, done){
  const f = AS.q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const vis = tops.filter(([t]) => !f || t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(f));
  return vis.map(([t, refs]) => { const d = refs.filter(r => done.has(r.join(':'))).length;
    return `<label class="asrow ${AS.sel.has(t) ? 'on' : ''}"><input type="checkbox" data-ast="${esc(t)}" ${AS.sel.has(t) ? 'checked' : ''}><span class="ast">${esc(t)}</span><span class="asn">${refs.length} ${refs.length > 1 ? 'questões' : 'questão'}${d ? ` · ${d} ${d > 1 ? 'feitas' : 'feita'}` : ''}</span><span class="bar"><i style="width:${Math.round(d / refs.length * 100)}%"></i></span></label>`; }).join('')
    || '<div class="empty" style="padding:18px">Nenhum assunto com esse nome.</div>';
}
function buildAss(){
  const [per, disc] = discKey(AS.path), tops = topicsOf(AS.path), done = doneKeys();
  let refs = shuffle(tops.filter(([t]) => AS.sel.has(t)).flatMap(([, r]) => r));
  if (AS.novas) refs = [...refs.filter(r => !done.has(r.join(':'))), ...refs.filter(r => done.has(r.join(':')))];
  if (AS.lim) refs = refs.slice(0, AS.lim);
  const topics = [...AS.sel], id = 'as_' + sid();
  VIRT[id] = {per, disc, path: AS.path, topics, refs, title: topics.length === 1 ? topics[0] : `${topics.length} assuntos`};
  store.set('virt', VIRT); addVirtual(id, VIRT[id]);
  draft = null; location.hash = '#/config/' + id;
}

// ---------- áreas (Internato): mesma grade do período ----------
function areaHTML(path){
  const n = nodeAt(path); if (!n) return '<p>Pasta não encontrada.</p>';
  const kids = [...n.kids.values()];
  return `<div class="crumbs"><a href="#/">Início</a> › ${esc(clean(n.name))}</div>
  <div class="pvwrap"><div class="pvhead"><h2>${esc(clean(n.name))}</h2><div class="pvhb"><button class="mbtn" data-go="#/f/${encodeURIComponent(path)}">${ico('folder')} Drive</button></div></div>
  <div class="per-g area-g">${kids.map(d => { const [per, disc] = discKey(d.path), ps = provasDe(per, disc).filter(p => p.kind === 'prova'), nq = ps.reduce((a, p) => a + p.q.length, 0), pr = progress(d);
    return `<button class="disc" data-disc="${esc(d.path)}"><span class="nm">${esc(clean(d.name))}${ico('right')}</span><span class="meta"><span>${ps.length} provas · ${nq} questões</span><span>${pr.d}/${pr.t}</span></span><span class="bar"><i style="width:${pr.p}%"></i></span></button>`; }).join('')}</div></div>`;
}

// ---------- configuração ----------
let draft = null;
function cfgHTML(provaId){
  const p = PV[provaId]; if (!p) return '<p>Prova não encontrada.</p>';
  const last = store.get('lastcfg', {gab: 'depois', timer: true, pauseFb: true, shuffle: false, theme: 'dark'});
  if (!draft || draft.prova !== provaId) draft = {prova: provaId, ...last, dur: Math.max(10, Math.round(p.q.length * 3 / 5) * 5)};
  const open = sessionsOf(provaId).filter(s => !s.finished);
  const opt = (k, v, t, d, icn) => `<button class="opt ${draft[k] === v ? 'on' : ''}" data-set="${k}" data-v="${v}">${ico(icn)}<b>${t}</b><small>${d}</small></button>`;
  const tog = (k, t, i) => `<div class="setrow">${ico(i)}<span>${t}</span><button class="sw ${draft[k] ? 'on' : ''}" data-tog="${k}"><i></i></button></div>`;
  const path = backPath(provaId);
  return `<div class="cfgwrap">
    <button class="back" data-go="${path ? (p.kind === 'assunto' ? '#/assuntos/' : '#/provas/') + encodeURIComponent(path) : '#/'}">${ico('left')}</button>
    <div class="cfg">
      <div class="cfgh"><span class="chip dark">${ico('cog')} Configurar prova</span><small>Você está configurando a prova:</small><h2>${esc(clean(p.disc))} · ${esc(ptitle(p))}${p.flags.length ? ' · ' + p.flags.join(', ') : ''}</h2><p>${esc(p.title || p.per)}</p></div>
      ${open.length ? `<div class="cfgsec"><div class="opens">${open.map(s => { const sc = scoreOf(s); return `<div class="opencard"><small>PROVA EM ANDAMENTO</small><b>${sc.ans}/${sc.n} respondidas</b><span class="bar"><i style="width:${Math.round(sc.ans / sc.n * 100)}%"></i></span><small>Iniciada em ${new Date(s.start).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})}</small><div class="oacts"><button class="del" data-del="${s.id}">${ico('x')}</button><button class="cont" data-go="#/exam/${s.id}">▷ Continuar</button></div></div>`; }).join('')}</div></div>` : ''}
      <div class="cfgsec"><h4>${ico('check')} Quando o gabarito e os comentários devem aparecer?</h4>
        <div class="opts">${opt('gab', 'depois', 'Depois de responder', 'Gabarito e comentário aparecem assim que você confirma a alternativa.', 'check')}${opt('gab', 'final', 'Só no final', 'Gabarito e comentários depois de fazer todas as questões.', 'target')}${opt('gab', 'agora', 'Agora', 'Prova completa com gabarito e comentários visíveis.', 'book')}</div></div>
      <div class="cfgsec"><h4>${ico('pen')} Formato da prova</h4>
        <div class="opts two"><button class="opt on">${ico('clip')}<b>Clássico</b><small>Selecione as alternativas e avance pelas questões.</small></button><button class="opt" disabled>${ico('pen')}<b>Interativo <em>em breve</em></b><small>Rabiscar e fazer anotações (tablet/iPad).</small></button></div></div>
      <div class="cfgsec"><h4>${ico('cog')} Ajustes da prova</h4>
        <div class="sets">
          ${tog('timer', 'Usar cronômetro', 'clock')}
          ${draft.timer ? `<div class="setrow sub"><span>Duração da prova<small>${p.q.length} questões</small></span><div class="stepper"><button data-dur="-5">−</button><b>${draft.dur} min</b><button data-dur="5">+</button></div></div>` : ''}
          ${tog('pauseFb', 'Pausar o timer na resposta comentada', 'target')}
          ${tog('shuffle', 'Aleatorizar questões e alternativas', 'arrow')}
          <div class="setrow">${ico('star')}<span>Tema da interface</span><div class="seg"><button class="${draft.theme === 'dark' ? 'on' : ''}" data-set="theme" data-v="dark">Escuro</button><button class="${draft.theme === 'light' ? 'on' : ''}" data-set="theme" data-v="light">Claro</button></div></div>
        </div></div>
      <button class="start" data-start>INICIAR PROVA <span>${ico('arrow')}</span></button>
    </div></div>`;
}
function startExam(){
  const p = PV[draft.prova], {prova, ...cfg} = draft;
  store.set('lastcfg', {gab: cfg.gab, timer: cfg.timer, pauseFb: cfg.pauseFb, shuffle: cfg.shuffle, theme: cfg.theme});
  const idx = p.q.map((_, i) => i);
  const s = {id: sid(), prova, cfg, order: cfg.shuffle ? shuffle(idx) : idx, alt: {}, ans: {}, cur: 0, elapsed: 0, paused: false, start: Date.now(), finished: 0};
  if (cfg.shuffle) p.q.forEach((q, i) => { if (q.t === 'mc') s.alt[i] = shuffle(q.a.map((_, j) => j)); });
  SX.sessions[s.id] = s; saveSX(); draft = null;
  location.hash = '#/exam/' + s.id;
}

// ---------- prova ----------
const fmtT = sec => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; };
// [[IMG:arquivo]] = figura ou tabela recortada do PDF (pasta img/)
const IMGRX = /\[\[IMG:([\w.-]+)\]\]/g;
// r_*.png = trecho recortado da página em 2x: mostra no tamanho da letra
const rich = t => esc(t).replace(IMGRX, (_, f) => f.startsWith('r_')
  ? `<img class="qimg crop" src="img/${f}" alt="Trecho do PDF" onload="this.style.width=this.naturalWidth/1.3+'px'">`
  : `<img class="qimg" src="img/${f}" alt="Imagem da questão" loading="lazy" data-zoom>`);
const isFig = x => /^\[\[IMG:[\w.-]+\]\]$/.test(x.trim());
const paras = (t, cls = '') => (t || '').split('\n\n').filter(Boolean).map(x => isFig(x) ? `<figure class="qfig">${rich(x)}</figure>` : `<p class="${cls}">${rich(x)}</p>`).join('');
function comentHTML(k){
  if (!k) return '<p class="muted">Sem comentário no material original.</p>';
  return k.split('\n\n').map(x => {
    if (isFig(x)) return `<figure class="qfig">${rich(x)}</figure>`;
    let h = rich(x).replace(/\((Correta|CORRETA)\)|\bCORRETA\b\.?/g, m => `<span class="tg ok">${m}</span>`).replace(/\((Incorreta|INCORRETA)\)|\bINCORRETA\b\.?/g, m => `<span class="tg bad">${m}</span>`);
    return `<p class="${/^Refer[êe]ncia/i.test(x) ? 'ref' : ''}">${h}</p>`;
  }).join('');
}
function examHTML(id){
  const s = SX.sessions[id]; if (!s) return '<p>Sessão não encontrada. <a href="#/">Voltar</a></p>';
  if (s.finished) { location.replace('#/resultado/' + id); return ''; }
  const p = PV[s.prova], n = s.order.length, qi = s.order[s.cur], q = p.q[qi], a = s.ans[qi] || {};
  const reveal = s.cfg.gab === 'agora' || (a.done && s.cfg.gab === 'depois');
  const rem = s.cfg.timer ? s.cfg.dur * 60 - s.elapsed : s.elapsed;
  const dots = s.order.map((x, i) => { const r = s.ans[x]; const st = !r?.done ? (r?.sel != null ? 'sel' : '') : (s.cfg.gab === 'final' ? 'ans' : r.ok ? 'ok' : 'bad'); return `<button class="dot ${st} ${i === s.cur ? 'cur' : ''} ${r?.flag ? 'flag' : ''}" data-q="${i}">${i + 1}</button>`; }).join('');
  let body = '';
  if (q.t === 'mc') {
    const ord = s.alt[qi] || q.a.map((_, j) => j);
    body = `<div class="alts">${ord.map((j, k) => {
      const [L, txt] = q.a[j], struck = (a.struck || []).includes(L), sel = a.sel === L;
      let st = '';
      if (reveal) st = L === q.c ? 'right' : (sel ? 'wrong' : 'dim');
      else if (a.done) st = sel ? 'chosen' : 'dim';
      else if (sel) st = 'sel';
      return `<div class="alt ${st} ${struck ? 'struck' : ''}" data-alt="${L}"><span class="L">${LET[k]})</span><span class="tx">${rich(txt)}</span>
        ${!a.done && !reveal ? `${sel ? `<button class="ok" data-confirm title="Confirmar">${ico('check')}</button>` : ''}<button class="xx" data-strike="${L}" title="Riscar alternativa">${ico('x')}</button>` : ''}</div>`;
    }).join('')}</div>`;
    if (q.anul) body += '<p class="muted">Esta questão não tem gabarito marcado no material (possivelmente anulada).</p>';
  } else if (q.t === 'one') {
    body = !a.done && !reveal && !a.show
      ? `<div class="think"><p>Este material só traz a alternativa correta. Pense na sua resposta e depois revele.</p><button class="pbtn go" data-show>Revelar resposta ${ico('arrow')}</button></div>`
      : `<div class="alt right"><span class="L">✓</span><span class="tx">${rich(q.r)}</span></div>`;
  } else {
    body = `<textarea class="disc" data-text placeholder="Escreva sua resposta…" ${a.done ? 'disabled' : ''}>${esc(a.text || '')}</textarea>
      ${!a.done && !reveal && !a.show ? `<button class="pbtn go" data-show>Ver resposta esperada ${ico('arrow')}</button>` : ''}`;
  }
  // feedback
  let fb = '';
  const selfGrade = (q.t !== 'mc') && (a.show || reveal) && !a.done && s.cfg.gab !== 'agora';
  if (q.t === 'mc' && a.done && s.cfg.gab === 'depois') {
    const ok = a.ok, msg = ok ? ['Boa, doutor(a)!', 'good'] : ['Cuidado, doutor(a)...', 'bad'];
    fb = `<div class="fb ${msg[1]}"><div class="fbh"><span class="fbi">${ico(ok ? 'check' : 'x')}</span><div><b>${msg[0]}</b><small>A resposta correta é a ${dispL(s, qi, q.c)}</small></div>${nextBtn(s)}</div><div class="fbb">${comentHTML(q.k)}</div>${fbFoot(q)}</div>`;
  } else if (q.t === 'mc' && reveal) {
    fb = `<div class="fb neutral"><div class="fbh"><span class="fbi">${ico('book')}</span><div><b>Resposta comentada</b><small>A resposta correta é a ${dispL(s, qi, q.c)}</small></div></div><div class="fbb">${comentHTML(q.k)}</div>${fbFoot(q)}</div>`;
  } else if (q.t !== 'mc' && (a.show || reveal || a.done) && s.cfg.gab !== 'final') {
    fb = `<div class="fb ${a.done ? (a.ok ? 'good' : 'bad') : 'neutral'}"><div class="fbh"><span class="fbi">${ico('book')}</span><div><b>${q.t === 'disc' ? 'Resposta esperada' : 'Comentário'}</b><small>${a.done ? (a.ok ? 'Você marcou: acertei' : 'Você marcou: errei') : 'Compare com a sua resposta'}</small></div>${a.done ? nextBtn(s) : ''}</div><div class="fbb">${comentHTML(q.k)}</div>${fbFoot(q)}</div>`;
  }
  if (selfGrade) fb += `<div class="selfg"><span>Como você foi?</span><button class="bad" data-self="0">${ico('x')} Errei</button><button class="good" data-self="1">${ico('check')} Acertei</button></div>`;
  if (s.cfg.gab === 'final' && q.t !== 'mc' && (a.show) && !a.done) fb = `<div class="selfg"><span>Como você foi?</span><button class="bad" data-self="0">${ico('x')} Errei</button><button class="good" data-self="1">${ico('check')} Acertei</button></div>`;
  const allDone = s.order.every(x => s.ans[x]?.done);
  return `<div class="exam ${s.cfg.theme === 'light' ? 'light' : ''}">
    <div class="ebar"><div class="el"><button class="ebtn" data-home>${ico('hosp')} Início</button><button class="ebtn" data-restart>↻ Reiniciar</button><button class="ebtn" data-finish>${ico('check')} Finalizar</button></div>
      <span class="ecount">${s.cur + 1}/${n}</span>
      <div class="er"><span class="etime ${s.paused ? 'p' : ''}" id="etime">${ico('clock')} <b>${fmtT(rem)}</b>${s.paused ? ' · PAUSADO' : ''}</span><button class="sw ${s.paused ? '' : 'on'}" data-pause title="Pausar"><i></i></button><button class="ebtn sq" data-fs title="Tela cheia">${ico('expand')}</button></div></div>
    <div class="dots">${dots}</div>
    <div class="qcard">
      <div class="qh"><h3>Questão ${s.cur + 1}</h3><div class="qtools"><span class="qtype">${q.t === 'mc' ? '' : q.t === 'one' ? 'Só gabarito' : 'Discursiva'}</span><button class="ebtn ${a.flag ? 'on' : ''}" data-flag>${ico('star')} Marcar</button><button class="ebtn" data-copy>⧉ Copiar p/ IA</button></div></div>
      <div class="qtext">${paras(q.e)}</div>
      ${body}${fb}
      <div class="qnav"><button class="ebtn" data-prev ${s.cur ? '' : 'disabled'}>${ico('left')} Anterior</button>
        ${allDone || s.cur === n - 1 ? `<button class="pbtn go" data-finish>Finalizar prova ${ico('check')}</button>` : ''}
        <button class="ebtn" data-next ${s.cur < n - 1 ? '' : 'disabled'}>Próxima ${ico('right')}</button></div>
    </div></div>`;
}
const dispL = (s, qi, L) => { const ord = s.alt[qi]; if (!ord) return L; const q = PV[s.prova].q[qi]; const j = q.a.findIndex(x => x[0] === L); return LET[ord.indexOf(j)]; };
const nextBtn = s => s.cur < s.order.length - 1 ? `<button class="nextq" data-next>Próxima questão ${ico('right')}</button>` : `<button class="nextq" data-finish>Ver resultado ${ico('right')}</button>`;
const fbFoot = q => `<div class="fbf"><button class="ebtn" data-copy>⧉ Copiar questão para uma IA</button></div>`;

function questionText(s){
  const p = PV[s.prova], qi = s.order[s.cur], q = p.q[qi];
  let t = `Questão de prova de Medicina (${clean(p.disc)} ${p.refs ? PV[p.refs[qi][0]]?.sem || '' : p.sem}).\n\n${q.e}\n\n`;
  if (q.t === 'mc') { const ord = s.alt[qi] || q.a.map((_, j) => j); t += ord.map((j, k) => `${LET[k]}) ${q.a[j][1]}`).join('\n') + `\n\nGabarito oficial: ${dispL(s, qi, q.c)}`; }
  else if (q.t === 'one') t += `Resposta correta: ${q.r}`;
  if (q.k) t += `\n\nComentário oficial:\n${q.k}`;
  t = t.replace(IMGRX, '[imagem no PDF original]');
  return t + '\n\nExplique a questão, o raciocínio clínico e por que cada alternativa está certa ou errada.';
}

// ---------- resultado ----------
function resultHTML(id){
  const s = SX.sessions[id]; if (!s) return '<p>Sessão não encontrada.</p>';
  const p = PV[s.prova], sc = scoreOf(s);
  const rows = s.order.map((qi, i) => { const a = s.ans[qi] || {}, q = p.q[qi];
    return `<div class="rrow"><button class="dot ${a.done ? (a.ok ? 'ok' : 'bad') : ''}" data-review="${i}">${i + 1}</button><span>${esc(q.e.replace(/^\(.*?\)\s*/, '').slice(0, 140))}…</span><em>${!a.done ? 'em branco' : a.ok ? 'acertou' : 'errou'}</em></div>`; }).join('');
  return `<div class="cfgwrap"><button class="back" data-go="#/${p.kind === 'assunto' ? 'assuntos' : 'provas'}/${encodeURIComponent(backPath(s.prova))}">${ico('left')}</button>
    <div class="cfg"><div class="cfgh"><span class="chip dark">${ico('check')} Resultado</span><h2>${esc(clean(p.disc))} · ${esc(ptitle(p))}</h2><p>${sc.ok} de ${sc.n} questões · tempo ${fmtT(s.elapsed)}</p><div class="big-pct">${sc.pct}%</div></div>
      <div class="cfgsec"><h4>${ico('clip')} Questões</h4><p class="muted">Toque no número para revisar com o gabarito e o comentário.</p><div class="rlist">${rows}</div></div>
      <div class="cfgsec acts3"><button class="pbtn" data-redo="same">↻ Refazer com as mesmas configurações</button><button class="pbtn" data-cfg="${s.prova}">Refazer com novas configurações</button><button class="pbtn go" data-go="#/">Voltar ao início</button></div>
    </div></div>`;
}
function reviewHTML(id, i){
  const s = SX.sessions[id], p = PV[s.prova], qi = s.order[i], q = p.q[qi], a = s.ans[qi] || {};
  const alts = q.t === 'mc' ? `<div class="alts">${(s.alt[qi] || q.a.map((_, j) => j)).map((j, k) => { const [L, t] = q.a[j]; return `<div class="alt ${L === q.c ? 'right' : a.sel === L ? 'wrong' : 'dim'}"><span class="L">${LET[k]})</span><span class="tx">${rich(t)}</span></div>`; }).join('')}</div>`
    : q.t === 'one' ? `<div class="alt right"><span class="L">✓</span><span class="tx">${rich(q.r)}</span></div>` : (a.text ? `<div class="mine"><small>Sua resposta</small>${paras(a.text)}</div>` : '');
  return `<div class="exam ${s.cfg.theme === 'light' ? 'light' : ''}"><div class="ebar"><div class="el"><button class="ebtn" data-go="#/resultado/${id}">${ico('left')} Resultado</button></div><span class="ecount">${i + 1}/${s.order.length}</span><div class="er"></div></div>
    <div class="qcard"><div class="qh"><h3>Questão ${i + 1}</h3><span class="qtype">${!a.done ? 'Em branco' : a.ok ? '✓ Acertou' : '✗ Errou'}</span></div><div class="qtext">${paras(q.e)}</div>${alts}
    <div class="fb neutral"><div class="fbh"><span class="fbi">${ico('book')}</span><div><b>Resposta comentada</b>${q.t === 'mc' ? `<small>A resposta correta é a ${dispL(s, qi, q.c)}</small>` : ''}</div></div><div class="fbb">${comentHTML(q.k)}</div></div>
    <div class="qnav"><button class="ebtn" data-go="#/revisar/${id}/${i - 1}" ${i ? '' : 'disabled'}>${ico('left')} Anterior</button><button class="ebtn" data-go="#/revisar/${id}/${i + 1}" ${i < s.order.length - 1 ? '' : 'disabled'}>Próxima ${ico('right')}</button></div></div></div>`;
}

// ---------- histórico ----------
function histHTML(path){
  const [per, disc] = path ? discKey(path) : [];
  const ss = Object.values(SX.sessions).filter(s => PV[s.prova] && (!path || (PV[s.prova].per === per && PV[s.prova].disc === disc))).sort((a, b) => b.start - a.start);
  return `<div class="crumbs"><a href="#/">Início</a> › Histórico</div><div class="ph"><div><h2>Histórico de provas</h2><p>${path ? esc(clean(disc)) + ' · ' : ''}${ss.length} tentativas</p></div></div>
  <div class="list">${ss.map(s => { const p = PV[s.prova], sc = scoreOf(s); return `<div class="row"><span class="badge ${s.finished ? 'ok' : ''}">${s.finished ? sc.pct + '%' : 'Em andamento'}</span><div class="nm" data-go="${s.finished ? '#/resultado/' + s.id : '#/exam/' + s.id}"><b>${esc(clean(p.disc))} · ${esc(ptitle(p))}</b><small>${new Date(s.start).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})} · ${sc.ok}/${sc.n} certas · ${fmtT(s.elapsed)}</small></div><button class="st" data-delh="${s.id}" title="Apagar">${ico('x')}</button></div>`; }).join('') || '<div class="empty" style="padding:18px">Nenhuma prova feita ainda.</div>'}</div>`;
}

// ---------- rotas ----------
window.provaRoute = route => {
  let m;
  if ((m = route.match(/^\/provas\/(.+)/))) return provasHTML(decodeURIComponent(m[1]));
  if ((m = route.match(/^\/assuntos\/(.+)/))) return assHTML(decodeURIComponent(m[1]));
  if ((m = route.match(/^\/area\/(.+)/))) return areaHTML(decodeURIComponent(m[1]));
  if ((m = route.match(/^\/config\/(.+)/))) return cfgHTML(m[1]);
  if ((m = route.match(/^\/exam\/(.+)/))) return examHTML(m[1]);
  if ((m = route.match(/^\/resultado\/(.+)/))) return resultHTML(m[1]);
  if ((m = route.match(/^\/revisar\/([^/]+)\/(\d+)/))) return reviewHTML(m[1], +m[2]);
  if ((m = route.match(/^\/historico\/?(.*)/))) return histHTML(decodeURIComponent(m[1] || ''));
  return null;
};
window.discMenu = discMenu;

const curSession = () => { const m = (location.hash || '').match(/^#\/exam\/(.+)/); return m && SX.sessions[m[1]]; };
function finish(s){ s.finished = Date.now(); saveSX(); location.hash = '#/resultado/' + s.id; }
function commit(s, qi, ok){ const a = s.ans[qi]; a.done = 1; a.ok = ok; saveSX(); }

// ampliar imagem (fase de captura, para não marcar a alternativa ao clicar na figura)
document.addEventListener('click', e => {
  const z = e.target.closest('[data-zoom]'), box = document.getElementById('zoombox');
  if (box && e.target.closest('#zoombox')) { e.stopPropagation(); box.remove(); return; }
  if (!z) return;
  e.stopPropagation(); e.preventDefault();
  const d = document.createElement('div'); d.id = 'zoombox';
  d.innerHTML = `<img src="${z.getAttribute('src')}" alt="Imagem ampliada"><small>Toque para fechar</small>`;
  document.body.appendChild(d);
}, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('zoombox')?.remove(); });

document.addEventListener('click', e => {
  if (e.target.closest('[data-asall]')) { const f = AS.q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); topicsOf(AS.path).forEach(([t]) => { if (!f || t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(f)) AS.sel.add(t); }); render(); return; }
  if (e.target.closest('[data-asnone]')) { AS.sel.clear(); render(); return; }
  if (e.target.closest('[data-asgo]')) { buildAss(); return; }
  const t = e.target.closest('[data-disc],[data-cfg],[data-set],[data-tog],[data-dur],[data-start],[data-del],[data-alt],[data-strike],[data-confirm],[data-show],[data-self],[data-q],[data-prev],[data-next],[data-finish],[data-flag],[data-copy],[data-home],[data-restart],[data-pause],[data-fs],[data-redo],[data-review],[data-delh]');
  if (!t) return;
  const D = t.dataset;
  if (D.disc) { e.stopPropagation(); discMenu(D.disc); return; }
  if (D.cfg) { draft = null; location.hash = '#/config/' + D.cfg; return; }
  if (D.set) { draft[D.set] = D.v; render(); return; }
  if (D.tog) { draft[D.tog] = !draft[D.tog]; render(); return; }
  if (D.dur) { draft.dur = Math.max(5, draft.dur + +D.dur); render(); return; }
  if (D.start !== undefined) { startExam(); return; }
  if (D.del) { ask({title: 'Descartar prova em andamento?', text: 'Apenas este progresso será apagado. Provas concluídas continuam no histórico.', buttons: [{label: 'Cancelar'}, {label: 'Descartar progresso', cls: 'danger', go: () => { delete SX.sessions[D.del]; saveSX(); render(); }}]}); return; }
  if (D.delh) { ask({title: 'Apagar tentativa?', text: 'Ela some do histórico e do seu % de acerto.', buttons: [{label: 'Cancelar'}, {label: 'Apagar', cls: 'danger', go: () => { delete SX.sessions[D.delh]; saveSX(); render(); }}]}); return; }
  if (D.review) { location.hash = `#/revisar/${(location.hash.match(/resultado\/(.+)/) || [])[1]}/${D.review}`; return; }
  if (D.redo) { const old = SX.sessions[(location.hash.match(/resultado\/(.+)/) || [])[1]]; draft = {prova: old.prova, ...old.cfg}; startExam(); return; }
  const s = curSession(); if (!s) return;
  const p = PV[s.prova], qi = s.order[s.cur], q = p.q[qi];
  const a = s.ans[qi] = s.ans[qi] || {};
  const locked = a.done || s.cfg.gab === 'agora';
  if (D.strike) { e.stopPropagation(); if (locked) return; a.struck = a.struck || []; a.struck = a.struck.includes(D.strike) ? a.struck.filter(x => x !== D.strike) : [...a.struck, D.strike]; if (a.sel === D.strike) a.sel = null; saveSX(); render(); return; }
  if (D.confirm !== undefined) { e.stopPropagation(); if (a.sel) { commit(s, qi, a.sel === q.c); if (s.cfg.gab === 'final' && s.cur < s.order.length - 1) s.cur++; saveSX(); render(); } return; }
  if (D.alt) { if (locked || (a.struck || []).includes(D.alt)) return; a.sel = a.sel === D.alt ? null : D.alt; saveSX(); render(); return; }
  if (D.show !== undefined) { const ta = document.querySelector('[data-text]'); if (ta) a.text = ta.value; a.show = 1; saveSX(); render(); return; }
  if (D.self) { const ta = document.querySelector('[data-text]'); if (ta) a.text = ta.value; commit(s, qi, D.self === '1'); render(); return; }
  if (D.q) { s.cur = +D.q; saveSX(); render(); scrollTo(0, 0); return; }
  if (D.prev !== undefined) { s.cur = Math.max(0, s.cur - 1); saveSX(); render(); scrollTo(0, 0); return; }
  if (D.next !== undefined) { s.cur = Math.min(s.order.length - 1, s.cur + 1); saveSX(); render(); scrollTo(0, 0); return; }
  if (D.finish !== undefined) {
    const left = s.order.filter(x => !s.ans[x]?.done).length;
    if (!left) return finish(s);
    ask({title: 'Finalizar prova?', text: `Ainda há ${left} questão(ões) sem resposta. Elas contam como erradas.`, buttons: [{label: 'Continuar prova'}, {label: 'Finalizar', cls: 'danger', go: () => finish(s)}]}); return;
  }
  if (D.flag !== undefined) { a.flag = !a.flag; saveSX(); render(); return; }
  if (D.copy !== undefined) { navigator.clipboard?.writeText(questionText(s)).then(() => toast('Questão copiada'), () => toast('Não foi possível copiar')); return; }
  if (D.home !== undefined) { ask({title: 'Voltar para a tela inicial?', text: 'A prova fica salva e você pode continuar depois pela página da disciplina.', buttons: [{label: 'Cancelar'}, {label: 'Sair da prova', cls: 'danger', go: () => location.hash = '#/'}]}); return; }
  if (D.restart !== undefined) { ask({title: 'Reiniciar prova?', text: 'Você vai recomeçar do zero. Todas as respostas e marcações atuais serão perdidas.', buttons: [{label: 'Cancelar'}, {label: 'Reiniciar', cls: 'danger', go: () => { s.ans = {}; s.cur = 0; s.elapsed = 0; s.paused = false; saveSX(); render(); }}]}); return; }
  if (D.pause !== undefined) { s.paused = !s.paused; saveSX(); render(); return; }
  if (D.fs !== undefined) { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); return; }
}, true);

document.addEventListener('change', e => {
  const t = e.target;
  if (t.matches('[data-ast]')) { t.checked ? AS.sel.add(t.dataset.ast) : AS.sel.delete(t.dataset.ast); render(); }
  else if (t.matches('[data-asnovas]')) AS.novas = t.checked;
  else if (t.matches('[data-aslim]')) { AS.lim = +t.value; render(); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'asq') { AS.q = e.target.value; document.getElementById('aslist').innerHTML = asRows(topicsOf(AS.path), doneKeys()); return; } if (e.target.matches('[data-text]')) { const s = curSession(); if (!s) return; const qi = s.order[s.cur]; (s.ans[qi] = s.ans[qi] || {}).text = e.target.value; clearTimeout(e.target._t); e.target._t = setTimeout(saveSX, 400); } });

// cronômetro
setInterval(() => {
  const s = curSession(); if (!s || s.finished || s.paused || document.hidden) return;
  const qi = s.order[s.cur], a = s.ans[qi];
  if (s.cfg.pauseFb && a?.done && s.cfg.gab === 'depois') return;
  s.elapsed++;
  if (s.elapsed % 5 === 0) saveSX();
  const el = document.querySelector('#etime b');
  if (s.cfg.timer) { const rem = s.cfg.dur * 60 - s.elapsed; if (el) el.textContent = fmtT(rem); if (rem <= 0) { toast('Tempo esgotado'); finish(s); } }
  else if (el) el.textContent = fmtT(s.elapsed);
}, 1000);

render();
