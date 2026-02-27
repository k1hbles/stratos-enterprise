import type Database from "better-sqlite3";

export function runMigrations(db: Database.Database): void {
  // Check if migrations have already run
  const tableExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    )
    .get();
  if (tableExists) return;

  // Note: db.exec() here is better-sqlite3's method for executing raw SQL,
  // NOT child_process.exec(). This is safe — no shell execution involved.
  const sql = `
    -- 1. users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 2. user_profiles
    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subscription_tier TEXT DEFAULT 'free',
      preferred_name TEXT DEFAULT '',
      role TEXT DEFAULT '',
      goals TEXT DEFAULT '[]',
      timezone TEXT DEFAULT 'UTC',
      study_mode_default INTEGER DEFAULT 0,
      proactive_enabled INTEGER DEFAULT 0,
      onboarding_completed INTEGER DEFAULT 0,
      preferences TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 3. conversations
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT DEFAULT 'New Chat',
      preview TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

    -- 4. messages
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 5. jobs
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      task_type TEXT DEFAULT 'research',
      status TEXT DEFAULT 'queued',
      priority INTEGER DEFAULT 0,
      output_format TEXT DEFAULT 'auto',
      steps_completed INTEGER DEFAULT 0,
      total_steps INTEGER,
      current_step_description TEXT,
      started_at TEXT,
      completed_at TEXT,
      error_message TEXT,
      tokens_used INTEGER DEFAULT 0,
      estimated_cost REAL DEFAULT 0,
      conversation_id TEXT,
      trigger_run_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);

    -- 6. job_files
    CREATE TABLE IF NOT EXISTS job_files (
      id TEXT PRIMARY KEY,
      job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_type TEXT DEFAULT 'application/octet-stream',
      file_size INTEGER DEFAULT 0,
      storage_path TEXT NOT NULL,
      parsed_content TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 7. job_steps
    CREATE TABLE IF NOT EXISTS job_steps (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      step_number INTEGER NOT NULL,
      tool_name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'running',
      tokens_used INTEGER,
      duration_ms INTEGER,
      reasoning TEXT,
      result_data TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 8. job_results
    CREATE TABLE IF NOT EXISTS job_results (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      result_type TEXT NOT NULL,
      file_name TEXT,
      storage_path TEXT,
      file_size INTEGER,
      content_markdown TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 9. missions
    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      skill TEXT,
      schedule_cron TEXT,
      schedule_timezone TEXT DEFAULT 'UTC',
      data_source_ids TEXT DEFAULT '[]',
      parameters TEXT DEFAULT '{}',
      delivery_channels TEXT DEFAULT '[]',
      active INTEGER DEFAULT 1,
      last_run_at TEXT,
      last_run_job_id TEXT,
      run_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 10. memory_core
    CREATE TABLE IF NOT EXISTS memory_core (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      source TEXT DEFAULT 'agent',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, key)
    );
    CREATE INDEX IF NOT EXISTS idx_memory_core_user_id ON memory_core(user_id);

    -- 11. memory_buffer
    CREATE TABLE IF NOT EXISTS memory_buffer (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      conversation_id TEXT,
      summary TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_memory_buffer_user_id ON memory_buffer(user_id);

    -- 12. memory_semantic
    CREATE TABLE IF NOT EXISTS memory_semantic (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding TEXT,
      metadata TEXT DEFAULT '{}',
      source_type TEXT,
      source_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_memory_semantic_user_id ON memory_semantic(user_id);

    -- 13. directors
    CREATE TABLE IF NOT EXISTS directors (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      role_description TEXT,
      system_prompt TEXT,
      tool_whitelist TEXT DEFAULT '[]',
      model_preference TEXT DEFAULT 'claude-sonnet-4-5-20250929',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 14. council_sessions
    CREATE TABLE IF NOT EXISTS council_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      goal TEXT NOT NULL,
      mode TEXT DEFAULT 'council',
      stage TEXT DEFAULT 'pending',
      chairman_summary TEXT,
      conversation_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 15. council_tasks
    CREATE TABLE IF NOT EXISTS council_tasks (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES council_sessions(id) ON DELETE CASCADE,
      director_slug TEXT NOT NULL,
      goal TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      result_summary TEXT,
      result_data TEXT,
      tokens_used INTEGER DEFAULT 0,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_council_tasks_session_id ON council_tasks(session_id);

    -- 16. council_exchanges
    CREATE TABLE IF NOT EXISTS council_exchanges (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES council_sessions(id) ON DELETE CASCADE,
      stage TEXT,
      from_director TEXT,
      to_director TEXT,
      content TEXT,
      exchange_type TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_council_exchanges_session_id ON council_exchanges(session_id);

    -- 17. council_documents
    CREATE TABLE IF NOT EXISTS council_documents (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES council_sessions(id) ON DELETE CASCADE,
      title TEXT,
      content_markdown TEXT,
      document_type TEXT,
      storage_path TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 18. pending_confirmations
    CREATE TABLE IF NOT EXISTS pending_confirmations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT,
      job_id TEXT,
      director_slug TEXT,
      tool_name TEXT NOT NULL,
      tool_args TEXT DEFAULT '{}',
      description TEXT,
      status TEXT DEFAULT 'pending',
      resolved_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_pending_confirmations_user_status ON pending_confirmations(user_id, status);

    -- 19. audit_log
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      session_id TEXT,
      job_id TEXT,
      director_slug TEXT,
      tool_name TEXT NOT NULL,
      tool_args TEXT,
      result_summary TEXT,
      success INTEGER DEFAULT 1,
      duration_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_job_id ON audit_log(job_id);

    -- 20. decisions
    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT,
      title TEXT,
      reasoning TEXT,
      decision TEXT,
      directors_involved TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_decisions_user_id ON decisions(user_id);

    -- 21. whatsapp_queue
    CREATE TABLE IF NOT EXISTS whatsapp_queue (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      recipient_phone TEXT NOT NULL,
      message_body TEXT NOT NULL,
      status TEXT DEFAULT 'queued',
      sent_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status ON whatsapp_queue(status);

    -- 22. registered_tools
    CREATE TABLE IF NOT EXISTS registered_tools (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      input_schema TEXT DEFAULT '{}',
      code TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, name)
    );
    CREATE INDEX IF NOT EXISTS idx_registered_tools_user_active ON registered_tools(user_id, active);
  `;

  db.exec(sql);

  // Safe ALTER additions — wrapped in try/catch since columns may already exist
  try { db.exec("ALTER TABLE decisions ADD COLUMN status TEXT DEFAULT 'pending'"); } catch {}
  try { db.exec("ALTER TABLE decisions ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))"); } catch {}

  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      default_autonomy TEXT DEFAULT 'confirm',
      mode_overrides TEXT DEFAULT '{}',
      whatsapp_enabled INTEGER DEFAULT 0,
      whatsapp_number TEXT,
      timezone TEXT DEFAULT 'Asia/Jakarta',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}
