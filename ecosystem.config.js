module.exports = {
  apps: [{
    name: 'spy-dashboard',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/spy-dashboard',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/spy-dashboard-error.log',
    out_file: '/var/log/pm2/spy-dashboard-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '2G',
    watch: false,
    ignore_watch: ['node_modules', '.next', 'logs']
  }]
}

