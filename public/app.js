import { songs } from './catalog.js';
import { matchesQuery, matchesText } from './query.js';

const $ = selector => document.querySelector(selector);
const state = { search: '', query: '', chip: '', playlist: JSON.parse(localStorage.getItem('visor-playlist') || '[]') };
const chipOptions = [
  ['Alla visor', ''], ['Pippi', 'universe:Pippi'], ['Emil', 'universe:Emil'], ['Läggdags', 'occasion:läggdags'], ['Lek & rörelse', 'occasion:rörelselek'], ['Med ljud', 'media:midi']
];

const esc = value => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const youtubeUrl = song => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.title} ${song.composer.join(' ')}`)}`;
const metadata = song => [
  ['Berättelsevärld', song.universe], ['Text', song.lyricist.join(', ')], ['Musik', song.composer.join(', ')],
  ['Källa', song.source], ['Passar', song.occasions.join(', ')], ['Ålder', song.ages], ['Rättigheter', song.rights === 'public-domain' ? 'Traditionell / fri' : 'Upphovsrättsskyddad']
];

function filteredSongs() {
  try {
    $('#query-help').classList.remove('error');
    const query = state.query || state.chip;
    return songs.filter(song => matchesText(song, state.search) && matchesQuery(song, query));
  } catch (error) {
    $('#query-help').textContent = error.message;
    $('#query-help').classList.add('error');
    return [];
  }
}

function renderSongs() {
  const list = filteredSongs();
  $('#result-count').textContent = `${list.length} ${list.length === 1 ? 'visa' : 'visor'}`;
  $('#empty').hidden = list.length > 0;
  $('#song-grid').innerHTML = list.map(song => `
    <article class="song-card ${song.color}" data-id="${song.id}">
      <button class="card-main" data-open="${song.id}" aria-label="Visa ${esc(song.title)}">
        <div class="album-art"><span>♫</span><small>${esc(song.universe.split(' ')[0])}</small></div>
        <div class="card-copy"><div class="card-kicker">${esc(song.universe)}</div><h3>${esc(song.title)}</h3><p>${esc(song.composer.join(', '))}</p>
          <div class="tag-row">${song.moods.slice(0, 2).map(tag => `<span>${esc(tag)}</span>`).join('')}</div>
        </div><span class="chevron">›</span>
      </button>
      <button class="add-button ${state.playlist.includes(song.id) ? 'added' : ''}" data-add="${song.id}" aria-label="Lägg till ${esc(song.title)} i spellistan">${state.playlist.includes(song.id) ? '✓' : '+'}</button>
    </article>`).join('');
}

function renderChips() {
  $('#chips').innerHTML = chipOptions.map(([label, query]) => `<button class="chip ${state.chip === query ? 'active' : ''}" data-chip="${esc(query)}">${esc(label)}</button>`).join('');
}

function openSong(id) {
  const song = songs.find(item => item.id === id);
  $('#song-detail').innerHTML = `
    <button class="dialog-close" data-close aria-label="Stäng">×</button>
    <div class="detail-art ${song.color}"><span>♫</span><small>${esc(song.universe)}</small></div>
    <p class="eyebrow">${esc(song.source)}</p><h2>${esc(song.title)}</h2><p class="detail-note">${esc(song.note)}</p>
    <div class="detail-tags">${[...song.themes, ...song.moods].map(tag => `<span>${esc(tag)}</span>`).join('')}</div>
    <dl>${metadata(song).map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>
    <div class="rights-note">${song.rights === 'copyright' ? 'Text och noter visas inte i prototypen eftersom verket är upphovsrättsskyddat.' : 'Traditionell visa. Demon är en förenklad synttolkning.'}</div>
    <div class="detail-actions">
      ${song.media.includes('midi') ? `<button class="primary" data-play="${song.id}">▶ Spela demo</button>` : ''}
      <a class="secondary" href="${youtubeUrl(song)}" target="_blank" rel="noopener">Sök på YouTube ↗</a>
      <button class="secondary" data-add="${song.id}">${state.playlist.includes(song.id) ? '✓ I spellistan' : '+ Lägg i spellistan'}</button>
    </div>`;
  if (!$('#song-dialog').open) $('#song-dialog').showModal();
}

function savePlaylist() {
  localStorage.setItem('visor-playlist', JSON.stringify(state.playlist));
  renderPlaylist(); renderSongs();
}

function togglePlaylistSong(id) {
  state.playlist = state.playlist.includes(id) ? state.playlist.filter(item => item !== id) : [...state.playlist, id];
  savePlaylist(); toast(state.playlist.includes(id) ? 'Tillagd i spellistan' : 'Borttagen från spellistan');
  if ($('#song-dialog').open) openSong(id);
}

function renderPlaylist() {
  const selected = state.playlist.map(id => songs.find(song => song.id === id)).filter(Boolean);
  $('#playlist-count').textContent = selected.length;
  $('#playlist-empty').hidden = selected.length > 0;
  $('#playlist-items').innerHTML = selected.map((song, index) => `<li><span class="track-number">${index + 1}</span><button data-open="${song.id}"><strong>${esc(song.title)}</strong><small>${esc(song.universe)}</small></button><button class="remove" data-remove="${song.id}" aria-label="Ta bort ${esc(song.title)}">×</button></li>`).join('');
  $('#play-all').disabled = !selected.some(song => song.media.includes('midi'));
}

function setPlaylist(open) {
  $('#playlist').classList.toggle('open', open); $('#playlist').setAttribute('aria-hidden', String(!open));
  $('#playlist-toggle').setAttribute('aria-expanded', String(open)); $('#scrim').hidden = !open;
}

function playDemo() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContext();
  const notes = [392, 440, 494, 523, 523, 523, 494, 440, 392, 392, 392];
  notes.forEach((frequency, index) => {
    const osc = context.createOscillator(); const gain = context.createGain(); const start = context.currentTime + index * .32;
    osc.type = 'triangle'; osc.frequency.value = frequency; gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(.18, start + .025); gain.gain.exponentialRampToValueAtTime(.0001, start + .28);
    osc.connect(gain).connect(context.destination); osc.start(start); osc.stop(start + .3);
  });
  toast('Spelar en kort syntdemo');
}

let toastTimer;
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200); }

document.addEventListener('click', event => {
  const target = event.target.closest('button, a'); if (!target) return;
  if (target.dataset.open) openSong(target.dataset.open);
  if (target.dataset.add) togglePlaylistSong(target.dataset.add);
  if (target.dataset.remove) { state.playlist = state.playlist.filter(id => id !== target.dataset.remove); savePlaylist(); }
  if (target.dataset.play) playDemo();
  if (target.dataset.close) $('#song-dialog').close();
  if (target.dataset.chip !== undefined) { state.chip = target.dataset.chip; state.query = ''; $('#query').value = ''; renderChips(); renderSongs(); }
});
$('#search').addEventListener('input', event => { state.search = event.target.value; renderSongs(); });
$('#run-query').addEventListener('click', () => { state.query = $('#query').value; state.chip = ''; renderChips(); renderSongs(); });
$('#query').addEventListener('keydown', event => { if (event.key === 'Enter') $('#run-query').click(); });
$('#clear-filters').addEventListener('click', () => { state.search = state.query = state.chip = ''; $('#search').value = $('#query').value = ''; renderChips(); renderSongs(); });
$('#playlist-toggle').addEventListener('click', () => setPlaylist(true)); $('#playlist-close').addEventListener('click', () => setPlaylist(false)); $('#scrim').addEventListener('click', () => setPlaylist(false));
$('#clear-playlist').addEventListener('click', () => { state.playlist = []; savePlaylist(); });
$('#play-all').addEventListener('click', playDemo);
$('#song-dialog').addEventListener('click', event => { if (event.target === $('#song-dialog')) $('#song-dialog').close(); });
renderChips(); renderSongs(); renderPlaylist();
