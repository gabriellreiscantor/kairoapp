-- Adicionar coluna de hora como integer (igual weekly_report_hour)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weather_forecast_hour integer DEFAULT 7;

-- Adicionar coluna para evitar duplicatas de envio
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_weather_forecast_at timestamptz;

-- Adicionar colunas de localização do usuário
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_latitude numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_longitude numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_city text;