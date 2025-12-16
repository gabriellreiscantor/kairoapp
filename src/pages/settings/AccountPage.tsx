import { ChevronLeft, User, Mail, Phone, Shield, Trash2, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const AccountPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("Usuário");
  const [email, setEmail] = useState("usuario@email.com");
  const [phone, setPhone] = useState("+55 11 99999-9999");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm px-4 py-4 safe-area-top flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-kairo-surface-2 flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Conta</h1>
      </header>

      <div className="px-4 pb-8 space-y-6">
        {/* Profile Photo */}
        <div className="flex flex-col items-center py-4">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full bg-kairo-surface-3 flex items-center justify-center">
              <User className="w-12 h-12 text-muted-foreground" />
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Pencil className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">Toque para alterar foto</p>
        </div>

        {/* Account Info */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Informações Pessoais
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-border/10">
              <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent text-foreground focus:outline-none"
              />
            </div>
            <div className="px-4 py-3.5 border-b border-border/10">
              <label className="text-xs text-muted-foreground mb-1 block">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-foreground focus:outline-none"
              />
            </div>
            <div className="px-4 py-3.5">
              <label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-transparent text-foreground focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Security */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Segurança
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <button className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border/10">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">Alterar Senha</span>
              </div>
              <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180" />
            </button>
            <button className="w-full flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">Verificar E-mail</span>
              </div>
              <span className="text-xs text-kairo-green">Verificado</span>
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Zona de Perigo
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <button className="w-full flex items-center gap-3 px-4 py-3.5 text-kairo-red">
              <Trash2 className="w-5 h-5" />
              <span>Excluir Conta</span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1">
            Ao excluir sua conta, todos os seus dados serão permanentemente removidos.
          </p>
        </div>

        {/* Save Button */}
        <button className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold">
          Salvar Alterações
        </button>
      </div>
    </div>
  );
};

export default AccountPage;
