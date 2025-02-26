-- Create the user_feedback table for storing all types of user feedback
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  feedback_type VARCHAR(50) NOT NULL,  -- 'summary_retry_limit', 'general', 'bug', 'feature_request', etc.
  feedback_text TEXT NOT NULL,
  submitted_at TIMESTAMP DEFAULT NOW(),
  
  -- Context fields (optional based on feedback_type)
  summary_id UUID REFERENCES summaries(id),
  podcast_id UUID REFERENCES podcasts(id),
  page_url TEXT,  -- Which page they were on when submitting feedback
  browser_info JSONB,  -- Browser/device info for bug reports
  
  -- Administrative fields
  status VARCHAR(50) DEFAULT 'new',  -- 'new', 'reviewed', 'implemented', 'closed'
  admin_notes TEXT,
  priority INTEGER DEFAULT 3,  -- 1-5 scale (1 = highest, 5 = lowest)
  
  -- Metadata/categorization
  tags TEXT[]  -- For flexible categorization
);

-- Create an index on feedback_type for filtering
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(feedback_type);

-- Create an index on status for filtering
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);

-- Create an index on user_id for filtering by user
CREATE INDEX IF NOT EXISTS idx_user_feedback_user ON user_feedback(user_id);

-- Create an index on submitted_at for sorting by date
CREATE INDEX IF NOT EXISTS idx_user_feedback_date ON user_feedback(submitted_at);

-- Add RLS policies to protect the table
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Normal users can only see their own feedback
CREATE POLICY user_feedback_select_policy 
  ON user_feedback FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own feedback (but user_id must match their ID)
CREATE POLICY user_feedback_insert_policy 
  ON user_feedback FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can't update or delete feedback
CREATE POLICY user_feedback_update_policy 
  ON user_feedback FOR UPDATE 
  USING (false);

CREATE POLICY user_feedback_delete_policy 
  ON user_feedback FOR DELETE 
  USING (false);

-- Allow service_role (admin) to do anything
CREATE POLICY admin_full_access_policy 
  ON user_feedback 
  USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'service_role'); 