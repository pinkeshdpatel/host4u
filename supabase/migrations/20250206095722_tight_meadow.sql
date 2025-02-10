/*
  # Add GitHub repository information to projects

  1. Changes
    - Add GitHub-related columns to projects table:
      - `repo_name` (text)
      - `repo_url` (text)
  
  2. Security
    - Update RLS policies to include new columns
*/

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS repo_name text,
ADD COLUMN IF NOT EXISTS repo_url text;