import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsPage = () => {
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
        <h1 className="text-xl font-bold text-foreground">Termos de Uso</h1>
      </header>

      <div className="px-4 pb-8">
        <div className="prose prose-invert max-w-none">
          <p className="text-muted-foreground text-sm mb-4">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Ao acessar ou usar o aplicativo Kairo ("Serviço"), você concorda em estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não poderá acessar o Serviço.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Descrição do Serviço</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              O Kairo é um aplicativo de gerenciamento de agenda e lembretes que permite aos usuários criar, organizar e receber notificações sobre eventos e compromissos. O serviço inclui integração com WhatsApp, notificações push e recursos de inteligência artificial.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Conta do Usuário</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-2">
              Para usar determinados recursos do Serviço, você deve criar uma conta. Você é responsável por:
            </p>
            <ul className="text-muted-foreground text-sm leading-relaxed list-disc list-inside space-y-1">
              <li>Manter a confidencialidade de sua senha</li>
              <li>Todas as atividades que ocorrem em sua conta</li>
              <li>Fornecer informações precisas e atualizadas</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Uso Aceitável</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-2">
              Você concorda em não usar o Serviço para:
            </p>
            <ul className="text-muted-foreground text-sm leading-relaxed list-disc list-inside space-y-1">
              <li>Violar qualquer lei ou regulamento aplicável</li>
              <li>Enviar spam ou mensagens não solicitadas</li>
              <li>Interferir no funcionamento do Serviço</li>
              <li>Coletar dados de outros usuários sem consentimento</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Assinaturas e Pagamentos</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Alguns recursos do Kairo requerem uma assinatura paga. Os pagamentos são processados através da App Store ou Google Play. Você pode cancelar sua assinatura a qualquer momento através das configurações de sua loja de aplicativos.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Propriedade Intelectual</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              O Serviço e seu conteúdo original, recursos e funcionalidades são e permanecerão propriedade exclusiva do Kairo e seus licenciadores. O Serviço é protegido por direitos autorais, marcas registradas e outras leis.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              O Kairo não será responsável por danos indiretos, incidentais, especiais, consequenciais ou punitivos resultantes do uso ou impossibilidade de uso do Serviço.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Alterações nos Termos</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Reservamos o direito de modificar estes termos a qualquer momento. Notificaremos sobre alterações significativas através do aplicativo ou por e-mail.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Contato</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Se você tiver dúvidas sobre estes Termos, entre em contato conosco em: legal@kairo.app
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
