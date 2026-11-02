import './style.css'
import {
  createBattleScore,
  deleteBattleScore,
  fetchLeaderboard,
  fetchMyScores,
  supabase,
  updateBattleScore,
} from './supabase.js'

const app = document.querySelector('#app')
const crewmateStorageKey = 'battle-quest-crewmates'

const state = {
  playerName: 'Hero',
  playerHealth: 100,
  enemyHealth: 100,
  score: 0,
  battleOver: false,
  turn: 1,
  log: [],
  leaderboard: [],
  myScores: [],
  user: null,
  crewmates: [],
  editingCrewmateId: null,
}

app.innerHTML = `
  <div class="battle-shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">Arena</p>
        <h1>Battle Quest</h1>
      </div>
      <div class="status-pill">
        <span class="status-dot"></span>
        <span id="status-label">Ready</span>
      </div>
    </header>

    <nav class="page-nav" aria-label="Game pages">
      <a href="/#battle" data-page-link="battle">Battle</a>
      <a href="/#crew-summary" data-page-link="crew-summary">Crewmates <span id="nav-crewmate-count">0</span></a>
    </nav>

    <main>
      <div id="battle-page">
    <section class="player-panel">
      <label for="player-name">Hero name</label>
      <input id="player-name" maxlength="20" value="Hero" />
    </section>

    <section class="crewmate-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Build your team</p>
          <h2>Crewmates</h2>
        </div>
        <span id="crewmate-count" class="crewmate-count">0 crew</span>
      </div>
      <form id="crewmate-form" class="crewmate-form">
        <div class="crewmate-field">
          <label for="crewmate-name">Name</label>
          <input id="crewmate-name" name="name" maxlength="24" placeholder="e.g. Nova" required />
        </div>
        <div class="crewmate-field">
          <label for="crewmate-role">Role</label>
          <select id="crewmate-role" name="role">
            <option>Pilot</option>
            <option>Engineer</option>
            <option>Medic</option>
            <option>Scout</option>
            <option>Defender</option>
          </select>
        </div>
        <div class="crewmate-field">
          <label for="crewmate-health">Health</label>
          <input id="crewmate-health" name="health" type="number" min="1" max="200" value="100" required />
        </div>
        <div class="crewmate-field">
          <label for="crewmate-attack">Attack</label>
          <input id="crewmate-attack" name="attack" type="number" min="1" max="50" value="10" required />
        </div>
        <div class="crewmate-field">
          <label for="crewmate-defense">Defense</label>
          <input id="crewmate-defense" name="defense" type="number" min="0" max="30" value="5" required />
        </div>
        <button type="submit" class="mini-btn crewmate-submit">Add crewmate</button>
      </form>
      <p id="crewmate-status" class="supabase-status" aria-live="polite"></p>
      <ul id="crewmate-list" class="crewmate-list"></ul>
    </section>

    <section class="arena">
      <div class="fighter-card player-card">
        <div class="fighter-header">
          <span class="tag">You</span>
          <span id="player-score">Score: 0</span>
        </div>
        <div class="fighter-name">${state.playerName}</div>
        <div class="health-bar">
          <div id="player-health-bar" class="health-fill player-fill"></div>
        </div>
        <div class="health-text"><span id="player-health-value">100</span> / 100 HP</div>
      </div>

      <div class="versus">VS</div>

      <div class="fighter-card enemy-card">
        <div class="fighter-header">
          <span class="tag enemy-tag">Enemy</span>
          <span id="enemy-score">Turn: 1</span>
        </div>
        <div class="fighter-name">Shadow Warden</div>
        <div class="health-bar enemy-bar">
          <div id="enemy-health-bar" class="health-fill enemy-fill"></div>
        </div>
        <div class="health-text"><span id="enemy-health-value">100</span> / 100 HP</div>
      </div>
    </section>

    <section class="controls">
      <button class="action-btn attack" data-action="attack">Attack</button>
      <button class="action-btn heavy" data-action="heavy">Heavy Strike</button>
      <button class="action-btn heal" data-action="heal">Heal</button>
      <button class="action-btn retreat" data-action="surrender">Surrender</button>
    </section>

    <section class="log-panel">
      <h2>Battle log</h2>
      <ul id="battle-log"></ul>
    </section>

    <section class="leaderboard-panel">
      <div class="auth-panel">
        <h2>Player account</h2>
        <form id="auth-form">
          <label for="auth-email">Email</label>
          <input id="auth-email" type="email" autocomplete="email" required />
          <label for="auth-password">Password</label>
          <input id="auth-password" type="password" autocomplete="current-password" minlength="6" required />
          <div class="auth-actions">
            <button type="submit" class="mini-btn" data-auth-action="sign-in">Sign in</button>
            <button type="submit" class="mini-btn" data-auth-action="sign-up">Create account</button>
            <button type="button" id="sign-out" class="mini-btn" hidden>Sign out</button>
          </div>
        </form>
        <p id="auth-status" class="supabase-status" aria-live="polite"></p>
      </div>
      <div class="leaderboard-header">
        <h2>Leaderboard</h2>
        <button id="refresh-scoreboard" class="mini-btn">Refresh</button>
      </div>
      <div id="supabase-status" class="supabase-status"></div>
      <ol id="leaderboard-list"></ol>
      <h2 class="my-scores-heading">Your saved battles</h2>
      <ul id="my-scores-list"></ul>
    </section>
      </div>

    <section id="crew-summary-page" hidden>
      <section class="crew-summary-panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Your team</p>
            <h2>Crewmate summary</h2>
          </div>
          <span id="summary-crewmate-count" class="crewmate-count">0 crew members</span>
        </div>
        <p class="crew-summary-intro">All the crewmates you have added, with their roles and attributes.</p>
        <ul id="crew-summary-list" class="crewmate-list"></ul>
        <a class="mini-btn add-crew-link" href="/#battle">Add a crewmate</a>
      </section>
    </section>

    <section id="crew-profile-page" hidden>
      <article id="crew-profile-content" class="crew-profile-panel"></article>
    </section>
    </main>
  </div>
`

const pageLinks = document.querySelectorAll('[data-page-link]')
const battlePage = document.querySelector('#battle-page')
const crewSummaryPage = document.querySelector('#crew-summary-page')
const crewProfilePage = document.querySelector('#crew-profile-page')
const crewProfileContent = document.querySelector('#crew-profile-content')
const playerNameInput = document.querySelector('#player-name')
const crewmateForm = document.querySelector('#crewmate-form')
const crewmateNameInput = document.querySelector('#crewmate-name')
const crewmateRoleInput = document.querySelector('#crewmate-role')
const crewmateHealthInput = document.querySelector('#crewmate-health')
const crewmateAttackInput = document.querySelector('#crewmate-attack')
const crewmateDefenseInput = document.querySelector('#crewmate-defense')
const crewmateStatus = document.querySelector('#crewmate-status')
const crewmateList = document.querySelector('#crewmate-list')
const crewmateCount = document.querySelector('#crewmate-count')
const navCrewmateCount = document.querySelector('#nav-crewmate-count')
const summaryCrewmateCount = document.querySelector('#summary-crewmate-count')
const crewSummaryList = document.querySelector('#crew-summary-list')
const playerHealthBar = document.querySelector('#player-health-bar')
const enemyHealthBar = document.querySelector('#enemy-health-bar')
const playerHealthValue = document.querySelector('#player-health-value')
const enemyHealthValue = document.querySelector('#enemy-health-value')
const playerScoreLabel = document.querySelector('#player-score')
const enemyScoreLabel = document.querySelector('#enemy-score')
const battleLog = document.querySelector('#battle-log')
const leaderboardList = document.querySelector('#leaderboard-list')
const supabaseStatus = document.querySelector('#supabase-status')
const statusLabel = document.querySelector('#status-label')
const refreshButton = document.querySelector('#refresh-scoreboard')
const authForm = document.querySelector('#auth-form')
const authEmailInput = document.querySelector('#auth-email')
const authPasswordInput = document.querySelector('#auth-password')
const authStatus = document.querySelector('#auth-status')
const signOutButton = document.querySelector('#sign-out')
const myScoresList = document.querySelector('#my-scores-list')

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function updateStats() {
  playerHealthValue.textContent = state.playerHealth
  enemyHealthValue.textContent = state.enemyHealth
  playerScoreLabel.textContent = `Score: ${state.score}`
  enemyScoreLabel.textContent = `Turn: ${state.turn}`
  playerHealthBar.style.width = `${state.playerHealth}%`
  enemyHealthBar.style.width = `${state.enemyHealth}%`
  playerNameInput.value = state.playerName
}

function addLog(message) {
  state.log.unshift(message)
  battleLog.innerHTML = state.log
    .slice(0, 7)
    .map((entry) => `<li>${entry}</li>`)
    .join('')
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])
}

function isValidCrewmate(crewmate) {
  return crewmate
    && typeof crewmate.id === 'string'
    && typeof crewmate.name === 'string'
    && crewmate.name.trim().length > 0
    && typeof crewmate.role === 'string'
    && Number.isInteger(crewmate.health)
    && crewmate.health >= 1
    && crewmate.health <= 200
    && Number.isInteger(crewmate.attack)
    && crewmate.attack >= 1
    && crewmate.attack <= 50
    && Number.isInteger(crewmate.defense)
    && crewmate.defense >= 0
    && crewmate.defense <= 30
}

function renderCrewmates() {
  const countText = `${state.crewmates.length} ${state.crewmates.length === 1 ? 'crew member' : 'crew members'}`
  crewmateCount.textContent = countText
  navCrewmateCount.textContent = state.crewmates.length
  summaryCrewmateCount.textContent = countText

  if (state.crewmates.length === 0) {
    crewmateList.innerHTML = '<li class="empty-crew">Your crew is waiting to be assembled.</li>'
    crewSummaryList.innerHTML = '<li class="empty-crew">No crewmates added yet. Head to the battle page to assemble your crew.</li>'
    return
  }

  const crewCards = state.crewmates.map((crewmate) => {
    if (state.editingCrewmateId === crewmate.id) {
      return `
        <li class="crewmate-card">
          <form class="crewmate-edit-form" data-crewmate-edit-form="${escapeHtml(crewmate.id)}">
            <label>
              <span>Name</span>
              <input name="name" maxlength="24" value="${escapeHtml(crewmate.name)}" required />
            </label>
            <label>
              <span>Role</span>
              <select name="role">
                ${['Pilot', 'Engineer', 'Medic', 'Scout', 'Defender'].map((role) => `
                  <option${crewmate.role === role ? ' selected' : ''}>${role}</option>
                `).join('')}
              </select>
            </label>
            <div class="crewmate-edit-attributes">
              <label><span>Health</span><input name="health" type="number" min="1" max="200" value="${crewmate.health}" required /></label>
              <label><span>Attack</span><input name="attack" type="number" min="1" max="50" value="${crewmate.attack}" required /></label>
              <label><span>Defense</span><input name="defense" type="number" min="0" max="30" value="${crewmate.defense}" required /></label>
            </div>
            <div class="crewmate-edit-actions">
              <button type="submit" class="mini-btn">Save</button>
              <button type="button" class="mini-btn" data-cancel-edit>Cancel</button>
            </div>
          </form>
        </li>
      `
    }

    return `
      <li class="crewmate-card">
        <div class="crewmate-card-header">
          <div>
            <a class="crewmate-profile-link" href="/crewmates/${encodeURIComponent(crewmate.id)}">${escapeHtml(crewmate.name)}</a>
            <span class="crewmate-role">${escapeHtml(crewmate.role)}</span>
          </div>
          <span class="crewmate-card-actions">
            <button type="button" class="mini-btn" data-edit-crewmate="${escapeHtml(crewmate.id)}" aria-label="Edit ${escapeHtml(crewmate.name)}">Edit</button>
            <button type="button" class="mini-btn danger-btn" data-remove-crewmate="${escapeHtml(crewmate.id)}" aria-label="Remove ${escapeHtml(crewmate.name)}">Remove</button>
          </span>
        </div>
        <dl class="crewmate-attributes">
          <div><dt>Health</dt><dd>${crewmate.health}</dd></div>
          <div><dt>Attack</dt><dd>${crewmate.attack}</dd></div>
          <div><dt>Defense</dt><dd>${crewmate.defense}</dd></div>
        </dl>
      </li>
    `
  }).join('')
  crewmateList.innerHTML = crewCards
  crewSummaryList.innerHTML = crewCards
}

function getCrewmateIdFromPath() {
  const match = window.location.pathname.match(/^\/crewmates\/([^/]+)\/?$/)
  if (!match) return null

  try {
    return decodeURIComponent(match[1])
  } catch {
    return ''
  }
}

function renderCrewmateProfile(crewmateId) {
  const crewmate = state.crewmates.find((entry) => entry.id === crewmateId)
  if (!crewmate) {
    crewProfileContent.innerHTML = `
      <p class="eyebrow">Crewmate profile</p>
      <h2>Crewmate not found</h2>
      <p class="crew-profile-intro">This crewmate may have been removed or the profile link may be incorrect.</p>
      <a class="mini-btn add-crew-link" href="/#crew-summary">Back to crewmates</a>
    `
    return
  }

  const profilePath = `/crewmates/${encodeURIComponent(crewmate.id)}`
  const profileUrl = new URL(profilePath, window.location.origin).href
  const roleDescriptions = {
    Pilot: 'Navigates the crew through dangerous territory.',
    Engineer: 'Keeps equipment and systems running smoothly.',
    Medic: 'Supports the crew and patches them up after a fight.',
    Scout: 'Explores ahead and spots potential threats.',
    Defender: 'Stands guard and protects the rest of the crew.',
  }

  crewProfileContent.innerHTML = `
    <a class="profile-back-link" href="/#crew-summary">← All crewmates</a>
    <p class="eyebrow">Crewmate profile</p>
    <div class="crew-profile-heading">
      <div>
        <h2>${escapeHtml(crewmate.name)}</h2>
        <span class="crewmate-role">${escapeHtml(crewmate.role)}</span>
      </div>
      <span class="crew-profile-badge">Crew member</span>
    </div>
    <p class="crew-profile-intro">${escapeHtml(roleDescriptions[crewmate.role] ?? 'A valued member of your crew.')}</p>
    <dl class="crew-profile-attributes">
      <div><dt>Health</dt><dd>${crewmate.health}<span> HP</span></dd></div>
      <div><dt>Attack</dt><dd>${crewmate.attack}</dd></div>
      <div><dt>Defense</dt><dd>${crewmate.defense}</dd></div>
    </dl>
    <div class="crew-profile-url">
      <span>Direct profile link</span>
      <a href="${escapeHtml(profilePath)}"><code>${escapeHtml(profileUrl)}</code></a>
    </div>
  `
}

function updatePageView() {
  const crewmateId = getCrewmateIdFromPath()
  const page = crewmateId !== null
    ? 'crew-profile'
    : window.location.hash === '#crew-summary'
      ? 'crew-summary'
      : 'battle'
  if (page === 'crew-profile') renderCrewmateProfile(crewmateId)
  battlePage.hidden = page !== 'battle'
  crewSummaryPage.hidden = page !== 'crew-summary'
  crewProfilePage.hidden = page !== 'crew-profile'
  pageLinks.forEach((link) => {
    if (link.dataset.pageLink === (page === 'crew-profile' ? 'crew-summary' : page)) {
      link.setAttribute('aria-current', 'page')
    } else {
      link.removeAttribute('aria-current')
    }
  })
}

function saveCrewmates() {
  try {
    localStorage.setItem(crewmateStorageKey, JSON.stringify(state.crewmates))
    return true
  } catch (error) {
    crewmateStatus.textContent = `Crewmates could not be saved on this device: ${error.message}`
    return false
  }
}

function loadCrewmates() {
  try {
    const savedCrewmates = localStorage.getItem(crewmateStorageKey)
    if (!savedCrewmates) return

    const parsedCrewmates = JSON.parse(savedCrewmates)
    if (!Array.isArray(parsedCrewmates) || !parsedCrewmates.every(isValidCrewmate)) {
      crewmateStatus.textContent = 'Saved crewmates could not be loaded because the stored data is invalid.'
      return
    }

    state.crewmates = parsedCrewmates
  } catch (error) {
    crewmateStatus.textContent = `Crewmates could not be loaded: ${error.message}`
  }
}

function finishBattle(victory) {
  state.battleOver = true
  const outcome = victory ? 'Victory!' : 'Defeat...'
  statusLabel.textContent = outcome
  addLog(`${outcome} Final score: ${state.score}`)

  const heroName = playerNameInput.value.trim() || 'Hero'
  state.playerName = heroName
  updateStats()

  if (!supabase) {
    addLog('Supabase is not configured. Add the project URL and publishable key to enable score saving.')
  } else if (!state.user) {
    addLog('Sign in to save this score to your account.')
  } else {
    createBattleScore(heroName, state.score, state.user.id)
      .then(({ error }) => {
        if (error) {
          authStatus.textContent = `Could not save score: ${error.message}`
          return
        }
        addLog('Battle score saved to your account.')
        loadLeaderboard()
        loadMyScores()
      })
      .catch((error) => {
        authStatus.textContent = `Could not save score: ${error.message}`
      })
  }

  document.querySelectorAll('.action-btn').forEach((button) => {
    button.disabled = true
  })
}

function enemyTurn() {
  if (state.battleOver) return

  const damage = randomInt(8, 20)
  state.playerHealth = Math.max(0, state.playerHealth - damage)
  state.turn += 1
  addLog(`Enemy hits for ${damage} damage.`)
  updateStats()

  if (state.playerHealth <= 0) {
    finishBattle(false)
    return
  }

  statusLabel.textContent = 'Your move'
}

function performAttack(type) {
  if (state.battleOver) return

  let damage = 0

  if (type === 'attack') {
    damage = randomInt(16, 26)
  }

  if (type === 'heavy') {
    damage = randomInt(24, 38)
    const missChance = Math.random() < 0.2
    if (missChance) {
      addLog('Heavy strike missed!')
      enemyTurn()
      return
    }
  }

  state.enemyHealth = Math.max(0, state.enemyHealth - damage)
  state.score += damage
  addLog(`You deal ${damage} damage.`)
  updateStats()

  if (state.enemyHealth <= 0) {
    finishBattle(true)
    return
  }

  enemyTurn()
}

function heal() {
  if (state.battleOver) return

  const healAmount = randomInt(12, 24)
  state.playerHealth = Math.min(100, state.playerHealth + healAmount)
  addLog(`You heal for ${healAmount} HP.`)
  updateStats()
  enemyTurn()
}

function surrender() {
  if (state.battleOver) return
  state.score = Math.max(0, state.score - 10)
  addLog('You retreat from the battle.')
  finishBattle(false)
}

function renderLeaderboard(entries) {
  if (!entries || entries.length === 0) {
    leaderboardList.innerHTML = '<li>No scores yet. Start the battle!</li>'
    return
  }

  leaderboardList.innerHTML = entries
    .slice(0, 5)
    .map((entry, index) => `<li><span>#${index + 1} ${escapeHtml(entry.name)}</span><strong>${escapeHtml(entry.score)}</strong></li>`)
    .join('')
}

function renderMyScores(entries) {
  if (!state.user) {
    myScoresList.innerHTML = '<li>Sign in to manage your saved battles.</li>'
    return
  }

  if (!entries || entries.length === 0) {
    myScoresList.innerHTML = '<li>No saved battles yet.</li>'
    return
  }

  myScoresList.innerHTML = entries.map((entry) => `
    <li>
      <span>${escapeHtml(entry.name)} — ${escapeHtml(entry.score)} points</span>
      <span class="score-actions">
        <button type="button" class="mini-btn" data-score-action="edit" data-score-id="${escapeHtml(entry.id)}">Edit</button>
        <button type="button" class="mini-btn danger-btn" data-score-action="delete" data-score-id="${escapeHtml(entry.id)}">Delete</button>
      </span>
    </li>
  `).join('')
}

async function loadLeaderboard() {
  const { data, error, disabled } = await fetchLeaderboard()

  if (disabled) {
    supabaseStatus.textContent = 'Supabase is not connected. Add your VITE_ env vars.'
    renderLeaderboard([])
    return
  }

  if (error) {
    const message = error.code === 'PGRST204' || error.message.includes('relation')
      ? 'No battle_scores table yet. Create it in Supabase to enable the leaderboard.'
      : error.message

    supabaseStatus.textContent = message
    renderLeaderboard([])
    return
  }

  state.leaderboard = data ?? []
  renderLeaderboard(state.leaderboard)
  supabaseStatus.textContent = 'Connected to Supabase leaderboard.'
}

async function loadMyScores() {
  if (!state.user) {
    state.myScores = []
    renderMyScores([])
    return
  }

  const { data, error } = await fetchMyScores(state.user.id)
  if (error) {
    authStatus.textContent = `Could not load your saved battles: ${error.message}`
    return
  }

  state.myScores = data ?? []
  renderMyScores(state.myScores)
}

function updateAuthUi() {
  const signedIn = Boolean(state.user)
  authEmailInput.hidden = signedIn
  authPasswordInput.hidden = signedIn
  authForm.querySelectorAll('[data-auth-action]').forEach((button) => {
    button.hidden = signedIn
  })
  signOutButton.hidden = !signedIn
  authStatus.textContent = signedIn
    ? `Signed in as ${state.user.email}. Your saved battle records are editable below.`
    : supabase
      ? 'Sign in or create an account to save and manage your scores.'
      : 'Configure Supabase to enable accounts and score management.'
  renderMyScores(state.myScores)
}

async function handleAuth(action) {
  if (!supabase) {
    authStatus.textContent = 'Supabase is not configured. Add the project URL and publishable key.'
    return
  }

  const email = authEmailInput.value.trim()
  const password = authPasswordInput.value
  const result = action === 'sign-up'
    ? await supabase.auth.signUp({ email, password })
    : await supabase.auth.signInWithPassword({ email, password })

  if (result.error) {
    authStatus.textContent = result.error.message
    return
  }

  if (action === 'sign-up' && !result.data.session) {
    authStatus.textContent = 'Account created. Check your email to confirm it, then sign in.'
  } else {
    authStatus.textContent = 'Authentication successful.'
  }
}

playerNameInput.addEventListener('input', (event) => {
  state.playerName = event.target.value || 'Hero'
  updateStats()
})

crewmateForm.addEventListener('submit', (event) => {
  event.preventDefault()

  const crewmate = {
    id: crypto.randomUUID(),
    name: crewmateNameInput.value.trim(),
    role: crewmateRoleInput.value,
    health: Number(crewmateHealthInput.value),
    attack: Number(crewmateAttackInput.value),
    defense: Number(crewmateDefenseInput.value),
  }

  if (!isValidCrewmate(crewmate)) {
    crewmateStatus.textContent = 'Enter a name and valid attributes within the shown ranges.'
    return
  }

  state.crewmates.push(crewmate)
  renderCrewmates()
  const saved = saveCrewmates()
  crewmateForm.reset()
  crewmateHealthInput.value = '100'
  crewmateAttackInput.value = '10'
  crewmateDefenseInput.value = '5'
  if (saved) crewmateStatus.textContent = `${crewmate.name} joined your crew.`
})

function handleCrewmateListClick(event) {
  const editButton = event.target.closest('[data-edit-crewmate]')
  if (editButton) {
    state.editingCrewmateId = editButton.dataset.editCrewmate
    renderCrewmates()
    return
  }

  if (event.target.closest('[data-cancel-edit]')) {
    state.editingCrewmateId = null
    renderCrewmates()
    return
  }

  const button = event.target.closest('[data-remove-crewmate]')
  if (!button) return

  state.crewmates = state.crewmates.filter((crewmate) => crewmate.id !== button.dataset.removeCrewmate)
  if (state.editingCrewmateId === button.dataset.removeCrewmate) state.editingCrewmateId = null
  renderCrewmates()
  const saved = saveCrewmates()
  if (saved) crewmateStatus.textContent = 'Crewmate removed.'
}

function handleCrewmateEdit(event) {
  const form = event.target.closest('[data-crewmate-edit-form]')
  if (!form) return
  event.preventDefault()

  const currentCrewmate = state.crewmates.find((crewmate) => crewmate.id === form.dataset.crewmateEditForm)
  if (!currentCrewmate) return

  const formData = new FormData(form)
  const updatedCrewmate = {
    ...currentCrewmate,
    name: String(formData.get('name')).trim(),
    role: String(formData.get('role')),
    health: Number(formData.get('health')),
    attack: Number(formData.get('attack')),
    defense: Number(formData.get('defense')),
  }

  if (!isValidCrewmate(updatedCrewmate)) {
    crewmateStatus.textContent = 'Enter a name and valid attributes within the shown ranges.'
    return
  }

  state.crewmates = state.crewmates.map((crewmate) => (
    crewmate.id === updatedCrewmate.id ? updatedCrewmate : crewmate
  ))
  state.editingCrewmateId = null
  renderCrewmates()
  const saved = saveCrewmates()
  if (saved) crewmateStatus.textContent = `${updatedCrewmate.name} updated.`
}

crewmateList.addEventListener('click', handleCrewmateListClick)
crewSummaryList.addEventListener('click', handleCrewmateListClick)
crewmateList.addEventListener('submit', handleCrewmateEdit)
crewSummaryList.addEventListener('submit', handleCrewmateEdit)
window.addEventListener('hashchange', updatePageView)
window.addEventListener('popstate', updatePageView)

document.querySelectorAll('.action-btn').forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.action

    if (action === 'attack') {
      performAttack('attack')
    }

    if (action === 'heavy') {
      performAttack('heavy')
    }

    if (action === 'heal') {
      heal()
    }

    if (action === 'surrender') {
      surrender()
    }
  })
})

refreshButton.addEventListener('click', () => {
  loadLeaderboard()
})

authForm.addEventListener('submit', (event) => {
  event.preventDefault()
  const action = event.submitter?.dataset.authAction
  if (action) handleAuth(action)
})

signOutButton.addEventListener('click', async () => {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) authStatus.textContent = `Could not sign out: ${error.message}`
})

myScoresList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-score-action]')
  if (!button || !state.user) return

  const entry = state.myScores.find((score) => score.id === button.dataset.scoreId)
  if (!entry) return

  if (button.dataset.scoreAction === 'delete') {
    if (!window.confirm(`Delete the saved battle "${entry.name}"?`)) return

    const { error } = await deleteBattleScore(entry.id, state.user.id)
    if (error) {
      authStatus.textContent = `Could not delete score: ${error.message}`
      return
    }
    authStatus.textContent = 'Battle score deleted.'
  } else if (button.dataset.scoreAction === 'edit') {
    const name = window.prompt('Edit hero name:', entry.name)
    if (name === null) return
    const scoreText = window.prompt('Edit score:', String(entry.score))
    if (scoreText === null) return
    const score = Number(scoreText)
    if (!name.trim() || name.trim().length > 24 || !Number.isInteger(score) || score < 0) {
      authStatus.textContent = 'Enter a name of 1–24 characters and a non-negative whole-number score.'
      return
    }

    const { error } = await updateBattleScore(entry.id, state.user.id, name, score)
    if (error) {
      authStatus.textContent = `Could not update score: ${error.message}`
      return
    }
    authStatus.textContent = 'Battle score updated.'
  }

  await Promise.all([loadMyScores(), loadLeaderboard()])
})

if (supabase) {
  const { data, error } = await supabase.auth.getSession()
  if (error) authStatus.textContent = `Could not check sign-in status: ${error.message}`
  state.user = data?.session?.user ?? null
  updateAuthUi()
  await loadMyScores()

  supabase.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user ?? null
    updateAuthUi()
    loadMyScores()
  })
} else {
  updateAuthUi()
}

state.log = [
  'The arena doors open. Your battle begins!',
  'Shadow Warden advances toward you.',
]

updateStats()
loadCrewmates()
renderCrewmates()
updatePageView()
addLog('Prepare your strategy.')
loadLeaderboard()
