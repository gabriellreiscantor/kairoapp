// Event colors
export const EVENT_COLORS = [
  { value: 'primary', label: 'Kairo', className: 'bg-gradient-to-br from-primary to-pink-500' },
  { value: 'red', label: 'Vermelho', className: 'bg-red-500' },
  { value: 'blue', label: 'Azul', className: 'bg-blue-500' },
  { value: 'green', label: 'Verde', className: 'bg-green-500' },
  { value: 'yellow', label: 'Amarelo', className: 'bg-yellow-500' },
  { value: 'orange', label: 'Laranja', className: 'bg-orange-500' },
  { value: 'purple', label: 'Roxo', className: 'bg-purple-500' },
  { value: 'cyan', label: 'Azul Claro', className: 'bg-cyan-500' },
  { value: 'amber', label: 'Laranja Escuro', className: 'bg-amber-700' },
  { value: 'pink', label: 'Rosa', className: 'bg-pink-500' },
];

// Repeat options
export const REPEAT_OPTIONS = [
  { value: 'never', label: 'Nunca' },
  { value: 'daily', label: 'Todos os Dias' },
  { value: 'every2days', label: 'A cada 2 dias' },
  { value: 'weekly', label: 'Todas as Semanas' },
  { value: 'every2weeks', label: 'A cada 2 Semanas' },
  { value: 'monthly', label: 'Todos os Meses' },
  { value: 'yearly', label: 'Todos os Anos' },
];

// Alert time options
export const ALERT_OPTIONS = [
  { value: '5min', label: '5 minutos antes' },
  { value: '15min', label: '15 minutos antes' },
  { value: '30min', label: '30 minutos antes' },
  { value: '1hour', label: '1 hora antes' },
  { value: '2hours', label: '2 horas antes' },
  { value: '1day', label: '1 dia antes' },
];

// Common emojis for events
export const EVENT_EMOJIS = [
  '📅', '📆', '🗓️', '⏰', '🕐', '🔔', '✅', '⭐',
  '🎯', '💼', '📝', '📌', '🎉', '🎂', '🎊', '🎁',
  '💪', '🏃', '🚗', '✈️', '🏠', '🏢', '🏥', '🎓',
  '💰', '🛒', '📞', '💻', '📱', '🎬', '🎵', '🎮',
  '🍕', '🍔', '☕', '🍺', '💊', '🐕', '❤️', '👨‍👩‍👧',
  '🧹', '🔧', '📦', '✂️', '💇', '🦷', '👁️', '🏋️',
];

// Helper functions
export const getColorClassName = (colorValue: string): string => {
  return EVENT_COLORS.find(c => c.value === colorValue)?.className || EVENT_COLORS[0].className;
};

export const getRepeatLabel = (repeatValue: string): string => {
  return REPEAT_OPTIONS.find(r => r.value === repeatValue)?.label || 'Nunca';
};

export const getAlertLabel = (alertValue: string): string => {
  return ALERT_OPTIONS.find(a => a.value === alertValue)?.label || '1 hora antes';
};
