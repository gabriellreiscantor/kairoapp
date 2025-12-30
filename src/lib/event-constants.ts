// Event colors - use labelKey for translations
export const EVENT_COLORS = [
  { value: 'primary', labelKey: 'color.horah', className: 'bg-gradient-to-br from-[#1F5BFF] via-[#39B7E5] to-[#63E0A3]' },
  { value: 'red', labelKey: 'color.red', className: 'bg-red-500' },
  { value: 'blue', labelKey: 'color.blue', className: 'bg-blue-500' },
  { value: 'green', labelKey: 'color.green', className: 'bg-green-500' },
  { value: 'yellow', labelKey: 'color.yellow', className: 'bg-yellow-500' },
  { value: 'orange', labelKey: 'color.orange', className: 'bg-orange-500' },
  { value: 'purple', labelKey: 'color.purple', className: 'bg-purple-500' },
  { value: 'cyan', labelKey: 'color.cyan', className: 'bg-cyan-500' },
  { value: 'amber', labelKey: 'color.amber', className: 'bg-amber-700' },
  { value: 'pink', labelKey: 'color.pink', className: 'bg-pink-500' },
];

// Repeat options - use labelKey for translations
export const REPEAT_OPTIONS = [
  { value: 'never', labelKey: 'repeat.never' },
  { value: 'daily', labelKey: 'repeat.daily' },
  { value: 'every2days', labelKey: 'repeat.every2days' },
  { value: 'weekly', labelKey: 'repeat.weekly' },
  { value: 'every2weeks', labelKey: 'repeat.every2weeks' },
  { value: 'monthly', labelKey: 'repeat.monthly' },
  { value: 'yearly', labelKey: 'repeat.yearly' },
];

// Alert time options - use labelKey for translations
export const ALERT_OPTIONS = [
  { value: 'exact', labelKey: 'alert.exact' },
  { value: '5min', labelKey: 'alert.5min' },
  { value: '15min', labelKey: 'alert.15min' },
  { value: '30min', labelKey: 'alert.30min' },
  { value: '1hour', labelKey: 'alert.1hour' },
  { value: '2hours', labelKey: 'alert.2hours' },
  { value: '1day', labelKey: 'alert.1day' },
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

// These functions now return the labelKey - components should use t(labelKey) to get translated text
export const getRepeatLabelKey = (repeatValue: string): string => {
  return REPEAT_OPTIONS.find(r => r.value === repeatValue)?.labelKey || 'repeat.never';
};

export const getAlertLabelKey = (alertValue: string): string => {
  return ALERT_OPTIONS.find(a => a.value === alertValue)?.labelKey || 'alert.1hour';
};

// Legacy functions for backward compatibility - return Portuguese labels
// Components should migrate to using t(getRepeatLabelKey()) or t(getAlertLabelKey())
export const getRepeatLabel = (repeatValue: string): string => {
  const labelKeyToPortuguese: Record<string, string> = {
    'repeat.never': 'Nunca',
    'repeat.daily': 'Todos os Dias',
    'repeat.every2days': 'A cada 2 dias',
    'repeat.weekly': 'Todas as Semanas',
    'repeat.every2weeks': 'A cada 2 Semanas',
    'repeat.monthly': 'Todos os Meses',
    'repeat.yearly': 'Todos os Anos',
  };
  const labelKey = getRepeatLabelKey(repeatValue);
  return labelKeyToPortuguese[labelKey] || 'Nunca';
};

export const getAlertLabel = (alertValue: string): string => {
  const labelKeyToPortuguese: Record<string, string> = {
    'alert.exact': 'No momento exato',
    'alert.5min': '5 minutos antes',
    'alert.15min': '15 minutos antes',
    'alert.30min': '30 minutos antes',
    'alert.1hour': '1 hora antes',
    'alert.2hours': '2 horas antes',
    'alert.1day': '1 dia antes',
  };
  const labelKey = getAlertLabelKey(alertValue);
  return labelKeyToPortuguese[labelKey] || '1 hora antes';
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
