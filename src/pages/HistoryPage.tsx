import { CheckCircle2, XCircle, Clock } from "lucide-react";

type HistoryStatus = "done" | "missed" | "postponed";

interface HistoryItem {
  id: string;
  title: string;
  date: string;
  time: string;
  status: HistoryStatus;
}

const statusConfig = {
  done: {
    icon: CheckCircle2,
    color: "text-kairo-green",
    bgColor: "bg-kairo-green/10",
    label: "Concluído",
  },
  missed: {
    icon: XCircle,
    color: "text-kairo-red",
    bgColor: "bg-kairo-red/10",
    label: "Perdido",
  },
  postponed: {
    icon: Clock,
    color: "text-kairo-amber",
    bgColor: "bg-kairo-amber/10",
    label: "Adiado",
  },
};

const HistoryPage = () => {
  const history: HistoryItem[] = [
    { id: "1", title: "Reunião de projeto", date: "Ontem", time: "14:00", status: "done" },
    { id: "2", title: "Consulta médica", date: "Ontem", time: "10:00", status: "done" },
    { id: "3", title: "Ligação com cliente", date: "13 Jan", time: "16:00", status: "missed" },
    { id: "4", title: "Enviar relatório", date: "12 Jan", time: "09:00", status: "postponed" },
    { id: "5", title: "Academia", date: "12 Jan", time: "07:00", status: "done" },
    { id: "6", title: "Dentista", date: "11 Jan", time: "15:00", status: "done" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold text-foreground">Histórico</h1>
        <p className="text-muted-foreground mt-1">Eventos passados</p>
      </header>

      {/* Stats */}
      <div className="px-6 mb-6">
        <div className="grid grid-cols-3 gap-3">
          {(["done", "missed", "postponed"] as HistoryStatus[]).map((status) => {
            const config = statusConfig[status];
            const count = history.filter((h) => h.status === status).length;
            const Icon = config.icon;

            return (
              <div
                key={status}
                className={`${config.bgColor} rounded-2xl p-4 text-center`}
              >
                <Icon className={`w-5 h-5 ${config.color} mx-auto mb-2`} />
                <p className={`text-2xl font-bold ${config.color}`}>{count}</p>
                <p className="text-xs text-muted-foreground mt-1">{config.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* History List */}
      <section className="px-6">
        <div className="space-y-3">
          {history.map((item, index) => {
            const config = statusConfig[item.status];
            const Icon = config.icon;

            return (
              <div
                key={item.id}
                className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 animate-fade-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center`}
                >
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.date} às {item.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default HistoryPage;
