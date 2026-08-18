module.exports = {
  apps: [
    {
      name: 'cms-api',
      cwd: './apps/api',
      script: 'dist/server.js',
      instances: 'max', // Or set to a number (e.g. 1 or 2)
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '../logs/pm2-error.log',
      out_file: '../logs/pm2-out.log',
      merge_logs: true
    }
  ]
};
