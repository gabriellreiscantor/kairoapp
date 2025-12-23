-- Rename weekly_report_day to weekly_report_hour
ALTER TABLE public.profiles 
  RENAME COLUMN weekly_report_day TO weekly_report_hour;

-- Change default from 0 (Sunday) to 12 (noon)
ALTER TABLE public.profiles 
  ALTER COLUMN weekly_report_hour SET DEFAULT 12;

-- Update all existing values to 12 (noon) since they were days, not hours
UPDATE public.profiles 
  SET weekly_report_hour = 12 
  WHERE weekly_report_hour IS NOT NULL;