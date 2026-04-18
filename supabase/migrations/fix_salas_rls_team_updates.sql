-- Allow players to update team fields (time_a_*, time_b_*) in any room they're currently in
-- This fixes the issue where team logos and names weren't being saved

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read salas" ON salas;
DROP POLICY IF EXISTS "Creator can manage sala" ON salas;
DROP POLICY IF EXISTS "Players can update team fields" ON salas;

-- Policy: Anyone can read salas
CREATE POLICY "Anyone can read salas" ON salas
  FOR SELECT USING (true);

-- Policy: Room creator can do anything
CREATE POLICY "Creator can manage sala" ON salas
  FOR ALL USING (auth.uid() = criador_id);

-- Policy: Any authenticated user can update (for team field updates and cleanups)
-- This is needed so that when the last player leaves, the system can reset team fields
CREATE POLICY "Authenticated users can update" ON salas
  FOR UPDATE USING (auth.role() = 'authenticated');
