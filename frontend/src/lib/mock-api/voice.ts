export interface BayoReply {
  text: string
  suggestedAction?: string
}

export async function transcribeVoice(
  _blob: Blob,
  context: string,
): Promise<string> {
  await new Promise((r) => setTimeout(r, 800))
  if (context.includes('accept')) return 'Accept am.'
  if (context.includes('jobs')) return 'Read me new jobs.'
  if (context.includes('finish')) return 'I don finish.'
  if (context.includes('balance')) return 'Wetin be my balance?'
  return 'Yes Bayo, read am.'
}

export async function bayoRespond(
  transcript: string,
  context: string,
): Promise<BayoReply> {
  await new Promise((r) => setTimeout(r, 1200))
  const lower = transcript.toLowerCase()

  if (lower.includes('accept') || context.includes('accept-job')) {
    return {
      text: 'I don accept the job. Funmi go see say you dey come. Make I tell her wetin time you go reach there?',
      suggestedAction: 'accept_hero_job',
    }
  }
  if (lower.includes('30') || lower.includes('minute')) {
    return {
      text: 'Done. Go safe, Tunde.',
      suggestedAction: 'set_en_route',
    }
  }
  if (lower.includes('job') || lower.includes('read')) {
    return {
      text: "She talk say: 'Generator no dey start. Service Sunday is in 6 hours.' Wetin you wan do?",
      suggestedAction: 'prompt_accept',
    }
  }
  if (lower.includes('balance')) {
    return {
      text: 'You get ₦17,575 wey dem release yesterday, and ₦18,500 still dey escrow for Funmi job.',
    }
  }
  if (lower.includes('finish')) {
    return {
      text: 'I go mark the job complete. Funmi go receive notification to confirm.',
      suggestedAction: 'mark_complete',
    }
  }

  return {
    text: 'Welcome back Tunde. You get one new job from Funmi for ₦18,500. Phase 2. You wan make I read am for you?',
  }
}
