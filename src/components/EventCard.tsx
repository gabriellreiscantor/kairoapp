import { Clock, AlertCircle, CheckCircle2 } from "lucide-react";

export type Priority = "high" | "medium" | "low";
export type EventStatus = "pending" | "confirmed" | "done";

interface EventCardProps {
  id: string;
  title: string;
  time: string;
  priority: Priority;
  status?: EventStatus;
  onClick?: () => void;
}

const priorityConfig = {
  high: {
    color: "text-kairo-red",
    bgColor: "bg-kairo-red/10",
    borderColor: "border-kairo-red/30",
    icon: AlertCircle,
  },
  medium: {
    color: "text-kairo-amber",
    bgColor: "bg-kairo-amber/10",
    borderColor: "border-kairo-amber/30",
    icon: Clock,
  },
  low: {
    color: "text-kairo-green",
    bgColor: "bg-kairo-green/10",
    borderColor: "border-kairo-green/30",
    icon: CheckCircle2,
  },
};

const EventCard = ({
  title,
  time,
  priority,
  status = "pending",
  onClick,
}: EventCardProps) => {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2.5 rounded-xl bg-card border ${config.borderColor} 
                  transition-all duration-150 hover:bg-accent active:scale-[0.99]
                  flex items-center gap-3 text-left group`}
    >
      {/* Priority indicator */}
      <div
        className={`w-9 h-9 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}
      >
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3
          className={`text-sm font-medium text-foreground truncate ${
            status === "done" ? "line-through opacity-50" : ""
          }`}
        >
          {title}
        </h3>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>

      {/* Time indicator */}
      <div className={`text-base font-semibold ${config.color} tabular-nums`}>
        {time.split(" ")[0]}
      </div>
    </button>
  );
};

export default EventCard;
