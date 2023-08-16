# Running

    sh up.sh


Once inside the the container, you have to manually build and run the app:

    cd /var/app/frontend && npm install && npm run build
    cd /var/app/backend && npm install
    node app.js