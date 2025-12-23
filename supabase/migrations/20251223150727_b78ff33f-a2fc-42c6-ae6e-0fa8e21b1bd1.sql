-- Enable realtime for events table to get live call status updates
ALTER PUBLICATION supabase_realtime ADD TABLE events;