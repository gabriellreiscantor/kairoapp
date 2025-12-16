import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPage = () => {
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
        <h1 className="text-xl font-bold text-foreground">Política de Privacidade</h1>
      </header>

      <div className="px-4 pb-8">
        <div className="prose prose-invert max-w-none">
          <p className="text-muted-foreground text-sm mb-4">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Introdução</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              O Kairo ("nós", "nosso" ou "Empresa") opera o aplicativo móvel Kairo. Esta página informa sobre nossas políticas relativas à coleta, uso e divulgação de dados pessoais quando você usa nosso Serviço.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Dados que Coletamos</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-2">
              Coletamos os seguintes tipos de informações:
            </p>
            <ul className="text-muted-foreground text-sm leading-relaxed list-disc list-inside space-y-1">
              <li><strong>Dados da Conta:</strong> Nome, e-mail, número de telefone</li>
              <li><strong>Dados de Eventos:</strong> Títulos, datas, horários, localizações de seus compromissos</li>
              <li><strong>Dados de Uso:</strong> Como você interage com o aplicativo</li>
              <li><strong>Dados do Dispositivo:</strong> Tipo de dispositivo, sistema operacional, identificadores únicos</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Como Usamos seus Dados</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-2">
              Utilizamos suas informações para:
            </p>
            <ul className="text-muted-foreground text-sm leading-relaxed list-disc list-inside space-y-1">
              <li>Fornecer e manter o Serviço</li>
              <li>Enviar notificações e lembretes</li>
              <li>Personalizar sua experiência</li>
              <li>Melhorar nossos recursos e funcionalidades</li>
              <li>Processar transações de assinatura</li>
              <li>Fornecer suporte ao cliente</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-2">
              Não vendemos seus dados pessoais. Podemos compartilhar informações com:
            </p>
            <ul className="text-muted-foreground text-sm leading-relaxed list-disc list-inside space-y-1">
              <li><strong>Provedores de Serviço:</strong> Para operar o aplicativo (ex: servidores, notificações)</li>
              <li><strong>Integrações:</strong> Com seu consentimento, para sincronização de calendários</li>
              <li><strong>Requisitos Legais:</strong> Quando exigido por lei</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Segurança dos Dados</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados, incluindo criptografia em trânsito e em repouso, controles de acesso rigorosos e monitoramento contínuo.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Seus Direitos</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-2">
              Você tem o direito de:
            </p>
            <ul className="text-muted-foreground text-sm leading-relaxed list-disc list-inside space-y-1">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incorretos</li>
              <li>Solicitar exclusão de seus dados</li>
              <li>Exportar seus dados em formato legível</li>
              <li>Retirar consentimento a qualquer momento</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Retenção de Dados</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário para fornecer o Serviço. Após exclusão da conta, seus dados serão removidos em até 30 dias.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Crianças</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              O Serviço não é destinado a menores de 13 anos. Não coletamos intencionalmente dados de crianças menores de 13 anos.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Alterações na Política</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Podemos atualizar esta Política periodicamente. Notificaremos sobre mudanças significativas através do aplicativo ou por e-mail.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Contato</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Para questões sobre privacidade, entre em contato: privacy@kairo.app
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
