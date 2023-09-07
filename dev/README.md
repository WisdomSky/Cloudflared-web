# Running dev

    sh up.sh

Once inside the the container, you have to manually build and run the app:

    cd /var/app/frontend && npm install && npm run build
    cd /var/app/backend && npm install
    node app.js

During development, you can set the module bundler of the frontend app to watch for changes using `npm run watch`:

    cd /var/app/frontend && npm install && npm run watch
