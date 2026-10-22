import { useState } from 'react'

/** Opens the shared boy profile modal from any dashboard row. */
export function useBoyDrawer() {
  const [boy, setBoy] = useState(null)
  const open = (b) =>
    setBoy(
      typeof b === 'object'
        ? { id: b.id ?? b.boy_id, boy_name: b.boy_name, class_id: b.class_id }
        : { id: Number(b), boy_name: `ولد #${b}` },
    )
  return [boy, open, () => setBoy(null)]
}
