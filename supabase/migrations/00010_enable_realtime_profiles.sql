do $$
begin
  execute 'alter publication supabase_realtime add table profiles';
exception
  when duplicate_object then null;
end $$;
