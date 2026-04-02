const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://hjwhjkmaogojpbwbvnwb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PBjtLQ8RII6sq6u8Z1iwNw_y1Il478E';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('feedback_notes').select('*');
  console.log('Total notes:', data.length);
  const sipNotes = data.filter(n => n.project_id === '04eab22f-7e1c-4844-93c4-5076940d8604');
  console.log('Notes for sip:', sipNotes);
}

test();
