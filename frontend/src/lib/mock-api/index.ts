/** Mock API — full implementation in PROMPT 2 */
export async function resetDemo(): Promise<void> {
  localStorage.removeItem('steward_demo_v2')
}

export const mockApi = {
  resetDemo,
}
