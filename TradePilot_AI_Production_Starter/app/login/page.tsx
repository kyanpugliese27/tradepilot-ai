"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [message,setMessage]=useState("");

  async function submit() {
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if(!url||!key){setMessage("Supabase is not connected yet. Use the dashboard demo for now.");return;}
    const supabase=createBrowserClient(url,key);
    const {error}=await supabase.auth.signInWithPassword({email,password});
    setMessage(error?error.message:"Signed in successfully.");
  }

  return (
    <main className="shell">
      <div className="form card">
        <div className="brand">TradePilot <span>AI</span></div>
        <h1>Welcome back</h1>
        <label>Email</label>
        <input className="input" value={email} onChange={e=>setEmail(e.target.value)} type="email"/>
        <label>Password</label>
        <input className="input" value={password} onChange={e=>setPassword(e.target.value)} type="password"/>
        <button className="button" style={{width:"100%"}} onClick={submit}>Log in</button>
        {message&&<p className="muted">{message}</p>}
        <p className="muted">Not connected yet? <Link className="green" href="/dashboard">Open the demo dashboard.</Link></p>
      </div>
    </main>
  );
}
