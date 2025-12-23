import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Lock, User } from "lucide-react";
import horahLogo from "@/assets/horah-logo.png";
import { z } from "zod";

const emailSchema = z.string().email("Email inválido");
const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres");

const AuthPage = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const validateForm = () => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrorMessage(error.errors[0].message);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrorMessage("");

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            setErrorMessage("Email ou senha incorretos");
          } else {
            setErrorMessage(error.message);
          }
        } else {
          localStorage.setItem("kairo-logged-in", "true");
          navigate("/");
        }
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          if (error.message.includes("already registered")) {
            setErrorMessage("Este email já está cadastrado");
          } else {
            setErrorMessage(error.message);
          }
        } else {
          localStorage.setItem("kairo-logged-in", "true");
          navigate("/");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Aurora Effect Background */}
      <div className="aurora-effect absolute inset-0 pointer-events-none" />
      
      {/* Subtle geometric pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <div className="absolute top-20 left-10 w-32 h-32 border border-primary rounded-full" />
        <div className="absolute top-40 right-8 w-20 h-20 border border-primary/50 rounded-full" />
        <div className="absolute bottom-40 left-1/4 w-16 h-16 border border-primary/30 rounded-full" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-10 relative z-10">
        {/* Logo */}
        <div className="relative mb-6">
          <div className="absolute inset-0 w-24 h-24 rounded-full bg-primary/20 blur-xl" />
          <div className="w-24 h-24 rounded-full overflow-hidden relative shadow-2xl">
            <img src={horahLogo} alt="Horah" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-foreground mb-1 tracking-tight">Kairo</h1>
        <p className="text-muted-foreground text-sm mb-8">
          {isLogin ? "Entre na sua conta" : "Crie sua conta"}
        </p>

        {/* Error Message */}
        {errorMessage && (
          <p className="text-destructive text-sm text-center mb-4">{errorMessage}</p>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Seu nome"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="pl-10 h-12 bg-kairo-surface-2 border-border/20"
              />
            </div>
          )}
          
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12 bg-kairo-surface-2 border-border/20"
              required
            />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12 bg-kairo-surface-2 border-border/20"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 gradient-gold text-primary-foreground font-semibold"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isLogin ? (
              "Entrar"
            ) : (
              "Criar conta"
            )}
          </Button>
        </form>

        {/* Toggle */}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {isLogin ? (
            <>Não tem conta? <span className="text-primary">Criar conta</span></>
          ) : (
            <>Já tem conta? <span className="text-primary">Entrar</span></>
          )}
        </button>
      </div>

      {/* Footer */}
      <div className="px-6 pb-8 text-center safe-area-bottom relative z-10">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Ao continuar, você concorda com os{' '}
          <span className="text-primary/80">Termos</span>
          {' '}e{' '}
          <span className="text-primary/80">Privacidade</span>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
