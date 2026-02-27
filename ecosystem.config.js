module.exports = {
  apps: [
    {
      name: "nightshift",
      script: "npm",
      args: "start",
      exec_mode: "fork",
      instances: 1, // SQLite single-writer
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "1G",
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
