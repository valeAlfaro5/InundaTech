import { useEffect, useState } from "react";
import { db } from "../firebaseClient";
import { onValue, ref } from "firebase/database";

export function useRTDBConnection() {
  const [conn, setConn] = useState("connecting"); // "connecting" | "connected" | "disconnected"

  useEffect(() => {
    const connectedRef = ref(db, ".info/connected");
    const unsub = onValue(connectedRef, (snap) => {
      setConn(snap.val() ? "connected" : "disconnected");
    });
    return () => unsub();
  }, []);

  return conn;
}
