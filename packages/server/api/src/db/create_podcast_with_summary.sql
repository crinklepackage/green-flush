-- packages/server/api/src/db/procedures/create_podcast_with_summary.sql

-- Define the function
create or replace function create_podcast_with_summary(
  podcast_data jsonb,
  summary_id uuid,
  user_id uuid
) returns jsonb
language plpgsql
security definer
as $$
declare
  new_podcast_id uuid;
  podcast_record record;
begin
  -- Start transaction
  begin
    -- Create podcast record
    insert into podcasts (
      url,
      platform,
      title,
      show_name,
      thumbnail_url,
      duration,
      youtube_url,
      created_by,
      created_at,
      updated_at
    ) values (
      (podcast_data->>'url'),
      (podcast_data->>'platform')::text,
      (podcast_data->>'title'),
      (podcast_data->>'show_name'),
      (podcast_data->>'thumbnail_url'),
      (podcast_data->>'duration')::integer,
      (podcast_data->>'youtube_url'),
      user_id,
      now(),
      now()
    )
    returning * into podcast_record;

    -- Update summary with podcast_id and status
    update summaries
    set 
      podcast_id = podcast_record.id,
      status = 'FETCHING_TRANSCRIPT',
      updated_at = now()
    where id = summary_id;

    -- Create user_summary association if it doesn't exist
    insert into user_summaries (
      user_id,
      summary_id,
      created_at
    ) values (
      user_id,
      summary_id,
      now()
    )
    on conflict (user_id, summary_id) do nothing;

    -- Return the created podcast data
    return jsonb_build_object(
      'id', podcast_record.id,
      'url', podcast_record.url,
      'title', podcast_record.title,
      'show_name', podcast_record.show_name,
      'created_at', podcast_record.created_at,
      'platform', podcast_record.platform
    );

  exception 
    when others then
      -- Rollback transaction on any error
      raise exception 'Failed to create podcast with summary: %', SQLERRM;
  end;
end;
$$;

-- Add some helpful comments
comment on function create_podcast_with_summary(jsonb, uuid, uuid) is 
'Creates a podcast record, updates the summary with the podcast_id, and creates a user_summary association in a single transaction.';