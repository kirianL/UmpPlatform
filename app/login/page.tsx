"use client";

import { useState, useEffect } from "react";
import { ArrowLeftIcon, SpinnerIcon } from "@phosphor-icons/react/dist/ssr";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al iniciar sesión");
      }

      window.location.href = data.redirect || "/analytics";
    } catch (err: any) {
      setError(err.message || "Credenciales incorrectas");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-dvh w-screen flex-col justify-between overflow-hidden bg-grayscale-1 text-grayscale-12 p-6 font-sans">
      
      {/* Top Header Row */}
      <div className="flex items-center justify-between w-full animate-fade-in">
        <button 
          type="button"
          onClick={() => window.history.back()} 
          className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-grayscale-3 bg-grayscale-1 text-grayscale-11 hover:bg-grayscale-2 active:scale-95 transition-all dark:border-grayscale-4 dark:bg-grayscale-2 dark:hover:bg-grayscale-3"
        >
          <ArrowLeftIcon size={15} weight="bold" />
        </button>
        <div className="flex items-center gap-2">
          <Logo iconSize={13} className="w-5 h-5 rounded-md" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-12">
            UmpPlatform
          </span>
        </div>
        <div className="w-8" /> {/* Spacer to balance and center the logo */}
      </div>

      {/* Main Login Form Container */}
      <div className="w-full max-w-[360px] mx-auto flex flex-col gap-6 my-auto animate-scale-up">
        
        {/* Headings */}
        <div className="flex flex-col gap-1.5 text-left">
          <h2 className="text-2xl font-bold tracking-tight text-grayscale-12">
            Inicia sesión en tu cuenta
          </h2>
          <p className="text-xs text-grayscale-9 leading-relaxed">
            Introduce tus credenciales para acceder al sistema
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-red-9/20 bg-red-9/5 p-3 text-center text-xs text-red-11 font-medium animate-shake">
              {error}
            </div>
          )}

          {/* Email Input */}
          <div className="flex flex-col">
            <input
              type="email"
              required
              disabled={loading}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Correo electrónico"
              autoComplete="email"
              autoCapitalize="none"
              className="w-full px-3.5 py-3 rounded-xl border border-grayscale-3 bg-grayscale-1 text-sm text-grayscale-12 placeholder-grayscale-8 outline-none focus:border-accent-9 transition-all disabled:opacity-50 dark:border-grayscale-4 dark:bg-grayscale-2"
            />
          </div>

          {/* Password Input */}
          <div className="flex flex-col">
            <input
              type="password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              autoComplete="current-password"
              className="w-full px-3.5 py-3 rounded-xl border border-grayscale-3 bg-grayscale-1 text-sm text-grayscale-12 placeholder-grayscale-8 outline-none focus:border-accent-9 transition-all disabled:opacity-50 dark:border-grayscale-4 dark:bg-grayscale-2"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !username || !password}
            className="w-full mt-2 py-3 rounded-xl bg-grayscale-12 text-grayscale-1 font-mono text-xs font-bold uppercase tracking-wider transition-all hover:bg-grayscale-11 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2 dark:bg-grayscale-12 dark:text-grayscale-1 dark:hover:bg-grayscale-11"
          >
            {loading ? (
              <>
                <SpinnerIcon size={14} className="animate-spin" />
                Verificando...
              </>
            ) : (
              "Continuar"
            )}
          </button>
        </form>

        {/* SignUp / Admin Notice Link */}
        <p className="text-center text-xs text-grayscale-9">
          ¿No tienes cuenta? <span className="font-semibold text-grayscale-11 cursor-pointer hover:underline">Regístrate</span>
        </p>
      </div>

      {/* PWA bottom options */}
      <div className="flex items-center justify-center gap-4 text-[9px] font-mono uppercase tracking-widest text-grayscale-9 mt-auto py-2">
        <span className="cursor-pointer hover:text-grayscale-12 transition-colors">Ayuda</span>
        <span className="text-grayscale-5">/</span>
        <span className="cursor-pointer hover:text-grayscale-12 transition-colors">Términos</span>
        <span className="text-grayscale-5">/</span>
        <span className="cursor-pointer hover:text-grayscale-12 transition-colors">Privacidad</span>
      </div>

    </div>
  );
}
