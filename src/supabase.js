import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null

export async function fetchLeaderboard() {
  if (!supabase) {
    return { data: [], error: null, disabled: true }
  }

  const { data, error } = await supabase
    .from('battle_scores')
    .select('id, name, score, owner_id')
    .order('score', { ascending: false })
    .limit(5)

  return { data, error, disabled: false }
}

export async function fetchMyScores(ownerId) {
  if (!supabase || !ownerId) {
    return { data: [], error: null }
  }

  const { data, error } = await supabase
    .from('battle_scores')
    .select('id, name, score, owner_id')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(25)

  return { data, error }
}

export async function createBattleScore(playerName, score, ownerId) {
  if (!supabase || !ownerId) {
    return { data: null, error: new Error('Sign in before saving a battle score.') }
  }

  const { data, error } = await supabase
    .from('battle_scores')
    .insert({
      name: String(playerName || 'Hero').trim().slice(0, 24) || 'Hero',
      score: Math.max(0, Math.floor(Number(score) || 0)),
      owner_id: ownerId,
    })
    .select('id, name, score, owner_id')
    .single()

  return { data, error }
}

export async function updateBattleScore(id, ownerId, playerName, score) {
  if (!supabase || !ownerId) {
    return { data: null, error: new Error('Sign in before editing a battle score.') }
  }

  const { data, error } = await supabase
    .from('battle_scores')
    .update({
      name: String(playerName || 'Hero').trim().slice(0, 24) || 'Hero',
      score: Math.floor(Number(score)),
    })
    .eq('id', id)
    .eq('owner_id', ownerId)
    .select('id, name, score, owner_id')
    .single()

  return { data, error }
}

export async function deleteBattleScore(id, ownerId) {
  if (!supabase || !ownerId) {
    return { error: new Error('Sign in before deleting a battle score.') }
  }

  const { error } = await supabase
    .from('battle_scores')
    .delete()
    .eq('id', id)
    .eq('owner_id', ownerId)

  return { error }
}
