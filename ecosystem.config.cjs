module.exports = {
  apps: [
    {
      name: "ruangtemu-api",
      cwd: "/var/www/ruangtemu.biz.id/backend",
      script: "dist/server.js",
      env: { NODE_ENV: "production", HOST: "127.0.0.1", PORT: "3200" },
      max_memory_restart: "300M",
    },
    {
      name: "ruangtemu-web",
      cwd: "/var/www/ruangtemu.biz.id/frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3201 -H 127.0.0.1",
      env: { NODE_ENV: "production" },
      max_memory_restart: "400M",
    },
  ],
};
