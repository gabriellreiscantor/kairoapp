-- Adicionar campos para tracking de ligações na tabela events
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS call_alert_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS call_alert_answered boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS call_alert_answered_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS call_alert_outcome text;

-- Atualizar eventos passados que já tiveram call_alert_sent_at
-- Marcar como 'sent' pois não temos dados históricos do resultado
UPDATE events 
SET call_alert_outcome = 'sent',
    call_alert_attempts = 1
WHERE call_alert_sent_at IS NOT NULL AND call_alert_outcome IS NULL;