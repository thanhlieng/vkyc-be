module.exports = {
  apps: [
    {
      name: "vkyc-backend",
      script: "build/server.js",
      instances: 1,
      exec_mode: "cluster",
      watch: ".",
      ignore_watch: ["node_modules", "src/assets"],
      env: {
        NODE_ENV: "production",
        // Set your umask here (e.g., 0002 for read/write for owner and group)
        umask: "0000",
      },
    },
  ],

  // deploy : {
  //   production : {
  //     user : 'SSH_USERNAME',
  //     host : 'SSH_HOSTMACHINE',
  //     ref  : 'origin/master',
  //     repo : 'GIT_REPOSITORY',
  //     path : 'DESTINATION_PATH',
  //     'pre-deploy-local': '',
  //     'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production',
  //     'pre-setup': ''
  //   }
  // }
};
