CREATE TABLE IF NOT EXISTS support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('problem', 'question', 'feedback')),
  product_area TEXT NOT NULL CHECK (product_area IN ('upload', 'analysis', 'results', 'billing', 'account', 'other')),
  subject TEXT NOT NULL,
  actual_behavior TEXT NOT NULL,
  expected_behavior TEXT NOT NULL,
  reproduction_steps TEXT,
  related_correction_id TEXT,
  related_file_name TEXT,
  device_context TEXT,
  screenshot_available BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'answered', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_requests_user_id ON support_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests(status);
CREATE INDEX IF NOT EXISTS idx_support_requests_created_at ON support_requests(created_at DESC);

ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own support requests" ON support_requests;
DROP POLICY IF EXISTS "Users can insert own support requests" ON support_requests;

CREATE POLICY "Users can view own support requests"
  ON support_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own support requests"
  ON support_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);
