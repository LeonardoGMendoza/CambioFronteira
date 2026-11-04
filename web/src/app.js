// CambioFronteira: compara as casas de câmbio da fronteira (tipo Trivago) e tem um assistente de IA por voz.
// Com o servidor ligado, usa as cotações reais e a IA da Oracle; sem ele, usa dados-exemplo.json e responde por regra.

const API_PADRAO = 'https://cambio.sandlj.com.br';
function apiUrl() {
  const q = new URLSearchParams(location.search).get('api');
  try {
    if (q !== null) { localStorage.setItem('cf.api', q); return q; }
    const salvo = localStorage.getItem('cf.api');
    return salvo !== null ? salvo : API_PADRAO;
  } catch (e) { return q || API_PADRAO; }
}
const API = apiUrl().replace(/\/$/, '');

const T = {
  pt: {
    comecar: '👋 Toque para conversar', carregando: 'Chamando a atendente…', ola: 'Oi! Sou a atendente do CambioFronteira. Me diga quanto quer trocar e eu mostro onde paga mais.', parceiros: 'Parceiros', promos: 'Uniformes & Faculdades',
    titulo: 'Onde trocar dinheiro hoje na fronteira?', subtitulo: 'Compare as casas de câmbio de Ciudad del Este e Foz do Iguaçu e veja qual paga mais.',
    valor: 'Quanto você quer trocar', de: 'Tenho', para: 'Quero', inverter: 'Inverter moedas', todas: 'Todas as cidades',
    exemplo: 'Valores de EXEMPLO: ainda não são cotações reais. Confirme sempre no balcão.',
    atualizado: (d) => `Atualizado em ${d}. A cotação muda durante o dia.`, recebe: 'Você recebe', taxa: (t, de, para) => `1 ${de} = ${t} ${para}`,
    mais: (v) => `+ ${v} que a pior`, melhor: 'Melhor taxa', parceiro: 'Parceiro', comoChegar: 'Como chegar', whatsapp: 'WhatsApp',
    patrocinado: 'Patrocinado', anuncie: 'Anuncie aqui', nada: 'Nenhuma casa tem cotação para essa troca ainda.',
    iaTitulo: 'Pergunte à IA', iaSub: 'Ex.: "Onde troco 2 mil reais por guaranis?" Toque no microfone e fale.',
    placeholder: 'Escreva ou fale sua pergunta', enviar: 'Enviar', falar: 'Falar', pensando: 'Pensando…', semMic: 'Este navegador não ouve a voz. Use o Chrome ou o Safari.',
    demo: 'Modo demo: respondo com a tabela de exemplo.', erro: 'Tive um problema agora. Tente de novo.',
    rodape: 'Cotações informadas pelas casas. O CambioFronteira não faz câmbio: apenas compara.',
    resposta: (v, casa, cid, rec, eco) => `Para trocar ${v}, a melhor opção é ${casa} (${cid}): você recebe ${rec}. Em relação à pior, você ganha ${eco}.`,
    avisoEx: ' Atenção: são valores de exemplo, não cotações reais.'
  },
  es: {
    comecar: '👋 Toca para conversar', carregando: 'Llamando a la asistente…', ola: '¡Hola! Soy la asistente de CambioFronteira. Dime cuánto quieres cambiar y te muestro dónde pagan más.', parceiros: 'Socios', promos: 'Uniformes y Facultades',
    titulo: '¿Dónde cambiar dinero hoy en la frontera?', subtitulo: 'Compara las casas de cambio de Ciudad del Este y Foz do Iguaçu y mira cuál paga más.',
    valor: 'Cuánto quieres cambiar', de: 'Tengo', para: 'Quiero', inverter: 'Invertir monedas', todas: 'Todas las ciudades',
    exemplo: 'Valores de EJEMPLO: todavía no son cotizaciones reales. Confirma siempre en ventanilla.',
    atualizado: (d) => `Actualizado el ${d}. La cotización cambia durante el día.`, recebe: 'Recibes', taxa: (t, de, para) => `1 ${de} = ${t} ${para}`,
    mais: (v) => `+ ${v} que la peor`, melhor: 'Mejor tasa', parceiro: 'Socio', comoChegar: 'Cómo llegar', whatsapp: 'WhatsApp',
    patrocinado: 'Patrocinado', anuncie: 'Anuncia aquí', nada: 'Ninguna casa tiene cotización para ese cambio todavía.',
    iaTitulo: 'Pregúntale a la IA', iaSub: 'Ej.: "¿Dónde cambio 2 mil reales a guaraníes?" Toca el micrófono y habla.',
    placeholder: 'Escribe o di tu pregunta', enviar: 'Enviar', falar: 'Hablar', pensando: 'Pensando…', semMic: 'Este navegador no escucha la voz. Usa Chrome o Safari.',
    demo: 'Modo demo: respondo con la tabla de ejemplo.', erro: 'Tuve un problema. Intenta de nuevo.',
    rodape: 'Cotizaciones informadas por las casas. CambioFronteira no hace cambio: solo compara.',
    resposta: (v, casa, cid, rec, eco) => `Para cambiar ${v}, la mejor opción es ${casa} (${cid}): recibes ${rec}. Frente a la peor, ganas ${eco}.`,
    avisoEx: ' Ojo: son valores de ejemplo, no cotizaciones reales.'
  },
  en: {
    comecar: '👋 Tap to talk', carregando: 'Calling the assistant…', ola: "Hi! I'm the CambioFronteira assistant. Tell me how much you want to exchange and I'll show you where it pays the most.", parceiros: 'Partners', promos: 'Uniforms & Universities',
    titulo: 'Where to exchange money at the border today?', subtitulo: 'Compare exchange houses in Ciudad del Este and Foz do Iguaçu and see which pays the most.',
    valor: 'How much to exchange', de: 'I have', para: 'I want', inverter: 'Swap currencies', todas: 'All cities',
    exemplo: 'SAMPLE values: not real rates yet. Always confirm at the counter.',
    atualizado: (d) => `Updated ${d}. Rates change during the day.`, recebe: 'You get', taxa: (t, de, para) => `1 ${de} = ${t} ${para}`,
    mais: (v) => `+ ${v} vs the worst`, melhor: 'Best rate', parceiro: 'Partner', comoChegar: 'Directions', whatsapp: 'WhatsApp',
    patrocinado: 'Sponsored', anuncie: 'Advertise here', nada: 'No exchange house has a rate for this yet.',
    iaTitulo: 'Ask the AI', iaSub: 'E.g.: "Where do I exchange 2,000 reais for guaranis?" Tap the mic and speak.',
    placeholder: 'Type or say your question', enviar: 'Send', falar: 'Speak', pensando: 'Thinking…', semMic: "This browser can't hear voice. Use Chrome or Safari.",
    demo: 'Demo mode: I answer from the sample table.', erro: 'Something went wrong. Try again.',
    rodape: 'Rates provided by the exchange houses. CambioFronteira does not exchange money: it only compares.',
    resposta: (v, casa, cid, rec, eco) => `To exchange ${v}, the best option is ${casa} (${cid}): you get ${rec}. Compared with the worst, you gain ${eco}.`,
    avisoEx: ' Note: these are sample values, not real rates.'
  }
};
const LOCALE = { pt: 'pt-BR', es: 'es-PY', en: 'en-US' };
const MOEDAS = [['BRL', 'R$', '🇧🇷 Real'], ['PYG', 'Gs', '🇵🇾 Guaraní'], ['USD', 'US$', '🇺🇸 Dólar'], ['ARS', 'AR$', '🇦🇷 Peso']];
const DECIMAIS = { PYG: 0, ARS: 0, BRL: 2, USD: 2 };
const simbolo = (m) => (MOEDAS.find(x => x[0] === m) || [m, m])[1];

const ler = (k, p) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : p; } catch (e) { return p; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const lang0 = (navigator.language || 'pt').slice(0, 2);
let idioma = ler('cf.idioma', T[lang0] ? lang0 : 'pt');
let busca = ler('cf.busca', { valor: 1000, de: 'BRL', para: 'PYG', cidade: '' });
let dados = null, online = false;
const conversa = [];
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const t = () => T[idioma];
const fmt = (v, m) => `${simbolo(m)} ${new Intl.NumberFormat(LOCALE[idioma], { minimumFractionDigits: DECIMAIS[m] ?? 2, maximumFractionDigits: DECIMAIS[m] ?? 2 }).format(v)}`;
const fmtTaxa = (v) => new Intl.NumberFormat(LOCALE[idioma], { maximumSignificantDigits: 6 }).format(v);

// ---------- dados ----------
async function carregar() {
  if (API) {
    try {
      const r = await fetch(API + '/api/casas', { cache: 'no-store' });
      if (r.ok) { dados = await r.json(); online = true; return; }
    } catch (e) { /* sem servidor: usa o exemplo */ }
  }
  dados = await (await fetch('./dados-exemplo.json')).json();
}

// mesmo cálculo do servidor (backend/app/cambio.py)
function comparar({ de, para, valor, cidade }) {
  const par = `${de}>${para}`;
  const lista = (dados.casas || [])
    .filter(c => (!cidade || c.cidade === cidade) && c.cotacoes && c.cotacoes[par])
    .map(c => ({ ...c, taxa: c.cotacoes[par], recebe: valor * c.cotacoes[par] }))
    .sort((a, b) => b.recebe - a.recebe);
  const pior = lista.length ? lista[lista.length - 1].recebe : 0;
  lista.forEach((c, i) => { c.posicao = i + 1; c.a_mais = c.recebe - pior; });
  return lista;
}

function registrar(tipo, id) {
  if (!online) return;
  try { fetch(API + '/api/clique', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo, id }), keepalive: true }); } catch (e) {}
}

// ---------- tela ----------
function cidades() { return [...new Set((dados.casas || []).map(c => c.cidade).filter(Boolean))]; }

function telaBusca() {
  const x = t();
  const opcoes = (sel) => MOEDAS.map(([c, , n]) => `<option value="${c}" ${c === sel ? 'selected' : ''} title="${n.slice(5)}">${n.slice(0, 4)} ${c}</option>`).join('');
  return `
  <form class="busca" id="busca" onsubmit="return false">
    <label class="v">${x.valor}<input id="valor" type="number" inputmode="decimal" min="1" step="any" value="${busca.valor}"></label>
    <label>${x.de}<select id="de">${opcoes(busca.de)}</select></label>
    <button type="button" class="inverter" id="inverter" aria-label="${x.inverter}" title="${x.inverter}">⇄</button>
    <label>${x.para}<select id="para">${opcoes(busca.para)}</select></label>
  </form>
  <div class="cidades" role="group">
    <button type="button" class="chip" data-cidade="" aria-pressed="${!busca.cidade}">${x.todas}</button>
    ${cidades().map(c => `<button type="button" class="chip" data-cidade="${esc(c)}" aria-pressed="${busca.cidade === c}">${esc(c)}</button>`).join('')}
  </div>
  <div id="resultado"></div>
  <section class="ia" aria-labelledby="iaTit">
    <h2 id="iaTit">🤖 ${x.iaTitulo}</h2><p class="sub">${x.iaSub}</p>
    <div class="conversa" id="conversa" aria-live="polite"></div>
    <form class="perg" id="perg">
      <button type="button" class="mic" id="mic" aria-label="${x.falar}">🎤</button>
      <input id="txt" type="text" placeholder="${esc(x.placeholder)}" autocomplete="off" required>
      <button class="btn prim" type="submit">${x.enviar}</button>
    </form>
  </section>`;
}

function anuncios(tipo) {
  return (dados.anuncios || []).filter(a => a.ativo && (a.tipo || 'banner') === tipo && (!a.cidade || !busca.cidade || a.cidade === busca.cidade));
}
const txt = (o) => (o && (o[idioma] || o.pt)) || '';
function linkAnuncio(a) {
  const zap = dados.anuncie && dados.anuncie.whatsapp;
  return a.link || (a.id === 'anuncie' && zap ? `https://wa.me/${zap}` : '');
}
function anuncioHtml() {
  const x = t(), lista = anuncios('banner');
  if (!lista.length) return '';
  const item = (a) => {
    const cor = a.cor || '#0f8b5f', link = linkAnuncio(a);
    const corpo = `<span class="ic" style="background:${esc(cor)}">${esc(a.icone || '📣')}</span>
      <span><span class="tag">${x.patrocinado}</span><b>${esc(txt(a.titulo))}</b><small>${esc(txt(a.texto))}</small></span>`;
    const estilo = `style="background:${esc(cor)}1a;border-color:${esc(cor)}55"`;
    return link ? `<a class="parceiro" ${estilo} href="${esc(link)}" target="_blank" rel="noopener sponsored" data-ad="${esc(a.id)}">${corpo}</a>`
                : `<div class="parceiro" ${estilo}>${corpo}</div>`;
  };
  return `<div class="carrossel" id="carrossel" aria-label="${x.parceiros}">${lista.map(item).join('')}</div>`;
}
function promosHtml() {
  const x = t(), lista = anuncios('promo');
  if (!lista.length) return '';
  const item = (a) => {
    const corpo = `<span class="selo-p" style="background:${esc(a.cor || '#0f8b5f')}">${esc(a.selo || '')}</span><b>${esc(txt(a.titulo))}</b><span class="cta">${esc(txt(a.texto))} ›</span>`;
    const estilo = `style="background-image:url('${esc(a.imagem || '')}')"`;
    const link = linkAnuncio(a);
    return link ? `<a class="promo" ${estilo} href="${esc(link)}" target="_blank" rel="noopener sponsored" data-ad="${esc(a.id)}">${corpo}</a>`
                : `<div class="promo" ${estilo}>${corpo}</div>`;
  };
  return `<h2 class="titulo-sec">${x.promos}</h2><div class="promos">${lista.map(item).join('')}</div>`;
}

function telaResultado() {
  const x = t(), lista = comparar(busca);
  const data = dados.atualizado_em ? new Date(dados.atualizado_em).toLocaleString(LOCALE[idioma], { dateStyle: 'short', timeStyle: 'short' }) : '';
  const cartoes = lista.map(c => `
    <li class="casa ${c.posicao === 1 ? 'melhor' : ''}">
      <div class="pos">${c.posicao}</div>
      <div><div class="nome">${esc(c.nome)}</div><div class="onde">📍 ${esc([c.bairro, c.cidade].filter(Boolean).join(' · '))}</div>
        <div class="selos">${c.posicao === 1 ? `<span class="selo top">⭐ ${x.melhor}</span>` : ''}${c.parceiro ? `<span class="selo parc">${x.parceiro}</span>` : ''}</div></div>
      <div class="valor"><div class="taxa">${x.recebe}</div><div class="recebe">${fmt(c.recebe, busca.para)}</div>
        <div class="taxa">${x.taxa(fmtTaxa(c.taxa), busca.de, busca.para)}</div>
        ${c.a_mais > 0 ? `<div class="mais">${x.mais(fmt(c.a_mais, busca.para))}</div>` : ''}</div>
      ${c.mapa || c.whatsapp ? `<div class="acoes">
        ${c.mapa ? `<a class="btn" href="${esc(c.mapa)}" target="_blank" rel="noopener" data-clique="mapa" data-id="${esc(c.id)}">🗺️ ${x.comoChegar}</a>` : ''}
        ${c.whatsapp ? `<a class="btn prim" href="https://wa.me/${esc(c.whatsapp)}" target="_blank" rel="noopener" data-clique="whatsapp" data-id="${esc(c.id)}">💬 ${x.whatsapp}</a>` : ''}
      </div>` : ''}
    </li>`).join('');
  return `${dados.exemplo ? `<div class="aviso">⚠️ ${x.exemplo}</div>` : ''}
    ${anuncioHtml()}
    ${data ? `<p class="info">${x.atualizado(data)}</p>` : ''}
    ${lista.length ? `<ol class="lista">${cartoes}</ol>` : `<div class="vazio">${x.nada}</div>`}
    ${promosHtml()}`;
}

function telaConversa() {
  $('#conversa').innerHTML = conversa.map(m => `<div class="msg ${m.quem}">${esc(m.chave ? t()[m.chave] : m.texto)}</div>`).join('');
}

function atualizarResultado() {
  $('#resultado').innerHTML = telaResultado();
  document.querySelectorAll('[data-clique]').forEach(a => a.onclick = () => registrar(a.dataset.clique, a.dataset.id));
  document.querySelectorAll('[data-ad]').forEach(ad => ad.onclick = () => registrar('anuncio', ad.dataset.ad));
  gravar('cf.busca', busca);
}

let timerCarrossel = null;
function rodarCarrossel() {
  clearInterval(timerCarrossel);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  timerCarrossel = setInterval(() => {
    const c = $('#carrossel'); if (!c || c.matches(':hover')) return;
    const fimLinha = c.scrollLeft + c.clientWidth >= c.scrollWidth - 4;
    c.scrollTo({ left: fimLinha ? 0 : c.scrollLeft + c.firstElementChild.offsetWidth + 12, behavior: 'smooth' });
  }, 4000);
}
function render() {
  const x = t();
  document.documentElement.lang = idioma;
  document.querySelectorAll('.idiomas button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === idioma)));
  $('#titulo').textContent = x.titulo; $('#subtitulo').textContent = x.subtitulo; $('#rodape').textContent = x.rodape;
  $('#app').innerHTML = telaBusca();
  atualizarResultado(); telaConversa(); ligar(); rodarCarrossel();
}

// ---------- assistente ----------
const MOEDA_PALAVRAS = [['BRL', /\b(reales|reais|real|r\$|brl)\b/], ['PYG', /\b(guaranis?|guaranies|gs|pyg)\b/], ['USD', /\b(dolar|dolares|us\$|usd|dollars?)\b/], ['ARS', /\b(pesos?|ars)\b/]];
const semAcento = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function entender(texto) {
  const s = semAcento(texto);
  const achadas = MOEDA_PALAVRAS.map(([c, re]) => { const m = s.match(re); return m ? [m.index, c] : null; }).filter(Boolean).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const n = s.match(/(\d{1,3}(?:[.\s]\d{3})+|\d+)(?:,(\d+))?\s*(mil)?/);
  let valor = busca.valor;
  if (n) { valor = parseFloat(n[1].replace(/[.\s]/g, '') + (n[2] ? '.' + n[2] : '')); if (n[3]) valor *= 1000; }
  let de = busca.de, para = busca.para;
  if (achadas.length >= 2) [de, para] = achadas;
  else if (achadas.length === 1) { de = achadas[0]; para = de === 'PYG' ? 'BRL' : 'PYG'; }
  return { de, para, valor };
}
function respostaLocal(texto) {
  const x = t(), q = entender(texto), lista = comparar({ ...q, cidade: '' });
  Object.assign(busca, q); // a tabela acompanha a pergunta
  if (!lista.length) return x.nada;
  const m = lista[0];
  return x.resposta(fmt(q.valor, q.de), m.nome, m.cidade, fmt(m.recebe, q.para), fmt(m.a_mais, q.para)) + (dados.exemplo ? x.avisoEx : '');
}

async function perguntar(texto) {
  const x = t();
  conversa.push({ quem: 'eu', texto }, { quem: 'bot', texto: x.pensando }); telaConversa();
  let resposta = null;
  if (online) {
    try {
      const r = await fetch(API + '/api/perguntar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto, idioma }) });
      if (r.ok) { const j = await r.json(); resposta = j.resposta; if (j.comparacao) Object.assign(busca, { de: j.comparacao.de, para: j.comparacao.para, valor: j.comparacao.valor }); }
    } catch (e) { /* cai na resposta local */ }
  }
  if (!resposta) resposta = respostaLocal(texto);
  conversa[conversa.length - 1].texto = resposta;
  const foco = document.activeElement && document.activeElement.id;
  render();
  if (foco === 'txt') $('#txt').focus();
  falar(resposta);
}

// ---------- atendente 3D ----------
let atendente = null, audioLiberado = false;
function vozDoIdioma() {
  const lang = LOCALE[idioma], vozes = ('speechSynthesis' in window) ? speechSynthesis.getVoices() : [];
  const nota = (v) => (v.lang.replace('_', '-') === lang ? 100 : v.lang.startsWith(lang.slice(0, 2)) ? 60 : 0) + (/female|mulher|mujer|francisca|tania|maria|luciana|paulina|helena|zira|samantha/i.test(v.name) ? 20 : 0) + (/natural|neural|online|premium|enhanced/i.test(v.name) ? 30 : 0);
  return { lang, voz: vozes.slice().sort((a, b) => nota(b) - nota(a))[0] };
}
async function iniciarAtendente() {
  $('#status').textContent = t().carregando;
  $('#comecar').hidden = true;
  try {
    const { Atendente } = await import('./atendente.js');
    atendente = new Atendente($('#avatar'));
    await atendente.carregar();
    $('#status').textContent = '';
  } catch (e) {
    console.warn('atendente 3D indisponível', e);
    atendente = null; $('#status').textContent = '🤖';
  }
  $('#comecar').textContent = t().comecar;
  $('#comecar').hidden = audioLiberado;
}
async function falar(texto) {
  $('#balao').textContent = texto;
  const info = { ...vozDoIdioma(), dito: texto.replace(/AR\$ /g, 'pesos ').replace(/US\$ /g, 'dólares ').replace(/R\$ /g, 'reais ').replace(/Gs /g, 'guaranis ') };
  if (atendente) { atendente.liberarAudio(); return atendente.falar(texto, info); }
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(info.dito); u.lang = info.lang; if (info.voz) u.voice = info.voz;
  speechSynthesis.speak(u);
}
function liberarAudio() {
  if (audioLiberado) return;
  audioLiberado = true; $('#comecar').hidden = true;
  if (atendente) atendente.liberarAudio();
}

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
function ouvir() {
  if (!SR) { conversa.push({ quem: 'bot', chave: 'semMic' }); telaConversa(); return; }
  if (rec) { rec.stop(); return; }
  rec = new SR(); rec.lang = LOCALE[idioma]; rec.interimResults = false;
  $('#mic').dataset.ouvindo = '1';
  rec.onresult = (e) => { const txt = e.results[0][0].transcript; if (txt) perguntar(txt); };
  rec.onend = rec.onerror = () => { rec = null; const m = $('#mic'); if (m) m.dataset.ouvindo = ''; };
  try { liberarAudio(); if (atendente) atendente.parar(); else if ('speechSynthesis' in window) speechSynthesis.cancel(); rec.start(); } catch (e) { rec = null; }
}

// ---------- eventos ----------
function ligar() {
  $('#valor').oninput = (e) => { const v = parseFloat(e.target.value); if (v > 0) { busca.valor = v; atualizarResultado(); } };
  $('#de').onchange = (e) => { busca.de = e.target.value; if (busca.de === busca.para) busca.para = busca.de === 'PYG' ? 'BRL' : 'PYG'; render(); };
  $('#para').onchange = (e) => { busca.para = e.target.value; if (busca.de === busca.para) busca.de = busca.para === 'PYG' ? 'BRL' : 'PYG'; render(); };
  $('#inverter').onclick = () => { [busca.de, busca.para] = [busca.para, busca.de]; render(); };
  document.querySelectorAll('[data-cidade]').forEach(b => b.onclick = () => { busca.cidade = b.dataset.cidade; render(); });
  $('#perg').onsubmit = (e) => { e.preventDefault(); liberarAudio(); const txt = $('#txt').value.trim(); if (txt) { $('#txt').value = ''; perguntar(txt); } };
  $('#mic').onclick = ouvir;
}
document.querySelectorAll('.idiomas button').forEach(b => b.onclick = () => { idioma = b.dataset.lang; gravar('cf.idioma', idioma); render(); if (!audioLiberado) $('#comecar').textContent = t().comecar; });
$('#comecar').onclick = () => { liberarAudio(); if (atendente) atendente.acenar(); falar(t().ola); };

await carregar();
iniciarAtendente();
if (!online) conversa.push({ quem: 'bot', chave: 'demo' });
render();
