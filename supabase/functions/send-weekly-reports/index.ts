import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Send Weekly Reports Cron Job
 * 
 * This function is called by a cron job every hour.
 * It checks all users with weekly_report_enabled=true and:
 * 1. Checks if today is the user's configured weekly_report_day
 * 2. Checks if it's around midnight in the user's timezone
 * 3. Generates the report by calling generate-weekly-report
 * 4. Creates a chat message with the report
 * 5. Sends a push notification
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[send-weekly-reports] Starting cron job at', new Date().toISOString());

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all users with weekly reports enabled
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, timezone, weekly_report_day, last_weekly_report_at, fcm_token')
      .eq('weekly_report_enabled', true);

    if (usersError) {
      console.error('[send-weekly-reports] Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`[send-weekly-reports] Found ${users?.length || 0} users with reports enabled`);

    const now = new Date();
    const processedUsers: string[] = [];
    const errors: { userId: string; error: string }[] = [];

    for (const user of users || []) {
      try {
        const userTimezone = user.timezone || 'America/Sao_Paulo';
        
        // Get current time in user's timezone
        const userLocalTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
        const userDayOfWeek = userLocalTime.getDay(); // 0 = Sunday
        const userHour = userLocalTime.getHours();

        // Check if it's the configured day and around midnight (between 0:00 and 0:59)
        if (userDayOfWeek !== (user.weekly_report_day ?? 0) || userHour !== 0) {
          continue;
        }

        // Check if report was already sent today
        if (user.last_weekly_report_at) {
          const lastReportDate = new Date(user.last_weekly_report_at);
          const lastReportLocalDate = new Date(lastReportDate.toLocaleString('en-US', { timeZone: userTimezone }));
          
          // If last report was sent today, skip
          if (
            lastReportLocalDate.getFullYear() === userLocalTime.getFullYear() &&
            lastReportLocalDate.getMonth() === userLocalTime.getMonth() &&
            lastReportLocalDate.getDate() === userLocalTime.getDate()
          ) {
            console.log(`[send-weekly-reports] User ${user.id} already received report today, skipping`);
            continue;
          }
        }

        console.log(`[send-weekly-reports] Generating report for user ${user.id}`);

        // Detect user's language from their chat messages
        const { data: lastMessage } = await supabase
          .from('chat_messages')
          .select('metadata')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const language = lastMessage?.metadata?.language || 'pt-BR';

        // Generate the report
        const reportResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-weekly-report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ 
            userId: user.id, 
            language,
            forceGenerate: false 
          }),
        });

        if (!reportResponse.ok) {
          const errorText = await reportResponse.text();
          console.error(`[send-weekly-reports] Failed to generate report for ${user.id}:`, errorText);
          errors.push({ userId: user.id, error: errorText });
          continue;
        }

        const reportData = await reportResponse.json();
        
        if (!reportData.report) {
          console.error(`[send-weekly-reports] No report data for ${user.id}`);
          continue;
        }

        console.log(`[send-weekly-reports] Report generated for ${user.id}:`, reportData.report.id);

        // Create chat message with the report
        const assistantMessage = getReportArrivalMessage(language);
        
        const messageMetadata = {
          language,
          action: 'relatorio_semanal',
          weeklyReportData: {
            report: reportData.report,
            isPreviousWeek: true
          }
        };

        // Insert assistant message
        const { error: messageError } = await supabase
          .from('chat_messages')
          .insert({
            user_id: user.id,
            role: 'assistant',
            content: assistantMessage,
            metadata: messageMetadata
          });

        if (messageError) {
          console.error(`[send-weekly-reports] Failed to create chat message for ${user.id}:`, messageError);
        }

        // Send push notification if user has FCM token
        if (user.fcm_token) {
          const notificationTitle = getNotificationTitle(language);
          const notificationBody = getNotificationBody(language);

          try {
            await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                fcmToken: user.fcm_token,
                title: notificationTitle,
                body: notificationBody,
                data: { type: 'weekly_report' }
              }),
            });
            console.log(`[send-weekly-reports] Push notification sent to ${user.id}`);
          } catch (pushError) {
            console.error(`[send-weekly-reports] Failed to send push to ${user.id}:`, pushError);
          }
        }

        // Update last_weekly_report_at
        await supabase
          .from('profiles')
          .update({ last_weekly_report_at: now.toISOString() })
          .eq('id', user.id);

        processedUsers.push(user.id);
        console.log(`[send-weekly-reports] Successfully processed user ${user.id}`);

      } catch (userError) {
        console.error(`[send-weekly-reports] Error processing user ${user.id}:`, userError);
        errors.push({ 
          userId: user.id, 
          error: userError instanceof Error ? userError.message : 'Unknown error' 
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[send-weekly-reports] Completed in ${duration}ms. Processed: ${processedUsers.length}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedUsers.length,
        errors: errors.length,
        duration 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-weekly-reports] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getReportArrivalMessage(language: string): string {
  const messages: Record<string, string> = {
    'pt-BR': '📊 Seu resumo semanal chegou!',
    'en-US': '📊 Your weekly summary has arrived!',
    'es-ES': '📊 ¡Tu resumen semanal ha llegado!',
    'fr-FR': '📊 Votre résumé hebdomadaire est arrivé !',
    'ja-JP': '📊 週間サマリーが届きました！',
    'ko-KR': '📊 주간 요약이 도착했습니다!',
    'zh-CN': '📊 您的周报已送达！',
  };
  return messages[language] || messages['pt-BR'];
}

function getNotificationTitle(language: string): string {
  const titles: Record<string, string> = {
    'pt-BR': '📊 Resumo semanal pronto!',
    'en-US': '📊 Weekly summary ready!',
    'es-ES': '📊 ¡Resumen semanal listo!',
    'fr-FR': '📊 Résumé hebdomadaire prêt !',
    'ja-JP': '📊 週間サマリー完成！',
    'ko-KR': '📊 주간 요약 준비 완료!',
    'zh-CN': '📊 周报已准备好！',
  };
  return titles[language] || titles['pt-BR'];
}

function getNotificationBody(language: string): string {
  const bodies: Record<string, string> = {
    'pt-BR': 'Veja como foi sua semana no Horah!',
    'en-US': 'See how your week went on Horah!',
    'es-ES': '¡Mira cómo fue tu semana en Horah!',
    'fr-FR': 'Voyez comment s\'est passée votre semaine sur Horah !',
    'ja-JP': 'Horahであなたの一週間をチェック！',
    'ko-KR': 'Horah에서 당신의 한 주를 확인하세요!',
    'zh-CN': '来看看您在Horah上的一周！',
  };
  return bodies[language] || bodies['pt-BR'];
}
