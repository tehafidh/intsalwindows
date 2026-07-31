module.exports = {
    apps: [
        {
            name: "instaler-hafid-store",
            script: "server.js",
            instances: 1,
            exec_mode: "fork",
            autorestart: true,
            watch: false,
            max_memory_restart: "512M",
            env: {
                NODE_ENV: "production",
                PORT: "8081",
                PUBLIC_SITE_URL: "https://web.buyrdp.biz.id",
            },
            env_production: {
                NODE_ENV: "production",
                PORT: "8081",
                PUBLIC_SITE_URL: "https://web.buyrdp.biz.id",
            },
        },
    ],
};
