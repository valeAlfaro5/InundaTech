import { useEffect, useState, useRef } from "react"
import { db } from "../firebaseClient"
import { onValue, ref } from "firebase/database"

export function useRTDB(path) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const unsubRef = useRef(null)

  useEffect(() => {
    const r = ref(db, path)
    const unsub = onValue(
      r,
      (snap) => {
        setData(snap.val())
        setError(null)
      },
      (err) => setError(err?.message || "Error en RTDB")
    )
    unsubRef.current = unsub
    return () => unsub()
  }, [path])

  return { data, error }
}
