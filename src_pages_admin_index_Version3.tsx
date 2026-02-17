import React, { useEffect, useState } from "react";

export default function AdminPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const token = typeof window !== "undefined" ? localStorage.getItem("jme_token") : "";

  useEffect(()=>{ fetchAll(); }, []);

  async function fetchAll(){
    if(!token) return;
    const headers = { Authorization: "Bearer " + token };
    const p = await fetch("/api/admin/payouts", { headers }).then(r=>r.json());
    setPayouts(p.data || []);
  }

  async function process(payoutId: string){
    await fetch("/api/payouts/processProvider", { method:"POST", headers:{ "Content-Type":"application/json", Authorization:"Bearer "+token }, body: JSON.stringify({ payoutId })});
    fetchAll();
  }

  return (
    <div style={{padding:20}}>
      <h1>Admin — Jeferson Money Earns</h1>
      <div>
        {payouts.map(p => (
          <div key={p.id} style={{background:"#07162a", padding:12, marginBottom:8}}>
            <div>{p.id} — User: {p.userId} — S/{(p.amount/100).toFixed(2)} — {p.status}</div>
            {p.status === "pending" && <button onClick={()=>process(p.id)} style={{marginTop:6}}>Procesar</button>}
          </div>
        ))}
      </div>
    </div>
  );
}