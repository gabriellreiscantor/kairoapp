import { ChevronLeft, ChevronRight, Star, Share2, FileText, Shield, ScrollText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import kairoLogo from "@/assets/kairo-logo.png";

const AboutPage = () => {
  const navigate = useNavigate();

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
        <h1 className="text-xl font-bold text-foreground">Sobre</h1>
      </header>

      <div className="px-4 pb-8 space-y-6">
        {/* App Info */}
        <div className="flex flex-col items-center py-6">
          <img 
            src={kairoLogo} 
            alt="Kairo" 
            className="w-24 h-24 rounded-3xl shadow-lg mb-4"
          />
          <h2 className="text-2xl font-bold text-foreground mb-1">Kairo</h2>
          <p className="text-muted-foreground text-sm mb-1">Versão 1.0.0</p>
          <p className="text-muted-foreground text-xs">© 2024 Kairo. Todos os direitos reservados.</p>
        </div>

        {/* Actions */}
        <div>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <button className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border/10">
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">Avaliar na App Store</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Share2 className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">Compartilhar Kairo</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Legal */}
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Legal
          </h2>
          <div className="bg-kairo-surface-2 rounded-2xl overflow-hidden">
            <button 
              onClick={() => navigate('/terms')}
              className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border/10"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">Termos de Uso</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button 
              onClick={() => navigate('/privacy')}
              className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border/10"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">Política de Privacidade</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button 
              onClick={() => navigate('/eula')}
              className="w-full flex items-center justify-between px-4 py-3.5"
            >
              <div className="flex items-center gap-3">
                <ScrollText className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">EULA</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Credits */}
        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">
            Feito com ❤️ no Brasil
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
