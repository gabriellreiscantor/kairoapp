import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const EULAPage = () => {
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
        <h1 className="text-xl font-bold text-foreground">EULA</h1>
      </header>

      <div className="px-4 pb-8">
        <div className="prose prose-invert max-w-none">
          <p className="text-muted-foreground text-sm mb-4">
            Contrato de Licença de Usuário Final (End User License Agreement)
          </p>
          <p className="text-muted-foreground text-sm mb-4">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Concessão de Licença</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Kairo concede a você uma licença limitada, não exclusiva, não transferível e revogável para usar o aplicativo em dispositivos que você possui ou controla, exclusivamente para fins pessoais e não comerciais.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Restrições</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-2">
              Você não pode:
            </p>
            <ul className="text-muted-foreground text-sm leading-relaxed list-disc list-inside space-y-1">
              <li>Copiar, modificar ou distribuir o aplicativo</li>
              <li>Fazer engenharia reversa ou descompilar o código</li>
              <li>Remover avisos de direitos autorais ou marcas</li>
              <li>Usar o aplicativo para fins ilegais</li>
              <li>Sublicenciar, vender ou transferir a licença</li>
              <li>Usar o aplicativo para criar um produto concorrente</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Propriedade Intelectual</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              O aplicativo, incluindo design, código, gráficos, interface e todo o conteúdo, é propriedade do Kairo e protegido por leis de propriedade intelectual. Esta licença não lhe concede nenhum direito de propriedade sobre o aplicativo.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Serviços de Terceiros</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              O aplicativo pode incluir serviços de terceiros (como sincronização de calendários, processamento de pagamentos). O uso destes serviços está sujeito aos termos e políticas de privacidade dos respectivos terceiros.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Atualizações</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Kairo pode fornecer atualizações, correções ou melhorias ao aplicativo. Estas atualizações podem ser instaladas automaticamente e estão sujeitas a este EULA.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Isenção de Garantias</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              O APLICATIVO É FORNECIDO "COMO ESTÁ" SEM GARANTIAS DE QUALQUER TIPO, EXPRESSAS OU IMPLÍCITAS. NÃO GARANTIMOS QUE O APLICATIVO SERÁ ININTERRUPTO, LIVRE DE ERROS OU SEGURO.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              EM NENHUMA CIRCUNSTÂNCIA O KAIRO SERÁ RESPONSÁVEL POR DANOS INDIRETOS, INCIDENTAIS, ESPECIAIS, CONSEQUENCIAIS OU PUNITIVOS. NOSSA RESPONSABILIDADE TOTAL NÃO EXCEDERÁ O VALOR PAGO PELA ASSINATURA NOS ÚLTIMOS 12 MESES.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Rescisão</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Esta licença é efetiva até ser rescindida. Podemos rescindir imediatamente se você violar qualquer termo. Você pode rescindir excluindo o aplicativo. Após rescisão, você deve cessar todo uso do aplicativo.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Lei Aplicável</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Este EULA é regido pelas leis do Brasil. Disputas serão resolvidas nos tribunais competentes do Brasil.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Termos da App Store</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-2">
              Se você baixou o aplicativo através da Apple App Store ou Google Play:
            </p>
            <ul className="text-muted-foreground text-sm leading-relaxed list-disc list-inside space-y-1">
              <li>Este EULA é entre você e Kairo, não com Apple/Google</li>
              <li>Apple/Google não têm obrigação de fornecer suporte</li>
              <li>Apple/Google são beneficiários terceiros deste EULA</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">11. Contato</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Para questões sobre este EULA: legal@kairo.app
            </p>
          </section>

          <section className="mb-6">
            <p className="text-muted-foreground text-sm leading-relaxed font-medium">
              AO USAR O APLICATIVO, VOCÊ RECONHECE QUE LEU, ENTENDEU E CONCORDA EM ESTAR VINCULADO A ESTE EULA.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default EULAPage;
