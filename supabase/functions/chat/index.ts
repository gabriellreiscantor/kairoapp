import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fromZonedTime } from 'https://esm.sh/date-fns-tz@3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * HORAH — ASSISTENTE DE AGENDA INTELIGENTE
 * 
 * Função da IA: INTERPRETAÇÃO EXCLUSIVA
 * - Identifica intenção
 * - Extrai dados estruturados
 * - Detecta informações faltantes
 * - Mantém contexto conversacional
 * 
 * A IA NÃO:
 * - Cria eventos
 * - Edita eventos
 * - Acessa banco de dados
 * - Executa ações de negócio
 * 
 * Toda execução é responsabilidade do backend.
 */

// JSON structure that AI will return - MASTER PROMPT CONTRACT
interface KairoAction {
  acao: 'criar_evento' | 'listar_eventos' | 'editar_evento' | 'deletar_evento' | 'conversar' | 'coletar_informacoes' | 'solicitar_confirmacao' | 'data_passada' | 'relatorio_semanal' | 'relatorio_nao_pronto' | 'previsao_tempo';
  titulo?: string;
  data?: string; // YYYY-MM-DD
  hora?: string; // HH:MM
  local?: string;
  descricao?: string; // Short AI-generated description
  location_type?: 'commercial' | 'personal';
  location_state?: 'missing_city' | 'missing_place_name' | 'complete';
  duracao_minutos?: number;
  prioridade?: 'low' | 'medium' | 'high';
  categoria?: string;
  evento_id?: string;
  buscar_titulo?: string;
  limite?: number;
  idioma_detectado?: 'pt' | 'en' | 'es' | 'fr' | 'de' | 'it' | 'ja' | 'ko' | 'zh' | 'outro';
  observacoes?: string;
  resposta_usuario?: string;
  informacao_faltante?: 'titulo' | 'data' | 'hora' | 'local' | 'cidade' | 'nome_estabelecimento';
  contexto_coletado?: string;
  resumo_evento?: {
    titulo: string;
    data: string;
    hora: string;
    local: string;
    notificacao: string;
  };
  _alreadyExecuted?: boolean; // Flag to skip executeAction when action was already processed
  evento_atualizado?: any; // Full updated event in Supabase format for EventCreatedCard
  evento_deletado?: any; // Full deleted event data for EventDeletedCard
  weeklyReportData?: any; // Weekly report data for WeeklyReportCard
  weeklyReportNotReady?: any; // Weekly report not ready data
  weatherData?: any; // Weather forecast data for WeatherForecastCard
}

interface UserProfile {
  display_name?: string;
  smart_suggestions_enabled?: boolean;
  auto_reschedule_enabled?: boolean;
  context_aware_enabled?: boolean;
  learn_patterns_enabled?: boolean;
  weather_forecast_enabled?: boolean;
  weather_forecast_time?: string;
  preferred_times?: any[];
}

// Save user patterns after event creation
async function saveUserPattern(
  supabase: any,
  userId: string,
  action: KairoAction,
  profile: UserProfile
): Promise<void> {
  if (!profile.learn_patterns_enabled) {
    console.log('Pattern learning disabled for user');
    return;
  }

  try {
    const patterns: Array<{ type: string; data: any }> = [];

    if (action.hora) {
      patterns.push({
        type: 'preferred_time',
        data: { time: action.hora, category: action.categoria || 'geral' }
      });
    }

    if (action.categoria) {
      patterns.push({
        type: 'common_category',
        data: { category: action.categoria }
      });
    }

    if (action.duracao_minutos) {
      patterns.push({
        type: 'common_duration',
        data: { duration: action.duracao_minutos, category: action.categoria || 'geral' }
      });
    }

    if (action.local) {
      patterns.push({
        type: 'common_location',
        data: { location: action.local }
      });
    }

    for (const pattern of patterns) {
      const { data: existing } = await supabase
        .from('user_patterns')
        .select('id, confidence, pattern_data')
        .eq('user_id', userId)
        .eq('pattern_type', pattern.type)
        .maybeSingle();

      if (existing) {
        const newConfidence = Math.min(existing.confidence + 0.1, 1.0);
        const mergedData = { ...existing.pattern_data, ...pattern.data, count: (existing.pattern_data?.count || 1) + 1 };
        
        await supabase
          .from('user_patterns')
          .update({ 
            confidence: newConfidence, 
            pattern_data: mergedData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('user_patterns')
          .insert({
            user_id: userId,
            pattern_type: pattern.type,
            pattern_data: { ...pattern.data, count: 1 },
            confidence: 0.5
          });
      }
    }

    console.log(`Saved ${patterns.length} patterns for user`);
  } catch (error) {
    console.error('Error saving patterns:', error);
  }
}

// Map category to emoji - Extended version with title-based detection
function getCategoryEmoji(category: string, title?: string): string {
  const emojiMap: Record<string, string> = {
    // Saúde
    'medico': '🏥',
    'hospital': '🏥',
    'saude': '💊',
    'dentista': '🦷',
    'consulta': '🩺',
    'exame': '🔬',
    'fisioterapia': '🦵',
    'terapia': '🧠',
    'psicologo': '🧠',
    'psiquiatra': '🧠',
    
    // Fitness
    'academia': '💪',
    'treino': '🏋️',
    'esporte': '🏃',
    'corrida': '🏃',
    'natacao': '🏊',
    'yoga': '🧘',
    'pilates': '🧘‍♀️',
    'musculacao': '💪',
    'crossfit': '🏋️',
    'futebol': '⚽',
    'basquete': '🏀',
    'tenis': '🎾',
    'vôlei': '🏐',
    
    // Trabalho
    'trabalho': '💼',
    'reuniao': '📝',
    'empresa': '🏢',
    'escritorio': '🏢',
    'entrevista': '🤝',
    'apresentacao': '📊',
    'deadline': '⏰',
    
    // Educação
    'escola': '🏫',
    'faculdade': '🎓',
    'universidade': '🎓',
    'curso': '📚',
    'aula': '📖',
    'prova': '📝',
    'estudo': '📚',
    
    // Lazer
    'cinema': '🎬',
    'filme': '🎬',
    'show': '🎵',
    'concerto': '🎵',
    'teatro': '🎭',
    'festa': '🎉',
    'aniversario': '🎂',
    'casamento': '💒',
    'formatura': '🎓',
    'balada': '🎉',
    'boate': '🕺',
    'karaoke': '🎤',
    'parque': '🌳',
    'museu': '🏛️',
    
    // Alimentação
    'restaurante': '🍽️',
    'lanchonete': '🍔',
    'cafe': '☕',
    'almoco': '🍕',
    'jantar': '🍷',
    'brunch': '🥐',
    'churrasco': '🍖',
    'pizzaria': '🍕',
    'sushi': '🍣',
    
    // Bares e bebidas
    'bar': '🍺',
    'barzinho': '🍺',
    'cerveja': '🍺',
    'happy_hour': '🍻',
    'happyhour': '🍻',
    'drinks': '🍹',
    'boteco': '🍺',
    'pub': '🍺',
    
    // Beleza e cuidados
    'salao': '💇‍♀️',
    'cabelo': '💇',
    'cabeleireiro': '💇‍♀️',
    'manicure': '💅',
    'pedicure': '💅',
    'unha': '💅',
    'barbearia': '💇',
    'barbeiro': '💈',
    'spa': '💆',
    'massagem': '💆',
    'depilacao': '✨',
    'estetica': '💅',
    'sobrancelha': '👁️',
    'maquiagem': '💄',
    'beleza': '💇‍♀️',
    
    // Viagem e transporte
    'viagem': '✈️',
    'aeroporto': '✈️',
    'voo': '✈️',
    'aviao': '✈️',
    'embarque': '✈️',
    'rodoviaria': '🚌',
    'onibus': '🚌',
    'trem': '🚆',
    'metro': '🚇',
    'uber': '🚗',
    'taxi': '🚕',
    
    // Praia e lazer ao ar livre
    'praia': '🏖️',
    'piscina': '🏊',
    'trilha': '🥾',
    'camping': '⛺',
    'chacara': '🏡',
    'sitio': '🏡',
    'fazenda': '🌾',
    
    // Compras
    'compras': '🛒',
    'mercado': '🛒',
    'supermercado': '🛒',
    'shopping': '🛍️',
    'loja': '🛍️',
    'feira': '🥕',
    
    // Casa e família
    'casa': '🏠',
    'familia': '👨‍👩‍👧',
    'visita': '🏠',
    'mudanca': '📦',
    'reforma': '🔨',
    
    // Pets
    'pet': '🐕',
    'veterinario': '🐕',
    'cachorro': '🐕',
    'gato': '🐱',
    
    // Veículos
    'carro': '🚗',
    'mecanico': '🔧',
    'oficina': '🔧',
    'moto': '🏍️',
    'revisao': '🔧',
    
    // Religião
    'igreja': '⛪',
    'missa': '⛪',
    'culto': '⛪',
    'religioso': '⛪',
    
    // Finanças
    'banco': '🏦',
    'pagamento': '💳',
    'conta': '💳',
    
    // Default
    'pessoal': '📌',
    'lazer': '🎮',
    'geral': '📅',
    'outro': '📅',
  };
  
  // First, check if we can find emoji from the title keywords
  if (title) {
    const titleLower = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Priority keywords to check in title
    const titleKeywords: Record<string, string> = {
      // ============================================
      // FASE 1: ROTINA DIÁRIA, CASA, ALIMENTAÇÃO, HIGIENE (~125 emojis)
      // Multilíngue: PT, EN, ES, FR, DE, IT, JA, KO, ZH
      // ============================================
      
      // --- ACORDAR / WAKE UP ---
      'acordar': '⏰', 'levantar': '⏰', 'despertar': '⏰',
      'wake up': '⏰', 'get up': '⏰', 'wakeup': '⏰',
      'levantarse': '⏰', 'madrugar': '⏰',
      'se reveiller': '⏰', 'reveiller': '⏰', 'lever': '⏰',
      'aufwachen': '⏰', 'aufstehen': '⏰',
      'svegliarsi': '⏰', 'alzarsi': '⏰',
      '起きる': '⏰', '起床': '⏰', '目覚め': '⏰',
      '일어나다': '⏰', '기상': '⏰',
      '醒来': '⏰',
      
      // --- DORMIR / SLEEP ---
      'dormir': '😴', 'soneca': '😴', 'cochilo': '😴', 'descansar': '😴',
      'sleep': '😴', 'nap': '😴', 'rest': '😴', 'bedtime': '😴', 'go to bed': '😴',
      'siesta': '😴', 'descanso': '😴', 'acostarse': '😴',
      'se coucher': '😴', 'coucher': '😴', 'sieste': '😴', 'dodo': '😴',
      'schlafen': '😴', 'schlaf': '😴', 'nickerchen': '😴',
      'dormire': '😴', 'pisolino': '😴', 'riposare': '😴',
      '寝る': '😴', '睡眠': '😴', '昼寝': '😴', 'おやすみ': '😴',
      '자다': '😴', '잠': '😴', '낮잠': '😴',
      '睡觉': '😴', '午睡': '😴', '休息': '😴',
      
      // --- CAFÉ DA MANHÃ / BREAKFAST ---
      'cafe da manha': '☕', 'café da manhã': '☕', 'breakfast': '☕',
      'desayuno': '☕', 'desayunar': '☕',
      'petit dejeuner': '☕', 'petit-dejeuner': '☕',
      'fruhstuck': '☕', 'frühstück': '☕',
      'colazione': '☕', 'fare colazione': '☕',
      '朝食': '☕', '朝ご飯': '☕', '朝ごはん': '☕',
      '아침': '☕', '아침밥': '☕', '아침식사': '☕',
      '早餐': '☕', '早饭': '☕',
      
      // --- ALMOÇO / LUNCH ---
      'almoco': '🍽️', 'almoço': '🍽️', 'almoçar': '🍽️',
      'lunch': '🍽️', 'lunchtime': '🍽️',
      'almuerzo': '🍽️', 'almorzar': '🍽️', 'comida': '🍽️',
      'dejeuner': '🍽️', 'déjeuner': '🍽️',
      'mittagessen': '🍽️',
      'pranzo': '🍽️', 'pranzare': '🍽️',
      '昼食': '🍽️', 'ランチ': '🍽️', '昼ご飯': '🍽️',
      '점심': '🍽️', '점심밥': '🍽️',
      '午餐': '🍽️', '午饭': '🍽️',
      
      // --- JANTAR / DINNER ---
      'jantar': '🍷', 'janta': '🍷',
      'dinner': '🍷', 'supper': '🍷',
      'cena': '🍷', 'cenar': '🍷',
      'diner': '🍷', 'dîner': '🍷', 'souper': '🍷',
      'abendessen': '🍷',
      'cenare': '🍷',
      '夕食': '🍷', '晩ご飯': '🍷', 'ディナー': '🍷',
      '저녁': '🍷', '저녁밥': '🍷', '저녁식사': '🍷',
      '晚餐': '🍷', '晚饭': '🍷',
      
      // --- LANCHE / SNACK ---
      'lanche': '🥪', 'lanchinhar': '🥪', 'merendar': '🥪',
      'snack': '🥪', 'merienda': '🥪',
      'gouter': '🥪', 'goûter': '🥪',
      'imbiss': '🥪', 'zwischenmahlzeit': '🥪',
      'merenda': '🥪', 'spuntino': '🥪',
      'おやつ': '🥪', '間食': '🥪',
      '간식': '🥪',
      '点心': '🥪', '零食': '🥪',
      
      // --- COZINHAR / COOK ---
      'cozinhar': '👨‍🍳', 'cozinha': '👨‍🍳', 'preparar comida': '👨‍🍳',
      'cook': '👨‍🍳', 'cooking': '👨‍🍳', 'prepare meal': '👨‍🍳',
      'cocinar': '👨‍🍳', 'guisar': '👨‍🍳',
      'cuisiner': '👨‍🍳', 'cuisine': '👨‍🍳', 'faire la cuisine': '👨‍🍳',
      'kochen': '👨‍🍳',
      'cucinare': '👨‍🍳', 'cucina': '👨‍🍳',
      '料理': '👨‍🍳', '料理する': '👨‍🍳',
      '요리': '👨‍🍳', '요리하다': '👨‍🍳',
      '做饭': '👨‍🍳', '做菜': '👨‍🍳', '烹饪': '👨‍🍳',
      
      // --- LIMPAR / CLEAN ---
      'limpar': '🧹', 'limpeza': '🧹', 'faxina': '🧹', 'faxinar': '🧹',
      'clean': '🧹', 'cleaning': '🧹', 'tidy': '🧹', 'housework': '🧹',
      'limpiar': '🧹', 'limpieza': '🧹', 'asear': '🧹',
      'nettoyer': '🧹', 'menage': '🧹', 'ménage': '🧹', 'nettoyage': '🧹',
      'putzen': '🧹', 'sauber machen': '🧹', 'reinigen': '🧹',
      'pulire': '🧹', 'pulizia': '🧹', 'fare le pulizie': '🧹',
      '掃除': '🧹', '掃除する': '🧹', 'そうじ': '🧹',
      '청소': '🧹', '청소하다': '🧹',
      '打扫': '🧹', '清洁': '🧹', '大扫除': '🧹',
      
      // --- LAVAR ROUPA / LAUNDRY ---
      'lavar roupa': '🧺', 'roupa': '🧺', 'lavanderia': '🧺',
      'laundry': '🧺', 'wash clothes': '🧺', 'washing': '🧺',
      'lavar ropa': '🧺', 'colada': '🧺', 'lavadora': '🧺',
      'lessive': '🧺', 'laver le linge': '🧺', 'machine a laver': '🧺',
      'wasche': '🧺', 'wäsche': '🧺', 'waschen': '🧺',
      'bucato': '🧺', 'fare il bucato': '🧺', 'lavare': '🧺',
      '洗濯': '🧺', 'せんたく': '🧺', '洗濯する': '🧺',
      '빨래': '🧺', '빨래하다': '🧺', '세탁': '🧺',
      '洗衣服': '🧺', '洗衣': '🧺',
      
      // --- COMPRAS / SHOPPING ---
      'compras': '🛒', 'supermercado': '🛒', 'mercado': '🛒', 'feira': '🛒',
      'grocery': '🛒', 'groceries': '🛒', 'supermarket': '🛒', 'market': '🛒',
      'comprar': '🛒', 'hacer compras': '🛒', 'tienda': '🛒',
      'courses': '🛒', 'faire les courses': '🛒', 'supermarche': '🛒',
      'einkaufen': '🛒', 'supermarkt': '🛒', 'lebensmittel': '🛒',
      'spesa': '🛒', 'fare la spesa': '🛒', 'supermercato': '🛒',
      '買い物': '🛒', 'スーパー': '🛒',
      '장보기': '🛒', '마트': '🛒', '쇼핑': '🛒',
      '购物': '🛒', '超市': '🛒', '买东西': '🛒',
      
      // --- BANHO / SHOWER ---
      'banho': '🚿', 'banhar': '🚿', 'ducha': '🚿', 'chuveiro': '🚿',
      'shower': '🚿', 'bath': '🚿', 'bathe': '🚿',
      'ducharse': '🚿', 'banarse': '🚿', 'bañarse': '🚿',
      'douche': '🚿', 'se doucher': '🚿', 'bain': '🚿',
      'duschen': '🚿', 'dusche': '🚿', 'baden': '🚿',
      'doccia': '🚿', 'fare la doccia': '🚿', 'bagno': '🚿',
      'シャワー': '🚿', 'お風呂': '🚿', '入浴': '🚿',
      '샤워': '🚿', '목욕': '🚿',
      '洗澡': '🚿', '淋浴': '🚿',
      
      // --- CABELO / HAIR ---
      'cabelo': '💇', 'cabeleireiro': '💇‍♀️', 'salao': '💇‍♀️', 'salão': '💇‍♀️',
      'cortar cabelo': '💇', 'corte de cabelo': '💇',
      'haircut': '💇', 'hair salon': '💇‍♀️', 'hairdresser': '💇‍♀️',
      'peluqueria': '💇‍♀️', 'peluquería': '💇‍♀️', 'corte de pelo': '💇', 'cortarse el pelo': '💇',
      'coiffeur': '💇‍♀️', 'coiffure': '💇‍♀️', 'couper les cheveux': '💇',
      'friseur': '💇‍♀️', 'haarschnitt': '💇', 'haare schneiden': '💇',
      'parrucchiere': '💇‍♀️', 'taglio di capelli': '💇',
      '美容院': '💇‍♀️', '髪': '💇', 'ヘアカット': '💇',
      '미용실': '💇‍♀️', '머리': '💇', '헤어컷': '💇',
      '理发': '💇', '剪头发': '💇', '美发': '💇‍♀️',
      
      // --- BARBEIRO / BARBER ---
      'barbearia': '💈', 'barbeiro': '💈', 'barba': '💈', 'fazer barba': '💈',
      'barber': '💈', 'barbershop': '💈', 'shave': '💈',
      'barberia': '💈', 'barbería': '💈', 'afeitarse': '💈',
      'barbier': '💈', 'se raser': '💈', 'rasieren': '💈',
      'barbiere': '💈', 'radersi': '💈',
      '床屋': '💈', 'ひげ': '💈',
      '이발소': '💈', '면도': '💈',
      '理发店': '💈', '刮胡子': '💈',
      
      // --- MANICURE / NAILS ---
      'manicure': '💅', 'unha': '💅', 'unhas': '💅', 'pedicure': '💅',
      'nails': '💅', 'nail salon': '💅',
      'manicura': '💅', 'unas': '💅', 'uñas': '💅', 'pedicura': '💅',
      'manucure': '💅', 'ongles': '💅',
      'manikure': '💅', 'maniküre': '💅', 'nagel': '💅', 'nägel': '💅',
      'unghie': '💅',
      'ネイル': '💅', 'ネイルサロン': '💅',
      '네일': '💅', '네일샵': '💅', '손톱': '💅',
      '美甲': '💅', '指甲': '💅',
      
      // --- ARRUMAR / ORGANIZE ---
      'arrumar': '🏠', 'organizar': '🏠', 'arrumacao': '🏠',
      'tidy up': '🏠', 'organize': '🏠', 'declutter': '🏠',
      'ordenar': '🏠', 'arreglar': '🏠',
      'ranger': '🏠', 'organiser': '🏠', 'mettre en ordre': '🏠',
      'aufraumen': '🏠', 'aufräumen': '🏠', 'ordnen': '🏠',
      'sistemare': '🏠', 'mettere in ordine': '🏠', 'riordinare': '🏠',
      '片付け': '🏠', '整理': '🏠', 'かたづけ': '🏠',
      '정리': '🏠', '정리하다': '🏠', '정돈': '🏠',
      '收拾': '🏠',
      
      // --- ESCOVAR DENTES / BRUSH TEETH ---
      'escovar dentes': '🪥', 'escovar os dentes': '🪥', 'escova de dente': '🪥',
      'brush teeth': '🪥', 'brushing teeth': '🪥',
      'cepillarse los dientes': '🪥', 'cepillo de dientes': '🪥',
      'se brosser les dents': '🪥', 'brosse a dents': '🪥',
      'zahne putzen': '🪥', 'zähne putzen': '🪥', 'zahnburste': '🪥',
      'lavarsi i denti': '🪥', 'spazzolino': '🪥',
      '歯を磨く': '🪥', '歯磨き': '🪥', 'はみがき': '🪥',
      '양치': '🪥', '양치질': '🪥', '이닦기': '🪥',
      '刷牙': '🪥',
      
      // --- CAFÉ / COFFEE ---
      'cafe': '☕', 'café': '☕', 'cafezinho': '☕', 'expresso': '☕',
      'coffee': '☕', 'espresso': '☕', 'latte': '☕', 'cappuccino': '☕',
      'cafecito': '☕',
      'kaffee': '☕',
      'caffe': '☕', 'caffè': '☕',
      'コーヒー': '☕', 'カフェ': '☕',
      '커피': '☕', '카페': '☕',
      '咖啡': '☕',
      
      // --- CHÁ / TEA ---
      'cha': '🍵', 'chá': '🍵',
      'tea': '🍵', 'teatime': '🍵',
      'te': '🍵', 'té': '🍵',
      'the': '🍵', 'thé': '🍵',
      'tee': '🍵',
      'tè': '🍵',
      'お茶': '🍵', '紅茶': '🍵', '緑茶': '🍵',
      '차': '🍵', '녹차': '🍵',
      '茶': '🍵', '喝茶': '🍵',
      
      // --- ÁGUA / WATER ---
      'agua': '💧', 'água': '💧', 'beber agua': '💧',
      'water': '💧', 'drink water': '💧', 'hydrate': '💧',
      'hidratarse': '💧',
      'eau': '💧', 'boire de leau': '💧',
      'wasser': '💧', 'trinken': '💧',
      'acqua': '💧', 'bere acqua': '💧',
      '水': '💧', '水を飲む': '💧',
      '물': '💧', '물 마시기': '💧',
      '喝水': '💧',
      
      // --- PASSEAR CACHORRO / WALK DOG ---
      'passear cachorro': '🐕', 'passear com cachorro': '🐕', 'levar cachorro': '🐕',
      'walk dog': '🐕', 'dog walk': '🐕', 'walking the dog': '🐕',
      'pasear perro': '🐕', 'sacar al perro': '🐕',
      'promener le chien': '🐕', 'sortir le chien': '🐕',
      'mit dem hund gehen': '🐕', 'gassi gehen': '🐕', 'hund spazieren': '🐕',
      'portare fuori il cane': '🐕', 'passeggiare con il cane': '🐕',
      '犬の散歩': '🐕', 'いぬのさんぽ': '🐕',
      '강아지 산책': '🐕', '개 산책': '🐕',
      '遛狗': '🐕', '溜狗': '🐕',
      
      // --- ALIMENTAR PET / FEED PET ---
      'alimentar pet': '🐶', 'dar comida cachorro': '🐶', 'dar racao': '🐶',
      'feed pet': '🐶', 'feed dog': '🐶', 'feed cat': '🐱', 'pet food': '🐶',
      'alimentar mascota': '🐶', 'dar de comer': '🐶',
      'nourrir animal': '🐶', 'donner a manger': '🐶',
      'tier futtern': '🐶', 'haustier futtern': '🐶',
      'dar da mangiare': '🐶', 'nutrire animale': '🐶',
      'ペットの餌': '🐶', 'えさをあげる': '🐶',
      '밥주기': '🐶', '사료주기': '🐶',
      '喂宠物': '🐶', '喂狗': '🐶',
      
      // --- REGAR PLANTAS / WATER PLANTS ---
      'regar plantas': '🌱', 'regar': '🌱', 'plantas': '🌱', 'jardim': '🌱',
      'water plants': '🌱', 'watering': '🌱', 'garden': '🌱', 'gardening': '🌱',
      'jardin': '🌱', 'jardín': '🌱',
      'arroser plantes': '🌱', 'jardinage': '🌱',
      'pflanzen giessen': '🌱', 'garten': '🌱', 'gartenarbeit': '🌱',
      'innaffiare piante': '🌱', 'giardino': '🌱', 'giardinaggio': '🌱',
      '植物に水': '🌱', '水やり': '🌱', '庭': '🌱',
      '물주기': '🌱', '식물': '🌱', '정원': '🌱',
      '浇花': '🌱', '浇水': '🌱', '花园': '🌱',
      
      // --- LIXO / TRASH ---
      'lixo': '🗑️', 'jogar lixo': '🗑️', 'tirar lixo': '🗑️',
      'trash': '🗑️', 'garbage': '🗑️', 'take out trash': '🗑️', 'rubbish': '🗑️',
      'basura': '🗑️', 'sacar la basura': '🗑️', 'tirar la basura': '🗑️',
      'poubelle': '🗑️', 'sortir les poubelles': '🗑️', 'ordures': '🗑️',
      'mull': '🗑️', 'müll': '🗑️', 'mullrausbringen': '🗑️',
      'spazzatura': '🗑️', 'buttare la spazzatura': '🗑️', 'immondizia': '🗑️',
      'ゴミ出し': '🗑️', 'ゴミ': '🗑️', 'ごみ': '🗑️',
      '쓰레기': '🗑️', '쓰레기 버리기': '🗑️',
      '垃圾': '🗑️', '倒垃圾': '🗑️',
      
      // --- PASSAR ROUPA / IRON ---
      'passar roupa': '👔', 'passar': '👔', 'ferro de passar': '👔',
      'iron': '👔', 'ironing': '👔', 'iron clothes': '👔',
      'planchar': '👔', 'planchar ropa': '👔',
      'repasser': '👔', 'repassage': '👔', 'fer a repasser': '👔',
      'bugeln': '👔', 'bügeln': '👔',
      'stirare': '👔', 'ferro da stiro': '👔',
      'アイロン': '👔', 'アイロンがけ': '👔',
      '다림질': '👔', '다리미': '👔',
      '熨衣服': '👔', '熨烫': '👔',
      
      // ============================================
      // FASE 2: TRABALHO & ESTUDO (~125 emojis)
      // ============================================
      
      // --- REUNIÃO / MEETING ---
      'reuniao': '📊', 'reunião': '📊', 'videoconferencia': '📊',
      'meeting': '📊', 'conference': '📊', 'video call': '📊', 'zoom': '📊', 'teams': '📊',
      'junta': '📊', 'videollamada': '📊',
      'réunion': '📊', 'visioconference': '📊',
      'besprechung': '📊', 'sitzung': '📊', 'konferenz': '📊',
      'riunione': '📊', 'incontro': '📊', 'videochiamata': '📊',
      '会議': '📊', 'ミーティング': '📊', 'かいぎ': '📊',
      '회의': '📊', '미팅': '📊', '화상회의': '📊',
      '开会': '📊', '视频会议': '📊',
      
      // --- TRABALHO / WORK ---
      'trabalho': '💼', 'trampo': '💼', 'serviço': '💼', 'emprego': '💼',
      'work': '💼', 'job': '💼', 'office': '💼', 'workplace': '💼',
      'trabajo': '💼', 'oficina': '💼', 'curro': '💼', 'chamba': '💼',
      'travail': '💼', 'boulot': '💼', 'bureau': '💼',
      'arbeit': '💼', 'büro': '💼', 'arbeitsplatz': '💼',
      'lavoro': '💼', 'ufficio': '💼',
      '仕事': '💼', 'しごと': '💼', 'オフィス': '💼',
      '일': '💼', '출근': '💼', '회사': '💼', '직장': '💼',
      '工作': '💼', '上班': '💼', '办公室': '💼',
      
      // --- HOME OFFICE ---
      'home office': '🏠', 'trabalhar de casa': '🏠', 'remoto': '🏠',
      'remote work': '🏠', 'work from home': '🏠', 'wfh': '🏠',
      'teletrabajo': '🏠', 'trabajo remoto': '🏠',
      'télétravail': '🏠', 'teletravail': '🏠', 'travail a distance': '🏠',
      'homeoffice': '🏠', 'heimarbeit': '🏠',
      'lavoro da casa': '🏠', 'smart working': '🏠', 'telelavoro': '🏠',
      'リモートワーク': '🏠', '在宅勤務': '🏠', 'テレワーク': '🏠',
      '재택근무': '🏠', '원격근무': '🏠',
      '远程工作': '🏠', '在家工作': '🏠', '居家办公': '🏠',
      
      // --- ESTUDAR / STUDY ---
      'estudar': '📚', 'estudos': '📚', 'estudando': '📚',
      'study': '📚', 'studying': '📚', 'homework': '📚', 'revision': '📚',
      'estudiar': '📚', 'deberes': '📚', 'tarea': '📚',
      'étudier': '📚', 'etudier': '📚', 'devoirs': '📚', 'révision': '📚',
      'studieren': '📚', 'lernen': '📚', 'hausaufgaben': '📚',
      'studiare': '📚', 'compiti': '📚',
      '勉強': '📚', 'べんきょう': '📚', '宿題': '📚',
      '공부': '📚', '공부하다': '📚', '숙제': '📚',
      '学习': '📚', '作业': '📚',
      
      // --- ESCOLA / SCHOOL ---
      'escola': '🏫', 'colegio': '🏫', 'colégio': '🏫',
      'school': '🏫', 'class': '🏫', 'classroom': '🏫',
      'escuela': '🏫', 'clase': '🏫',
      'école': '🏫', 'ecole': '🏫', 'classe': '🏫', 'lycée': '🏫',
      'schule': '🏫', 'unterricht': '🏫', 'klasse': '🏫',
      'scuola': '🏫', 'lezione': '🏫',
      '学校': '🏫', 'がっこう': '🏫', '授業': '🏫',
      '학교': '🏫', '수업': '🏫',
      '上课': '🏫',
      
      // --- UNIVERSIDADE / UNIVERSITY ---
      'faculdade': '🎓', 'universidade': '🎓', 'campus': '🎓',
      'university': '🎓', 'college': '🎓', 'uni': '🎓',
      'universidad': '🎓', 'facultad': '🎓',
      'université': '🎓', 'universite': '🎓', 'fac': '🎓',
      'universität': '🎓', 'hochschule': '🎓',
      'università': '🎓', 'universita': '🎓',
      '大学': '🎓', 'だいがく': '🎓',
      '대학': '🎓', '대학교': '🎓',
      '上大学': '🎓',
      
      // --- PROVA / EXAM ---
      'prova': '📝', 'exame': '📝', 'teste': '📝', 'simulado': '📝',
      'exam': '📝', 'test': '📝', 'quiz': '📝', 'examination': '📝',
      'examen': '📝', 'prueba': '📝', 'parcial': '📝', 'final': '📝',
      'épreuve': '📝', 'contrôle': '📝', 'partiel': '📝',
      'prüfung': '📝', 'pruefung': '📝', 'klausur': '📝',
      'esame': '📝', 'verifica': '📝', 'compito': '📝',
      '試験': '📝', 'しけん': '📝', 'テスト': '📝',
      '시험': '📝', '테스트': '📝',
      '考试': '📝', '测验': '📝',
      
      // --- APRESENTAÇÃO / PRESENTATION ---
      'apresentacao': '📽️', 'apresentação': '📽️', 'slide': '📽️', 'slides': '📽️',
      'presentation': '📽️', 'powerpoint': '📽️', 'keynote': '📽️', 'pitch': '📽️',
      'presentacion': '📽️', 'presentación': '📽️', 'diapositivas': '📽️',
      'présentation': '📽️', 'exposé': '📽️',
      'prasentation': '📽️', 'präsentation': '📽️', 'vortrag': '📽️',
      'presentazione': '📽️',
      'プレゼン': '📽️', 'プレゼンテーション': '📽️', '発表': '📽️',
      '발표': '📽️', '프레젠테이션': '📽️', 'ppt': '📽️',
      '演示': '📽️', '汇报': '📽️',
      
      // --- DEADLINE / PRAZO ---
      'deadline': '⏳', 'prazo': '⏳', 'entrega': '⏳', 'entregar': '⏳',
      'due date': '⏳', 'submission': '⏳', 'due': '⏳',
      'fecha limite': '⏳', 'fecha límite': '⏳', 'plazo': '⏳', 'vencimiento': '⏳',
      'date limite': '⏳', 'échéance': '⏳', 'echeance': '⏳', 'delai': '⏳',
      'frist': '⏳', 'abgabe': '⏳', 'termin': '⏳',
      'scadenza': '⏳', 'consegna': '⏳',
      '締め切り': '⏳', 'しめきり': '⏳', '期限': '⏳',
      '마감': '⏳', '제출': '⏳', '기한': '⏳',
      '截止日期': '⏳', '交稿': '⏳',
      
      // --- PROJETO / PROJECT ---
      'projeto': '📋', 'projetos': '📋',
      'project': '📋', 'projects': '📋',
      'proyecto': '📋', 'proyectos': '📋',
      'projet': '📋', 'projets': '📋',
      'projekt': '📋', 'projekte': '📋',
      'progetto': '📋', 'progetti': '📋',
      'プロジェクト': '📋',
      '프로젝트': '📋',
      '项目': '📋', '工程': '📋',
      
      // --- CURSO / COURSE ---
      'curso': '🎓', 'cursos': '🎓', 'aula': '🎓',
      'course': '🎓', 'lesson': '🎓', 'training': '🎓', 'workshop': '🎓',
      'taller': '🎓', 'capacitacion': '🎓',
      'cours': '🎓', 'formation': '🎓', 'atelier': '🎓',
      'kurs': '🎓', 'schulung': '🎓', 'weiterbildung': '🎓',
      'corso': '🎓', 'formazione': '🎓',
      'コース': '🎓', '講座': '🎓', '研修': '🎓',
      '강좌': '🎓', '강의': '🎓', '워크샵': '🎓',
      '课程': '🎓', '培训': '🎓', '讲座': '🎓',
      
      // --- EMAIL ---
      'email': '📧', 'emails': '📧', 'responder email': '📧',
      'mail': '📧', 'inbox': '📧', 'reply': '📧',
      'correo': '📧', 'correo electronico': '📧', 'correo electrónico': '📧',
      'courriel': '📧', 'messagerie': '📧', 'mél': '📧',
      'nachricht': '📧',
      'posta': '📧', 'posta elettronica': '📧',
      'メール': '📧', 'Eメール': '📧',
      '이메일': '📧', '메일': '📧',
      '邮件': '📧', '电子邮件': '📧',
      
      // --- LIGAÇÃO / CALL ---
      'ligacao': '📞', 'ligação': '📞', 'telefonema': '📞', 'ligar': '📞',
      'phone call': '📞', 'call back': '📞', 'phone': '📞',
      'llamada': '📞', 'llamar': '📞', 'telefonear': '📞',
      'appel': '📞', 'coup de fil': '📞', 'téléphone': '📞',
      'anruf': '📞', 'telefonat': '📞', 'anrufen': '📞',
      'chiamata': '📞', 'telefonata': '📞', 'chiamare': '📞',
      '電話': '📞', 'でんわ': '📞',
      '전화': '📞', '통화': '📞',
      '电话': '📞', '打电话': '📞',
      
      // --- ENTREVISTA / INTERVIEW ---
      'entrevista': '🎤', 'entrevistas': '🎤',
      'interview': '🎤', 'job interview': '🎤',
      'entrevista de trabajo': '🎤', 'entrevista laboral': '🎤',
      'entretien': '🎤', 'entretien dembauche': '🎤',
      'vorstellungsgespräch': '🎤', 'bewerbungsgesprach': '🎤',
      'colloquio': '🎤', 'colloquio di lavoro': '🎤',
      '面接': '🎤', 'めんせつ': '🎤',
      '면접': '🎤', '인터뷰': '🎤',
      '面试': '🎤',
      
      // --- RELATÓRIO / REPORT ---
      'relatorio': '📄', 'relatório': '📄', 'relatorios': '📄',
      'report': '📄', 'reports': '📄', 'document': '📄',
      'informe': '📄', 'reporte': '📄', 'documento': '📄',
      'rapport': '📄', 'compte rendu': '📄',
      'bericht': '📄', 'berichte': '📄', 'dokument': '📄',
      'rapporto': '📄', 'relazione': '📄',
      '報告書': '📄', 'レポート': '📄',
      '보고서': '📄', '리포트': '📄',
      '报告': '📄', '文档': '📄',
      
      // --- CONTRATO / CONTRACT ---
      'contrato': '📃', 'contratos': '📃', 'assinar': '📃',
      'contract': '📃', 'sign': '📃', 'agreement': '📃',
      'firmar': '📃', 'acuerdo': '📃',
      'contrat': '📃', 'signer': '📃', 'accord': '📃',
      'vertrag': '📃', 'unterschreiben': '📃',
      'contratto': '📃', 'firmare': '📃', 'accordo': '📃',
      '契約': '📃', 'けいやく': '📃',
      '계약': '📃', '계약서': '📃',
      '合同': '📃', '签合同': '📃',
      
      // --- BRAINSTORM / IDEIAS ---
      'brainstorm': '💡', 'ideias': '💡', 'ideação': '💡',
      'brainstorming': '💡', 'ideas': '💡', 'ideation': '💡',
      'lluvia de ideas': '💡',
      'remue meninges': '💡', 'idées': '💡',
      'ideenfindung': '💡', 'ideen': '💡',
      'idee': '💡',
      'ブレスト': '💡', 'アイデア': '💡',
      '브레인스토밍': '💡', '아이디어': '💡',
      '头脑风暴': '💡', '创意': '💡',
      
      // --- SEMINÁRIO / SEMINAR ---
      'seminario': '🎓', 'seminário': '🎓', 'palestra': '🎓', 'webinar': '🎓',
      'seminar': '🎓', 'lecture': '🎓', 'talk': '🎓',
      'conferencia': '🎓', 'charla': '🎓', 'ponencia': '🎓',
      'séminaire': '🎓', 'seminaire': '🎓', 'conférence': '🎓', 'webinaire': '🎓',
      'convegno': '🎓', 'conferenza': '🎓',
      'セミナー': '🎓', 'ウェビナー': '🎓', '講演': '🎓',
      '세미나': '🎓', '웨비나': '🎓', '강연': '🎓',
      '研讨会': '🎓', '网络研讨会': '🎓',
      
      // --- NOTA / GRADE ---
      'nota': '📊', 'notas': '📊', 'boletim': '📊',
      'grade': '📊', 'grades': '📊', 'report card': '📊', 'gpa': '📊',
      'calificacion': '📊', 'calificación': '📊',
      'note': '📊', 'bulletin': '📊', 'moyenne': '📊',
      'noten': '📊', 'zeugnis': '📊',
      'voto': '📊', 'voti': '📊', 'pagella': '📊',
      '成績': '📊', 'せいせき': '📊', '通知表': '📊',
      '성적': '📊', '성적표': '📊',
      '成绩': '📊', '分数': '📊',
      
      // --- BIBLIOTECA / LIBRARY ---
      'biblioteca': '📖', 'livros': '📖', 'leitura': '📖',
      'library': '📖', 'books': '📖', 'reading': '📖',
      'libros': '📖', 'lectura': '📖',
      'bibliothèque': '📖', 'bibliotheque': '📖', 'livres': '📖',
      'bibliothek': '📖', 'bücher': '📖', 'lesen': '📖',
      'libri': '📖', 'lettura': '📖',
      '図書館': '📖', 'としょかん': '📖', '読書': '📖',
      '도서관': '📖', '독서': '📖',
      '图书馆': '📖',
      
      // ============================================
      // FASE 3: SAÚDE, ESPORTES & LAZER (~125 emojis)
      // ============================================
      
      // --- MÉDICO / DOCTOR ---
      'medico': '👨‍⚕️', 'médico': '👨‍⚕️', 'consulta': '👨‍⚕️', 'consultorio': '👨‍⚕️',
      'doctor': '👨‍⚕️', 'physician': '👨‍⚕️', 'appointment': '👨‍⚕️', 'checkup': '👨‍⚕️',
      'cita medica': '👨‍⚕️',
      'médecin': '👨‍⚕️', 'docteur': '👨‍⚕️', 'rendez-vous médical': '👨‍⚕️',
      'arzt': '👨‍⚕️', 'doktor': '👨‍⚕️', 'arzttermin': '👨‍⚕️',
      'dottore': '👨‍⚕️', 'visita medica': '👨‍⚕️',
      '医者': '👨‍⚕️', 'いしゃ': '👨‍⚕️', '診察': '👨‍⚕️',
      '의사': '👨‍⚕️', '진료': '👨‍⚕️',
      '医生': '👨‍⚕️', '看病': '👨‍⚕️', '看医生': '👨‍⚕️',
      
      // --- DENTISTA / DENTIST ---
      'dentista': '🦷', 'dente': '🦷', 'dentes': '🦷',
      'dentist': '🦷', 'teeth': '🦷', 'dental': '🦷',
      'dientes': '🦷', 'odontologo': '🦷',
      'dentiste': '🦷', 'dents': '🦷',
      'zahnarzt': '🦷', 'zahn': '🦷', 'zähne': '🦷',
      'denti': '🦷',
      '歯医者': '🦷', 'はいしゃ': '🦷', '歯': '🦷',
      '치과': '🦷', '치과의사': '🦷',
      '牙医': '🦷', '看牙': '🦷',
      
      // --- HOSPITAL ---
      'hospital': '🏥', 'emergencia': '🏥', 'emergência': '🏥', 'pronto socorro': '🏥',
      'emergency': '🏥', 'er': '🏥', 'clinic': '🏥',
      'urgencias': '🏥', 'clinica': '🏥',
      'hôpital': '🏥', 'hopital': '🏥', 'urgences': '🏥', 'clinique': '🏥',
      'krankenhaus': '🏥', 'notaufnahme': '🏥', 'klinik': '🏥',
      'ospedale': '🏥', 'pronto soccorso': '🏥',
      '病院': '🏥', 'びょういん': '🏥', '救急': '🏥',
      '응급실': '🏥',
      '医院': '🏥', '急诊': '🏥',
      
      // --- FARMÁCIA / PHARMACY ---
      'farmacia': '💊', 'farmácia': '💊', 'remedio': '💊', 'remédio': '💊',
      'pharmacy': '💊', 'drugstore': '💊', 'medicine': '💊', 'pills': '💊',
      'medicamento': '💊', 'medicinas': '💊',
      'pharmacie': '💊', 'médicament': '💊',
      'apotheke': '💊', 'medikament': '💊', 'medizin': '💊',
      'medicina': '💊', 'medicinale': '💊',
      '薬局': '💊', 'やっきょく': '💊', '薬': '💊',
      '약국': '💊', '약': '💊',
      '药店': '💊', '买药': '💊',
      
      // --- ACADEMIA / GYM ---
      'academia': '💪', 'musculacao': '💪', 'musculação': '💪', 'malhar': '💪',
      'gym': '💪', 'workout': '💪', 'weights': '💪', 'fitness': '💪',
      'gimnasio': '💪', 'pesas': '💪', 'ejercicio': '💪',
      'salle de sport': '💪', 'musculation': '💪',
      'fitnessstudio': '💪', 'krafttraining': '💪',
      'ジム': '💪', '筋トレ': '💪', 'きんトレ': '💪',
      '헬스장': '💪', '헬스': '💪', '운동': '💪',
      '健身房': '💪', '健身': '💪', '锻炼': '💪',
      
      // --- TREINO / TRAINING ---
      'treino': '🏋️', 'treinar': '🏋️',
      'exercise': '🏋️',
      'entrenamiento': '🏋️', 'entrenar': '🏋️',
      'entraînement': '🏋️', 'entrainement': '🏋️',
      'übung': '🏋️', 'trainieren': '🏋️',
      'allenamento': '🏋️', 'allenarsi': '🏋️',
      'トレーニング': '🏋️',
      '트레이닝': '🏋️',
      '训练': '🏋️',
      
      // --- YOGA / MEDITAÇÃO ---
      'yoga': '🧘', 'ioga': '🧘', 'meditacao': '🧘', 'meditação': '🧘',
      'meditation': '🧘', 'mindfulness': '🧘',
      'meditacion': '🧘', 'meditación': '🧘',
      'méditation': '🧘',
      'meditazione': '🧘',
      'ヨガ': '🧘', '瞑想': '🧘', 'めいそう': '🧘',
      '요가': '🧘', '명상': '🧘',
      '瑜伽': '🧘', '冥想': '🧘',
      
      // --- PILATES ---
      'pilates': '🧘‍♀️',
      'ピラティス': '🧘‍♀️',
      '필라테스': '🧘‍♀️',
      '普拉提': '🧘‍♀️',
      
      // --- FUTEBOL / SOCCER ---
      'futebol': '⚽', 'bola': '⚽', 'pelada': '⚽', 'golzinho': '⚽', 'rachao': '⚽',
      'soccer': '⚽', 'football': '⚽', 'futbol': '⚽', 'fútbol': '⚽',
      'foot': '⚽', 'match de foot': '⚽',
      'fußball': '⚽', 'fussball': '⚽',
      'calcio': '⚽', 'partita': '⚽',
      'サッカー': '⚽', 'フットボール': '⚽',
      '축구': '⚽',
      '足球': '⚽', '踢球': '⚽',
      
      // --- BASQUETE / BASKETBALL ---
      'basquete': '🏀', 'basket': '🏀',
      'basketball': '🏀', 'hoops': '🏀',
      'baloncesto': '🏀', 'basquetbol': '🏀',
      'pallacanestro': '🏀',
      'バスケ': '🏀', 'バスケットボール': '🏀',
      '농구': '🏀',
      '篮球': '🏀', '打篮球': '🏀',
      
      // --- VOLEI / VOLLEYBALL ---
      'volei': '🏐', 'vôlei': '🏐', 'volleyball': '🏐',
      'voleibol': '🏐', 'voley': '🏐',
      'volley': '🏐',
      'pallavolo': '🏐',
      'バレー': '🏐', 'バレーボール': '🏐',
      '배구': '🏐',
      '排球': '🏐', '打排球': '🏐',
      
      // --- TENIS / TENNIS ---
      'tenis': '🎾', 'tênis': '🎾',
      'tennis': '🎾',
      'テニス': '🎾',
      '테니스': '🎾',
      '网球': '🎾', '打网球': '🎾',
      
      // --- CORRIDA / RUNNING ---
      'corrida': '🏃', 'correr': '🏃', 'cooper': '🏃',
      'running': '🏃', 'run': '🏃', 'jog': '🏃',
      'carrera': '🏃', 'trotar': '🏃',
      'courir': '🏃',
      'laufen': '🏃', 'joggen': '🏃', 'rennen': '🏃',
      'correre': '🏃', 'corsa': '🏃',
      'ランニング': '🏃', 'ジョギング': '🏃', '走る': '🏃',
      '달리기': '🏃', '조깅': '🏃',
      '跑步': '🏃', '慢跑': '🏃',
      
      // --- CAMINHADA / WALKING ---
      'caminhada': '🚶', 'caminhar': '🚶', 'andar': '🚶', 'passeio': '🚶',
      'walk': '🚶', 'walking': '🚶', 'stroll': '🚶', 'hike': '🚶',
      'caminar': '🚶', 'paseo': '🚶', 'caminata': '🚶',
      'marche': '🚶', 'marcher': '🚶', 'promenade': '🚶', 'randonnée': '🚶',
      'spaziergang': '🚶', 'spazieren': '🚶', 'wandern': '🚶',
      'camminare': '🚶', 'passeggiata': '🚶', 'camminata': '🚶',
      'ウォーキング': '🚶', '散歩': '🚶', 'さんぽ': '🚶',
      '걷기': '🚶', '산책': '🚶',
      '散步': '🚶', '走路': '🚶',
      
      // --- NATAÇÃO / SWIMMING ---
      'natacao': '🏊', 'natação': '🏊', 'nadar': '🏊', 'piscina': '🏊',
      'swimming': '🏊', 'swim': '🏊', 'pool': '🏊',
      'natacion': '🏊', 'natación': '🏊',
      'natation': '🏊', 'nager': '🏊', 'piscine': '🏊',
      'schwimmen': '🏊', 'schwimmbad': '🏊',
      'nuotare': '🏊', 'nuoto': '🏊',
      '水泳': '🏊', 'すいえい': '🏊', 'プール': '🏊',
      '수영': '🏊', '수영장': '🏊',
      '游泳': '🏊', '游泳池': '🏊',
      
      // --- PRAIA / BEACH ---
      'praia': '🏖️', 'prainha': '🏖️', 'litoral': '🏖️',
      'beach': '🏖️', 'seaside': '🏖️', 'shore': '🏖️',
      'playa': '🏖️', 'costa': '🏖️',
      'plage': '🏖️', 'bord de mer': '🏖️',
      'strand': '🏖️', 'meer': '🏖️',
      'spiaggia': '🏖️', 'mare': '🏖️',
      'ビーチ': '🏖️', '海': '🏖️', 'うみ': '🏖️',
      '해변': '🏖️', '바다': '🏖️',
      '海滩': '🏖️', '海边': '🏖️',
      
      // --- VIAGEM / TRAVEL ---
      'viagem': '✈️', 'viajar': '✈️', 'aeroporto': '✈️', 'voo': '✈️', 'aviao': '✈️',
      'travel': '✈️', 'trip': '✈️', 'airport': '✈️', 'flight': '✈️', 'vacation': '✈️',
      'viaje': '✈️', 'aeropuerto': '✈️', 'vuelo': '✈️', 'vacaciones': '✈️',
      'voyage': '✈️', 'voyager': '✈️', 'aéroport': '✈️', 'vol': '✈️', 'vacances': '✈️',
      'reise': '✈️', 'reisen': '✈️', 'flughafen': '✈️', 'flug': '✈️', 'urlaub': '✈️',
      'viaggio': '✈️', 'viaggiare': '✈️', 'volo': '✈️', 'vacanza': '✈️',
      '旅行': '✈️', 'りょこう': '✈️', '空港': '✈️', '飛行機': '✈️',
      '여행': '✈️', '공항': '✈️', '비행기': '✈️',
      '旅游': '✈️', '机场': '✈️', '飞机': '✈️',
      
      // --- CINEMA / MOVIES ---
      'cinema': '🎬', 'filme': '🎬', 'filmes': '🎬',
      'movies': '🎬', 'movie': '🎬', 'theater': '🎬', 'theatre': '🎬',
      'cine': '🎬', 'pelicula': '🎬', 'película': '🎬',
      'cinéma': '🎬', 'film': '🎬',
      'kino': '🎬',
      '映画': '🎬', 'えいが': '🎬', '映画館': '🎬',
      '영화': '🎬', '영화관': '🎬',
      '电影': '🎬', '电影院': '🎬', '看电影': '🎬',
      
      // --- SHOW / CONCERT ---
      'show': '🎵', 'concerto': '🎵', 'musica': '🎵', 'música': '🎵',
      'concert': '🎵', 'gig': '🎵', 'live music': '🎵',
      'concierto': '🎵',
      'spectacle': '🎵', 'musique': '🎵',
      'konzert': '🎵', 'musik': '🎵',
      'コンサート': '🎵', 'ライブ': '🎵', '音楽': '🎵',
      '콘서트': '🎵', '공연': '🎵', '음악': '🎵',
      '音乐会': '🎵', '演唱会': '🎵', '音乐': '🎵',
      
      // --- FESTA / PARTY ---
      'festa': '🎉', 'balada': '🎉', 'festinha': '🎉',
      'party': '🎉', 'celebration': '🎉', 'bash': '🎉',
      'fiesta': '🎉', 'celebracion': '🎉', 'celebración': '🎉',
      'fête': '🎉', 'fete': '🎉', 'soirée': '🎉', 'soiree': '🎉',
      'feier': '🎉', 'fest': '🎉',
      'festeggiare': '🎉',
      'パーティー': '🎉', 'パーティ': '🎉',
      '파티': '🎉',
      '派对': '🎉', '聚会': '🎉',
      
      // --- BAR ---
      'bar': '🍺', 'barzinho': '🍺', 'cerveja': '🍺', 'boteco': '🍺',
      'pub': '🍺', 'beer': '🍺', 'drinks': '🍺',
      'cerveza': '🍺', 'copas': '🍺',
      'bière': '🍺', 'apéro': '🍺',
      'bier': '🍺', 'kneipe': '🍺',
      'birra': '🍺',
      'バー': '🍺', '居酒屋': '🍺', 'ビール': '🍺',
      '술집': '🍺', '맥주': '🍺',
      '酒吧': '🍺', '喝酒': '🍺', '啤酒': '🍺',
      
      // --- HAPPY HOUR ---
      'happy hour': '🍻', 'happyhour': '🍻',
      'ハッピーアワー': '🍻',
      '해피아워': '🍻',
      
      // --- CHURRASCO / BBQ ---
      'churrasco': '🍖', 'churras': '🍖',
      'bbq': '🍖', 'barbecue': '🍖', 'grill': '🍖',
      'asado': '🍖', 'parrilla': '🍖', 'barbacoa': '🍖',
      'grillades': '🍖',
      'grillen': '🍖', 'grillparty': '🍖',
      'grigliata': '🍖',
      'バーベキュー': '🍖',
      '바베큐': '🍖',
      '烧烤': '🍖',
      
      // --- RESTAURANTE / RESTAURANT ---
      'restaurante': '🍽️', 'almocar fora': '🍽️', 'jantar fora': '🍽️',
      'restaurant': '🍽️', 'dining': '🍽️', 'eat out': '🍽️',
      'comer fuera': '🍽️',
      'resto': '🍽️', 'dîner dehors': '🍽️',
      'essen gehen': '🍽️',
      'ristorante': '🍽️', 'mangiare fuori': '🍽️',
      'レストラン': '🍽️', '外食': '🍽️',
      '식당': '🍽️', '레스토랑': '🍽️', '외식': '🍽️',
      '餐厅': '🍽️', '吃饭': '🍽️',
      
      // --- SPA / MASSAGEM ---
      'spa': '💆', 'massagem': '💆', 'relaxar': '💆',
      'massage': '💆', 'relax': '💆', 'wellness': '💆',
      'masaje': '💆', 'relajarse': '💆',
      'détente': '💆',
      'entspannung': '💆',
      'massaggio': '💆',
      'スパ': '💆', 'マッサージ': '💆', 'リラックス': '💆',
      '스파': '💆', '마사지': '💆',
      '按摩': '💆', '放松': '💆',
      
      // --- SHOPPING ---
      'shopping': '🛍️', 'comprinhas': '🛍️',
      'mall': '🛍️',
      'centro comercial': '🛍️',
      'centre commercial': '🛍️', 'galerie': '🛍️',
      'einkaufszentrum': '🛍️',
      'centro commerciale': '🛍️',
      'ショッピング': '🛍️', 'モール': '🛍️',
      '쇼핑몰': '🛍️',
      '商场': '🛍️', '购物中心': '🛍️',
      
      // --- BANCO / BANK ---
      'banco': '🏦', 'agencia': '🏦', 'agência': '🏦',
      'bank': '🏦', 'banking': '🏦',
      'sucursal': '🏦',
      'banque': '🏦', 'agence': '🏦',
      'filiale': '🏦',
      'banca': '🏦',
      '銀行': '🏦', 'ぎんこう': '🏦',
      '은행': '🏦',
      '银行': '🏦',
      
      // ============================================
      // FASE 4: SOCIAL, FAMÍLIA & EVENTOS ESPECIAIS (~125 emojis)
      // ============================================
      
      // --- ANIVERSÁRIO / BIRTHDAY ---
      'aniversario': '🎂', 'aniversário': '🎂', 'niver': '🎂',
      'birthday': '🎂', 'bday': '🎂', 'b-day': '🎂',
      'cumpleanos': '🎂', 'cumpleaños': '🎂', 'cumple': '🎂',
      'anniversaire': '🎂',
      'geburtstag': '🎂',
      'compleanno': '🎂',
      '誕生日': '🎂', 'たんじょうび': '🎂',
      '생일': '🎂',
      '生日': '🎂',
      
      // --- CASAMENTO / WEDDING ---
      'casamento': '💒', 'casar': '💒',
      'wedding': '💒', 'marriage': '💒', 'bride': '💒', 'groom': '💒',
      'boda': '💒', 'casarse': '💒',
      'mariage': '💒', 'noces': '💒', 'mariée': '💒',
      'hochzeit': '💒', 'heirat': '💒', 'braut': '💒',
      'matrimonio': '💒', 'nozze': '💒', 'sposa': '💒', 'sposo': '💒',
      '結婚式': '💒', 'けっこんしき': '💒', '結婚': '💒',
      '결혼식': '💒', '결혼': '💒',
      '婚礼': '💒', '结婚': '💒',
      
      // --- AMIGOS / FRIENDS ---
      'amigos': '👯', 'amigas': '👯', 'galera': '👯',
      'friends': '👯', 'friend': '👯', 'buddies': '👯', 'pals': '👯', 'hang out': '👯',
      'cuates': '👯', 'panas': '👯',
      'amis': '👯', 'ami': '👯', 'copains': '👯', 'potes': '👯',
      'freunde': '👯', 'freund': '👯', 'kumpel': '👯',
      'amici': '👯', 'amico': '👯', 'amica': '👯',
      '友達': '👯', 'ともだち': '👯', '友人': '👯',
      '친구': '👯', '친구들': '👯',
      '朋友': '👯', '朋友们': '👯',
      
      // --- FAMÍLIA / FAMILY ---
      'familia': '👨‍👩‍👧', 'família': '👨‍👩‍👧', 'familias': '👨‍👩‍👧',
      'family': '👨‍👩‍👧', 'relatives': '👨‍👩‍👧',
      'familiares': '👨‍👩‍👧', 'parientes': '👨‍👩‍👧',
      'famille': '👨‍👩‍👧', 'proches': '👨‍👩‍👧',
      'familie': '👨‍👩‍👧', 'verwandte': '👨‍👩‍👧',
      'famiglia': '👨‍👩‍👧', 'parenti': '👨‍👩‍👧',
      '家族': '👨‍👩‍👧', 'かぞく': '👨‍👩‍👧',
      '가족': '👨‍👩‍👧',
      '家人': '👨‍👩‍👧', '家庭': '👨‍👩‍👧',
      
      // --- PAIS / PARENTS ---
      'pais': '👨‍👩‍👦', 'pai': '👨', 'mae': '👩', 'mãe': '👩', 'papai': '👨', 'mamae': '👩', 'mamãe': '👩',
      'parents': '👨‍👩‍👦', 'dad': '👨', 'mom': '👩', 'father': '👨', 'mother': '👩', 'daddy': '👨', 'mommy': '👩',
      'padres': '👨‍👩‍👦', 'papá': '👨', 'mamá': '👩',
      'pere': '👨', 'père': '👨', 'mère': '👩', 'mere': '👩', 'maman': '👩',
      'eltern': '👨‍👩‍👦', 'vater': '👨', 'mutter': '👩',
      'genitori': '👨‍👩‍👦', 'papà': '👨', 'mamma': '👩', 'padre it': '👨', 'madre it': '👩',
      '両親': '👨‍👩‍👦', 'りょうしん': '👨‍👩‍👦', '父': '👨', '母': '👩', 'ちち': '👨', 'はは': '👩',
      '부모님': '👨‍👩‍👦', '아버지': '👨', '어머니': '👩', '아빠': '👨', '엄마': '👩',
      '父母': '👨‍👩‍👦', '爸爸': '👨', '妈妈': '👩',
      
      // --- AVÓS / GRANDPARENTS ---
      'avos': '👴', 'avó': '👵', 'avo': '👴', 'vovo': '👵', 'vovó': '👵', 'vovô': '👴',
      'grandparents': '👴', 'grandma': '👵', 'grandpa': '👴', 'grandmother': '👵', 'grandfather': '👴', 'granny': '👵',
      'abuelos': '👴', 'abuela': '👵', 'abuelo': '👴', 'abuelita': '👵', 'abuelito': '👴',
      'grands-parents': '👴', 'grand-mere': '👵', 'grand-père': '👴', 'mamie': '👵', 'papi': '👴',
      'grosseltern': '👴', 'oma': '👵', 'opa': '👴', 'großmutter': '👵', 'großvater': '👴',
      'nonni': '👴', 'nonna': '👵', 'nonno': '👴',
      '祖父母': '👴', 'そふぼ': '👴', 'おじいちゃん': '👴', 'おばあちゃん': '👵',
      '조부모': '👴', '할아버지': '👴', '할머니': '👵',
      '爷爷': '👴', '奶奶': '👵', '外公': '👴', '外婆': '👵',
      
      // --- FILHOS / CHILDREN ---
      'filhos': '👶', 'filho': '👶', 'filha': '👶', 'crianca': '👶', 'criança': '👶', 'bebe': '👶', 'bebê': '👶',
      'children': '👶', 'child': '👶', 'kids': '👶', 'kid': '👶', 'baby': '👶', 'son': '👶', 'daughter': '👶',
      'hijos': '👶', 'hijo': '👶', 'hija': '👶', 'ninos': '👶', 'niños': '👶', 'nino': '👶', 'niña': '👶',
      'enfants': '👶', 'enfant': '👶', 'fils': '👶', 'fille': '👶', 'bébé': '👶',
      'kinder': '👶', 'kind': '👶', 'sohn': '👶', 'tochter': '👶',
      'figli': '👶', 'figlio': '👶', 'figlia': '👶', 'bambini': '👶', 'bambino': '👶',
      '子供': '👶', 'こども': '👶', '息子': '👶', '娘': '👶', '赤ちゃん': '👶',
      '아이': '👶', '아이들': '👶', '아들': '👶', '딸': '👶',
      '孩子': '👶', '儿子': '👶', '女儿': '👶', '宝宝': '👶',
      
      // --- IRMÃOS / SIBLINGS ---
      'irmaos': '👫', 'irmãos': '👫', 'irmao': '👫', 'irmão': '👫', 'irma': '👫', 'irmã': '👫',
      'siblings': '👫', 'brother': '👫', 'sister': '👫', 'bro': '👫', 'sis': '👫',
      'hermanos': '👫', 'hermano': '👫', 'hermana': '👫',
      'frères et sœurs': '👫', 'frere': '👫', 'frère': '👫', 'sœur': '👫', 'soeur': '👫',
      'geschwister': '👫', 'bruder': '👫', 'schwester': '👫',
      'fratelli': '👫', 'fratello': '👫', 'sorella': '👫',
      '兄弟': '👫', 'きょうだい': '👫', '兄': '👫', '弟': '👫', '姉': '👫', '妹': '👫',
      '형제': '👫', '오빠': '👫', '형': '👫', '누나': '👫', '언니': '👫', '동생': '👫',
      '兄弟姐妹': '👫', '哥哥': '👫', '弟弟': '👫', '姐姐': '👫', '妹妹': '👫',
      
      // --- NATAL / CHRISTMAS ---
      'natal': '🎄', 'natalino': '🎄', 'papai noel': '🎅',
      'christmas': '🎄', 'xmas': '🎄', 'santa': '🎅', 'santa claus': '🎅',
      'navidad': '🎄', 'nochebuena': '🎄',
      'noël': '🎄', 'noel': '🎄', 'père noël': '🎅',
      'weihnachten': '🎄', 'weihnachtsmann': '🎅', 'heiligabend': '🎄',
      'natale': '🎄', 'babbo natale': '🎅', 'vigilia': '🎄',
      'クリスマス': '🎄', 'サンタ': '🎅',
      '크리스마스': '🎄', '산타': '🎅',
      '圣诞节': '🎄', '圣诞老人': '🎅',
      
      // --- ANO NOVO / NEW YEAR ---
      'ano novo': '🎆', 'reveillon': '🎆', 'réveillon': '🎆', 'virada': '🎆',
      'new year': '🎆', 'new years': '🎆', 'new years eve': '🎆', 'nye': '🎆',
      'ano nuevo': '🎆', 'año nuevo': '🎆', 'nochevieja': '🎆',
      'nouvel an': '🎆', 'saint sylvestre': '🎆',
      'neujahr': '🎆', 'silvester': '🎆',
      'capodanno': '🎆', 'anno nuovo': '🎆',
      '新年': '🎆', 'しんねん': '🎆', 'お正月': '🎆', 'おしょうがつ': '🎆',
      '새해': '🎆', '신년': '🎆',
      '元旦': '🎆', '跨年': '🎆',
      
      // --- PÁSCOA / EASTER ---
      'pascoa': '🐰', 'páscoa': '🐰',
      'easter': '🐰', 'easter bunny': '🐰',
      'semana santa es': '🐰',
      'pâques': '🐰', 'paques': '🐰',
      'ostern': '🐰', 'osterhase': '🐰',
      'pasqua': '🐰',
      'イースター': '🐰', '復活祭': '🐰',
      '부활절': '🐰',
      '复活节': '🐰',
      
      // --- DIA DAS MÃES / MOTHER'S DAY ---
      'dia das maes': '💐', 'dia das mães': '💐',
      'mothers day': '💐', "mother's day": '💐',
      'dia de la madre': '💐', 'día de la madre': '💐',
      'fete des meres': '💐', 'fête des mères': '💐',
      'muttertag': '💐',
      'festa della mamma': '💐',
      '母の日': '💐', 'ははのひ': '💐',
      '어머니날': '💐',
      '母亲节': '💐',
      
      // --- DIA DOS PAIS / FATHER'S DAY ---
      'dia dos pais': '👔',
      'fathers day': '👔', "father's day": '👔',
      'dia del padre': '👔', 'día del padre': '👔',
      'fete des peres': '👔', 'fête des pères': '👔',
      'vatertag': '👔',
      'festa del papà': '👔', 'festa del papa': '👔',
      '父の日': '👔', 'ちちのひ': '👔',
      '아버지날': '👔',
      '父亲节': '👔',
      
      // --- VALENTINE'S DAY / DIA DOS NAMORADOS ---
      'dia dos namorados': '💕', 'valentines': '💕', 'valentim': '💕',
      'valentines day': '💕', "valentine's day": '💕',
      'san valentin': '💕', 'san valentín': '💕', 'dia del amor': '💕',
      'saint valentin': '💕',
      'valentinstag': '💕',
      'san valentino': '💕',
      'バレンタイン': '💕', 'バレンタインデー': '💕',
      '밸런타인데이': '💕', '발렌타인': '💕',
      '情人节': '💕',
      
      // --- FORMATURA / GRADUATION ---
      'formatura': '🎓', 'formar': '🎓', 'graduacao': '🎓', 'graduação': '🎓',
      'graduation': '🎓', 'graduate': '🎓', 'commencement': '🎓',
      'graduacion': '🎓', 'graduación': '🎓', 'licenciatura': '🎓',
      'remise de diplôme': '🎓', 'diplome': '🎓', 'diplôme': '🎓',
      'abschluss': '🎓', 'abschlussfeier': '🎓',
      'laurea': '🎓', 'diploma': '🎓',
      '卒業式': '🎓', 'そつぎょうしき': '🎓', '卒業': '🎓',
      '졸업식': '🎓', '졸업': '🎓',
      '毕业典礼': '🎓', '毕业': '🎓',
      
      // --- CHÁ DE BEBÊ / BABY SHOWER ---
      'cha de bebe': '🍼', 'chá de bebê': '🍼', 'cha de fraldas': '🍼',
      'baby shower': '🍼',
      'lluvia de bebe': '🍼',
      'fête prénatale': '🍼',
      'babyparty': '🍼',
      'festa per il bambino': '🍼',
      'ベビーシャワー': '🍼',
      '베이비샤워': '🍼',
      '宝宝派对': '🍼',
      
      // --- NOIVADO / ENGAGEMENT ---
      'noivado': '💍', 'noiva': '💍', 'noivo': '💍', 'pedido de casamento': '💍',
      'engagement': '💍', 'engaged': '💍', 'proposal': '💍',
      'compromiso': '💍', 'pedida de mano': '💍',
      'fiançailles': '💍',
      'verlobung': '💍', 'verlobt': '💍',
      'fidanzamento': '💍', 'proposta di matrimonio': '💍',
      '婚約': '💍', 'こんやく': '💍', 'プロポーズ': '💍',
      '약혼': '💍', '프러포즈': '💍',
      '订婚': '💍', '求婚': '💍',
      
      // --- BATIZADO / BAPTISM ---
      'batizado': '⛪', 'batismo': '⛪',
      'baptism': '⛪', 'christening': '⛪',
      'bautizo': '⛪', 'bautismo': '⛪',
      'baptême': '⛪', 'bapteme': '⛪',
      'taufe': '⛪',
      'battesimo': '⛪',
      '洗礼': '⛪', 'せんれい': '⛪',
      '세례': '⛪', '세례식': '⛪',
      '受洗': '⛪',
      
      // --- ENCONTRO / DATE ---
      'encontro': '❤️', 'date romantico': '❤️', 'romântico': '❤️',
      'romantic': '❤️', 'romance': '❤️',
      'cita romantica': '❤️', 'romántico': '❤️',
      'rendez-vous': '❤️', 'rencontre': '❤️', 'romantique': '❤️',
      'verabredung': '❤️', 'romantisch': '❤️',
      'appuntamento': '❤️', 'romantico it': '❤️',
      'デート': '❤️', 'ロマンチック': '❤️',
      '데이트': '❤️', '로맨틱': '❤️',
      '约会': '❤️', '浪漫': '❤️',
      
      // --- VISITA / VISIT ---
      'visitar': '🏠', 'visitando': '🏠',
      'visit': '🏠', 'visiting': '🏠',
      'visita es': '🏠',
      'visite': '🏠', 'rendre visite': '🏠',
      'besuch': '🏠', 'besuchen': '🏠',
      'visita it': '🏠', 'visitare': '🏠',
      '訪問': '🏠', 'ほうもん': '🏠',
      '방문': '🏠',
      '拜访': '🏠', '探望': '🏠',
      
      // --- CHURRASCO FAMÍLIA / FAMILY BBQ ---
      'churras familia': '🍖', 'churrasco em familia': '🍖', 'almoco em familia': '🍽️',
      'family bbq': '🍖', 'family gathering': '👨‍👩‍👧', 'family dinner': '🍽️',
      'reunion familiar': '👨‍👩‍👧', 'reunión familiar': '👨‍👩‍👧',
      'repas de famille': '🍽️', 'réunion de famille': '👨‍👩‍👧',
      'familientreffen': '👨‍👩‍👧', 'familienessen': '🍽️',
      'pranzo in famiglia': '🍽️', 'riunione di famiglia': '👨‍👩‍👧',
      '家族の集まり': '👨‍👩‍👧', 'かぞくのあつまり': '👨‍👩‍👧',
      '가족 모임': '👨‍👩‍👧',
      '家庭聚会': '👨‍👩‍👧', '家人聚餐': '🍽️',
      
      // --- BRINDE / TOAST ---
      'brinde': '🥂', 'brindar': '🥂', 'comemorar': '🥂', 'comemoracao': '🥂',
      'toast': '🥂', 'cheers': '🥂', 'celebrate': '🥂',
      'brindis': '🥂', 'celebrar': '🥂',
      'trinquer': '🥂', 'célébrer': '🥂', 'celebrer': '🥂', 'santé': '🥂',
      'anstossen': '🥂', 'anstoßen': '🥂', 'prost': '🥂', 'feiern': '🥂',
      'brindare': '🥂', 'cin cin': '🥂',
      '乾杯': '🥂', 'かんぱい': '🥂', 'お祝い': '🥂',
      '건배': '🥂', '축하': '🥂',
      '干杯': '🥂', '庆祝': '🥂',
      
      // --- HALLOWEEN ---
      'halloween': '🎃', 'dia das bruxas': '🎃',
      'víspera de todos los santos': '🎃', 'noche de brujas': '🎃',
      'toussaint': '🎃',
      'ハロウィン': '🎃', 'ハロウィーン': '🎃',
      '할로윈': '🎃',
      '万圣节': '🎃',
      
      // --- AÇÃO DE GRAÇAS / THANKSGIVING ---
      'acao de gracas': '🦃', 'ação de graças': '🦃',
      'thanksgiving': '🦃',
      'accion de gracias': '🦃', 'acción de gracias': '🦃', 'dia de gracias': '🦃',
      'action de grâces': '🦃',
      'erntedankfest': '🦃',
      'ringraziamento': '🦃', 'giorno del ringraziamento': '🦃',
      '感謝祭': '🦃', 'かんしゃさい': '🦃',
      '추수감사절': '🦃',
      '感恩节': '🦃',
      
      // --- CARNAVAL ---
      'carnaval': '🎭', 'bloco': '🎭', 'bloquinho': '🎭', 'desfile': '🎭',
      'carnival': '🎭', 'mardi gras': '🎭',
      'karneval': '🎭', 'fasching': '🎭',
      'carnevale': '🎭',
      'カーニバル': '🎭',
      '카니발': '🎭',
      '狂欢节': '🎭',
      
      // --- FESTA JUNINA / JUNE FESTIVAL ---
      'festa junina': '🌽', 'sao joao': '🌽', 'são joão': '🌽', 'arraial': '🌽', 'quadrilha': '🌽',
      'june festival': '🌽', 'midsummer': '🌽',
      'fiesta de san juan': '🌽',
      'fête de la saint-jean': '🌽', 'saint-jean': '🌽',
      'johannisfest': '🌽', 'mittsommer': '🌽',
      'festa di san giovanni': '🌽',
      '夏祭り': '🌽', 'なつまつり': '🌽',
      '여름 축제': '🌽',
      '夏日祭': '🌽',
      
      // --- REUNIÃO DE TURMA / CLASS REUNION ---
      'reuniao de turma': '🎓', 'reencontro': '🎓', 'ex-alunos': '🎓',
      'class reunion': '🎓', 'alumni': '🎓',
      'reunion de exalumnos': '🎓', 'reunión de exalumnos': '🎓',
      'reunion danciens': '🎓', 'réunion d\'anciens': '🎓',
      'klassentreffen': '🎓', 'ehemaligentreffen': '🎓',
      'riunione di classe': '🎓',
      '同窓会': '🎓', 'どうそうかい': '🎓',
      '동창회': '🎓',
      '同学会': '🎓',
      
      // --- PIQUENIQUE / PICNIC ---
      'piquenique': '🧺', 'picnic': '🧺',
      'merienda campestre': '🧺',
      'pique-nique': '🧺',
      'picknick': '🧺',
      'scampagnata': '🧺',
      'ピクニック': '🧺',
      '피크닉': '🧺', '소풍': '🧺',
      '野餐': '🧺',
      
      // --- DESPEDIDA / FAREWELL ---
      'despedida': '👋', 'despedir': '👋', 'adeus': '👋', 'tchau': '👋',
      'farewell': '👋', 'goodbye': '👋', 'send-off': '👋',
      'adiós': '👋', 'despedida es': '👋',
      'adieu': '👋', 'au revoir': '👋', 'pot de départ': '👋',
      'abschied': '👋', 'verabschiedung': '👋', 'tschüss': '👋',
      'addio': '👋', 'arrivederci': '👋',
      'お別れ': '👋', 'おわかれ': '👋', 'さようなら': '👋',
      '송별회': '👋', '작별': '👋',
      '告别': '👋', '送别': '👋',
      
      // --- PRESENTE / GIFT ---
      'presente': '🎁', 'presentes': '🎁', 'dar presente': '🎁', 'comprar presente': '🎁',
      'gift': '🎁', 'gifts': '🎁', 'present': '🎁', 'buy gift': '🎁',
      'regalos': '🎁', 'regalo es': '🎁',
      'cadeau': '🎁', 'cadeaux': '🎁',
      'geschenk': '🎁', 'geschenke': '🎁',
      'regalo it': '🎁', 'regali': '🎁',
      'プレゼント': '🎁', '贈り物': '🎁', 'おくりもの': '🎁',
      '선물': '🎁',
      '礼物': '🎁', '送礼': '🎁',
    };
    
    for (const [keyword, emoji] of Object.entries(titleKeywords)) {
      if (titleLower.includes(keyword)) {
        return emoji;
      }
    }
  }
  
  return emojiMap[category?.toLowerCase()] || '📅';
}

// Calculate timezone offset dynamically (works for ANY timezone and handles DST)
function getTimezoneOffset(timezone: string): number {
  try {
    // Use the Intl API to get the current offset for the timezone
    const now = new Date();
    
    // Format the same moment in UTC and in the target timezone
    const utcFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
    
    const tzFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
    
    // Parse the formatted dates
    const utcParts = utcFormatter.formatToParts(now);
    const tzParts = tzFormatter.formatToParts(now);
    
    const getPart = (parts: Intl.DateTimeFormatPart[], type: string) => 
      parseInt(parts.find(p => p.type === type)?.value || '0', 10);
    
    const utcHour = getPart(utcParts, 'hour');
    const utcDay = getPart(utcParts, 'day');
    const tzHour = getPart(tzParts, 'hour');
    const tzDay = getPart(tzParts, 'day');
    
    // Calculate hour difference, accounting for day boundary
    let hourDiff = tzHour - utcHour;
    
    // Handle day boundary (if timezone crossed midnight)
    if (tzDay > utcDay) {
      hourDiff += 24;
    } else if (tzDay < utcDay) {
      hourDiff -= 24;
    }
    
    console.log(`[getTimezoneOffset] Timezone: ${timezone}, UTC hour: ${utcHour}, TZ hour: ${tzHour}, Offset: ${hourDiff}h`);
    
    return hourDiff;
  } catch (e) {
    console.error(`[getTimezoneOffset] Invalid timezone: ${timezone}, defaulting to 0 (UTC)`, e);
    return 0;
  }
}

// Normalize time format from any format to HH:MM
// Handles ISO format ("2025-12-28T21:29:00" -> "21:29") and validates HH:MM format
function normalizeTimeFormat(timeStr: string | null | undefined): string | null {
  if (!timeStr) return null;
  
  // If contains 'T', it's ISO format - extract just the time
  if (timeStr.includes('T')) {
    const match = timeStr.match(/T(\d{2}):(\d{2})/);
    if (match) {
      const normalized = `${match[1]}:${match[2]}`;
      console.log(`[normalizeTimeFormat] Converted ISO "${timeStr}" to "${normalized}"`);
      return normalized;
    }
    console.warn(`[normalizeTimeFormat] Failed to extract time from ISO format: "${timeStr}"`);
    return null;
  }
  
  // If already in HH:MM or HH:MM:SS format, extract HH:MM
  const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(:\d{2})?$/);
  if (timeMatch) {
    const hours = timeMatch[1].padStart(2, '0');
    const minutes = timeMatch[2];
    return `${hours}:${minutes}`;
  }
  
  console.warn(`[normalizeTimeFormat] Unexpected format: "${timeStr}"`);
  return null;
}

// Check if date/time is in the past considering user's timezone
function isDateInPast(dateStr: string, timeStr?: string, timezone?: string): boolean {
  const tz = timezone || 'America/Sao_Paulo';
  
  // Get dynamic timezone offset (handles DST automatically)
  const offsetHours = getTimezoneOffset(tz);
  
  // Get current UTC time
  const nowUtcMs = Date.now();
  
  // Parse event date/time components
  const [year, month, day] = dateStr.split('-').map(Number);
  let hours = 23, minutes = 59, seconds = 59; // Default to end of day for all-day events
  
  if (timeStr) {
    const timeParts = timeStr.split(':').map(Number);
    hours = timeParts[0] || 0;
    minutes = timeParts[1] || 0;
    seconds = 0;
  }
  
  // Create event time in UTC:
  // Date.UTC creates a timestamp as if the time was in UTC
  // For São Paulo (UTC-3), if event is at 15:20 local, it's 18:20 UTC
  // So we need to SUBTRACT the offset (offsetHours is -3, so -(-3) = +3 hours)
  const eventLocalAsUtcMs = Date.UTC(year, month - 1, day, hours, minutes, seconds);
  const eventUtcMs = eventLocalAsUtcMs - (offsetHours * 60 * 60 * 1000);
  
  // Add 2-minute margin to avoid race conditions when scheduling "now"
  const marginMs = 2 * 60 * 1000;
  
  // Event is past if it's more than 2 minutes before now
  const isPast = eventUtcMs < (nowUtcMs - marginMs);
  
  // For debugging - calculate what time it is now in user's timezone
  const nowLocalHours = new Date(nowUtcMs).getUTCHours() + offsetHours;
  const nowLocalMinutes = new Date(nowUtcMs).getUTCMinutes();
  
  console.log(`[isDateInPast] Timezone: ${tz} (dynamic offset: ${offsetHours}h)`);
  console.log(`[isDateInPast] Checking: ${dateStr} ${timeStr || 'all day'}`);
  console.log(`[isDateInPast] Now UTC: ${new Date(nowUtcMs).toISOString()}`);
  console.log(`[isDateInPast] Now local (approx): ${(nowLocalHours + 24) % 24}:${String(nowLocalMinutes).padStart(2, '0')}`);
  console.log(`[isDateInPast] Event local: ${hours}:${String(minutes).padStart(2, '0')}`);
  console.log(`[isDateInPast] Event UTC: ${new Date(eventUtcMs).toISOString()}`);
  console.log(`[isDateInPast] Is past (with 2min margin): ${isPast}`);
  
  return isPast;
}

// Determine correct date for event based on current time
// If no explicit date given and time hasn't passed yet, use TODAY
// If time has passed (or is too close), use TOMORROW
function determineDateForTime(
  timeString: string | null | undefined,
  providedDate: string | null | undefined,
  userTimezone: string
): string {
  console.log(`[determineDateForTime] Input: time=${timeString}, providedDate=${providedDate}, timezone=${userTimezone}`);
  
  // Calculate "now" in user's timezone
  const now = new Date();
  
  // Get today's date in user's timezone (YYYY-MM-DD format)
  const todayISO = now.toLocaleDateString('en-CA', { timeZone: userTimezone });
  
  // Get tomorrow's date
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toLocaleDateString('en-CA', { timeZone: userTimezone });
  
  console.log(`[determineDateForTime] Today: ${todayISO}, Tomorrow: ${tomorrowISO}`);
  
  // If already has explicit date (not 'hoje' or 'amanha'), validate and use it
  if (providedDate && providedDate !== 'hoje' && providedDate !== 'amanha' && providedDate !== 'today' && providedDate !== 'tomorrow') {
    // Check if it's a valid date format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(providedDate)) {
      console.log(`[determineDateForTime] Using explicit date: ${providedDate}`);
      return providedDate;
    }
  }
  
  // If explicitly said 'amanha' or 'tomorrow', use tomorrow
  if (providedDate === 'amanha' || providedDate === 'tomorrow') {
    console.log(`[determineDateForTime] Explicit tomorrow requested: ${tomorrowISO}`);
    return tomorrowISO;
  }
  
  // If no time specified, it's an all-day event → TODAY
  if (!timeString) {
    console.log(`[determineDateForTime] No time specified, using today: ${todayISO}`);
    return todayISO;
  }
  
  // Parse the time string (HH:MM or HH:MM:SS)
  const timeParts = timeString.split(':');
  const eventHours = parseInt(timeParts[0], 10);
  const eventMinutes = parseInt(timeParts[1] || '0', 10);
  
  // Get current time in user's timezone
  const nowInUserTz = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
  const currentHours = nowInUserTz.getHours();
  const currentMinutes = nowInUserTz.getMinutes();
  
  // Convert to total minutes for easy comparison
  const eventTotalMinutes = eventHours * 60 + eventMinutes;
  const nowTotalMinutes = currentHours * 60 + currentMinutes;
  
  console.log(`[determineDateForTime] Event time: ${eventHours}:${String(eventMinutes).padStart(2, '0')} (${eventTotalMinutes} min)`);
  console.log(`[determineDateForTime] Current time: ${currentHours}:${String(currentMinutes).padStart(2, '0')} (${nowTotalMinutes} min)`);
  
  // If event time is still ahead (with 2 minute buffer), it's TODAY
  // The buffer allows for slight delays in processing
  if (eventTotalMinutes > nowTotalMinutes - 2) {
    console.log(`[determineDateForTime] Time hasn't passed, using TODAY: ${todayISO}`);
    return todayISO;
  }
  
  // Time has passed, so it must be TOMORROW
  console.log(`[determineDateForTime] Time has passed, using TOMORROW: ${tomorrowISO}`);
  return tomorrowISO;
}

// Calculate best alert time based on time until event
function getBestAlertTimeForEvent(eventDate: string | undefined, eventTime: string | undefined | null, timezone?: string): string {
  if (!eventDate) return '1hour'; // Fallback if no date
  if (!eventTime) return '30min'; // All-day events: 30 minutes before (effectively at event date start)
  
  const now = new Date();
  
  // Parse event date/time in user's timezone
  const [year, month, day] = eventDate.split('-').map(Number);
  const [hours, minutes] = eventTime.split(':').map(Number);
  const eventDateTime = new Date(year, month - 1, day, hours, minutes);
  
  const diffMinutes = Math.floor((eventDateTime.getTime() - now.getTime()) / (1000 * 60));
  
  // Return best alert based on time remaining
  if (diffMinutes <= 0) return 'exact'; // Already passed or now
  if (diffMinutes <= 5) return 'exact'; // Less than 5 min: alert at exact time
  if (diffMinutes <= 15) return '5min'; // 5-15 min: alert 5 min before
  if (diffMinutes <= 30) return '15min'; // 15-30 min: alert 15 min before
  if (diffMinutes <= 60) return '30min'; // 30-60 min: alert 30 min before
  if (diffMinutes <= 120) return '1hour'; // 1-2 hours: alert 1 hour before
  return '1hour'; // More than 2 hours: default to 1 hour before
}

// Convert alert value string to minutes
function getAlertMinutesFromValue(alertValue: string): number {
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
}

/**
 * Calculate the call_alert_scheduled_at UTC timestamp during event creation
 * This MUST be done at creation time to avoid race conditions with the cron job
 * Uses date-fns-tz for proper timezone handling including DST
 */
function calculateCallAlertScheduledAt(
  eventDate: string,
  eventTime: string | null | undefined,
  alertTimeValue: string,
  timezone: string
): string | null {
  if (!eventTime) {
    console.log('[calculateCallAlertScheduledAt] No event time, returning null');
    return null;
  }
  
  try {
    // Parse date and time components
    const [year, month, day] = eventDate.split('-').map(Number);
    const [hours, minutes] = eventTime.split(':').map(Number);
    
    // Create a Date object representing the local time in the user's timezone
    const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    
    // Convert to UTC using date-fns-tz (handles DST correctly)
    const eventUTC = fromZonedTime(localDate, timezone);
    
    // Get alert minutes before event
    const alertMinutes = getAlertMinutesFromValue(alertTimeValue);
    
    // Calculate scheduled time (event time minus alert minutes)
    const scheduledAtMs = eventUTC.getTime() - (alertMinutes * 60 * 1000);
    const scheduledAt = new Date(scheduledAtMs);
    
    const isoString = scheduledAt.toISOString();
    console.log(`[calculateCallAlertScheduledAt] Event: ${eventDate} ${eventTime} ${timezone} -> Event UTC: ${eventUTC.toISOString()} -> Alert ${alertMinutes}min before -> Scheduled: ${isoString}`);
    
    return isoString;
  } catch (error) {
    console.error('[calculateCallAlertScheduledAt] Error calculating scheduled time:', error);
    return null;
  }
}


// Execute action in database - THIS IS THE BACKEND LOGIC
async function executeAction(
  supabase: any, 
  userId: string, 
  action: KairoAction,
  profile: UserProfile,
  timezone?: string, // User's device timezone
  device_id?: string // Device ID for VoIP push (device-centric architecture)
): Promise<{ success: boolean; data?: any; error?: string; limitReached?: boolean; limitData?: { currentPlan: string; eventsUsed: number; eventsLimit: number; daysUntilReset: number }; pastDate?: boolean; attemptedEvent?: any; eventId?: string; noIdReturned?: boolean }> {
  console.log(`Backend executing action: ${action.acao}`, action);
  console.log(`User timezone: ${timezone || 'not provided, will use default'}`);

  try {
    switch (action.acao) {
      case 'criar_evento': {
        if (!action.titulo) {
          return { success: false, error: 'Título é obrigatório' };
        }

        // CRITICAL: Normalize time format FIRST
        // AI sometimes sends ISO format like "2025-12-28T21:29:00" instead of "21:29"
        const normalizedTime = normalizeTimeFormat(action.hora);
        console.log(`[criar_evento] Original hora: "${action.hora}" → Normalized: "${normalizedTime}"`);
        
        // Determine the correct date - DON'T trust AI's date decision
        // Calculate programmatically based on current time
        const userTz = timezone || 'America/Sao_Paulo';
        const correctedDate = determineDateForTime(normalizedTime, action.data, userTz);
        console.log(`[criar_evento] AI date: ${action.data} → Corrected date: ${correctedDate}`);
        
        // Use corrected date for validation and insertion
        const eventDate = correctedDate;

        // Check if date is in the past (use normalized time!)
        if (isDateInPast(eventDate, normalizedTime || undefined, timezone)) {
          console.log('Event date is in the past - blocking creation');
          return {
            success: false, 
            pastDate: true,
            error: 'Data/hora no passado',
            attemptedEvent: {
              titulo: action.titulo,
              data: eventDate,
              hora: action.hora,
              local: action.local
            }
          };
        }

        const { data: canCreate } = await supabase.rpc('can_create_event', {
          _user_id: userId
        });

        if (!canCreate) {
          const { data: planData } = await supabase.rpc('get_user_plan', {
            _user_id: userId
          });
          
          const planName = planData || 'free';
          const limits: Record<string, number> = { free: 14, plus: 50, super: 280 };
          const limit = limits[planName] || 14;
          
          // Get current event count for this week
          const { data: eventCount } = await supabase.rpc('count_user_events_this_week', {
            _user_id: userId
          });
          
          // Calculate days until week resets (next Sunday)
          const now = new Date();
          const dayOfWeek = now.getDay(); // 0 = Sunday
          const daysUntilReset = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
          
          return { 
            success: false, 
            limitReached: true,
            limitData: {
              currentPlan: planName,
              eventsUsed: eventCount || limit,
              eventsLimit: limit,
              daysUntilReset
            },
            error: `Você atingiu o limite de ${limit} eventos do plano ${planName === 'free' ? 'grátis' : planName.toUpperCase()}. Atualize seu plano para criar mais eventos.`
          };
        }

        // É dia inteiro APENAS se não tem hora definida
        // Ter hora sem duração NÃO é dia inteiro - é evento com horário sem duração explícita
        const isAllDay = !normalizedTime;
        
        // Calculate intelligent alert time based on time until event (use normalized time!)
        const bestAlertTime = getBestAlertTimeForEvent(eventDate, normalizedTime, timezone);
        
        // Calculate call_alert_scheduled_at and notification_scheduled_at NOW during creation
        // This eliminates race conditions with the cron job that was causing missed calls
        const userTzForCalc = timezone || 'America/Sao_Paulo';
        const callAlertScheduledAt = calculateCallAlertScheduledAt(eventDate, normalizedTime, bestAlertTime, userTzForCalc);
        const notificationScheduledAt = calculateCallAlertScheduledAt(eventDate, normalizedTime, bestAlertTime, userTzForCalc);
        
        console.log('[criar_evento] Attempting to insert event for user:', userId);
        console.log('[criar_evento] Calculated call_alert_scheduled_at:', callAlertScheduledAt);
        console.log('[criar_evento] Calculated notification_scheduled_at:', notificationScheduledAt);
        
        const { data, error } = await supabase
          .from('events')
          .insert({
            user_id: userId,
            title: action.titulo,
            description: action.descricao || null,
            event_date: eventDate, // Use corrected date, not AI's date
            event_time: normalizedTime || null, // Use normalized time!
            location: action.local || null,
            duration_minutes: action.duracao_minutos || null, // null se não explícito
            is_all_day: isAllDay,
            priority: action.prioridade || 'medium',
            category: action.categoria || 'geral',
            emoji: getCategoryEmoji(action.categoria || 'geral', action.titulo),
            status: 'pending',
            notification_enabled: true,
            call_alert_enabled: true, // Default to enabled
            alerts: [{ time: bestAlertTime }],
            // CRITICAL: Pre-calculate scheduled times to avoid race conditions with cron
            call_alert_scheduled_at: callAlertScheduledAt,
            notification_scheduled_at: notificationScheduledAt,
            // DEVICE-CENTRIC: Save device_id for VoIP push targeting
            device_id: device_id || null
          })
          .select()
          .single();

        if (error) {
          console.error('[criar_evento] CRITICAL - Database insert error:', error);
          throw error;
        }
        
        // CRITICAL: Verify the event was actually saved and has an ID
        if (!data?.id) {
          console.error('[criar_evento] CRITICAL - Event insert succeeded but no ID returned!', { data });
          return { 
            success: false, 
            error: 'Evento não foi salvo no banco de dados. Por favor, tente novamente.',
            noIdReturned: true
          };
        }
        
        console.log('[criar_evento] SUCCESS - Event created with ID:', data.id);

        await saveUserPattern(supabase, userId, action, profile);

        return { success: true, data, eventId: data.id };
      }

      case 'listar_eventos': {
        let query = supabase
          .from('events')
          .select('*')
          .eq('user_id', userId)
          .order('event_date', { ascending: true })
          .order('event_time', { ascending: true });

        if (action.data) {
          query = query.eq('event_date', action.data);
        } else {
          const today = new Date().toISOString().split('T')[0];
          query = query.gte('event_date', today);
        }

        query = query.limit(action.limite || 10);

        const { data, error } = await query;
        if (error) throw error;
        return { success: true, data };
      }

      case 'editar_evento': {
        if (!action.evento_id) {
          return { success: false, error: 'ID do evento é obrigatório' };
        }

        const updates: any = {};
        if (action.titulo) updates.title = action.titulo;
        if (action.data) updates.event_date = action.data;
        if (action.hora) updates.event_time = action.hora;
        if (action.local) updates.location = action.local;
        if (action.prioridade) updates.priority = action.prioridade;

        const { data, error } = await supabase
          .from('events')
          .update(updates)
          .eq('id', action.evento_id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return { success: true, data };
      }

      case 'deletar_evento': {
        if (action.evento_id) {
          const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', action.evento_id)
            .eq('user_id', userId);

          if (error) throw error;
          return { success: true, data: { deleted: true } };
        } else if (action.buscar_titulo) {
          const { data: events } = await supabase
            .from('events')
            .select('id, title')
            .eq('user_id', userId)
            .ilike('title', `%${action.buscar_titulo}%`)
            .limit(1);

          if (events && events.length > 0) {
            const { error } = await supabase
              .from('events')
              .delete()
              .eq('id', events[0].id);

            if (error) throw error;
            return { success: true, data: { deleted: true, event: events[0] } };
          }
          return { success: false, error: 'Evento não encontrado' };
        }
        return { success: false, error: 'ID ou título do evento necessário' };
      }

      case 'conversar':
      case 'coletar_informacoes':
      case 'solicitar_confirmacao':
        return { success: true, data: action.resumo_evento || null };

      default:
        return { success: false, error: `Ação desconhecida: ${action.acao}` };
    }
  } catch (error) {
    console.error(`Action error (${action.acao}):`, error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

serve(async (req) => {
  console.log('=== CHAT FUNCTION CALLED ===');
  console.log('Method:', req.method);
  
  if (req.method === "OPTIONS") {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, imageAnalysis, isOnboarding, onboardingStep, timezone, language: requestLanguage, device_id } = body;
    
    // Use user's timezone or fallback to America/Sao_Paulo
    const userTimezone = timezone || 'America/Sao_Paulo';
    console.log('Received messages count:', messages?.length || 0);
    console.log('Has image analysis:', !!imageAnalysis);
    console.log('Is onboarding:', isOnboarding, 'Step:', onboardingStep);
    console.log('User timezone:', userTimezone);
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      throw new Error("OPENAI_API_KEY não configurada");
    }
    
    console.log('OpenAI API key found, length:', OPENAI_API_KEY.length);

    // === SPECIAL HANDLING FOR IMAGE ANALYSIS ===
    // When an image is analyzed and event is detected, CREATE THE EVENT AUTOMATICALLY (optimistic)
    if (imageAnalysis && imageAnalysis.tipo === 'evento_detectado') {
      console.log('Image detected event - creating automatically (optimistic flow)');
      
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        throw new Error('Authorization required for event creation');
      }
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const imageSupabase = createClient(supabaseUrl, supabaseKey);
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await imageSupabase.auth.getUser(token);
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Map detected category to duration defaults
      const categoryDurations: Record<string, number> = {
        cinema: 150,
        show: 180,
        teatro: 120,
        casamento: 300,
        formatura: 180,
        aniversario: 180,
        medico: 60,
        trabalho: 60,
        esporte: 120,
        viagem: 480,
        restaurante: 90,
        festa: 240,
        religioso: 120,
        outro: 60
      };
      
      const detectedCategory = imageAnalysis.categoria_evento || 'outro';
      const defaultDuration = categoryDurations[detectedCategory] || 120;
      
      console.log('Detected category from image:', detectedCategory);

      // ===== PAST DATE VALIDATION FOR IMAGE =====
      if (isDateInPast(imageAnalysis.data_detectada, imageAnalysis.hora_detectada, userTimezone)) {
        console.log('Image event date is in the past - returning warning');
        
        const responseText = `Ops! Essa data e horário já passaram. Por favor, envie uma imagem com um evento no futuro.`;
        
        const actionData = {
          acao: 'data_passada',
          success: false,
          resposta_usuario: responseText,
          titulo: imageAnalysis.titulo || 'Evento',
          data: imageAnalysis.data_detectada,
          hora: imageAnalysis.hora_detectada,
          local: imageAnalysis.local_detectado,
          idioma_detectado: 'pt'
        };

        let ssePayload = `data: {"text": "${responseText.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}\n\n`;
        ssePayload += `data: {"action": ${JSON.stringify(actionData)}}\n\n`;
        ssePayload += `data: [DONE]\n\n`;

        return new Response(ssePayload, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        });
      }
      // É dia inteiro se não tem hora na imagem
      const imageIsAllDay = !imageAnalysis.hora_detectada;
      
      const { data: createdEvent, error: createError } = await imageSupabase
        .from('events')
        .insert({
          user_id: user.id,
          title: imageAnalysis.titulo || 'Evento',
          description: imageAnalysis.descricao || null,
          event_date: imageAnalysis.data_detectada,
          event_time: imageAnalysis.hora_detectada || null,
          location: imageAnalysis.local_detectado || null,
          duration_minutes: imageIsAllDay ? null : defaultDuration,
          is_all_day: imageIsAllDay,
          priority: 'medium',
          category: detectedCategory,
          emoji: getCategoryEmoji(detectedCategory),
          status: 'pending',
          notification_enabled: true
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating event from image:', createError);
        throw createError;
      }

      console.log('Event created from image:', createdEvent);

      // Build response text
      const responseText = `Pronto! Criei o evento "${imageAnalysis.titulo}" para ${imageAnalysis.data_detectada}${imageAnalysis.hora_detectada ? ` às ${imageAnalysis.hora_detectada}` : ''}. Se precisar mudar algo, é só me falar!`;

      // Build action with created event data
      const actionData = {
        acao: 'criar_evento',
        success: true,
        resposta_usuario: responseText,
        titulo: createdEvent.title,
        hora: createdEvent.event_time,
        local: createdEvent.location,
        descricao: createdEvent.description,
        prioridade: createdEvent.priority,
        categoria: createdEvent.category,
        duracao_minutos: createdEvent.duration_minutes,
        idioma_detectado: 'pt',
        // Include the full event data for EventCreatedCard
        eventData: {
          id: createdEvent.id,
          title: createdEvent.title,
          event_date: createdEvent.event_date,
          event_time: createdEvent.event_time,
          location: createdEvent.location,
          category: createdEvent.category,
          notification_enabled: createdEvent.notification_enabled,
          call_alert_enabled: createdEvent.call_alert_enabled
        },
        resumo_evento: {
          titulo: createdEvent.title,
          data: createdEvent.event_date,
          hora: createdEvent.event_time || 'Dia inteiro',
          local: createdEvent.location || '',
          notificacao: '30 min antes'
        }
      };

      console.log('Image event action data:', JSON.stringify(actionData));

      // Build SSE response
      let ssePayload = `data: {"text": "${responseText.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}\n\n`;
      ssePayload += `data: {"action": ${JSON.stringify(actionData)}}\n\n`;
      ssePayload += `data: [DONE]\n\n`;

      return new Response(ssePayload, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Handle other image analysis types (health, generic, not identified)
    if (imageAnalysis && imageAnalysis.tipo !== 'evento_detectado') {
      console.log('Image analysis type:', imageAnalysis.tipo);
      
      let responseText = imageAnalysis.pergunta_usuario || 'Analisei a imagem. O que você quer lembrar sobre isso?';
      
      if (imageAnalysis.tipo === 'saude') {
        responseText = imageAnalysis.pergunta_usuario || 'Vi que parece ser algo de saúde. Quer que eu crie um lembrete de medicamento?';
      } else if (imageAnalysis.tipo === 'generico') {
        responseText = imageAnalysis.pergunta_usuario || 'O que você quer lembrar sobre essa imagem?';
      } else if (imageAnalysis.tipo === 'nao_identificado') {
        responseText = imageAnalysis.pergunta_usuario || 'Não consegui identificar bem a imagem. Pode me dizer o que quer agendar?';
      }

      const actionData = {
        acao: 'conversar',
        resposta_usuario: responseText,
        idioma_detectado: 'pt'
      };

      let ssePayload = `data: {"text": "${responseText.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}\n\n`;
      ssePayload += `data: {"action": ${JSON.stringify(actionData)}}\n\n`;
      ssePayload += `data: [DONE]\n\n`;

      return new Response(ssePayload, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    const authHeader = req.headers.get('authorization');
    let userContext = "";
    let userId: string | null = null;
    let supabase: any = null;
    let userProfile: UserProfile = {};
    let userName = "";

    if (authHeader) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      supabase = createClient(supabaseUrl, supabaseKey);
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        userId = user.id;
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (profile) {
          userProfile = profile;
          userName = profile.display_name || '';
          
          userContext += `\n\nCONTEXTO DO USUARIO`;
          userContext += `\nNome: ${userName || 'Não informado'}`;
          
          if (profile.context_aware_enabled && profile.preferred_times && profile.preferred_times.length > 0) {
            userContext += `\nHorarios preferidos: ${JSON.stringify(profile.preferred_times)}`;
          }
        }
        
        const { data: events } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', userId)
          .gte('event_date', new Date().toISOString().split('T')[0])
          .order('event_date', { ascending: true })
          .limit(10);
        
        if (events && events.length > 0) {
          userContext += `\n\nPROXIMOS EVENTOS`;
          events.forEach((e: any) => {
            userContext += `\n- [ID: ${e.id}] ${e.title} em ${e.event_date}${e.event_time ? ' às ' + e.event_time : ''}${e.location ? ' em ' + e.location : ''} (${e.priority})`;
          });

          if (userProfile.auto_reschedule_enabled) {
            const today = new Date().toISOString().split('T')[0];
            const { data: pastEvents } = await supabase
              .from('events')
              .select('*')
              .eq('user_id', userId)
              .eq('status', 'pending')
              .lt('event_date', today)
              .limit(3);

            if (pastEvents && pastEvents.length > 0) {
              userContext += `\n\nEVENTOS PERDIDOS (sugira reagendamento)`;
              pastEvents.forEach((e: any) => {
                userContext += `\n- [ID: ${e.id}] ${e.title} era em ${e.event_date}`;
              });
            }
          }
        }
        
        if (userProfile.smart_suggestions_enabled) {
          const { data: patterns } = await supabase
            .from('user_patterns')
            .select('*')
            .eq('user_id', userId)
            .order('confidence', { ascending: false })
            .limit(5);
          
          if (patterns && patterns.length > 0) {
            userContext += `\n\nPADROES APRENDIDOS (use para sugestoes inteligentes)`;
            patterns.forEach((p: any) => {
              userContext += `\n- ${p.pattern_type}: ${JSON.stringify(p.pattern_data)} (confianca: ${(p.confidence * 100).toFixed(0)}%)`;
            });
          }
        }
      }
    }

    // Calcular data "hoje" no timezone do usuário (não UTC)
    const currentDate = new Date();
    
    // Formata a data no timezone do usuário para obter o dia correto
    const todayStr = currentDate.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: userTimezone
    });
    
    // Obtém a data ISO no timezone do usuário (en-CA retorna YYYY-MM-DD)
    const todayISO = currentDate.toLocaleDateString('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    // NOVO: Calcular "amanhã" EXPLICITAMENTE para evitar erros da IA
    const tomorrowDate = new Date(currentDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowISO = tomorrowDate.toLocaleDateString('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const greetingInstruction = userName 
      ? `Cumprimente o usuario pelo nome "${userName}". Exemplo: "E ai ${userName}, o que vamos agendar hoje?"`
      : `Use uma saudacao casual como "E ai, o que vamos agendar hoje?"`;

    const onboardingContext = isOnboarding ? `
MODO ONBOARDING ATIVO
Este e um novo usuario que esta criando seu primeiro evento.
- Seja amigavel e encorajador
- CRIE O EVENTO IMEDIATAMENTE mesmo no onboarding
- NAO pergunte informacoes - use padroes (hoje, dia inteiro)
- Apos criar, o usuario pode corrigir se precisar
` : '';

    // Language-specific response instructions
    const languageInstructions: Record<string, string> = {
      'pt-BR': 'Responda SEMPRE em portugues brasileiro. Use linguagem casual e amigavel, como um amigo falando. Voce se chama Horah.',
      'en-US': 'ALWAYS respond in English. Use casual and friendly language, like a friend talking. Your name is Horah.',
      'en': 'ALWAYS respond in English. Use casual and friendly language, like a friend talking. Your name is Horah.',
      'es-ES': 'Responde SIEMPRE en espanol. Usa un lenguaje casual y amigable, como un amigo hablando. Te llamas Horah.',
      'es': 'Responde SIEMPRE en espanol. Usa un lenguaje casual y amigable, como un amigo hablando. Te llamas Horah.',
      'fr-FR': 'Reponds TOUJOURS en francais. Utilise un langage decontracte et amical, comme un ami qui parle. Tu t\'appelles Horah.',
      'fr': 'Reponds TOUJOURS en francais. Utilise un langage decontracte et amical, comme un ami qui parle. Tu t\'appelles Horah.',
      'de-DE': 'Antworte IMMER auf Deutsch. Verwende eine lockere und freundliche Sprache, wie ein Freund spricht. Du heisst Horah.',
      'de': 'Antworte IMMER auf Deutsch. Verwende eine lockere und freundliche Sprache, wie ein Freund spricht. Du heisst Horah.',
      'it-IT': 'Rispondi SEMPRE in italiano. Usa un linguaggio informale e amichevole, come un amico che parla. Ti chiami Horah.',
      'it': 'Rispondi SEMPRE in italiano. Usa un linguaggio informale e amichevole, come un amico che parla. Ti chiami Horah.',
      'ja-JP': '常に日本語で返答してください。友達のようにカジュアルでフレンドリーな言葉を使ってください。私の名前はHorahです。',
      'ja': '常に日本語で返答してください。友達のようにカジュアルでフレンドリーな言葉を使ってください。私の名前はHorahです。',
      'ko-KR': '항상 한국어로 응답해주세요. 친구처럼 캐주얼하고 친근한 언어를 사용하세요. 제 이름은 Horah입니다.',
      'ko': '항상 한국어로 응답해주세요. 친구처럼 캐주얼하고 친근한 언어를 사용하세요. 제 이름은 Horah입니다.',
      'zh-CN': '请始终用中文回复。使用休闲友好的语言，像朋友一样说话。我的名字是Horah。',
      'zh': '请始终用中文回复。使用休闲友好的语言，像朋友一样说话。我的名字是Horah。',
    };

    const responseLanguage = requestLanguage || 'pt-BR';
    const languageInstruction = languageInstructions[responseLanguage] || languageInstructions['en-US'];
    console.log('Response language:', responseLanguage, '| Instruction:', languageInstruction.substring(0, 50) + '...');

    // HORAH EVENT ENGINE v2 — CRIAÇÃO OTIMISTA
    const systemPrompt = `HORAH EVENT ENGINE v2

=== IDIOMA DE RESPOSTA (OBRIGATORIO) ===
${languageInstruction}
Responda SEMPRE no idioma indicado acima. Se o usuario escrever em outro idioma, ainda responda no idioma configurado.

Voce e Horah, um motor de agendamento focado em VELOCIDADE.

=== PRINCIPIO CENTRAL — CRIACAO OTIMISTA ===

Seu objetivo primario e REDUZIR FRICCAO.
Voce opera no modelo CRIACAO PRIMEIRO, CORRECAO DEPOIS.

REGRA DE OURO:
Se o usuario menciona QUALQUER atividade ou compromisso, CRIE O EVENTO IMEDIATAMENTE.

Correcoes acontecem DEPOIS da criacao, nao antes.

=== REGRA DE PADRAO ABSOLUTO (CRITICO) ===

Se o usuario menciona QUALQUER atividade/compromisso sem data nem hora:
- data = HOJE (${todayISO})
- hora = null (dia inteiro)
- CRIAR IMEDIATAMENTE

Exemplos que devem CRIAR evento na hora:
- "lanchonete" → CRIAR "Lanchonete" para HOJE, dia inteiro
- "cinema" → CRIAR "Cinema" para HOJE, dia inteiro  
- "barbearia" → CRIAR "Barbearia" para HOJE, dia inteiro
- "mercado" → CRIAR "Mercado" para HOJE, dia inteiro
- "farmacia" → CRIAR "Farmacia" para HOJE, dia inteiro

NUNCA use "coletar_informacoes" para perguntar data/hora.
SEMPRE crie o evento primeiro. Usuario corrige depois se precisar.

=== INTERPRETACAO DE TEMPO ===

Quando o usuario menciona hora SEM data:
- Assuma HOJE se a hora ainda nao passou
- Assuma AMANHA se a hora ja passou

Hora atual: ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: userTimezone })}

Exemplos:
"as tres da tarde vou na barbearia" (enviado as 14:00) → HOJE as 15:00
"as tres da tarde vou na barbearia" (enviado as 16:00) → AMANHA as 15:00

=== EXEMPLOS CRITICOS — CERTO vs ERRADO ===

ERRADO (NAO FACA ISSO):
User: "lanchonete"
AI: {"acao": "coletar_informacoes", "resposta_usuario": "Quando quer ir?"}

CERTO:
User: "lanchonete"
AI: {"acao": "criar_evento", "titulo": "Lanchonete", "data": "${todayISO}", "hora": null, ...}

ERRADO:
User: "cinema"  
AI: {"acao": "coletar_informacoes", "resposta_usuario": "Que dia?"}

CERTO:
User: "cinema"
AI: {"acao": "criar_evento", "titulo": "Cinema", "data": "${todayISO}", "hora": null, ...}

ERRADO:
User: "vou no shopping"
AI: {"acao": "conversar", "resposta_usuario": "Quando voce quer ir?"}

CERTO:
User: "vou no shopping"
AI: {"acao": "criar_evento", "titulo": "Shopping", "data": "${todayISO}", "hora": null, ...}

=== FLUXO DE CRIACAO RAPIDA ===

Passo 1: Detectar atividade/compromisso na mensagem
Passo 2: Extrair o que existe (titulo, hora, data, local)
Passo 3: CRIAR EVENTO IMEDIATAMENTE com padroes

Dados minimos = apenas TITULO (atividade detectada)

Se nao tem data → usa HOJE
Se nao tem hora → evento dia inteiro (null)
Se nao tem local → null

NAO PERGUNTE. CRIE.

=== REGRA DE TITULO OBRIGATORIO ===

Se o usuario pede para criar um evento mas NAO menciona QUAL evento (apenas "um evento", "algo", "uma coisa"):
- Use "coletar_informacoes" com informacao_faltante = "titulo"
- Pergunte de forma amigavel qual e o evento

Exemplos que DEVEM perguntar o titulo:
- "cria um evento pra mim dia 19" → {"acao": "coletar_informacoes", "informacao_faltante": "titulo", "resposta_usuario": "Beleza! Mas qual evento voce quer criar?"}
- "marca algo pra amanha as 15h" → {"acao": "coletar_informacoes", "informacao_faltante": "titulo", "resposta_usuario": "Pode ser! O que vai ser esse evento?"}
- "agenda dia 20 meio-dia" → {"acao": "coletar_informacoes", "informacao_faltante": "titulo", "resposta_usuario": "Anotado dia 20 ao meio-dia! Mas e pra que?"}
- "cria um evento as 12:30" → {"acao": "coletar_informacoes", "informacao_faltante": "titulo", "resposta_usuario": "Claro! Qual vai ser o evento?"}

Exemplos que NAO precisam perguntar (titulo esta claro):
- "dentista dia 19 as 15h" → CRIAR evento "Dentista"
- "reuniao amanha as 10h" → CRIAR evento "Reuniao"
- "cria um evento cinema dia 20" → CRIAR evento "Cinema"
- "lanchonete" → CRIAR evento "Lanchonete"
- "vou no shopping" → CRIAR evento "Shopping"

IMPORTANTE: A diferenca e se o usuario menciona uma ATIVIDADE ou apenas pede para criar "um evento" generico.
Palavras genericas que DEVEM perguntar: "evento", "algo", "uma coisa", "compromisso" (sem especificar o que)
Palavras especificas que NAO precisam perguntar: qualquer substantivo de atividade (dentista, cinema, reuniao, etc)

=== COMPORTAMENTO DE CAMPOS ===

titulo: Use o substantivo da atividade exatamente como falado
local: Se mencionado → armazenar. Se nao → null (NAO perguntar)
hora: Se mencionado → usar. Se nao → null (dia inteiro)
duracao: Padrao 60 minutos
notificacao: Padrao "30 min antes"
prioridade:
- medico, hospital, emergencia = high
- trabalho, reuniao = medium
- lazer, cinema, cafe = low

=== CONFIRMACAO POS-CRIACAO (OBRIGATORIO) ===

APOS criar o evento, envie confirmacao com resumo visual.

{"acao": "criar_evento", "titulo": "...", "data": "${todayISO}", "hora": null, "local": null, "prioridade": "low", "categoria": "pessoal", "duracao_minutos": 60, "resumo_evento": {"titulo": "...", "data": "Hoje", "hora": "Dia inteiro", "local": "", "notificacao": "30 min antes"}, "idioma_detectado": "pt", "resposta_usuario": "Criado! Quer editar algo?"}

=== MODO EDICAO (CRITICO) ===

CONTEXTO DE EDICAO TEM VALIDADE DE 2 MINUTOS.
Se passou mais de 2 minutos desde a ultima mensagem do assistant, trate como nova conversa.

DETECTAR MODO EDICAO (SOMENTE SE CONTEXTO ATIVO):
Se a ultima mensagem do sistema foi "Quer editar algo?" ou "Criado! Quer editar algo?"
E o usuario responde "sim", "quero", "vou", "editar", "s":
→ Use edit_event para perguntar O QUE quer mudar
→ NAO crie outro evento!

Se usuario diz "nao", "errado", "muda", "nao e isso", "corrige":
→ Use edit_event para perguntar O QUE quer mudar

Exemplo CORRETO:
Sistema: "Criado! Quer editar algo?"
Usuario: "sim" (dentro de 2 minutos)
→ edit_event com resposta_usuario: "O que voce quer mudar? Titulo, data, hora ou local?"

Exemplo ERRADO (NAO FACA):
Sistema: "Criado! Quer editar algo?"
Usuario: "sim"
→ create_event (ERRADO! NAO crie novo evento!)

=== EDICAO NATURAL DE EVENTOS (update_event) ===

Quando usuario menciona ALTERAR/MUDAR/EDITAR/CANCELAR + nome de evento existente,
use update_event para buscar e modificar o evento.

Exemplos:
- "quero mudar o horario da barbearia pras 16h" → update_event busca="barbearia", novo_horario="16:00"
- "muda a reuniao de amanha para sexta" → update_event busca="reuniao", nova_data="YYYY-MM-DD"
- "altera o dentista pras 14h" → update_event busca="dentista", novo_horario="14:00"
- "muda o local do cinema pro shopping" → update_event busca="cinema", novo_local="shopping"

IMPORTANTE: Palavras como "mudar", "alterar", "editar", "trocar" + nome de evento = SEMPRE edicao!

=== REGRAS DE LOCAL (RELAXADAS) ===

Na criacao: Aceite locais genericos: "cinema", "barbearia", "shopping"
Na edicao: Se usuario pedir precisao, locais comerciais = nome + cidade

=== CONTRATO JSON ===

SEMPRE responda APENAS com JSON valido.

Para CRIAR evento:
{"acao": "criar_evento", "titulo": "Lanchonete", "data": "${todayISO}", "hora": null, "local": null, "prioridade": "low", "categoria": "pessoal", "duracao_minutos": 60, "resumo_evento": {"titulo": "Lanchonete", "data": "Hoje", "hora": "Dia inteiro", "local": "", "notificacao": "30 min antes"}, "idioma_detectado": "pt", "resposta_usuario": "Criado! Quer editar algo?"}

Para LISTAR eventos:
{"acao": "listar_eventos", "data": "YYYY-MM-DD ou null", "limite": 10, "idioma_detectado": "pt", "resposta_usuario": "Seus proximos compromissos:"}

Para EDITAR evento:
{"acao": "editar_evento", "evento_id": "...", "titulo": "...", "data": "...", "hora": "...", "local": "...", "resumo_evento": {...}, "idioma_detectado": "pt", "resposta_usuario": "Atualizado!"}

Para DELETAR evento:
{"acao": "deletar_evento", "evento_id": "...", "idioma_detectado": "pt", "resposta_usuario": "Beleza, removi o evento!"}

Para CONVERSAR (saudacoes):
${greetingInstruction}
{"acao": "conversar", "idioma_detectado": "pt", "resposta_usuario": "saudacao personalizada"}

Para PERGUNTAS FORA DO ESCOPO (quem e voce, noticias, esportes, clima, etc):
VARIE as respostas de forma NATURAL e HUMANA. Voce se chama Horah, um assistente de agenda.
Exemplos de respostas variadas (escolha uma diferente a cada vez):
- "Ah, isso eu nao sei te dizer... Mas bora agendar algo? 📅"
- "Po, nao e minha praia, haha. Sou o Horah, focado em te ajudar a nao esquecer das coisas!"
- "Opa, essa eu passo! Minha especialidade e organizar sua agenda. O que quer lembrar?"
- "Haha, queria saber! Mas sou so o Horah, seu assistente de lembretes. Bora agendar?"
- "Nao manjo disso nao! Mas se quiser marcar algo, to aqui."
- "Eita, foge do meu escopo! Sou seu assistente de agenda, nao um oraculo haha"
- "Quem dera eu soubesse! Mas meu negocio e te ajudar a nao esquecer dos compromissos."
NAO repita a mesma frase. Seja criativo e casual, como se fosse um amigo.

=== HARD RULES ===

- SEMPRE crie primeiro, pergunte depois
- NUNCA use coletar_informacoes para coleta inicial
- NUNCA bloqueie criacao se atividade e detectada
- Uma palavra como "lanchonete" JA E suficiente para criar
- Correcoes sao EDICAO do evento existente
- NUNCA formate resumo como markdown na resposta_usuario

=== CONTEXTO ===

Data de hoje: ${todayStr} (${todayISO})
- "hoje" = ${todayISO}
- "amanha" = ${tomorrowISO}
- Dias da semana = proxima ocorrencia

Idiomas suportados: pt, en, es, fr, de, it, ja, ko, zh

=== REGRA ABSOLUTA FINAL ===
SAUDACOES/CONFIRMACOES (NAO sao atividades - use chat_response):
- oi, ola, opa, e ai, fala, hey, blz, beleza, ok, certo, valeu, obrigado, bom dia, boa tarde, boa noite, show, legal

ATIVIDADES (CRIE evento - use create_event):
- lanchonete, cinema, barbearia, shopping, mercado, medico, reuniao, etc
- Qualquer LUGAR ou ACAO especifica = atividade

Se detectar atividade:
- acao DEVE ser "criar_evento"
- Mesmo que informacao esteja incompleta, CRIE com padroes

${onboardingContext}

${userContext}

${imageAnalysis ? `IMAGEM ANALISADA: ${JSON.stringify(imageAnalysis)}` : ''}`;

    console.log('Sending to GPT-4o-mini with Tool Calling...');

    // Define tools to FORCE specific behavior
    const tools = [
      {
        type: "function",
        function: {
          name: "create_event",
          description: "SEMPRE use esta funcao quando usuario mencionar QUALQUER atividade, compromisso ou evento. Exemplos: lanchonete, cinema, barbearia, shopping, medico, reuniao, etc. Use mesmo sem data/hora especificada - use padroes. NAO use se usuario disse 'sim' apos 'Quer editar algo?' - nesse caso use edit_event.",
          parameters: {
            type: "object",
            properties: {
              titulo: { type: "string", description: "Nome da atividade exatamente como usuario falou" },
              data: { type: "string", description: `Data YYYY-MM-DD. Padrao: ${todayISO} (hoje)` },
              hora: { type: ["string", "null"], description: "SOMENTE formato HH:MM (ex: '14:30', '09:00'). NUNCA use formato ISO com data. Para dia inteiro, use null." },
              local: { type: ["string", "null"], description: "Local se mencionado, senao null" },
              prioridade: { type: "string", enum: ["low", "medium", "high"], description: "low=lazer, medium=trabalho, high=saude/urgente" },
              categoria: { type: "string", description: "pessoal, trabalho, saude, lazer" },
              descricao: { type: "string", description: "Descricao CURTA (max 10 palavras) e amigavel do evento. Ex: 'Hora de cuidar do visual', 'Momento de diversao com a familia', 'Consulta importante de saude'" },
              resposta_usuario: { type: "string", description: "Mensagem curta confirmando criacao. Ex: Pronto! Criei o evento X para hoje." }
            },
            required: ["titulo", "data", "prioridade", "categoria", "descricao", "resposta_usuario"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "edit_event",
          description: "OBRIGATORIO quando usuario responder 'sim', 'quero', 'vou', 'editar' apos mensagem 'Quer editar algo?' ou 'Criado! Quer editar algo?'. Pergunte O QUE deseja mudar. NAO crie novo evento!",
          parameters: {
            type: "object",
            properties: {
              resposta_usuario: { type: "string", description: "Pergunte o que quer mudar. Ex: 'O que voce quer mudar? Titulo, data, hora ou local?'" }
            },
            required: ["resposta_usuario"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "chat_response",
          description: "Use para: saudacoes (oi, ola, opa, e ai, fala, hey, bom dia, boa tarde, boa noite), confirmacoes (ok, certo, blz, beleza, legal, valeu, obrigado), perguntas sobre o sistema (quem e voce, quem te criou), ou temas fora do escopo de eventos (esportes, clima, noticias, politica, etc). IMPORTANTE: Para respostas fora do escopo, seja CRIATIVO e HUMANO, variando as frases como um amigo faria. Voce e o Horah, assistente de agenda. Use humor leve e linguagem casual brasileira.",
          parameters: {
            type: "object",
            properties: {
              resposta_usuario: { type: "string", description: "Resposta conversacional VARIADA e HUMANA. Para fora do escopo: seja criativo, use humor leve, mencione que voce e o Horah e sua funcao e ajudar com agenda. NAO repita sempre a mesma frase." }
            },
            required: ["resposta_usuario"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "list_events",
          description: "Use quando usuario perguntar sobre eventos existentes: 'o que tenho hoje', 'meus eventos', 'minha agenda'",
          parameters: {
            type: "object",
            properties: {
              data: { type: ["string", "null"], description: "Data especifica YYYY-MM-DD ou null para todos" },
              limite: { type: "number", description: "Limite de eventos. Padrao: 10" },
              resposta_usuario: { type: "string", description: "Introducao da lista" }
            },
            required: ["resposta_usuario"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_event",
          description: "SOMENTE use quando usuario EXPLICITAMENTE usar palavras de edicao como: 'mudar', 'muda', 'alterar', 'altera', 'editar', 'edita', 'trocar', 'troca' seguido do NOME de um evento existente. NUNCA use para novas atividades! Ex CORRETO: 'muda barbearia pras 16h'. Ex ERRADO: 'vou no salao hoje' (isso e NOVO evento).",
          parameters: {
            type: "object",
            properties: {
              busca_evento: { type: "string", description: "Nome ou parte do titulo do evento a buscar" },
              novo_titulo: { type: ["string", "null"], description: "Novo titulo se usuario quiser mudar" },
              nova_data: { type: ["string", "null"], description: "Nova data YYYY-MM-DD se usuario quiser mudar" },
              novo_horario: { type: ["string", "null"], description: "Novo horario HH:MM se usuario quiser mudar" },
              novo_local: { type: ["string", "null"], description: "Novo local se usuario quiser mudar" },
              resposta_usuario: { type: "string", description: "Confirmacao da alteracao" }
            },
            required: ["busca_evento", "resposta_usuario"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delete_event",
          description: "Use SOMENTE quando usuario quiser CANCELAR/REMOVER/DELETAR um evento. Palavras-chave: 'cancelar', 'cancela', 'remover', 'remove', 'deletar', 'deleta', 'apagar', 'apaga', 'tirar', 'tira'. Ex: 'cancela a reuniao', 'remove o evento da barbearia', 'apaga o cinema'.",
          parameters: {
            type: "object",
            properties: {
              busca_evento: { type: "string", description: "Nome ou parte do titulo do evento a deletar" },
              resposta_usuario: { type: "string", description: "Confirmacao AMIGAVEL da remocao. Ex: 'Beleza, removi a reuniao das 15h do seu calendario!', 'Pronto, tirei o evento da barbearia pra voce!'" }
            },
            required: ["busca_evento", "resposta_usuario"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "request_weekly_report",
          description: "Use quando usuario pedir o relatorio semanal, resumo da semana, ou perguntar sobre seu desempenho/estatisticas. Palavras-chave: 'relatorio', 'relatório', 'resumo', 'semana', 'desempenho', 'estatisticas', 'como foi minha semana', 'meu relatorio', 'meus eventos da semana', 'weekly report', 'resumen semanal'.",
          parameters: {
            type: "object",
            properties: {
              resposta_usuario: { type: "string", description: "Resposta amigavel sobre o relatorio. Ex: 'Deixa eu pegar seu relatorio!', 'Vou buscar seu resumo da semana!'" }
            },
            required: ["resposta_usuario"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "request_weather_forecast",
          description: "Use quando usuario pedir previsao do tempo, clima, ou perguntar como esta o tempo. Palavras-chave: 'tempo', 'clima', 'previsão', 'previsao', 'weather', 'forecast', 'como ta o tempo', 'vai chover', 'ta frio', 'ta quente', 'temperatura', 'chuva'.",
          parameters: {
            type: "object",
            properties: {
              resposta_usuario: { type: "string", description: "Resposta amigavel. Ex: 'Vou ver como ta o tempo ai!', 'Deixa eu conferir a previsao!'" }
            },
            required: ["resposta_usuario"]
          }
        }
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        tools: tools,
        tool_choice: "required", // MUST use a tool
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GPT-4o-mini error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisicoes. Aguarde um momento." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao processar sua mensagem." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const message = aiResponse.choices?.[0]?.message;
    
    console.log('AI response message:', JSON.stringify(message));

    let action: KairoAction;
    
    // Get last user message to determine context
    const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase()?.trim() || '';
    
    // Greetings/confirmations that should NEVER create events
    const greetings = ['opa', 'oi', 'ola', 'olá', 'e ai', 'eai', 'fala', 'hey', 'hi', 'hello',
                       'blz', 'beleza', 'ok', 'certo', 'valeu', 'obrigado', 'obg', 'vlw',
                       'bom dia', 'boa tarde', 'boa noite', 'show', 'legal', 'massa',
                       'sim', 'nao', 'não', 's', 'n', 'yes', 'no', 'yeah', 'thanks'];
    
    const isGreeting = greetings.some(g => lastUserMessage === g || lastUserMessage === g + '!');
    
    // Check timestamp of last assistant message for context timeout (2 minutes)
    const previousAssistantMessages = messages.filter((m: any) => m.role === 'assistant');
    const lastAssistantMsg = previousAssistantMessages.slice(-1)[0];
    const lastAssistantTime = lastAssistantMsg?.created_at ? new Date(lastAssistantMsg.created_at) : null;
    const now = new Date();
    const minutesSinceLastAssistant = lastAssistantTime 
      ? (now.getTime() - lastAssistantTime.getTime()) / (1000 * 60) 
      : Infinity;
    
    // Context is only active if less than 1 minute passed
    const contextIsActive = minutesSinceLastAssistant < 1;
    
    // Check if previous AI message asked about editing (only if context is active)
    const recentAssistantMessages = previousAssistantMessages.slice(-2);
    const askedAboutEditing = contextIsActive && recentAssistantMessages.some((m: any) => 
      m.content?.toLowerCase()?.includes('quer editar') || 
      m.content?.toLowerCase()?.includes('quer mudar')
    );
    
    // Words that indicate user wants to edit after being asked
    const editConfirmations = ['sim', 's', 'quero', 'vou', 'editar', 'yes', 'yeah', 'y'];
    const wantsToEdit = askedAboutEditing && editConfirmations.some(e => lastUserMessage === e || lastUserMessage === e + '!');
    
    console.log(`Last user message: "${lastUserMessage}", isGreeting: ${isGreeting}, contextIsActive: ${contextIsActive}, minutesSinceLastAssistant: ${minutesSinceLastAssistant.toFixed(1)}, askedAboutEditing: ${askedAboutEditing}, wantsToEdit: ${wantsToEdit}`);
    
    // Process tool calls
    if (message?.tool_calls && message.tool_calls.length > 0) {
      let toolCall;
      
      // CRITICAL: Detect if message describes a NEW event (not an edit)
      // Patterns like "vou no/na", "tenho", "marcar", "agendar" + place/activity = NEW EVENT
      const newEventPatterns = [
        /\b(vou|vamos|ir)\s+(no|na|ao|à|em|pra|para)\b/i,  // "vou no salão"
        /\b(tenho|temos)\s+(um|uma|que|.*?(às|as|\d))/i,    // "tenho reunião"
        /\b(marcar|agendar|criar)\s+(um|uma)/i,             // "marcar uma consulta"
        /\bhoje\s+(às|as)\s+\d/i,                           // "hoje às 15h"
        /\b(amanhã|amanha)\s+(às|as)\s+\d/i,                // "amanhã às 10h"
      ];
      const isNewEventDescription = newEventPatterns.some(p => p.test(lastUserMessage));
      
      // If user wants to edit, prioritize edit_event tool
      if (wantsToEdit) {
        const editCall = message.tool_calls.find((tc: any) => tc.function.name === 'edit_event');
        const chatCall = message.tool_calls.find((tc: any) => tc.function.name === 'chat_response');
        toolCall = editCall || chatCall || message.tool_calls[0];
        console.log(`Edit mode detected, prioritizing edit_event. Found edit_event: ${editCall ? 'yes' : 'no'}`);
      }
      // CRITICAL FIX: If message describes a NEW event, ALWAYS prioritize create_event
      else if (isNewEventDescription && message.tool_calls.length > 1) {
        const createCall = message.tool_calls.find((tc: any) => tc.function.name === 'create_event');
        if (createCall) {
          toolCall = createCall;
          console.log(`New event description detected: "${lastUserMessage}". Prioritizing create_event over other tools.`);
        } else {
          toolCall = message.tool_calls[0];
        }
      }
      // If last message is greeting and NOT in edit context, prioritize chat_response
      else if (isGreeting && message.tool_calls.length > 1) {
        const chatResponseCall = message.tool_calls.find((tc: any) => tc.function.name === 'chat_response');
        toolCall = chatResponseCall || message.tool_calls[0];
        console.log(`Greeting detected, prioritizing chat_response. Found: ${chatResponseCall ? 'yes' : 'no'}`);
      } else {
        // CRITICAL: Check if first tool is update_event but message has NO explicit edit words
        // Words that indicate editing (NOT deleting)
        const explicitEditWords = /\b(muda|mudar|altera|alterar|edita|editar|troca|trocar)\b/i;
        // Words that indicate deletion
        const explicitDeleteWords = /\b(cancela|cancelar|remove|remover|deleta|deletar|apaga|apagar|tira|tirar)\b/i;
        const hasExplicitEditWord = explicitEditWords.test(lastUserMessage);
        const hasExplicitDeleteWord = explicitDeleteWords.test(lastUserMessage);
        
        const firstTool = message.tool_calls[0];
        // If deletion word detected, prioritize delete_event
        if (hasExplicitDeleteWord) {
          const deleteCall = message.tool_calls.find((tc: any) => tc.function.name === 'delete_event');
          toolCall = deleteCall || firstTool;
          console.log(`Delete word detected in "${lastUserMessage}". Using ${toolCall.function.name}.`);
        } else if (firstTool.function.name === 'update_event' && !hasExplicitEditWord) {
          // AI incorrectly chose update_event - find create_event or chat_response instead
          const createCall = message.tool_calls.find((tc: any) => tc.function.name === 'create_event');
          const chatCall = message.tool_calls.find((tc: any) => tc.function.name === 'chat_response');
          toolCall = createCall || chatCall || firstTool;
          console.log(`Blocked update_event (no explicit edit word in "${lastUserMessage}"). Using ${toolCall.function.name} instead.`);
        } else {
          toolCall = firstTool;
        }
      }
      
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      
      console.log(`Tool called: ${functionName}`, args);
      
      if (functionName === "create_event") {
        action = {
          acao: 'criar_evento',
          titulo: args.titulo,
          data: args.data || todayISO,
          hora: args.hora || null,
          local: args.local || null,
          prioridade: args.prioridade || 'low',
          categoria: args.categoria || 'pessoal',
          duracao_minutos: args.duracao_minutos || null, // Só inclui duração se o usuário especificou
          resposta_usuario: args.resposta_usuario,
          resumo_evento: {
            titulo: args.titulo,
            data: args.data === todayISO ? 'Hoje' : args.data,
            hora: args.hora || 'Dia inteiro',
            local: args.local || '',
            notificacao: '30 min antes'
          }
        };
      } else if (functionName === "list_events") {
        action = {
          acao: 'listar_eventos',
          data: args.data || null,
          limite: args.limite || 10,
          resposta_usuario: args.resposta_usuario
        };
      } else if (functionName === "edit_event") {
        // User wants to edit - ask what to change
        action = {
          acao: 'conversar',
          resposta_usuario: args.resposta_usuario || "O que você quer mudar? Título, data, hora ou local?"
        };
        console.log('Edit mode: asking user what to change');
      } else if (functionName === "update_event") {
        // Natural language update - search for event and update it
        // This is handled INLINE and should NOT go through executeAction again
        console.log('Update event requested:', args);
        
        let updateSuccess = false;
        let updatedEventData: any = null;
        
        // Check for direct event ID in user message (e.g., "editar evento id:xxx")
        const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()?.content || '';
        const idMatch = lastUserMessage.match(/id:([a-f0-9-]+)/i);
        let eventIdToUpdate = idMatch ? idMatch[1] : null;
        
        if (userId && supabase && (args.busca_evento || eventIdToUpdate)) {
          let evento: any = null;
          
          // If we have a direct ID, use it
          if (eventIdToUpdate) {
            console.log('Direct event ID provided:', eventIdToUpdate);
            const { data: eventById } = await supabase
              .from('events')
              .select('*')
              .eq('id', eventIdToUpdate)
              .eq('user_id', userId)
              .single();
            evento = eventById;
          } else {
            // Search for matching event by name
            const { data: eventos } = await supabase
              .from('events')
              .select('*')
              .eq('user_id', userId)
              .ilike('title', `%${args.busca_evento}%`)
              .order('created_at', { ascending: false })
              .limit(1);
            evento = eventos?.[0];
          }
          
          if (evento) {
            const updates: any = {};
            
            if (args.novo_titulo) updates.title = args.novo_titulo;
            if (args.nova_data) updates.event_date = args.nova_data;
            if (args.novo_horario) updates.event_time = args.novo_horario;
            if (args.novo_local) updates.location = args.novo_local;
            
            // Reset call_alert_sent_at when date or time changes so new notification can be sent
            if (args.nova_data || args.novo_horario) {
              updates.call_alert_sent_at = null;
              console.log(`Resetting call_alert_sent_at for event ${evento.id} due to date/time change`);
            }
            
            if (Object.keys(updates).length > 0) {
              const { data: updatedEvent, error } = await supabase
                .from('events')
                .update(updates)
                .eq('id', evento.id)
                .select()
                .single();
              
              if (!error && updatedEvent) {
                updateSuccess = true;
                updatedEventData = updatedEvent;
                
                // Build a human, friendly message describing what changed
                const changes: string[] = [];
                if (args.novo_horario) changes.push(`horário pra ${updatedEvent.event_time}`);
                if (args.nova_data) changes.push(`data pra ${updatedEvent.event_date}`);
                if (args.novo_titulo) changes.push(`nome pra "${updatedEvent.title}"`);
                if (args.novo_local) changes.push(`local pra ${updatedEvent.location}`);
                
                const changesText = changes.length > 0 
                  ? changes.join(' e ') 
                  : 'os detalhes';
                
                const humanResponse = `Pronto, mudei o ${changesText} do "${evento.title}". Tá certinho agora!`;
                
                // Mark action as already executed so executeAction won't be called
                action = {
                  acao: 'editar_evento',
                  evento_id: evento.id,
                  resposta_usuario: humanResponse,
                  resumo_evento: {
                    titulo: updatedEvent.title,
                    data: updatedEvent.event_date,
                    hora: updatedEvent.event_time || 'Dia inteiro',
                    local: updatedEvent.location || '',
                    notificacao: '30 min antes'
                  },
                  // Include full Supabase-format event for EventCreatedCard
                  evento_atualizado: updatedEvent,
                  _alreadyExecuted: true // Flag to skip executeAction
                };
                console.log('Event updated successfully:', updatedEvent);
              } else {
                action = {
                  acao: 'conversar',
                  resposta_usuario: 'Não consegui atualizar o evento. Tente novamente.'
                };
              }
            } else {
              action = {
                acao: 'conversar',
                resposta_usuario: args.resposta_usuario
              };
            }
          } else {
            action = {
              acao: 'conversar',
              resposta_usuario: `Não encontrei nenhum evento com "${args.busca_evento}". Quer que eu liste seus eventos?`
            };
          }
        } else {
          action = {
            acao: 'conversar',
            resposta_usuario: args.resposta_usuario
          };
        }
      } else if (functionName === "delete_event") {
        // Delete event - search and delete
        console.log('Delete event requested:', args);
        
        if (userId && supabase && args.busca_evento) {
          // Search for matching event
          const { data: eventos } = await supabase
            .from('events')
            .select('*')
            .eq('user_id', userId)
            .ilike('title', `%${args.busca_evento}%`)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (eventos && eventos.length > 0) {
            const eventoParaDeletar = eventos[0];
            
            // Delete the event
            const { error } = await supabase
              .from('events')
              .delete()
              .eq('id', eventoParaDeletar.id);
            
            if (!error) {
              // Build friendly confirmation message
              const timeStr = eventoParaDeletar.event_time 
                ? ` das ${eventoParaDeletar.event_time}` 
                : '';
              const humanResponse = args.resposta_usuario || 
                `Beleza, removi o "${eventoParaDeletar.title}"${timeStr} do seu calendário!`;
              
              action = {
                acao: 'deletar_evento',
                evento_id: eventoParaDeletar.id,
                resposta_usuario: humanResponse,
                evento_deletado: eventoParaDeletar, // Full event data for card
                _alreadyExecuted: true
              };
              console.log('Event deleted successfully:', eventoParaDeletar);
            } else {
              console.error('Delete error:', error);
              action = {
                acao: 'conversar',
                resposta_usuario: 'Ops, não consegui remover o evento. Tenta de novo?'
              };
            }
          } else {
            action = {
              acao: 'conversar',
              resposta_usuario: `Não encontrei nenhum evento com "${args.busca_evento}". Quer que eu liste seus eventos?`
            };
          }
        } else {
          action = {
            acao: 'conversar',
            resposta_usuario: args.resposta_usuario || 'Qual evento você quer remover?'
          };
        }
      } else if (functionName === "request_weekly_report") {
        // Request weekly report
        console.log('Weekly report requested:', args);
        
        let weeklyReportData: any = null;
        let weeklyReportNotReady: any = null;
        
        if (userId && supabase) {
          // Check for existing reports
          const { data: existingReports } = await supabase
            .from('weekly_reports')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (existingReports && existingReports.length > 0) {
            // Has a report - return it with isPreviousWeek flag
            weeklyReportData = {
              report: existingReports[0],
              isPreviousWeek: true
            };
            console.log('Found existing report:', existingReports[0].id);
            
            action = {
              acao: 'relatorio_semanal',
              resposta_usuario: args.resposta_usuario || 'Aqui está seu último relatório semanal!',
              _alreadyExecuted: true,
              weeklyReportData
            };
          } else {
            // No reports yet - check if user is new (less than 7 days)
            const { data: profile } = await supabase
              .from('profiles')
              .select('created_at')
              .eq('id', userId)
              .single();
            
            if (profile?.created_at) {
              const userCreatedAt = new Date(profile.created_at);
              const daysSinceCreation = (Date.now() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
              const daysRemaining = Math.ceil(7 - daysSinceCreation);
              
              if (daysSinceCreation < 7) {
                weeklyReportNotReady = {
                  daysRemaining: Math.max(1, daysRemaining)
                };
                console.log(`User account is ${daysSinceCreation.toFixed(1)} days old, ${daysRemaining} days until first report`);
                
                action = {
                  acao: 'relatorio_nao_pronto',
                  resposta_usuario: `Você ainda não completou os 7 dias para o primeiro relatório. Faltam ${daysRemaining} dia${daysRemaining > 1 ? 's' : ''}!`,
                  _alreadyExecuted: true,
                  weeklyReportNotReady
                };
              } else {
                // User is old enough - generate report immediately
                console.log('User is old enough, generating report now');
                
                try {
                  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
                  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
                  
                  const reportResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-weekly-report`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    },
                    body: JSON.stringify({ 
                      userId, 
                      language: requestLanguage || 'pt-BR',
                      forceGenerate: true 
                    }),
                  });
                  
                  if (reportResponse.ok) {
                    const reportData = await reportResponse.json();
                    
                    if (reportData.report) {
                      weeklyReportData = {
                        report: reportData.report,
                        isPreviousWeek: true
                      };
                      console.log('Report generated successfully:', reportData.report.id);
                      
                      action = {
                        acao: 'relatorio_semanal',
                        resposta_usuario: args.resposta_usuario || 'Aqui está seu relatório semanal!',
                        _alreadyExecuted: true,
                        weeklyReportData
                      };
                    } else {
                      action = {
                        acao: 'conversar',
                        resposta_usuario: 'Não foi possível gerar seu relatório. Tente novamente mais tarde.'
                      };
                    }
                  } else {
                    console.error('Report generation failed:', await reportResponse.text());
                    action = {
                      acao: 'conversar',
                      resposta_usuario: 'Ocorreu um erro ao gerar seu relatório. Tente novamente.'
                    };
                  }
                } catch (reportError) {
                  console.error('Error generating report:', reportError);
                  action = {
                    acao: 'conversar',
                    resposta_usuario: 'Ocorreu um erro ao gerar seu relatório. Tente novamente.'
                  };
                }
              }
            } else {
              action = {
                acao: 'conversar',
                resposta_usuario: args.resposta_usuario || 'Não consegui encontrar seu relatório. Tente novamente.'
              };
            }
          }
        } else {
          action = {
            acao: 'conversar',
            resposta_usuario: args.resposta_usuario || 'Preciso que você esteja logado para ver seu relatório.'
          };
        }
      } else if (functionName === "request_weather_forecast") {
        // Handle weather forecast request
        console.log('Weather forecast requested:', args);
        
        if (userId && supabase) {
          // Get user profile with location
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_latitude, user_longitude, user_city, timezone')
            .eq('id', userId)
            .single();
          
          if (profile?.user_latitude && profile?.user_longitude) {
            try {
              // Call get-weather-forecast edge function
              const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
              const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
              
              const weatherResponse = await fetch(`${SUPABASE_URL}/functions/v1/get-weather-forecast`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({ 
                  latitude: profile.user_latitude,
                  longitude: profile.user_longitude,
                  timezone: profile.timezone || 'America/Sao_Paulo'
                }),
              });
              
              if (weatherResponse.ok) {
                const data = await weatherResponse.json();
                console.log('Weather data received:', data);
                
                const weatherData = {
                  ...data.forecast,
                  city: profile.user_city || 'Sua cidade'
                };
                
                action = {
                  acao: 'previsao_tempo',
                  resposta_usuario: args.resposta_usuario || 'Aqui está a previsão do tempo!',
                  _alreadyExecuted: true,
                  weatherData
                };
              } else {
                console.error('Weather API error:', await weatherResponse.text());
                action = {
                  acao: 'conversar',
                  resposta_usuario: 'Não consegui buscar a previsão do tempo. Tente novamente mais tarde.'
                };
              }
            } catch (weatherError) {
              console.error('Error fetching weather:', weatherError);
              action = {
                acao: 'conversar',
                resposta_usuario: 'Ocorreu um erro ao buscar a previsão. Tente novamente.'
              };
            }
          } else {
            // No location saved
            action = {
              acao: 'conversar',
              resposta_usuario: 'Você ainda não configurou sua localização. Vá em Configurações > Ações Inteligentes e ative a previsão do tempo para salvar sua localização.'
            };
          }
        } else {
          action = {
            acao: 'conversar',
            resposta_usuario: args.resposta_usuario || 'Preciso que você esteja logado para ver a previsão.'
          };
        }
      } else {
        // chat_response
        action = {
          acao: 'conversar',
          resposta_usuario: args.resposta_usuario
        };
      }
    } else {
      // Fallback if no tool call (shouldn't happen with tool_choice: required)
      const content = message?.content || '';
      console.log('No tool call, fallback to content:', content);
      action = { acao: 'conversar', resposta_usuario: content };
    }

    console.log('Parsed action:', action);

    let executionResult: { success: boolean; data?: any; error?: string; pastDate?: boolean; attemptedEvent?: any; eventId?: string; limitReached?: boolean; limitData?: { currentPlan: string; eventsUsed: number; eventsLimit: number; daysUntilReset: number }; noIdReturned?: boolean } = { success: true };
    
    // Skip executeAction if action was already processed inline (e.g., update_event)
    if (userId && supabase && !action._alreadyExecuted && action.acao !== 'conversar' && action.acao !== 'coletar_informacoes' && action.acao !== 'solicitar_confirmacao') {
      executionResult = await executeAction(supabase, userId, action, userProfile, userTimezone, device_id);
      console.log('Execution result:', executionResult);
      
      // Handle past date error - change action to data_passada
      if (executionResult.pastDate && executionResult.attemptedEvent) {
        console.log('Past date detected, changing action to data_passada');
        action = {
          ...action,
          acao: 'data_passada',
          resposta_usuario: 'Ops! Essa data e horário já passaram. Por favor, escolha uma data no futuro.',
          titulo: executionResult.attemptedEvent.titulo,
          data: executionResult.attemptedEvent.data,
          hora: executionResult.attemptedEvent.hora,
          local: executionResult.attemptedEvent.local,
        };
      }
    } else if (action._alreadyExecuted) {
      // Action was already executed inline, mark as success
      executionResult = { success: true, data: action };
      console.log('Action already executed inline, skipping executeAction');
    } else if (action.acao === 'solicitar_confirmacao') {
      // Pass through confirmation data
      executionResult = { success: true, data: action.resumo_evento };
    }

    let finalResponse = action.resposta_usuario || '';

    // Handle list events - include structured data for frontend cards
    let listedEvents: any[] | undefined;
    if (action.acao === 'listar_eventos' && executionResult.success && executionResult.data) {
      const events = executionResult.data as any[];
      if (events.length === 0) {
        finalResponse = action.resposta_usuario || 'Você não tem eventos agendados.';
      } else {
        // Map events to structured format for frontend
        listedEvents = events.map(e => ({
          id: e.id,
          titulo: e.title,
          data: e.event_date,
          hora: e.event_time,
          local: e.location,
          prioridade: e.priority,
          categoria: e.category
        }));
        finalResponse = action.resposta_usuario || `Você tem ${events.length} evento(s):`;
      }
    }

    console.log('Building SSE response with finalResponse:', finalResponse);
    
    const encoder = new TextEncoder();
    
    const chunks: string[] = [];
    
    const actionData = {
      action: action.acao,
      success: executionResult.success,
      data: executionResult.data || action,
      error: executionResult.error,
      eventId: executionResult.data?.id || executionResult.eventId, // CRITICAL: Explicit event ID for verification
      resumo_evento: action.resumo_evento,
      evento_atualizado: action.evento_atualizado, // CRITICAL: Include for update card persistence
      evento_deletado: action.evento_deletado, // CRITICAL: Include for delete card persistence
      eventos: listedEvents, // Include structured events for list action
      weeklyReportData: action.weeklyReportData, // Weekly report data
      weeklyReportNotReady: action.weeklyReportNotReady, // Weekly report not ready data
      weatherData: action.weatherData, // Weather forecast data
      limitReached: executionResult.limitReached, // Limit reached flag
      limitData: executionResult.limitData // Limit data for UpgradePlanCard
    };
    
    console.log('[SSE] Action data prepared:', { 
      action: actionData.action, 
      success: actionData.success, 
      eventId: actionData.eventId,
      hasError: !!actionData.error 
    });
    
    const actionJson = JSON.stringify([actionData]);
    const actionContent = `<!--KAIRO_ACTIONS:${actionJson}-->`;
    chunks.push(`data: ${JSON.stringify({choices:[{delta:{content:actionContent}}]})}\n\n`);

    // Don't send text response for confirmation - the card handles the display
    if (finalResponse && action.acao !== 'solicitar_confirmacao') {
      chunks.push(`data: ${JSON.stringify({choices:[{delta:{content:finalResponse}}]})}\n\n`);
    }
    
    chunks.push('data: [DONE]\n\n');
    
    const fullResponse = chunks.join('');
    console.log('SSE Response prepared, total length:', fullResponse.length);

    return new Response(fullResponse, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      },
    });

  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
