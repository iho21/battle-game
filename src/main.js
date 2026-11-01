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

    <section class="player-panel">
      <label for="player-name">Hero name</label>
      <input id="player-name" maxlength="20" value="Hero" />
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
`

const playerNameInput = document.querySelector('#player-name')
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
addLog('Prepare your strategy.')
loadLeaderboard()
