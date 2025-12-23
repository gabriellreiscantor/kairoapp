// Event colors
export const EVENT_COLORS = [
  { value: 'primary', label: 'Horah', className: 'bg-gradient-to-br from-[#1F5BFF] via-[#39B7E5] to-[#63E0A3]' },
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
  { value: 'exact', label: 'No momento exato' },
  { value: '5min', label: '5 minutos antes' },
  { value: '15min', label: '15 minutos antes' },
  { value: '30min', label: '30 minutos antes' },
  { value: '1hour', label: '1 hora antes' },
  { value: '2hours', label: '2 horas antes' },
  { value: '1day', label: '1 dia antes' },
];

// Common emojis for events - organized by category
export const EVENT_EMOJIS = [
  // Calendário & Tempo
  '📅', '📆', '🗓️', '⏰', '🕐', '🔔', '✅', '⭐',
  // Trabalho & Produtividade
  '🎯', '💼', '📝', '📌', '📊', '📈', '💡', '🖥️',
  // Celebrações
  '🎉', '🎂', '🎊', '🎁', '🥳', '🍾', '🎈', '🎀',
  // Esportes & Fitness
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🏸',
  '🏊', '🚴', '🏃', '🏋️', '🧘', '🥊', '⛳', '🏄',
  '🎿', '⛷️', '🏂', '🤸', '🚣', '🧗', '🏇', '🥅',
  // Viagem & Transporte
  '✈️', '🚗', '🚌', '🚂', '🚢', '🏖️', '🗺️', '🧳',
  '🏔️', '🌍', '🗽', '🗼', '⛩️', '🏰', '🎢', '🚁',
  // Casa & Família
  '🏠', '🏡', '👨‍👩‍👧', '👶', '🐕', '🐈', '🪴', '🛋️',
  // Saúde & Bem-estar
  '💊', '🏥', '🦷', '👁️', '💆', '🧘', '😴', '🩺',
  // Alimentação
  '🍕', '🍔', '🍣', '🥗', '☕', '🍺', '🍷', '🍰',
  '🥐', '🌮', '🍜', '🥘', '🍳', '🥤', '🧁', '🍝',
  // Entretenimento
  '🎬', '🎵', '🎮', '🎸', '🎹', '🎤', '📺', '🎭',
  '🎨', '📚', '🎲', '♠️', '🎻', '🎧', '📷', '🎪',
  // Educação
  '🎓', '📖', '✏️', '🔬', '🧪', '🔭', '💻', '📱',
  // Compras & Finanças
  '🛒', '💰', '💳', '🏦', '💸', '🛍️', '🏷️', '💎',
  // Serviços & Manutenção
  '🧹', '🔧', '📦', '✂️', '💇', '🪥', '🧺', '🔨',
  // Relacionamentos
  '❤️', '💕', '💍', '💐', '🥰', '👫', '💑', '🤝',
  // Natureza & Clima
  '☀️', '🌧️', '❄️', '🌸', '🌻', '🌈', '🌙', '⭐',
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

// Convert alert value to minutes
export const getAlertMinutes = (alertValue: string): number => {
  const alertMinutesMap: Record<string, number> = {
    'exact': 0,
    '5min': 5,
    '15min': 15,
    '30min': 30,
    '1hour': 60,
    '2hours': 120,
    '1day': 1440, // 24 * 60
  };
  return alertMinutesMap[alertValue] ?? 60;
};

// Filter available alerts based on time remaining until event
export const getAvailableAlertOptions = (
  eventDate: Date, 
  eventTime: string | null,
  isAllDay: boolean
): typeof ALERT_OPTIONS => {
  // For all-day events, all options are valid
  if (isAllDay || !eventTime) {
    return ALERT_OPTIONS;
  }
  
  // Calculate time remaining until event
  // IMPORTANT: Parse date components explicitly to avoid timezone issues
  // Using getFullYear/getMonth/getDate since eventDate is a Date object
  const now = new Date();
  const [hours, minutes] = eventTime.split(':').map(Number);
  
  const year = eventDate.getFullYear();
  const month = eventDate.getMonth(); // Already 0-indexed for Date objects
  const day = eventDate.getDate();
  const eventDateTime = new Date(year, month, day, hours, minutes, 0, 0);
  
  const diffMs = eventDateTime.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  // If event already passed, return only "exact" option
  if (diffMinutes <= 0) {
    return ALERT_OPTIONS.filter(opt => opt.value === 'exact');
  }
  
  // Filter options that make sense based on time remaining
  return ALERT_OPTIONS.filter(opt => {
    const alertMinutes = getAlertMinutes(opt.value);
    return alertMinutes <= diffMinutes;
  });
};

// Get best valid alert for when user changes time and current selection becomes invalid
export const getBestValidAlert = (
  currentAlert: string,
  availableOptions: typeof ALERT_OPTIONS
): string => {
  // If current is still valid, keep it
  if (availableOptions.some(opt => opt.value === currentAlert)) {
    return currentAlert;
  }
  // Otherwise return the last (longest) valid option, or 'exact' as fallback
  return availableOptions.length > 0 ? availableOptions[availableOptions.length - 1].value : 'exact';
};
